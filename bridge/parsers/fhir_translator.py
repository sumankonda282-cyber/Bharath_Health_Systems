"""
FHIR R4 translator — converts parsed HL7/ASTM/DICOM results to FHIR R4 resources.
Ready for ABDM/ABHA integration (NHA India health stack).
Produces: DiagnosticReport, Observation, ImagingStudy, Patient resources.
"""
from datetime import datetime
from typing import Optional


FHIR_FLAG_MAP = {
    'H': 'high', 'HH': 'critical-high',
    'L': 'low',  'LL': 'critical-low',
    'N': 'normal', 'A': 'abnormal',
    'C': 'critical',
}

FHIR_STATUS_MAP = {
    'F': 'final', 'P': 'preliminary',
    'C': 'corrected', 'X': 'cancelled',
    'R': 'registered', 'I': 'registered',
}


def to_fhir_diagnostic_report(parsed: dict, clinic_id: str, order_id: str) -> dict:
    """Convert parsed lab result to FHIR R4 DiagnosticReport."""
    observations = [
        _make_observation(obs, i, clinic_id, order_id)
        for i, obs in enumerate(parsed.get('observations', []))
    ]

    report = {
        'resourceType': 'DiagnosticReport',
        'id':           f'report-{order_id}',
        'status':       'preliminary',
        'category': [{
            'coding': [{
                'system':  'http://terminology.hl7.org/CodeSystem/v2-0074',
                'code':    'LAB',
                'display': 'Laboratory',
            }]
        }],
        'code': {
            'text': parsed.get('test_name', 'Laboratory Report'),
        },
        'subject': {
            'reference':   f'Patient/{parsed.get("patient_id", "")}',
            'display':      parsed.get('patient_name', ''),
            'identifier': [{
                'system': 'https://abha.abdm.gov.in',
                'value':   parsed.get('abha_id', ''),
            }] if parsed.get('abha_id') else [],
        },
        'effectiveDateTime': parsed.get('collected_at') or datetime.now().isoformat(),
        'issued':            parsed.get('reported_at')  or datetime.now().isoformat(),
        'performer': [{'display': clinic_id}],
        'result': [
            {'reference': f'Observation/obs-{order_id}-{i}'}
            for i in range(len(observations))
        ],
        'extension': [{
            'url':         'https://bharatcliniq.com/fhir/ext/order-id',
            'valueString': order_id,
        }],
    }

    return {'report': report, 'observations': observations}


def _make_observation(obs: dict, index: int, clinic_id: str, order_id: str) -> dict:
    flag      = obs.get('flag', 'N')
    status_raw = obs.get('status', 'F')

    interpretation = []
    if flag and flag != 'N':
        interpretation = [{
            'coding': [{
                'system':  'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                'code':    flag,
                'display': FHIR_FLAG_MAP.get(flag, flag),
            }]
        }]

    obs_resource = {
        'resourceType':  'Observation',
        'id':            f'obs-{order_id}-{index}',
        'status':        FHIR_STATUS_MAP.get(status_raw, 'final'),
        'code':          {'text': obs.get('test_name') or obs.get('identifier', '')},
        'subject':       {'reference': f'Patient/'},
        'effectiveDateTime': datetime.now().isoformat(),
        'performer':     [{'display': clinic_id}],
    }

    # Add value
    value = obs.get('value', '')
    unit  = obs.get('unit', '')
    try:
        numeric = float(value)
        obs_resource['valueQuantity'] = {
            'value':  numeric,
            'unit':   unit,
            'system': 'http://unitsofmeasure.org',
        }
    except (ValueError, TypeError):
        obs_resource['valueString'] = str(value)

    # Reference range
    ref = obs.get('ref_range', '')
    if ref:
        obs_resource['referenceRange'] = [{'text': ref}]

    if interpretation:
        obs_resource['interpretation'] = interpretation

    return obs_resource


def to_fhir_imaging_study(parsed: dict, clinic_id: str, order_id: str) -> dict:
    """Convert DICOM metadata to FHIR R4 ImagingStudy."""
    modality_code = parsed.get('modality', 'OT')
    return {
        'resourceType': 'ImagingStudy',
        'id':           f'imaging-{order_id}',
        'status':       'available',
        'subject': {
            'reference': f'Patient/{parsed.get("patient_id", "")}',
            'display':    parsed.get('patient_name', ''),
        },
        'started':      parsed.get('study_date', datetime.now().isoformat()),
        'numberOfSeries':   1,
        'numberOfInstances': 1,
        'description':  parsed.get('study_description', ''),
        'series': [{
            'uid':       parsed.get('series_uid', ''),
            'number':    parsed.get('series_number', 1),
            'modality': {
                'system': 'http://dicom.nema.org/resources/ontology/DCM',
                'code':    modality_code,
            },
            'description': parsed.get('series_description', ''),
            'bodySite':    {'display': parsed.get('body_part', '')},
            'instance': [{
                'uid':    parsed.get('study_uid', ''),
                'sopClass': {'system': 'urn:ietf:rfc:3986', 'code': ''},
                'number': parsed.get('instance_number', 1),
            }],
        }],
        'extension': [{
            'url':         'https://bharatcliniq.com/fhir/ext/order-id',
            'valueString': order_id,
        }],
    }


def to_fhir_patient(parsed: dict) -> dict:
    """Build FHIR R4 Patient resource from parsed message."""
    patient = {
        'resourceType': 'Patient',
        'id':           parsed.get('patient_id', ''),
        'name': [{'text': parsed.get('patient_name', '')}],
        'gender': {'M': 'male', 'F': 'female', 'O': 'other'}.get(
            parsed.get('gender', '').upper(), 'unknown'
        ),
        'identifier': [],
    }

    if parsed.get('dob'):
        patient['birthDate'] = parsed['dob']

    if parsed.get('abha_id'):
        patient['identifier'].append({
            'system': 'https://abha.abdm.gov.in',
            'value':   parsed['abha_id'],
            'type': {
                'coding': [{
                    'system':  'http://terminology.hl7.org/CodeSystem/v2-0203',
                    'code':    'ABHA',
                    'display': 'Ayushman Bharat Health Account ID',
                }]
            },
        })

    return patient
