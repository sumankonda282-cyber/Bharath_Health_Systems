"""
System tray icon for BHaratCliniq Bridge Agent.
Shows connection status, allows opening config, viewing log, and exit.
"""
import threading
import subprocess
import sys
from pathlib import Path

try:
    import pystray
    from PIL import Image
    TRAY_AVAILABLE = True
except ImportError:
    TRAY_AVAILABLE = False


def _load_icon_image():
    """Load icon from file or generate a fallback programmatically."""
    try:
        icon_path = Path(__file__).parent / 'icon.ico'
        if icon_path.exists():
            return Image.open(str(icon_path)).resize((64, 64))
    except Exception:
        pass

    # Fallback: draw a simple colored square with PIL
    from PIL import ImageDraw
    img = Image.new('RGB', (64, 64), color='#0F2557')
    draw = ImageDraw.Draw(img)
    draw.rectangle([8, 8, 56, 56], outline='white', width=2)
    draw.text((20, 22), 'BH', fill='white')
    return img


class BridgeTrayIcon:
    def __init__(self, bridge_agent_ref=None):
        self._agent = bridge_agent_ref
        self._icon = None
        self._status = 'Starting...'

    def _open_config(self, icon=None, item=None):
        """Open the config UI in a subprocess so it doesn't block the tray."""
        try:
            exe = sys.executable
            main_py = str(Path(__file__).parent.parent / 'main.py')
            subprocess.Popen([exe, main_py, '--config'])
        except Exception as e:
            pass

    def _open_log(self, icon=None, item=None):
        import os
        log_path = Path(os.environ.get('APPDATA', '.')) / 'BHaratCliniq' / 'bridge.log'
        try:
            os.startfile(str(log_path))
        except Exception:
            subprocess.Popen(['notepad', str(log_path)])

    def _exit_agent(self, icon, item):
        icon.stop()
        sys.exit(0)

    def set_status(self, status: str):
        self._status = status
        if self._icon:
            self._icon.title = f'BHaratCliniq Bridge — {status}'

    def _build_menu(self):
        return pystray.Menu(
            pystray.MenuItem(f'Status: {self._status}', None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Open Configuration', self._open_config),
            pystray.MenuItem('View Log File', self._open_log),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('Exit Bridge Agent', self._exit_agent),
        )

    def run(self):
        if not TRAY_AVAILABLE:
            return  # No tray support, run headless

        img = _load_icon_image()
        self._icon = pystray.Icon(
            name='bharatcliniq_bridge',
            icon=img,
            title='BHaratCliniq Bridge — Running',
            menu=self._build_menu(),
        )
        # Run tray in background thread so it doesn't block the agent
        t = threading.Thread(target=self._icon.run, daemon=True)
        t.start()

    def stop(self):
        if self._icon:
            self._icon.stop()
