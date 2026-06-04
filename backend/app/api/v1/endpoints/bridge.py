"""
Bridge Agent API endpoints
Receives data from the BHaratCliniq Bridge Agent (.exe) running on clinic PCs.
Auth: X-Bridge-Key header (per-clinic API key stored in Clinic.bridge_api_key)
"""
import hashlib
import json
import base64
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.models import (
    Clinic, LabOrder, LabResult, ImagingOrder, ImagingResult, UnmatchedResult, Staff
)

router = APIRouter(prefix='/bridge', tags=['bridge'])

# ── Auth ───────────────────────────────────────────────────────────────────────

def get_clinic_by_key(
    x_bridge_key: str = Header(...),
    x_clinic_id:  str = Header(...),
    db: Session = Depends(get_db),
) -> Clinic:
    clinic = db.query(Clinic).filter_by(id=int(x_clinic_id)).first()
    if not clinic:
        raise HTTPException(403, 'Clinic not found')
    expected = getattr(clinic, 'bridge_api_key', None)
    if not expected or expected != x_bridge_key:
        raise HTTPException(403, 'Invalid bridge API key')
    return clinic


# ── Ping / Health ──────────────────────────────────────────────────────────────

@router.get('/ping')
def ping(clinic: Clinic = Depends(get_clinic_by_key)):
    return {'status': 'ok', 'clinic': clinic.name}


# ── Lab Ingest ─────────────────────────────────────────────────────────────────

class LabIngestPayload(BaseModel):
    parsed: dict
    fhir:   dict


@router.post('/ingest/lab')
def ingest_lab(payload: LabIngestPayload, clinic: Clinic = Depends(get_clinic_by_key),
               db: Session = Depends(get_db)):
    parsed   = payload.parsed
    order_id = parsed.get('order_id', '').strip()

    # Try to find matching order
    order = None
    if order_id:
        order = db.query(LabOrder).filter_by(order_id=order_id, clinic_id=clinic.id).first()

    if not order:
        # No match → unmatched queue
        unmatched = UnmatchedResult(
            clinic_id    = clinic.id,
            source       = 'bridge_hl7' if 'HL7' in parsed.get('format', '') else 'bridge_astm',
            raw_format   = parsed.get('format', ''),
            parsed_data  = parsed,
            patient_hint = parsed.get('patient_name', '') or parsed.get('patient_id', ''),
        )
        db.add(unmatched)
        db.commit()
        return {'status': 'unmatched', 'unmatched_id': unmatched.id}

    # Create or update result
    existing = db.query(LabResult).filter_by(order_id=order.id).first()
    if existing and existing.status == 'signed':
        # Don't overwrite signed report — create amendment flag
        return {'status': 'already_signed', 'order_id': order_id}

    report_content = json.dumps(parsed, sort_keys=True)
    report_hash    = hashlib.sha256(report_content.encode()).hexdigest()

    if existing:
        existing.observations = parsed.get('observations', [])
        existing.fhir_report  = payload.fhir
        existing.raw_format   = parsed.get('format', '')
        existing.report_hash  = report_hash
        existing.source       = 'bridge'
        existing.status       = 'pending_review'
    else:
        result = LabResult(
            order_id     = order.id,
            observations = parsed.get('observations', []),
            fhir_report  = payload.fhir,
            raw_format   = parsed.get('format', ''),
            report_hash  = report_hash,
            source       = 'bridge',
            status       = 'pending_review',
        )
        db.add(result)

    order.status = 'pending_review'
    if parsed.get('abha_id'):
        order.abha_id = parsed['abha_id']

    db.commit()
    return {'status': 'received', 'order_id': order_id}


# ── Imaging Ingest ─────────────────────────────────────────────────────────────

class ImagingIngestPayload(BaseModel):
    metadata: dict
    fhir:     dict


@router.post('/ingest/imaging')
def ingest_imaging(payload: ImagingIngestPayload, clinic: Clinic = Depends(get_clinic_by_key),
                   db: Session = Depends(get_db)):
    meta     = payload.metadata
    order_id = meta.get('order_id', '').strip()

    order = None
    if order_id:
        order = db.query(ImagingOrder).filter_by(order_id=order_id, clinic_id=clinic.id).first()

    if not order:
        unmatched = UnmatchedResult(
            clinic_id    = clinic.id,
            source       = 'bridge_dicom',
            raw_format   = 'DICOM',
            parsed_data  = meta,
            patient_hint = meta.get('patient_name', '') or meta.get('patient_id', ''),
        )
        db.add(unmatched)
        db.commit()
        return {'status': 'unmatched', 'unmatched_id': unmatched.id}

    existing = db.query(ImagingResult).filter_by(order_id=order.id).first()
    if existing and existing.status == 'signed':
        return {'status': 'already_signed', 'order_id': order_id}

    if existing:
        existing.dicom_metadata = meta
        existing.fhir_report    = payload.fhir
        existing.modality       = meta.get('modality')
        existing.study_uid      = meta.get('study_uid')
        existing.series_uid     = meta.get('series_uid')
        existing.status         = 'pending_review'
        existing.source         = 'bridge'
    else:
        result = ImagingResult(
            order_id       = order.id,
            dicom_metadata = meta,
            fhir_report    = payload.fhir,
            modality       = meta.get('modality'),
            study_uid      = meta.get('study_uid'),
            series_uid     = meta.get('series_uid'),
            status         = 'pending_review',
            source         = 'bridge',
        )
        db.add(result)

    order.status = 'pending_review'
    db.commit()
    return {'status': 'received', 'order_id': order_id}


