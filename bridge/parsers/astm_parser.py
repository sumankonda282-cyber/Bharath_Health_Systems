"""
ASTM LIS02-A2 parser — handles E1394 / LIS02 format
Compatible with: Sysmex, Mindray, Horiba, Dirui, most Asian haematology/biochemistry analysers
"""
import re
from datetime import datetime
from typing import Optional


# ASTM record type identifiers
RECORD_TYPES = {
    'H': 'header',
    'P': 'patient',
    'O': 'order',
    'R': 'result',
    'L': 'terminator',
    'C': 'comment',
    'Q': 'query',
    'M': 'manufacturer',
}


def parse_astm_message(raw: str) -> Optional[dict]:
    """
    Parse ASTM LIS02-A2 message.
    Input can be raw serial bytes or text with STX/ETX framing stripped.
    """
    try:
        # Strip framing characters (STX=0x02, ETX=0x03, ACK=0x06)
        raw = re.sub(r'[\x02\x03\x06\x04\x05\x17\r]', '', raw)
        lines = [l.strip() for l in raw.split('\n') if l.strip()]

        records = {'header': None, 'patient': None, 'orders': [], 'results': []}

        for line in lines:
            fields = line.split('|')
            if not fields:
                continue
            rtype = fields[0][1:2] if len(fields[0]) > 1 else fields[0][:1]

            if rtype == 'H':
                records['header'] = _parse_header(fields)
            elif rtype == 'P':
                records['patient'] = _parse_patient(fields)
            elif rtype == 'O':
                records['orders'].append(_parse_order(fields))
            elif rtype == 'R':
                records['results'].append(_parse_result(fields))

        return _consolidate(records)
    except Exception as e:
        return {'type': 'error', 'format': 'ASTM', 'error': str(e), 'raw': raw}


def _safe_field(fields, idx, default=''):
    try:
        return fields[idx].strip() if idx < len(fields) else default
    except Exception:
        return default


def _parse_header(fields) -> dict:
    return {
        'sender':        _safe_field(fields, 4),
        'processing_id': _safe_field(fields, 11),
        'timestamp':     _safe_field(fields, 13),
    }


def _parse_patient(fields) -> dict:
    name_raw = _safe_field(fields, 4)
    # ASTM name format: LastName^FirstName or FirstName LastName
    name_parts = name_raw.replace('^', ' ').split()
    full_name = ' '.join(name_parts)

    return {
        'patient_id':   _safe_field(fields, 3),
        'patient_name': full_name,
        'dob':          _safe_field(fields, 7),
        'gender':       _safe_field(fields, 8),
        'abha_id':      _safe_field(fields, 10),  # Practice-assigned ID, may carry ABHA
    }


def _parse_order(fields) -> dict:
    return {
        'order_id':    _safe_field(fields, 3),
        'test_code':   _safe_field(fields, 4),
        'priority':    _safe_field(fields, 12),
        'ordered_at':  _safe_field(fields, 7),
        'specimen':    _safe_field(fields, 15),
    }


def _parse_result(fields) -> dict:
    value_raw   = _safe_field(fields, 3)
    units       = _safe_field(fields, 4)
    ref_range   = _safe_field(fields, 5)
    flag        = _safe_field(fields, 6)   # H, L, LL, HH, N, A (abnormal)
    result_stat = _safe_field(fields, 8)   # F=final, P=preliminary, C=corrected, X=cannot
    test_id     = _safe_field(fields, 2)
    test_name   = _safe_field(fields, 2).split('^')[-1] if '^' in _safe_field(fields, 2) else _safe_field(fields, 2)

    return {
        'test_id':    test_id,
        'test_name':  test_name,
        'value':      value_raw,
        'unit':       units,
        'ref_range':  ref_range,
        'flag':       flag,
        'status':     result_stat,
        'method':     _safe_field(fields, 10),
        'completed':  _safe_field(fields, 12),
    }


def _consolidate(records) -> dict:
    patient  = records['patient'] or {}
    order    = records['orders'][0] if records['orders'] else {}
    results  = records['results']

    return {
        'type':         'lab_result',
        'format':       'ASTM_LIS02',
        'order_id':     order.get('order_id', ''),
        'patient_id':   patient.get('patient_id', ''),
        'patient_name': patient.get('patient_name', ''),
        'dob':          patient.get('dob', ''),
        'gender':       patient.get('gender', ''),
        'abha_id':      patient.get('abha_id', ''),
        'test_name':    order.get('test_code', ''),
        'specimen':     order.get('specimen', ''),
        'collected_at': order.get('ordered_at', ''),
        'reported_at':  datetime.now().isoformat(),
        'observations': results,
        'fhir_ready':   True,
    }
