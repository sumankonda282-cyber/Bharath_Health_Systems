"""
Bharath Health Bridge Agent
=========================
Universal clinic-to-cloud connector. Runs as a Windows service.
Handles: HL7 v2.x, ASTM LIS02-A2, DICOM, PDF
Translates to FHIR R4 before posting to Bharath Health API.
ABHA-ready: maps patient identifiers from all formats.

Architecture:
  - Persistent WebSocket to API (for DICOM on-demand streaming)
  - Folder watchers for DICOM, PDF
  - TCP/Serial listeners for HL7, ASTM
  - All results normalised → FHIR R4 → POST to API
"""
import asyncio
import json
import logging
import os
import sys
import time
import threading
import hashlib
import socket
from pathlib import Path
from typing import Optional

import requests
import websockets
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from parsers import (
    parse_hl7_message, parse_astm_message,
    extract_metadata, extract_preview_image,
    scan_dicom_folder, group_by_study,
    to_fhir_diagnostic_report, to_fhir_imaging_study, to_fhir_patient,
)

# ── Logging ────────────────────────────────────────────────────────────────────
log_path = Path(os.environ.get('APPDATA', '.')) / 'BharathHealth' / 'bridge.log'
log_path.parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(str(log_path), encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger('bridge')

# ── Config ─────────────────────────────────────────────────────────────────────
CONFIG_PATH = Path(os.environ.get('APPDATA', '.')) / 'BharathHealth' / 'config.json'

DEFAULT_CONFIG = {
    'api_url':          'https://api.bharatcliniq.com',
    'api_key':          '',
    'clinic_id':        '',
    'hl7_port':         2575,
    'astm_port':        2576,
    'astm_serial_port': '',        # e.g. COM3
    'astm_baud_rate':   9600,
    'dicom_watch_folder': '',      # folder where scanner saves DICOM files
    'pdf_watch_folder':   '',      # folder where any machine saves PDFs
    'unmatched_folder':   '',      # where to move unmatched results
    'retry_interval':     30,      # seconds between retry attempts
    'ws_reconnect_delay': 5,
}


def load_config() -> dict:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            cfg = json.load(f)
        return {**DEFAULT_CONFIG, **cfg}
    return DEFAULT_CONFIG.copy()


def save_config(cfg: dict):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, 'w') as f:
        json.dump(cfg, f, indent=2)