# ── PDF Ingest ─────────────────────────────────────────────────────────────────

class PDFIngestPayload(BaseModel):
    order_id: str
    pdf_b64:  str
    source:   str = 'bridge'


@router.post('/ingest/pdf')
def ingest_pdf(payload: PDFIngestPayload, clinic: Clinic = Depends(get_clinic_by_key),
               db: Session = Depends(get_db)):
    order_id = payload.order_id.strip()

    # Try lab order first, then imaging
    lab_order = db.query(LabOrder).filter_by(order_id=order_id, clinic_id=clinic.id).first() if order_id else None
    img_order = db.query(ImagingOrder).filter_by(order_id=order_id, clinic_id=clinic.id).first() if order_id else None

    if lab_order:
        existing = db.query(LabResult).filter_by(order_id=lab_order.id).first()
        if existing:
            existing.pdf_b64 = payload.pdf_b64
            existing.source  = payload.source
        else:
            db.add(LabResult(
                order_id = lab_order.id,
                pdf_b64  = payload.pdf_b64,
                source   = payload.source,
                status   = 'pending_review',
                raw_format = 'PDF',
            ))
        lab_order.status = 'pending_review'
        db.commit()
        return {'status': 'received', 'type': 'lab', 'order_id': order_id}

    if img_order:
        existing = db.query(ImagingResult).filter_by(order_id=img_order.id).first()
        if existing:
            existing.pdf_b64 = payload.pdf_b64
            existing.source  = payload.source
        else:
            db.add(ImagingResult(
                order_id = img_order.id,
                pdf_b64  = payload.pdf_b64,
                source   = payload.source,
                status   = 'pending_review',
                raw_format = 'PDF',
            ))
        img_order.status = 'pending_review'
        db.commit()
        return {'status': 'received', 'type': 'imaging', 'order_id': order_id}

    # No matching order
    unmatched = UnmatchedResult(
        clinic_id   = clinic.id,
        source      = 'pdf_upload',
        raw_format  = 'PDF',
        parsed_data = {'order_id': order_id, 'source': payload.source},
    )
    db.add(unmatched)
    db.commit()
    return {'status': 'unmatched', 'unmatched_id': unmatched.id}


# ── DICOM Preview — On-Demand Stream ──────────────────────────────────────────

class DICOMPreviewPayload(BaseModel):
    order_id:    str
    preview_b64: str
    file_path:   str


@router.post('/dicom/preview')
def dicom_preview(payload: DICOMPreviewPayload, clinic: Clinic = Depends(get_clinic_by_key),
                  db: Session = Depends(get_db)):
    """Bridge agent posts preview when doctor requests DICOM view."""
    order = db.query(ImagingOrder).filter_by(order_id=payload.order_id, clinic_id=clinic.id).first()
    if not order:
        raise HTTPException(404, 'Imaging order not found')

    result = db.query(ImagingResult).filter_by(order_id=order.id).first()
    if result:
        # Store preview temporarily — expires after consultation
        result.pdf_b64 = payload.preview_b64   # reuse field for temp preview
        db.commit()

    # Notify connected doctor via in-memory event (simplified)
    return {'status': 'preview_ready', 'order_id': payload.order_id}


@router.post('/dicom/unavailable')
def dicom_unavailable(body: dict, clinic: Clinic = Depends(get_clinic_by_key)):
    """Bridge agent reports DICOM file not found on clinic PC."""
    return {'status': 'noted', 'order_id': body.get('order_id')}


# ── WebSocket — Bridge Agent Persistent Connection ────────────────────────────

# In-memory registry: clinic_id → WebSocket connection
_bridge_connections: dict[str, WebSocket] = {}


@router.websocket('/ws')
async def bridge_websocket(
    websocket: WebSocket,
    key:       str,
    clinic:    str,
    db:        Session = Depends(get_db),
):
    clinic_obj = db.query(Clinic).filter_by(id=int(clinic)).first()
    if not clinic_obj or getattr(clinic_obj, 'bridge_api_key', None) != key:
        await websocket.close(code=4003)
        return

    await websocket.accept()
    _bridge_connections[str(clinic)] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            msg  = json.loads(data)
            if msg.get('type') == 'pong':
                pass  # keepalive
    except WebSocketDisconnect:
        _bridge_connections.pop(str(clinic), None)


async def request_dicom_preview(clinic_id: str, order_id: str, file_path: str):
    """Called by provider portal when doctor wants to view DICOM images."""
    ws = _bridge_connections.get(str(clinic_id))
    if not ws:
        return False
    try:
        await ws.send_text(json.dumps({
            'type':      'dicom_preview_request',
            'order_id':  order_id,
            'file_path': file_path,
        }))
        return True
    except Exception:
        _bridge_connections.pop(str(clinic_id), None)
        return False
