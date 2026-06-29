"""Image helpers for durable profile photos / clinic logos.

Images are resized small and returned as base64 data-URIs so they can be stored
directly in the database (a TEXT column) and survive Render redeploys — unlike the
old ``/uploads`` disk approach, which is wiped on every deploy.
"""
import base64
import io

from PIL import Image

_MAX_INPUT_BYTES = 8 * 1024 * 1024   # reject anything over 8 MB before decoding


def process_image_bytes(raw: bytes, max_px: int = 256) -> str:
    """Resize raw image bytes to <= max_px on the long edge and return a compact
    base64 data-URI (JPEG, or PNG when the source has transparency).

    Raises ValueError on empty / oversized / unreadable input."""
    if not raw:
        raise ValueError("No image provided")
    if len(raw) > _MAX_INPUT_BYTES:
        raise ValueError("Image too large (max 8 MB)")
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
    except Exception:
        raise ValueError("Unsupported or corrupt image file")

    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    img.thumbnail((max_px, max_px))

    out = io.BytesIO()
    if has_alpha:
        img = img.convert("RGBA")
        img.save(out, format="PNG", optimize=True)
        mime = "image/png"
    else:
        img = img.convert("RGB")
        img.save(out, format="JPEG", quality=82, optimize=True)
        mime = "image/jpeg"
    b64 = base64.b64encode(out.getvalue()).decode("ascii")
    return f"data:{mime};base64,{b64}"


def process_image_data_uri(value: str, max_px: int = 256) -> str:
    """Same as :func:`process_image_bytes` but accepts a base64 string or a
    ``data:<mime>;base64,<...>`` URI (what the browser sends after a crop)."""
    if not value or not isinstance(value, str):
        raise ValueError("No image provided")
    payload = value
    if payload.startswith("data:"):
        if "," not in payload:
            raise ValueError("Malformed data URI")
        payload = payload.split(",", 1)[1]
    try:
        raw = base64.b64decode(payload, validate=True)
    except Exception:
        raise ValueError("Invalid base64 image data")
    return process_image_bytes(raw, max_px=max_px)