# ── API Client ─────────────────────────────────────────────────────────────────
class APIClient:
    def __init__(self, cfg: dict):
        self.base    = cfg['api_url'].rstrip('/')
        self.headers = {
            'X-Bridge-Key':    cfg['api_key'],
            'X-Clinic-ID':     cfg['clinic_id'],
            'Content-Type':    'application/json',
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        self._retry_queue = self._load_queue()  # restore queue from disk on startup
        if self._retry_queue:
            log.info(f'Restored {len(self._retry_queue)} items from persistent retry queue')

    def _queue_path(self) -> Path:
        return log_path.parent / 'retry_queue.json'

    def _load_queue(self) -> list:
        p = self._queue_path()
        if p.exists():
            try:
                return json.loads(p.read_text())
            except Exception:
                pass
        return []

    def _save_queue(self):
        try:
            self._queue_path().write_text(json.dumps(self._retry_queue))
        except Exception as e:
            log.warning(f'Could not persist retry queue: {e}')

    def post(self, path: str, payload: dict) -> bool:
        url = f'{self.base}{path}'
        try:
            r = self.session.post(url, json=payload, timeout=15)
            if r.status_code in (200, 201):
                log.info(f'POST {path} → {r.status_code}')
                return True
            log.warning(f'POST {path} → {r.status_code}: {r.text[:200]}')
            return False
        except requests.exceptions.ConnectionError:
            log.warning(f'API unreachable, queuing {path}')
            self._retry_queue.append((path, payload))
            self._save_queue()
            return False
        except Exception as e:
            log.error(f'POST {path} error: {e}')
            return False

    def flush_retry_queue(self):
        if not self._retry_queue:
            return
        remaining = []
        for path, payload in self._retry_queue:
            if not self.post(path, payload):
                remaining.append((path, payload))
        self._retry_queue = remaining
        self._save_queue()
        if remaining:
            log.info(f'{len(remaining)} items still in retry queue')

    def ingest_lab(self, parsed: dict, fhir: dict) -> bool:
        return self.post('/api/v1/bridge/ingest/lab', {
            'parsed': parsed,
            'fhir':   fhir,
        })

    def ingest_imaging(self, metadata: dict, fhir: dict) -> bool:
        return self.post('/api/v1/bridge/ingest/imaging', {
            'metadata': metadata,
            'fhir':     fhir,
        })

    def ingest_pdf(self, order_id: str, b64_pdf: str, source: str) -> bool:
        return self.post('/api/v1/bridge/ingest/pdf', {
            'order_id': order_id,
            'pdf_b64':  b64_pdf,
            'source':   source,
        })

    def stream_dicom_preview(self, order_id: str, file_path: str) -> bool:
        """Extract and stream preview images for on-demand DICOM viewing."""
        import base64
        b64 = extract_preview_image(file_path)
        if not b64:
            log.warning(f'Could not extract preview from {file_path}')
            return False
        return self.post('/api/v1/bridge/dicom/preview', {
            'order_id':    order_id,
            'preview_b64': b64,
            'file_path':   file_path,
        })


# ── Result Processor ───────────────────────────────────────────────────────────
class ResultProcessor:
    def __init__(self, api: APIClient, cfg: dict):
        self.api       = api
        self.cfg       = cfg
        self.clinic_id = cfg['clinic_id']
        # Track processed files to avoid duplicates
        self._processed = set()

    def _file_hash(self, path: str) -> str:
        return hashlib.md5(Path(path).read_bytes()).hexdigest()

    def already_processed(self, path: str) -> bool:
        h = self._file_hash(path)
        if h in self._processed:
            return True
        self._processed.add(h)
        return False

    def process_hl7(self, raw: str, source: str = 'tcp'):
        parsed = parse_hl7_message(raw)
        if not parsed or parsed.get('type') == 'error':
            log.error(f'HL7 parse error from {source}: {parsed}')
            return
        if parsed.get('type') == 'lab_result':
            order_id = parsed.get('order_id', '')
            fhir     = to_fhir_diagnostic_report(parsed, self.clinic_id, order_id)
            ok       = self.api.ingest_lab(parsed, fhir)
            log.info(f'HL7 lab result ORDER={order_id} → {"OK" if ok else "QUEUED"}')

    def process_astm(self, raw: str, source: str = 'tcp'):
        parsed = parse_astm_message(raw)
        if not parsed or parsed.get('type') == 'error':
            log.error(f'ASTM parse error from {source}: {parsed}')
            return
        if parsed.get('type') == 'lab_result':
            order_id = parsed.get('order_id', '')
            fhir     = to_fhir_diagnostic_report(parsed, self.clinic_id, order_id)
            ok       = self.api.ingest_lab(parsed, fhir)
            log.info(f'ASTM lab result ORDER={order_id} → {"OK" if ok else "QUEUED"}')

    def process_dicom(self, file_path: str):
        if self.already_processed(file_path):
            return
        meta = extract_metadata(file_path)
        if not meta:
            return
        order_id = meta.get('order_id', '')
        fhir     = to_fhir_imaging_study(meta, self.clinic_id, order_id)
        ok       = self.api.ingest_imaging(meta, fhir)
        log.info(f'DICOM {meta.get("modality")} ORDER={order_id} → {"OK" if ok else "QUEUED"}')

    def process_pdf(self, file_path: str):
        if self.already_processed(file_path):
            return
        import base64
        name     = Path(file_path).stem
        order_id = name if name.startswith('ORDER-') else ''
        b64      = base64.b64encode(Path(file_path).read_bytes()).decode()
        ok       = self.api.ingest_pdf(order_id, b64, 'file_watcher')
        log.info(f'PDF {Path(file_path).name} ORDER={order_id} → {"OK" if ok else "QUEUED"}')

    def handle_dicom_preview_request(self, order_id: str, file_path: str):
        """Called by WebSocket when doctor requests DICOM preview."""
        log.info(f'DICOM preview requested for ORDER={order_id}')
        ok = self.api.stream_dicom_preview(order_id, file_path)
        log.info(f'DICOM preview streamed → {"OK" if ok else "FAILED"}')


# ── File Watchers ──────────────────────────────────────────────────────────────
class DICOMWatcher(FileSystemEventHandler):
    def __init__(self, processor: ResultProcessor):
        self.processor = processor

    def on_created(self, event):
        if event.is_directory:
            return
        path = event.src_path
        if path.lower().endswith(('.dcm', '.dicom')) or '.' not in Path(path).suffix:
            time.sleep(1)  # wait for file to finish writing
            self.processor.process_dicom(path)


class PDFWatcher(FileSystemEventHandler):
    def __init__(self, processor: ResultProcessor):
        self.processor = processor

    def on_created(self, event):
        if event.is_directory:
            return
        if event.src_path.lower().endswith('.pdf'):
            time.sleep(1)
            self.processor.process_pdf(event.src_path)


def start_folder_watchers(cfg: dict, processor: ResultProcessor) -> list:
    observers = []

    if cfg.get('dicom_watch_folder') and Path(cfg['dicom_watch_folder']).exists():
        obs = Observer()
        obs.schedule(DICOMWatcher(processor), cfg['dicom_watch_folder'], recursive=True)
        obs.start()
        observers.append(obs)
        log.info(f'DICOM watcher started: {cfg["dicom_watch_folder"]}')

    if cfg.get('pdf_watch_folder') and Path(cfg['pdf_watch_folder']).exists():
        obs = Observer()
        obs.schedule(PDFWatcher(processor), cfg['pdf_watch_folder'], recursive=True)
        obs.start()
        observers.append(obs)
        log.info(f'PDF watcher started: {cfg["pdf_watch_folder"]}')

    return observers


# ── TCP Listeners (HL7 and ASTM over LAN) ──────────────────────────────────────
def start_hl7_tcp_listener(cfg: dict, processor: ResultProcessor):
    port = cfg.get('hl7_port', 2575)

    def _listen():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
            srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            srv.bind(('0.0.0.0', port))
            srv.listen(5)
            log.info(f'HL7 TCP listener on port {port}')
            while True:
                try:
                    conn, addr = srv.accept()
                    with conn:
                        data = b''
                        while True:
                            chunk = conn.recv(4096)
                            if not chunk:
                                break
                            data += chunk
                        if data:
                            processor.process_hl7(data.decode('utf-8', errors='replace'), f'tcp:{addr}')
                        conn.sendall(b'\x06')  # ACK
                except Exception as e:
                    log.error(f'HL7 TCP error: {e}')

    t = threading.Thread(target=_listen, daemon=True)
    t.start()
    return t


def start_astm_tcp_listener(cfg: dict, processor: ResultProcessor):
    port = cfg.get('astm_port', 2576)

    def _listen():
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
            srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            srv.bind(('0.0.0.0', port))
            srv.listen(5)
            log.info(f'ASTM TCP listener on port {port}')
            while True:
                try:
                    conn, addr = srv.accept()
                    with conn:
                        data = b''
                        while True:
                            chunk = conn.recv(4096)
                            if not chunk:
                                break
                            data += chunk
                        if data:
                            processor.process_astm(data.decode('utf-8', errors='replace'), f'tcp:{addr}')
                        conn.sendall(b'\x06')  # ACK
                except Exception as e:
                    log.error(f'ASTM TCP error: {e}')

    t = threading.Thread(target=_listen, daemon=True)
    t.start()
    return t


def start_astm_serial_listener(cfg: dict, processor: ResultProcessor):
    port_name = cfg.get('astm_serial_port', '')
    if not port_name:
        return None

    def _listen():
        try:
            import serial
            ser = serial.Serial(
                port=port_name,
                baudrate=cfg.get('astm_baud_rate', 9600),
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=1,
            )
            log.info(f'ASTM serial listener on {port_name}')
            buf = b''
            while True:
                chunk = ser.read(256)
                if chunk:
                    buf += chunk
                    # ASTM message ends with ETX (0x03) + checksum
                    if b'\x03' in buf:
                        processor.process_astm(buf.decode('ascii', errors='replace'), f'serial:{port_name}')
                        buf = b''
                        ser.write(b'\x06')  # ACK
        except Exception as e:
            log.error(f'ASTM serial error on {port_name}: {e}')

    t = threading.Thread(target=_listen, daemon=True)
    t.start()
    return t


# ── WebSocket — DICOM On-Demand + Keepalive ────────────────────────────────────
async def run_websocket(cfg: dict, processor: ResultProcessor):
    ws_url = cfg['api_url'].replace('https://', 'wss://').replace('http://', 'ws://')
    ws_url = f'{ws_url}/api/v1/bridge/ws?key={cfg["api_key"]}&clinic={cfg["clinic_id"]}'

    # Build index of ORDER ID → DICOM file path from watched folder
    dicom_index: dict[str, str] = {}

    def rebuild_index():
        folder = cfg.get('dicom_watch_folder', '')
        if not folder or not Path(folder).exists():
            return
        files = scan_dicom_folder(folder)
        for f in files:
            oid = f.get('order_id', '')
            if oid:
                dicom_index[oid] = f['file_path']
        log.info(f'DICOM index rebuilt: {len(dicom_index)} studies')

    rebuild_index()

    while True:
        try:
            async with websockets.connect(ws_url, ping_interval=30, ping_timeout=10) as ws:
                log.info('WebSocket connected to API')
                await ws.send(json.dumps({'type': 'hello', 'clinic_id': cfg['clinic_id']}))

                async for raw_msg in ws:
                    try:
                        msg = json.loads(raw_msg)
                        mtype = msg.get('type')

                        if mtype == 'dicom_preview_request':
                            order_id = msg.get('order_id', '')
                            # Look up file path from index
                            file_path = dicom_index.get(order_id)
                            if file_path and Path(file_path).exists():
                                processor.handle_dicom_preview_request(order_id, file_path)
                            else:
                                log.warning(f'DICOM file not found for ORDER={order_id}')
                                processor.api.post('/api/v1/bridge/dicom/unavailable', {
                                    'order_id': order_id,
                                    'reason':   'file_not_found',
                                })

                        elif mtype == 'rebuild_index':
                            rebuild_index()

                        elif mtype == 'ping':
                            await ws.send(json.dumps({'type': 'pong'}))

                    except json.JSONDecodeError:
                        pass

        except (websockets.exceptions.ConnectionClosed,
                websockets.exceptions.WebSocketException,
                OSError) as e:
            log.warning(f'WebSocket disconnected: {e}. Reconnecting in {cfg["ws_reconnect_delay"]}s...')
            await asyncio.sleep(cfg['ws_reconnect_delay'])
        except Exception as e:
            log.error(f'WebSocket error: {e}')
            await asyncio.sleep(cfg['ws_reconnect_delay'])


# ── Retry Loop ─────────────────────────────────────────────────────────────────
def start_retry_loop(api: APIClient, interval: int):
    def _loop():
        while True:
            time.sleep(interval)
            api.flush_retry_queue()
    t = threading.Thread(target=_loop, daemon=True)
    t.start()


# ── Main Entry ─────────────────────────────────────────────────────────────────
def main(tray: bool = False):
    cfg       = load_config()
    api       = APIClient(cfg)
    processor = ResultProcessor(api, cfg)

    if not cfg['api_key'] or not cfg['clinic_id']:
        log.warning('Bridge agent not configured. Please run the config UI.')
    else:
        log.info(f'Starting Bharath Health Bridge Agent for clinic {cfg["clinic_id"]}')

    # Start system tray icon (desktop mode only, not service)
    tray_icon = None
    if tray:
        try:
            from ui.tray_icon import BridgeTrayIcon
            tray_icon = BridgeTrayIcon()
            tray_icon.run()
            tray_icon.set_status('Running')
        except Exception as e:
            log.warning(f'Tray icon unavailable: {e}')

    # Start all listeners
    start_hl7_tcp_listener(cfg, processor)
    start_astm_tcp_listener(cfg, processor)
    start_astm_serial_listener(cfg, processor)
    observers = start_folder_watchers(cfg, processor)
    start_retry_loop(api, cfg['retry_interval'])

    log.info('All listeners started. Running...')

    # Run WebSocket in async loop (main thread)
    try:
        asyncio.run(run_websocket(cfg, processor))
    except KeyboardInterrupt:
        log.info('Shutting down bridge agent')
        if tray_icon:
            tray_icon.stop()
        for obs in observers:
            obs.stop()
        for obs in observers:
            obs.join()


if __name__ == '__main__':
    main()
