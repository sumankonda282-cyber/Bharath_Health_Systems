// Master Field Registry
// Every canonical clinical field lives here.
// field_id is permanent — never change it after any submission uses it.
// label, unit, placeholder, reference_range can be updated freely.

export const FIELD_REGISTRY = [
  // ── Hemodynamics ──────────────────────────────────────────────────────────
  {
    field_id: 'bp_site',
    label: 'BP Site',
    type: 'dropdown',
    col_span: 2,
    options: [
      { label: 'Left Arm',  value: 'left_arm' },
      { label: 'Right Arm', value: 'right_arm' },
      { label: 'Left Leg',  value: 'left_leg' },
      { label: 'Right Leg', value: 'right_leg' },
      { label: 'Wrist',     value: 'wrist' },
    ],
    default_value: 'left_arm',
    tags: ['vitals', 'hemodynamics', 'bp'],
  },
  {
    field_id: 'bp_systolic',
    label: 'Systolic BP',
    type: 'number',
    unit: 'mmHg',
    col_span: 1,
    min: 40, max: 300,
    placeholder: '90–140',
    reference_range: { normal_low: 90, normal_high: 140, critical_low: 70, critical_high: 180 },
    tags: ['vitals', 'hemodynamics', 'bp'],
  },
  {
    field_id: 'bp_diastolic',
    label: 'Diastolic BP',
    type: 'number',
    unit: 'mmHg',
    col_span: 1,
    min: 20, max: 200,
    placeholder: '60–90',
    reference_range: { normal_low: 60, normal_high: 90, critical_low: 40, critical_high: 120 },
    tags: ['vitals', 'hemodynamics', 'bp'],
  },
  {
    field_id: 'heart_rate',
    label: 'Heart Rate',
    type: 'number',
    unit: '/min',
    col_span: 1,
    min: 20, max: 300,
    placeholder: '60–100',
    reference_range: { normal_low: 60, normal_high: 100, critical_low: 40, critical_high: 150 },
    tags: ['vitals', 'hemodynamics', 'pulse'],
  },
  {
    field_id: 'pulse_rhythm',
    label: 'Pulse Rhythm',
    type: 'dropdown',
    col_span: 1,
    options: [
      { label: 'Regular',                value: 'regular' },
      { label: 'Irregular',              value: 'irregular' },
      { label: 'Regularly Irregular',    value: 'regularly_irregular' },
      { label: 'Irregularly Irregular',  value: 'irregularly_irregular' },
    ],
    tags: ['vitals', 'hemodynamics', 'pulse'],
  },
  {
    field_id: 'spo2',
    label: 'SpO₂',
    type: 'number',
    unit: '%',
    col_span: 1,
    min: 50, max: 100,
    placeholder: '95–100',
    reference_range: { normal_low: 95, normal_high: 100, critical_low: 88 },
    tags: ['vitals', 'respiratory', 'oxygen'],
  },
  {
    field_id: 'respiratory_rate',
    label: 'Respiratory Rate',
    type: 'number',
    unit: '/min',
    col_span: 1,
    min: 5, max: 60,
    placeholder: '12–20',
    reference_range: { normal_low: 12, normal_high: 20, critical_low: 8, critical_high: 30 },
    tags: ['vitals', 'respiratory'],
  },
  {
    field_id: 'mean_arterial_pressure',
    label: 'Mean Arterial Pressure',
    type: 'calculated',
    col_span: 2,
    formula: '({bp_diastolic} * 2 + {bp_systolic}) / 3',
    unit: 'mmHg',
    tags: ['vitals', 'hemodynamics', 'calculated'],
  },

  // ── Temperature ───────────────────────────────────────────────────────────
  {
    field_id: 'temp_site',
    label: 'Temp Site',
    type: 'dropdown',
    col_span: 2,
    options: [
      { label: 'Oral',      value: 'oral' },
      { label: 'Axillary',  value: 'axillary' },
      { label: 'Rectal',    value: 'rectal' },
      { label: 'Tympanic',  value: 'tympanic' },
      { label: 'Temporal',  value: 'temporal' },
    ],
    default_value: 'oral',
    tags: ['vitals', 'temperature'],
  },
  {
    field_id: 'temperature',
    label: 'Temperature',
    type: 'number',
    unit: '°C',
    col_span: 1,
    min: 30, max: 43,
    step: 0.1,
    placeholder: '36.1–37.2',
    reference_range: { normal_low: 36.1, normal_high: 37.2, critical_low: 35, critical_high: 39.5 },
    tags: ['vitals', 'temperature'],
  },

  // ── Anthropometrics ───────────────────────────────────────────────────────
  {
    field_id: 'weight',
    label: 'Weight',
    type: 'number',
    unit: 'kg',
    col_span: 1,
    min: 0.5, max: 500,
    step: 0.1,
    placeholder: 'kg',
    tags: ['vitals', 'anthropometrics'],
  },
  {
    field_id: 'height',
    label: 'Height',
    type: 'number',
    unit: 'cm',
    col_span: 1,
    min: 30, max: 250,
    step: 0.1,
    placeholder: 'cm',
    tags: ['vitals', 'anthropometrics'],
  },
  {
    field_id: 'bmi',
    label: 'BMI',
    type: 'calculated',
    col_span: 2,
    formula: '{weight} / (({height} / 100) * ({height} / 100))',
    unit: 'kg/m²',
    tags: ['vitals', 'anthropometrics', 'calculated'],
  },
  {
    field_id: 'head_circumference',
    label: 'Head Circumference',
    type: 'number',
    unit: 'cm',
    col_span: 1,
    min: 20, max: 80,
    step: 0.1,
    placeholder: 'cm',
    tags: ['vitals', 'anthropometrics', 'paediatric'],
  },
  {
    field_id: 'waist_circumference',
    label: 'Waist Circumference',
    type: 'number',
    unit: 'cm',
    col_span: 1,
    min: 20, max: 250,
    step: 0.1,
    tags: ['vitals', 'anthropometrics'],
  },

  // ── Metabolic ─────────────────────────────────────────────────────────────
  {
    field_id: 'glucose_timing',
    label: 'Glucose Timing',
    type: 'dropdown',
    col_span: 2,
    options: [
      { label: 'Fasting',              value: 'fasting' },
      { label: 'Random',               value: 'random' },
      { label: 'Post-Prandial (1 h)',  value: 'pp_1h' },
      { label: 'Post-Prandial (2 h)',  value: 'pp_2h' },
      { label: 'Pre-Meal',             value: 'pre_meal' },
    ],
    tags: ['vitals', 'metabolic', 'glucose'],
  },
  {
    field_id: 'blood_glucose',
    label: 'Blood Glucose',
    type: 'number',
    unit: 'mg/dL',
    col_span: 1,
    min: 20, max: 600,
    placeholder: '70–140',
    reference_range: { normal_low: 70, normal_high: 140, critical_low: 54, critical_high: 400 },
    tags: ['vitals', 'metabolic', 'glucose'],
  },

  // ── Pain ──────────────────────────────────────────────────────────────────
  {
    field_id: 'pain_score',
    label: 'Pain Score',
    type: 'scale',
    col_span: 4,
    min: 0, max: 10,
    left_label: 'No Pain', right_label: 'Worst Pain', scale_style: 'nrs',
    tags: ['vitals', 'pain', 'subjective'],
  },
  {
    field_id: 'pain_location',
    label: 'Pain Location',
    type: 'body_site_search',
    search_category: 'anatomy',
    col_span: 4,
    placeholder: 'Search body site…',
    conditions: [{ field_id: 'pain_score', operator: 'greater_than', value: '0' }],
    tags: ['vitals', 'pain', 'subjective'],
  },

  // ── Chief Complaint ───────────────────────────────────────────────────────
  {
    field_id: 'chief_complaint',
    label: 'Chief Complaint',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    placeholder: "Patient's primary presenting complaint in their own words…",
    required: true,
    tags: ['subjective', 'complaint'],
  },
  {
    field_id: 'complaint_duration',
    label: 'Duration',
    type: 'text',
    col_span: 1,
    placeholder: 'e.g. 3 days',
    tags: ['subjective', 'complaint'],
  },
  {
    field_id: 'complaint_onset',
    label: 'Onset',
    type: 'dropdown',
    col_span: 1,
    options: [
      { label: 'Sudden',   value: 'sudden' },
      { label: 'Gradual',  value: 'gradual' },
      { label: 'Episodic', value: 'episodic' },
    ],
    tags: ['subjective', 'complaint'],
  },

  // ── History ───────────────────────────────────────────────────────────────
  {
    field_id: 'past_medical_history',
    label: 'Past Medical History',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['history', 'subjective'],
  },
  {
    field_id: 'family_history',
    label: 'Family History',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['history', 'subjective'],
  },
  {
    field_id: 'social_history',
    label: 'Social History',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['history', 'subjective'],
  },
  {
    field_id: 'occupational_history',
    label: 'Occupational History',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['history', 'subjective'],
  },
  {
    field_id: 'surgical_history',
    label: 'Surgical History',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['history', 'subjective'],
  },
  {
    field_id: 'obstetric_history',
    label: 'Obstetric History',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['history', 'subjective', 'gynaecology'],
  },

  // ── Allergies & Medications ───────────────────────────────────────────────
  {
    field_id: 'known_allergies',
    label: 'Known Allergies',
    type: 'allergy_search',
    col_span: 4,
    tags: ['history', 'allergy'],
  },
  {
    field_id: 'current_medications',
    label: 'Current Medications',
    type: 'medication_search',
    col_span: 4,
    tags: ['history', 'medications'],
  },

  // ── Examination ───────────────────────────────────────────────────────────
  {
    field_id: 'general_appearance',
    label: 'General Appearance',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    placeholder: 'e.g. Well-built, well-nourished, not in acute distress…',
    tags: ['examination', 'objective'],
  },
  {
    field_id: 'consciousness_level',
    label: 'Level of Consciousness',
    type: 'dropdown',
    col_span: 2,
    options: [
      { label: 'Alert',    value: 'alert' },
      { label: 'Verbal',   value: 'verbal' },
      { label: 'Pain',     value: 'pain' },
      { label: 'Unresponsive', value: 'unresponsive' },
    ],
    tags: ['examination', 'objective', 'neuro'],
  },
  {
    field_id: 'pallor',
    label: 'Pallor',
    type: 'yes_no',
    col_span: 1,
    tags: ['examination', 'objective'],
  },
  {
    field_id: 'icterus',
    label: 'Icterus',
    type: 'yes_no',
    col_span: 1,
    tags: ['examination', 'objective'],
  },
  {
    field_id: 'cyanosis',
    label: 'Cyanosis',
    type: 'yes_no',
    col_span: 1,
    tags: ['examination', 'objective'],
  },
  {
    field_id: 'oedema',
    label: 'Oedema',
    type: 'yes_no',
    col_span: 1,
    tags: ['examination', 'objective'],
  },
  {
    field_id: 'lymphadenopathy',
    label: 'Lymphadenopathy',
    type: 'yes_no',
    col_span: 1,
    tags: ['examination', 'objective'],
  },
  {
    field_id: 'clubbing',
    label: 'Clubbing',
    type: 'yes_no',
    col_span: 1,
    tags: ['examination', 'objective'],
  },

  // ── Assessment / Plan ─────────────────────────────────────────────────────
  {
    field_id: 'clinical_impression',
    label: 'Clinical Impression',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    required: true,
    tags: ['assessment', 'impression'],
  },
  {
    field_id: 'diagnosis_primary',
    label: 'Primary Diagnosis',
    type: 'diagnosis_search',
    col_span: 4,
    tags: ['assessment', 'diagnosis'],
  },
  {
    field_id: 'diagnosis_secondary',
    label: 'Secondary Diagnosis',
    type: 'diagnosis_search',
    col_span: 4,
    tags: ['assessment', 'diagnosis'],
  },
  {
    field_id: 'management_plan',
    label: 'Management Plan',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['plan'],
  },
  {
    field_id: 'follow_up_date',
    label: 'Follow-up Date',
    type: 'date',
    col_span: 1,
    tags: ['plan', 'followup'],
  },
  {
    field_id: 'follow_up_instructions',
    label: 'Follow-up Instructions',
    type: 'textarea',
    col_span: 4,
    enable_dictation: true,
    tags: ['plan', 'followup'],
  },

  // ── Presenting-complaint qualifiers (seeded: Adult OPD History) ─────────────
  {
    field_id: 'complaint_severity', label: 'Severity', type: 'dropdown', col_span: 1,
    options: [
      { label: 'Mild', value: 'mild' }, { label: 'Moderate', value: 'moderate' }, { label: 'Severe', value: 'severe' },
    ],
    clinical_code: { system: 'SNOMED', code: '246112005', display: 'Severity' },
    tags: ['subjective', 'complaint'],
  },
  {
    field_id: 'complaint_timing', label: 'Timing', type: 'dropdown', col_span: 1,
    options: [
      { label: 'Constant', value: 'constant' }, { label: 'Intermittent', value: 'intermittent' },
      { label: 'Worse in morning', value: 'morning' }, { label: 'Worse at night', value: 'night' },
      { label: 'After meals', value: 'post_meal' }, { label: 'With activity', value: 'exertional' },
    ],
    tags: ['subjective', 'complaint'],
  },
  {
    field_id: 'hpi_narrative', label: 'History of Presenting Illness', type: 'textarea',
    col_span: 4, enable_dictation: true,
    clinical_code: { system: 'LOINC', code: '10164-2', display: 'History of Present illness Narrative' },
    tags: ['subjective', 'complaint', 'hpi'],
  },

  // ── Review of Systems gates (seeded: Adult OPD History) ─────────────────────
  // Each system: a yes_no gate + a revealed detail narrative. LOINC 10187-3 is the
  // Review-of-Systems narrative concept; the per-system detail shares the family.
  ...['cardiac', 'respiratory', 'gi', 'neuro', 'gu', 'msk'].flatMap(sys => {
    const labelMap = {
      cardiac: 'Cardiovascular', respiratory: 'Respiratory', gi: 'Gastrointestinal',
      neuro: 'Neurological', gu: 'Genitourinary', msk: 'Musculoskeletal',
    }
    const L = labelMap[sys]
    return [
      { field_id: `ros_${sys}`, label: `ROS — ${L}`, type: 'yes_no', col_span: 2,
        clinical_code: { system: 'LOINC', code: '10187-3', display: 'Review of systems Narrative' },
        tags: ['subjective', 'ros', sys] },
      { field_id: `ros_${sys}_detail`, label: `ROS — ${L} detail`, type: 'textarea', col_span: 4,
        enable_dictation: true, tags: ['subjective', 'ros', sys] },
    ]
  }),

  // ── Examination: hydration + systemic exam gates (seeded: Adult OPD Examination)
  {
    field_id: 'hydration', label: 'Hydration', type: 'dropdown', col_span: 2,
    options: [
      { label: 'Adequate', value: 'adequate' }, { label: 'Mild dehydration', value: 'mild' },
      { label: 'Moderate dehydration', value: 'moderate' }, { label: 'Severe dehydration', value: 'severe' },
    ],
    clinical_code: { system: 'SNOMED', code: '34095006', display: 'Dehydration' },
    tags: ['examination', 'objective'],
  },
  // Per-system exam gate + findings + note. SNOMED body-system codes on the gate.
  ...[
    { sys: 'cvs',  L: 'Cardiovascular (CVS)',           code: '113257007', disp: 'Cardiovascular system structure' },
    { sys: 'resp', L: 'Respiratory (RS)',               code: '20139000',  disp: 'Respiratory system structure' },
    { sys: 'abdo', L: 'Abdomen (P/A)',                  code: '113345001', disp: 'Abdominal structure' },
    { sys: 'cns',  L: 'Central Nervous System (CNS)',   code: '25087005',  disp: 'Nervous system structure' },
  ].flatMap(({ sys, L, code, disp }) => [
    { field_id: `${sys}_exam`, label: `${L} exam`, type: 'single_choice', col_span: 2,
      options: [{ label: 'Normal', value: 'normal' }, { label: 'Abnormal', value: 'abnormal' }],
      clinical_code: { system: 'SNOMED', code, display: disp }, tags: ['examination', 'objective', sys] },
    { field_id: `${sys}_findings`, label: `${L} findings`, type: 'dropdown', col_span: 2,
      searchable: true, multi_select: true, tags: ['examination', 'objective', sys] },
    { field_id: `${sys}_note`, label: `${L} note`, type: 'textarea', col_span: 4,
      enable_dictation: true, tags: ['examination', 'objective', sys] },
  ]),
  {
    field_id: 'local_examination', label: 'Local Examination', type: 'textarea',
    col_span: 4, enable_dictation: true,
    clinical_code: { system: 'LOINC', code: '29545-1', display: 'Physical findings' },
    tags: ['examination', 'objective'],
  },
]

// Build lookup maps for fast access
export const REGISTRY_BY_ID = Object.fromEntries(FIELD_REGISTRY.map(f => [f.field_id, f]))

// Search by label or field_id (case-insensitive)
export function searchRegistry(query) {
  if (!query || query.trim() === '') return FIELD_REGISTRY
  const q = query.trim().toLowerCase()
  return FIELD_REGISTRY.filter(f =>
    f.field_id.includes(q) ||
    f.label.toLowerCase().includes(q) ||
    (f.tags || []).some(t => t.includes(q))
  )
}
