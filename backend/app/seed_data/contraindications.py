"""
Drug-diagnosis contraindications — used by CDS engine for safety alerts.
Each entry: {generic, icd10_prefix, condition, severity, reason}
icd10_prefix matched with startswith() against the patient's diagnoses.
severity: contraindicated | serious | moderate
"""

CONTRAINDICATIONS = [
    # ── NSAIDs / Analgesics ───────────────────────────────────────────────────
    {"generic": "Ibuprofen", "icd10_prefix": "N18", "condition": "Chronic Kidney Disease",
     "severity": "contraindicated", "reason": "NSAIDs reduce renal perfusion; worsen CKD and can precipitate AKI"},
    {"generic": "Diclofenac", "icd10_prefix": "N18", "condition": "Chronic Kidney Disease",
     "severity": "contraindicated", "reason": "NSAIDs contraindicated in CKD; use paracetamol"},
    {"generic": "Ibuprofen", "icd10_prefix": "K25", "condition": "Peptic Ulcer Disease",
     "severity": "contraindicated", "reason": "NSAIDs inhibit prostaglandins → gastric mucosal damage → ulcer bleeding"},
    {"generic": "Diclofenac", "icd10_prefix": "K25", "condition": "Peptic Ulcer Disease",
     "severity": "contraindicated", "reason": "NSAIDs worsen peptic ulcers; use paracetamol ± PPI"},
    {"generic": "Ibuprofen", "icd10_prefix": "K26", "condition": "Duodenal Ulcer",
     "severity": "contraindicated", "reason": "NSAIDs worsen duodenal ulcer; risk of perforation and haemorrhage"},
    {"generic": "Aspirin", "icd10_prefix": "K25", "condition": "Peptic Ulcer Disease",
     "severity": "serious", "reason": "Aspirin (even low dose) can worsen peptic ulcer; co-prescribe PPI"},
    {"generic": "Ibuprofen", "icd10_prefix": "I50", "condition": "Heart Failure",
     "severity": "contraindicated", "reason": "NSAIDs cause fluid retention and reduce effectiveness of diuretics; worsen heart failure"},
    {"generic": "Diclofenac", "icd10_prefix": "I50", "condition": "Heart Failure",
     "severity": "contraindicated", "reason": "NSAIDs worsen cardiac decompensation"},
    {"generic": "Ibuprofen", "icd10_prefix": "I21", "condition": "Post-Myocardial Infarction",
     "severity": "serious", "reason": "NSAIDs associated with increased cardiovascular risk post-MI; avoid in first 4-6 weeks"},
    {"generic": "Aspirin", "icd10_prefix": "J45", "condition": "Aspirin-exacerbated Asthma",
     "severity": "serious", "reason": "Aspirin can trigger bronchoconstriction in sensitive asthmatic patients (Samter triad)"},
    {"generic": "Ibuprofen", "icd10_prefix": "J45", "condition": "Asthma (NSAID-sensitive)",
     "severity": "serious", "reason": "NSAIDs can trigger bronchospasm in aspirin-sensitive asthma"},

    # ── ACE Inhibitors / ARBs ─────────────────────────────────────────────────
    {"generic": "Enalapril", "icd10_prefix": "N18", "condition": "Severe Chronic Kidney Disease (eGFR<30)",
     "severity": "serious", "reason": "ACE inhibitors can worsen renal function in severe CKD; monitor eGFR and K+"},
    {"generic": "Ramipril", "icd10_prefix": "N18", "condition": "Severe Chronic Kidney Disease",
     "severity": "serious", "reason": "Risk of hyperkalaemia and acute kidney injury; careful dose adjustment required"},
    {"generic": "Losartan", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "contraindicated", "reason": "ARBs cause fetal renal toxicity and oligohydramnios; absolutely contraindicated in pregnancy"},
    {"generic": "Enalapril", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "contraindicated", "reason": "ACE inhibitors contraindicated in pregnancy; cause fetal death and malformations"},
    {"generic": "Ramipril", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "contraindicated", "reason": "ACE inhibitors contraindicated in all trimesters; switch to labetalol/nifedipine"},

    # ── Beta Blockers ─────────────────────────────────────────────────────────
    {"generic": "Atenolol", "icd10_prefix": "J45", "condition": "Bronchial Asthma",
     "severity": "contraindicated", "reason": "Non-selective beta blockers cause bronchospasm in asthma; use cardioselective alternative cautiously"},
    {"generic": "Metoprolol", "icd10_prefix": "J45", "condition": "Severe Asthma",
     "severity": "serious", "reason": "Beta blockers can worsen bronchospasm even cardioselective ones in severe asthma"},
    {"generic": "Atenolol", "icd10_prefix": "J44", "condition": "Severe COPD",
     "severity": "serious", "reason": "Beta blockers may worsen bronchospasm in COPD"},
    {"generic": "Atenolol", "icd10_prefix": "I48", "condition": "Bradycardia / Heart Block",
     "severity": "contraindicated", "reason": "Beta blockers contraindicated in significant bradycardia or second/third degree AV block"},
    {"generic": "Metoprolol", "icd10_prefix": "E16", "condition": "Hypoglycaemia (in Diabetic Patients)",
     "severity": "serious", "reason": "Beta blockers mask tachycardia (hypoglycaemia warning sign); prolonged hypoglycaemia risk"},

    # ── Metformin ─────────────────────────────────────────────────────────────
    {"generic": "Metformin", "icd10_prefix": "N18", "condition": "Severe Kidney Disease (eGFR<30)",
     "severity": "contraindicated", "reason": "Risk of potentially fatal lactic acidosis; contraindicated when eGFR <30; hold before IV contrast"},
    {"generic": "Metformin", "icd10_prefix": "K70", "condition": "Severe Hepatic Failure",
     "severity": "contraindicated", "reason": "Hepatic impairment impairs lactate metabolism → lactic acidosis risk"},
    {"generic": "Metformin", "icd10_prefix": "K74", "condition": "Liver Cirrhosis",
     "severity": "contraindicated", "reason": "Cirrhosis increases lactic acidosis risk; avoid metformin"},

    # ── Statins ───────────────────────────────────────────────────────────────
    {"generic": "Atorvastatin", "icd10_prefix": "K70", "condition": "Active Liver Disease",
     "severity": "contraindicated", "reason": "Statins contraindicated in active hepatic disease or unexplained persistent transaminase elevation"},
    {"generic": "Rosuvastatin", "icd10_prefix": "K70", "condition": "Active Liver Disease",
     "severity": "contraindicated", "reason": "Contraindicated in active hepatic disease"},
    {"generic": "Atorvastatin", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "contraindicated", "reason": "Statins are teratogenic; absolutely contraindicated in pregnancy and breastfeeding"},
    {"generic": "Rosuvastatin", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "contraindicated", "reason": "Teratogenic; contraindicated in pregnancy"},

    # ── Warfarin / Anticoagulants ─────────────────────────────────────────────
    {"generic": "Warfarin", "icd10_prefix": "I61", "condition": "Haemorrhagic Stroke (Acute)",
     "severity": "contraindicated", "reason": "Anticoagulation contraindicated in acute haemorrhagic stroke; increases bleeding and brain injury"},
    {"generic": "Warfarin", "icd10_prefix": "K92", "condition": "Active GI Bleeding",
     "severity": "contraindicated", "reason": "Anticoagulation worsens active GI haemorrhage"},

    # ── Hormones / Contraceptives ─────────────────────────────────────────────
    {"generic": "Levonorgestrel (OCP)", "icd10_prefix": "C50", "condition": "Breast Cancer",
     "severity": "contraindicated", "reason": "Combined oral contraceptives contraindicated in oestrogen-sensitive breast cancer"},
    {"generic": "Prednisolone", "icd10_prefix": "N18", "condition": "Chronic Kidney Disease",
     "severity": "serious", "reason": "Corticosteroids cause fluid retention and can worsen hypertension in CKD"},
    {"generic": "Prednisolone", "icd10_prefix": "E11", "condition": "Diabetes Mellitus",
     "severity": "serious", "reason": "Corticosteroids raise blood glucose significantly; increase insulin requirements; monitor glucose daily"},
    {"generic": "Dexamethasone", "icd10_prefix": "E11", "condition": "Diabetes Mellitus",
     "severity": "serious", "reason": "Steroid-induced hyperglycaemia; frequent glucose monitoring and insulin adjustment needed"},

    # ── Antiepileptics ────────────────────────────────────────────────────────
    {"generic": "Valproate (Sodium Valproate)", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "contraindicated", "reason": "Valproate is highly teratogenic (neural tube defects, neurodevelopmental harm); must not be used in women who may become pregnant without specialist counselling"},
    {"generic": "Phenytoin", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "serious", "reason": "Fetal hydantoin syndrome risk; use alternative (lamotrigine under specialist guidance)"},
    {"generic": "Carbamazepine", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "serious", "reason": "Teratogen (neural tube defects, craniofacial); specialist review required"},

    # ── Psychiatric Drugs ─────────────────────────────────────────────────────
    {"generic": "Lithium Carbonate", "icd10_prefix": "N18", "condition": "Chronic Kidney Disease",
     "severity": "serious", "reason": "Lithium is renally cleared; accumulates in CKD → toxicity; frequent level monitoring required"},
    {"generic": "Lithium Carbonate", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "serious", "reason": "Ebstein anomaly risk in first trimester; risk-benefit discussion with psychiatrist"},
    {"generic": "Olanzapine", "icd10_prefix": "E11", "condition": "Type 2 Diabetes Mellitus",
     "severity": "serious", "reason": "Atypical antipsychotics worsen glucose control; significant metabolic adverse effects"},
    {"generic": "Risperidone", "icd10_prefix": "E11", "condition": "Type 2 Diabetes Mellitus",
     "severity": "serious", "reason": "May worsen metabolic syndrome and glycaemic control; monitor glucose"},
    {"generic": "Amitriptyline", "icd10_prefix": "I48", "condition": "Cardiac Arrhythmia",
     "severity": "serious", "reason": "TCAs prolong QTc and have anticholinergic cardiac effects; risk of fatal arrhythmia"},
    {"generic": "Amitriptyline", "icd10_prefix": "I50", "condition": "Heart Failure",
     "severity": "serious", "reason": "TCAs have negative inotropic effects and prolong QTc; avoid in heart failure"},

    # ── Allopurinol ───────────────────────────────────────────────────────────
    {"generic": "Allopurinol", "icd10_prefix": "A15", "condition": "Acute Gout Attack",
     "severity": "serious", "reason": "Starting allopurinol during acute gout attack can prolong or worsen the attack; start 2-4 weeks after attack resolves"},

    # ── Thyroid ───────────────────────────────────────────────────────────────
    {"generic": "Carbimazole", "icd10_prefix": "O", "condition": "Pregnancy",
     "severity": "serious", "reason": "Can cause aplasia cutis in neonate; use PTU in first trimester, switch to carbimazole in 2nd/3rd"},
    {"generic": "Propylthiouracil", "icd10_prefix": "K70", "condition": "Liver Disease",
     "severity": "serious", "reason": "PTU can cause severe hepatotoxicity (black box warning); regular LFT monitoring required"},

    # ── Antimalarials ─────────────────────────────────────────────────────────
    {"generic": "Chloroquine", "icd10_prefix": "G6", "condition": "G6PD Deficiency",
     "severity": "serious", "reason": "Chloroquine can precipitate haemolytic anaemia in G6PD deficiency"},
    {"generic": "Hydroxychloroquine", "icd10_prefix": "H35", "condition": "Retinal Disease (Macular Degeneration)",
     "severity": "serious", "reason": "Hydroxychloroquine retinopathy risk; baseline and annual ophthalmology review required"},

    # ── Colchicine ────────────────────────────────────────────────────────────
    {"generic": "Colchicine", "icd10_prefix": "N18", "condition": "Severe Chronic Kidney Disease",
     "severity": "serious", "reason": "Colchicine accumulates in renal failure → neuromuscular toxicity; dose reduction or avoidance needed"},
    {"generic": "Colchicine", "icd10_prefix": "K70", "condition": "Severe Liver Disease",
     "severity": "serious", "reason": "Hepatic impairment reduces colchicine metabolism → toxicity risk"},

    # ── Fluoroquinolones ──────────────────────────────────────────────────────
    {"generic": "Ciprofloxacin", "icd10_prefix": "G40", "condition": "Epilepsy / Seizure Disorder",
     "severity": "serious", "reason": "Fluoroquinolones can lower seizure threshold; use with caution in epilepsy"},
    {"generic": "Levofloxacin", "icd10_prefix": "I48", "condition": "Cardiac Arrhythmia / QTc Prolongation",
     "severity": "serious", "reason": "Fluoroquinolones prolong QTc; risk of Torsades de Pointes in susceptible patients"},
    {"generic": "Ciprofloxacin", "icd10_prefix": "M", "condition": "Tendon / Musculoskeletal Disease",
     "severity": "serious", "reason": "Fluoroquinolones associated with tendon rupture (especially Achilles), peripheral neuropathy, and CNS effects"},

    # ── Metronidazole ─────────────────────────────────────────────────────────
    {"generic": "Metronidazole", "icd10_prefix": "G", "condition": "Neurological Disease / Epilepsy",
     "severity": "serious", "reason": "Metronidazole-induced encephalopathy in prolonged use; caution in CNS disease"},
    {"generic": "Metronidazole", "icd10_prefix": "F10", "condition": "Alcohol Use Disorder",
     "severity": "contraindicated", "reason": "Disulfiram-like reaction with alcohol; severe nausea, vomiting, hypotension; ensure complete alcohol abstinence"},
]
