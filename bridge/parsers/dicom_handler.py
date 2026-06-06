"""
DICOM handler — watches folder, extracts metadata, streams key frames on demand.
Compatible with: GE, Philips, Siemens, Canon, Mindray, Samsung (all DICOM-compliant devices)
Handles: CR, DX (X-ray), CT, MR, US (Ultrasound), NM, PT, MG, RF, OT
"""
import os
import io
import base64
from pathlib import Path
from typing import Optional
import pydicom
from pydicom.errors import InvalidDicomError
from PIL import Image, ImageEnhance


SUPPORTED_MODALITIES = {
    'CR': 'X-Ray (Computed Radiography)',
    'DX': 'X-Ray (Digital)',
    'CT': 'CT Scan',
    'MR': 'MRI',
    'US': 'Ultrasound',
    'NM': 'Nuclear Medicine',
    'PT': 'PET Scan',
    'MG': 'Mammography',
    'RF': 'Fluoroscopy',
    'XA': 'X-Ray Angiography',
    'OT': 'Other',
    'SC': 'Secondary Capture',
    'DOC': 'Document',
}


def extract_metadata(dicom_path: str) -> Optional[dict]:
    """Extract patient/study metadata from DICOM file without loading pixel data."""
    try:
        ds = pydicom.dcmread(dicom_path, stop_before_pixels=True)
        modality = getattr(ds, 'Modality', 'OT')
        return {
            'type':              'imaging_result',
            'format':            'DICOM',
            'modality':          modality,
            'modality_label':    SUPPORTED_MODALITIES.get(modality, modality),
            'order_id':          str(getattr(ds, 'AccessionNumber', '')).strip(),
            'patient_id':        str(getattr(ds, 'PatientID', '')).strip(),
            'patient_name':      str(getattr(ds, 'PatientName', '')).replace('^', ' ').strip(),
            'dob':               str(getattr(ds, 'PatientBirthDate', '')),
            'gender':            str(getattr(ds, 'PatientSex', '')),
            'study_date':        str(getattr(ds, 'StudyDate', '')),
            'study_time':        str(getattr(ds, 'StudyTime', '')),
            'study_description': str(getattr(ds, 'StudyDescription', '')),
            'series_description':str(getattr(ds, 'SeriesDescription', '')),
            'body_part':         str(getattr(ds, 'BodyPartExamined', '')),
            'institution':       str(getattr(ds, 'InstitutionName', '')),
            'referring_physician': str(getattr(ds, 'ReferringPhysicianName', '')).replace('^', ' ').strip(),
            'study_uid':         str(getattr(ds, 'StudyInstanceUID', '')),
            'series_uid':        str(getattr(ds, 'SeriesInstanceUID', '')),
            'instance_number':   int(getattr(ds, 'InstanceNumber', 0)),
            'series_number':     int(getattr(ds, 'SeriesNumber', 0)),
            'file_path':         str(dicom_path),
            'fhir_ready':        True,
        }
    except (InvalidDicomError, Exception) as e:
        return None


def extract_preview_image(dicom_path: str, max_width: int = 1024, quality: int = 75) -> Optional[str]:
    """
    Extract a preview JPG image from DICOM pixel data.
    Returns base64-encoded JPEG string.
    Applies window/level normalization for proper viewing.
    """
    try:
        ds = pydicom.dcmread(dicom_path)
        if not hasattr(ds, 'PixelData'):
            return None

        arr = ds.pixel_array

        # Apply rescale slope/intercept (Hounsfield units for CT)
        slope     = float(getattr(ds, 'RescaleSlope', 1))
        intercept = float(getattr(ds, 'RescaleIntercept', 0))
        arr       = arr * slope + intercept

        # Apply window/level for display
        wc = float(getattr(ds, 'WindowCenter', arr.mean()))
        ww = float(getattr(ds, 'WindowWidth',  arr.max() - arr.min()) or 1)
        if isinstance(wc, (list, tuple)): wc = wc[0]
        if isinstance(ww, (list, tuple)): ww = ww[0]

        lo = wc - ww / 2
        hi = wc + ww / 2
        arr = ((arr - lo) / (hi - lo) * 255).clip(0, 255).astype('uint8')

        # Handle multi-frame (take middle frame)
        if arr.ndim == 3 and arr.shape[0] > 1:
            arr = arr[arr.shape[0] // 2]
        elif arr.ndim == 3:
            arr = arr[0]

        img = Image.fromarray(arr)
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize if too large
        if img.width > max_width:
            ratio  = max_width / img.width
            img    = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)

        # Slight contrast enhancement
        img = ImageEnhance.Contrast(img).enhance(1.2)

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=quality)
        return base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception:
        return None


def scan_dicom_folder(folder: str) -> list[dict]:
    """Scan a folder for DICOM files, return list of metadata dicts."""
    results = []
    for f in Path(folder).rglob('*'):
        if f.suffix.lower() in ('.dcm', '.dicom') or f.suffix == '':
            meta = extract_metadata(str(f))
            if meta:
                results.append(meta)
    return results


def group_by_study(dicom_list: list[dict]) -> dict:
    """Group DICOM metadata by StudyInstanceUID."""
    studies = {}
    for d in dicom_list:
        uid = d.get('study_uid', 'unknown')
        if uid not in studies:
            studies[uid] = {'metadata': d, 'series': {}, 'file_count': 0}
        series_uid = d.get('series_uid', 'unknown')
        if series_uid not in studies[uid]['series']:
            studies[uid]['series'][series_uid] = []
        studies[uid]['series'][series_uid].append(d['file_path'])
        studies[uid]['file_count'] += 1
    return studies
