"""
HL7 v2.x parser — handles ORU^R01 (results), ORM^O01 (orders), ADT (demographics)
Compatible with: Beckman Coulter, Siemens, Abbott, Roche, and any HL7 v2.x LIS
"""
import hl7
from datetime import datetime
from typing import Optional


def parse_hl7_message(raw: str) -> Optional[dict]:
    """Parse any HL7 v2.x message and return normalised result dict."""
    try:
        raw = raw.replace('\n', '\r').strip()
        msg = hl7.parse(raw)
        msg_type = str(msg['MSH'][0][8][0])

        if 'ORU' in msg_type:
            return _parse_oru(msg)
        elif 'ORM' in msg_type:
            return _parse_orm(msg)
        elif 'ADT' in msg_type:
            return _parse_adt(msg)
        else:
            return {'type': 'unknown', 'raw': raw}
    except Exception as e:
        return {'type': 'error', 'error': str(e), 'raw': raw}


def _safe(segment, field, component=0, default=''):
    try:
        val = segment[field]
        if hasattr(val, '__getitem__') and component > 0:
            return str(val[component]).strip() or default
        return str(val).strip() or default
    except Exception:
        return default


def _parse_oru(msg) -> dict:
    """ORU^R01 — Observation Result (lab/imaging result from machine)"""
    pid = msg['PID'][0] if 'PID' in msg else None
    obr = msg['OBR'][0] if 'OBR' in msg else None

    patient_id   = _safe(pid, 3) if pid else ''
    patient_name = _safe(pid, 5, 1) if pid else ''
    dob          = _safe(pid, 7) if pid else ''
    gender       = _safe(pid, 8) if pid else ''
    abha_id      = _safe(pid, 19) if pid else ''   # PID-19 often used for national ID

    order_id     = _safe(obr, 3) if obr else ''    # Filler Order Number
    test_name    = _safe(obr, 4, 1) if obr else ''
    specimen     = _safe(obr, 15) if obr else ''
    collected_at = _safe(obr, 7) if obr else ''
    reported_at  = _safe(obr, 22) if obr else ''

    observations = []
    for segment in msg:
        if segment[0][0] == 'OBX':
            obs = {
                'value_type':  _safe(segment, 2),
                'identifier':  _safe(segment, 3, 1),
                'value':       _safe(segment, 5),
                'unit':        _safe(segment, 6, 1),
                'ref_range':   _safe(segment, 7),
                'flag':        _safe(segment, 8),   # H=high, L=low, N=normal, C=critical
                'status':      _safe(segment, 11),  # F=final, P=preliminary, C=corrected
                'method':      _safe(segment, 17, 1),
            }
            observations.append(obs)

    return {
        'type':         'lab_result',
        'format':       'HL7_ORU',
        'order_id':     order_id,
        'patient_id':   patient_id,
        'patient_name': patient_name,
        'dob':          dob,
        'gender':       gender,
        'abha_id':      abha_id,
        'test_name':    test_name,
        'specimen':     specimen,
        'collected_at': collected_at,
        'reported_at':  reported_at or datetime.now().isoformat(),
        'observations': observations,
        'fhir_ready':   True,
    }


def _parse_orm(msg) -> dict:
    """ORM^O01 — Order message"""
    pid = msg['PID'][0] if 'PID' in msg else None
    orc = msg['ORC'][0] if 'ORC' in msg else None
    return {
        'type':       'order',
        'format':     'HL7_ORM',
        'order_id':   _safe(orc, 3) if orc else '',
        'patient_id': _safe(pid, 3) if pid else '',
    }


def _parse_adt(msg) -> dict:
    """ADT — Patient demographics update"""
    pid = msg['PID'][0] if 'PID' in msg else None
    return {
        'type':         'demographics',
        'format':       'HL7_ADT',
        'patient_id':   _safe(pid, 3) if pid else '',
        'patient_name': _safe(pid, 5, 1) if pid else '',
        'abha_id':      _safe(pid, 19) if pid else '',
    }
