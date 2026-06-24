"""
Drug formulation data for the Indian hospital market.
Each entry maps a generic drug name to its commonly dispensed formulations,
with typical dose strengths and the clinical route for each form.

form     - Abbreviated formulation type shown in the UI
route    - One of: PO, IV, IM, SC, INH, TOP, PR, SL, NG
doses    - Most common strengths (numbers only; unit is in the "unit" field)
unit     - Display unit for the dose field (mg, mcg, mL, units, IU, g, %)
"""

DRUG_FORMULATIONS = [
    # ── Analgesics / Antipyretics ─────────────────────────────────────────────
    {"generic": "Paracetamol", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500, 650, 1000], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [125, 250], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [300, 600, 1000], "unit": "mg"},
        {"form": "Supp", "route": "PR", "doses": [125, 250, 500], "unit": "mg"},
    ]},
    {"generic": "Ibuprofen", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 400, 600, 800], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100, 200], "unit": "mg"},
        {"form": "Gel",  "route": "TOP", "doses": [5], "unit": "%"},
    ]},
    {"generic": "Diclofenac", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 75, 100], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [75, 100], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [25, 75], "unit": "mg"},
        {"form": "Gel",  "route": "TOP", "doses": [1], "unit": "%"},
        {"form": "Supp", "route": "PR", "doses": [50, 100], "unit": "mg"},
    ]},
    {"generic": "Aspirin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [75, 150, 325, 500], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [500], "unit": "mg"},
    ]},
    {"generic": "Tramadol", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [50, 100], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [50, 100], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [100, 150, 200], "unit": "mg"},
    ]},
    {"generic": "Morphine", "forms": [
        {"form": "Inj",  "route": "SC", "doses": [2, 4, 5, 10, 15], "unit": "mg"},
        {"form": "Tab",  "route": "PO", "doses": [5, 10, 15, 30], "unit": "mg"},
        {"form": "Oral Soln","route": "PO", "doses": [2, 5, 10], "unit": "mg"},
    ]},
    {"generic": "Codeine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [15, 30, 60], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [15], "unit": "mg"},
    ]},
    {"generic": "Ketorolac", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [15, 30], "unit": "mg"},
        {"form": "Tab",  "route": "PO", "doses": [10], "unit": "mg"},
    ]},
    {"generic": "Mefenamic Acid", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [250, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100], "unit": "mg"},
    ]},

    # ── Antibiotics ───────────────────────────────────────────────────────────
    {"generic": "Amoxicillin", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [250, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [125, 250], "unit": "mg"},
    ]},
    {"generic": "Amoxicillin-Clavulanate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [375, 625, 1000], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [156, 312], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [600, 1200], "unit": "mg"},
    ]},
    {"generic": "Azithromycin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [500], "unit": "mg"},
    ]},
    {"generic": "Ciprofloxacin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500, 750], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [200, 400], "unit": "mg"},
        {"form": "Drop", "route": "TOP", "doses": [3], "unit": "mg/mL"},
    ]},
    {"generic": "Metronidazole", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 400, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [500], "unit": "mg"},
        {"form": "Supp", "route": "PR", "doses": [500, 1000], "unit": "mg"},
    ]},
    {"generic": "Ceftriaxone", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [250, 500, 1000, 2000], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [250, 500, 1000], "unit": "mg"},
    ]},
    {"generic": "Cefuroxime", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [125, 250], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [250, 750, 1500], "unit": "mg"},
    ]},
    {"generic": "Doxycycline", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [50, 100], "unit": "mg"},
        {"form": "Tab",  "route": "PO", "doses": [100], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [100, 200], "unit": "mg"},
    ]},
    {"generic": "Clarithromycin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [125, 250], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [500], "unit": "mg"},
    ]},
    {"generic": "Cotrimoxazole", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [160, 400, 800], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [40, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [480, 960], "unit": "mg"},
    ]},
    {"generic": "Clindamycin", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [150, 300, 450], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [150, 300, 600, 900], "unit": "mg"},
    ]},
    {"generic": "Gentamicin", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [40, 60, 80, 160], "unit": "mg"},
        {"form": "Drop", "route": "TOP", "doses": [3], "unit": "mg/mL"},
    ]},
    {"generic": "Vancomycin", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [500, 1000], "unit": "mg"},
        {"form": "Cap",  "route": "PO", "doses": [125, 250], "unit": "mg"},
    ]},
    {"generic": "Meropenem", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [500, 1000], "unit": "mg"},
    ]},
    {"generic": "Piperacillin-Tazobactam", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [2250, 4500], "unit": "mg"},
    ]},
    {"generic": "Cefixime", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 400], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100, 200], "unit": "mg"},
    ]},
    {"generic": "Levofloxacin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500, 750], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [250, 500, 750], "unit": "mg"},
    ]},
    {"generic": "Acyclovir", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 400, 800], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [250, 500], "unit": "mg"},
        {"form": "Cream","route": "TOP", "doses": [5], "unit": "%"},
    ]},
    {"generic": "Fluconazole", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [50, 100, 150, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [100, 200, 400], "unit": "mg"},
    ]},
    {"generic": "Oseltamivir", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [30, 45, 75], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [12, 30, 45, 60], "unit": "mg"},
    ]},

    # ── Antihypertensives ─────────────────────────────────────────────────────
    {"generic": "Amlodipine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 5, 10], "unit": "mg"},
    ]},
    {"generic": "Atenolol", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 100], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [5, 10], "unit": "mg"},
    ]},
    {"generic": "Metoprolol", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 100], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [25, 50, 100, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [5], "unit": "mg"},
    ]},
    {"generic": "Losartan", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 100], "unit": "mg"},
    ]},
    {"generic": "Telmisartan", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [20, 40, 80], "unit": "mg"},
    ]},
    {"generic": "Enalapril", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 5, 10, 20], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [1.25], "unit": "mg"},
    ]},
    {"generic": "Ramipril", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [1.25, 2.5, 5, 10], "unit": "mg"},
    ]},
    {"generic": "Furosemide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [20, 40, 80], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [20, 40, 80], "unit": "mg"},
    ]},
    {"generic": "Hydrochlorothiazide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [12.5, 25, 50], "unit": "mg"},
    ]},
    {"generic": "Spironolactone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 100], "unit": "mg"},
    ]},
    {"generic": "Nifedipine", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [5, 10], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [10, 20, 30], "unit": "mg"},
    ]},
    {"generic": "Clonidine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.1, 0.2, 0.3], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [0.15, 0.3], "unit": "mg"},
    ]},
    {"generic": "Nitroglycerin", "forms": [
        {"form": "SL Tab","route": "SL", "doses": [0.3, 0.5], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [5, 10, 25, 50], "unit": "mg"},
        {"form": "Patch","route": "TOP", "doses": [5, 10], "unit": "mg"},
    ]},
    {"generic": "Isosorbide Mononitrate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [10, 20], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [30, 60], "unit": "mg"},
    ]},

    # ── Antidiabetics ─────────────────────────────────────────────────────────
    {"generic": "Metformin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [500, 850, 1000], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [500, 750, 1000], "unit": "mg"},
    ]},
    {"generic": "Glibenclamide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 5], "unit": "mg"},
    ]},
    {"generic": "Glipizide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 5, 10], "unit": "mg"},
    ]},
    {"generic": "Gliclazide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [40, 80], "unit": "mg"},
        {"form": "MR Tab","route": "PO", "doses": [30, 60], "unit": "mg"},
    ]},
    {"generic": "Sitagliptin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 100], "unit": "mg"},
    ]},
    {"generic": "Insulin Regular", "forms": [
        {"form": "Inj",  "route": "SC", "doses": [4, 6, 8, 10, 12, 16, 20], "unit": "units"},
        {"form": "Inj",  "route": "IV", "doses": [0.1], "unit": "units/kg/hr"},
    ]},
    {"generic": "Insulin NPH", "forms": [
        {"form": "Inj",  "route": "SC", "doses": [10, 14, 18, 20, 24, 28], "unit": "units"},
    ]},
    {"generic": "Insulin Glargine", "forms": [
        {"form": "Inj",  "route": "SC", "doses": [10, 12, 14, 16, 18, 20], "unit": "units"},
    ]},
    {"generic": "Insulin Aspart", "forms": [
        {"form": "Inj",  "route": "SC", "doses": [4, 6, 8, 10], "unit": "units"},
    ]},

    # ── Cardiac ───────────────────────────────────────────────────────────────
    {"generic": "Digoxin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.0625, 0.125, 0.25], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [0.25, 0.5], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [0.05], "unit": "mg"},
    ]},
    {"generic": "Atorvastatin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [10, 20, 40, 80], "unit": "mg"},
    ]},
    {"generic": "Rosuvastatin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [5, 10, 20, 40], "unit": "mg"},
    ]},
    {"generic": "Clopidogrel", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [75, 300], "unit": "mg"},
    ]},
    {"generic": "Warfarin", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [1, 2, 3, 4, 5], "unit": "mg"},
    ]},
    {"generic": "Heparin", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [5000, 10000, 25000], "unit": "units"},
        {"form": "Inj",  "route": "SC", "doses": [5000], "unit": "units"},
    ]},
    {"generic": "Enoxaparin", "forms": [
        {"form": "Inj",  "route": "SC", "doses": [20, 40, 60, 80, 100], "unit": "mg"},
    ]},
    {"generic": "Amiodarone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [100, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [150, 300], "unit": "mg"},
    ]},
    {"generic": "Dobutamine", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [250, 500], "unit": "mg"},
    ]},
    {"generic": "Dopamine", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [200, 400], "unit": "mg"},
    ]},
    {"generic": "Noradrenaline", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [2, 4, 8], "unit": "mg"},
    ]},
    {"generic": "Adrenaline", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [0.1, 0.5, 1], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [0.3, 0.5], "unit": "mg"},
    ]},

    # ── GI Drugs ──────────────────────────────────────────────────────────────
    {"generic": "Omeprazole", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [10, 20, 40], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [20, 40], "unit": "mg"},
    ]},
    {"generic": "Pantoprazole", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [20, 40], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [40, 80], "unit": "mg"},
    ]},
    {"generic": "Ranitidine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [150, 300], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [50], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [75], "unit": "mg"},
    ]},
    {"generic": "Metoclopramide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [5, 10], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [5, 10], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [5], "unit": "mg"},
    ]},
    {"generic": "Ondansetron", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [4, 8], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [2, 4, 8], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [2, 4], "unit": "mg"},
    ]},
    {"generic": "Domperidone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [10], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [5], "unit": "mg"},
    ]},
    {"generic": "Loperamide", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [2], "unit": "mg"},
    ]},
    {"generic": "Mesalazine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [400, 800], "unit": "mg"},
        {"form": "Supp", "route": "PR", "doses": [500, 1000], "unit": "mg"},
    ]},

    # ── CNS / Anticonvulsants ─────────────────────────────────────────────────
    {"generic": "Phenytoin", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [50, 100], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [50, 100, 250], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [30, 125], "unit": "mg"},
    ]},
    {"generic": "Carbamazepine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [100, 200, 400], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [200, 400], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100], "unit": "mg"},
    ]},
    {"generic": "Valproate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 500], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [200], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [400], "unit": "mg"},
        {"form": "SR Tab","route": "PO", "doses": [300, 500], "unit": "mg"},
    ]},
    {"generic": "Levetiracetam", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500, 1000], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [500, 1000], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [100], "unit": "mg"},
    ]},
    {"generic": "Diazepam", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2, 5, 10], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [5, 10], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [5, 10], "unit": "mg"},
    ]},
    {"generic": "Lorazepam", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.5, 1, 2], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [1, 2, 4], "unit": "mg"},
    ]},
    {"generic": "Midazolam", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [1, 2, 5, 10], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [2, 5], "unit": "mg"},
    ]},
    {"generic": "Haloperidol", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.5, 1, 2, 5], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [2, 5], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [0.5], "unit": "mg"},
    ]},
    {"generic": "Risperidone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.5, 1, 2, 3, 4], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [0.5, 1], "unit": "mg"},
    ]},
    {"generic": "Olanzapine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 5, 7.5, 10], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [5, 10], "unit": "mg"},
    ]},
    {"generic": "Amitriptyline", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [10, 25, 50, 75], "unit": "mg"},
    ]},
    {"generic": "Sertraline", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [25, 50, 100], "unit": "mg"},
    ]},
    {"generic": "Fluoxetine", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [10, 20, 40, 60], "unit": "mg"},
    ]},

    # ── Respiratory ───────────────────────────────────────────────────────────
    {"generic": "Salbutamol", "forms": [
        {"form": "MDI",  "route": "INH", "doses": [100], "unit": "mcg"},
        {"form": "Neb",  "route": "INH", "doses": [1.25, 2.5, 5], "unit": "mg"},
        {"form": "Tab",  "route": "PO", "doses": [2, 4], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [1, 2], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [0.25, 0.5], "unit": "mg"},
    ]},
    {"generic": "Ipratropium", "forms": [
        {"form": "MDI",  "route": "INH", "doses": [20], "unit": "mcg"},
        {"form": "Neb",  "route": "INH", "doses": [0.25, 0.5], "unit": "mg"},
    ]},
    {"generic": "Budesonide", "forms": [
        {"form": "MDI",  "route": "INH", "doses": [100, 200, 400], "unit": "mcg"},
        {"form": "Neb",  "route": "INH", "doses": [0.25, 0.5, 1], "unit": "mg"},
    ]},
    {"generic": "Theophylline", "forms": [
        {"form": "SR Tab","route": "PO", "doses": [100, 200, 300, 400], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [250, 500], "unit": "mg"},
    ]},
    {"generic": "Montelukast", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [4, 5, 10], "unit": "mg"},
    ]},

    # ── Antihistamines / Corticosteroids ──────────────────────────────────────
    {"generic": "Cetirizine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [5, 10], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [2.5, 5], "unit": "mg"},
    ]},
    {"generic": "Chlorpheniramine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2, 4], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [1, 2], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [4, 10], "unit": "mg"},
    ]},
    {"generic": "Prednisolone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [5, 10, 20, 40], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [5, 10, 15], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [25, 50, 125], "unit": "mg"},
    ]},
    {"generic": "Dexamethasone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.5, 1, 4], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [4, 8, 16], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [4, 8], "unit": "mg"},
    ]},
    {"generic": "Hydrocortisone", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [25, 50, 100, 200, 500], "unit": "mg"},
        {"form": "Cream","route": "TOP", "doses": [1], "unit": "%"},
        {"form": "Tab",  "route": "PO", "doses": [5, 10, 20], "unit": "mg"},
    ]},
    {"generic": "Methylprednisolone", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [4, 8, 16], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [40, 125, 250, 500, 1000], "unit": "mg"},
    ]},

    # ── Supplements / Vitamins ────────────────────────────────────────────────
    {"generic": "Folic Acid", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.4, 1, 5], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [0.5, 1, 5], "unit": "mg"},
    ]},
    {"generic": "Iron Sulfate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [65, 195, 325], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [25, 50], "unit": "mg"},
    ]},
    {"generic": "Ferrous Sulfate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 300], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [30, 60], "unit": "mg"},
    ]},
    {"generic": "Vitamin B12", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [100, 250, 500, 1000], "unit": "mcg"},
        {"form": "Inj",  "route": "IM", "doses": [500, 1000], "unit": "mcg"},
    ]},
    {"generic": "Vitamin D", "forms": [
        {"form": "Cap",  "route": "PO", "doses": [400, 1000, 2000, 5000, 60000], "unit": "IU"},
        {"form": "Inj",  "route": "IM", "doses": [300000, 600000], "unit": "IU"},
    ]},
    {"generic": "Calcium Carbonate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [500, 1000], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [200, 500], "unit": "mg"},
    ]},
    {"generic": "Zinc Sulfate", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [10, 20], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [10, 20], "unit": "mg"},
    ]},
    {"generic": "Potassium Chloride", "forms": [
        {"form": "Tab SR","route": "PO", "doses": [600, 750], "unit": "mg"},
        {"form": "Inj",   "route": "IV", "doses": [10, 20, 40], "unit": "mEq"},
    ]},

    # ── IV Fluids / Electrolytes ──────────────────────────────────────────────
    {"generic": "Normal Saline", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [100, 250, 500, 1000], "unit": "mL"},
    ]},
    {"generic": "Dextrose", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [250, 500, 1000], "unit": "mL"},
    ]},
    {"generic": "Ringer Lactate", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [250, 500, 1000], "unit": "mL"},
    ]},
    {"generic": "Mannitol", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [100, 250, 500], "unit": "mL"},
    ]},

    # ── Anticoagulants / Anti-platelets ──────────────────────────────────────
    {"generic": "Rivaroxaban", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 10, 15, 20], "unit": "mg"},
    ]},
    {"generic": "Apixaban", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [2.5, 5], "unit": "mg"},
    ]},

    # ── Antiemetics ───────────────────────────────────────────────────────────
    {"generic": "Promethazine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [10, 25, 50], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [12.5, 25, 50], "unit": "mg"},
        {"form": "Syr",  "route": "PO", "doses": [5, 10], "unit": "mg"},
    ]},
    {"generic": "Granisetron", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [1, 2], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [1, 3], "unit": "mg"},
    ]},

    # ── Muscle Relaxants / Anaesthesia ────────────────────────────────────────
    {"generic": "Succinylcholine", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [50, 100, 200], "unit": "mg"},
    ]},
    {"generic": "Atracurium", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [25, 50], "unit": "mg"},
    ]},
    {"generic": "Propofol", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [10, 20], "unit": "mg"},
    ]},
    {"generic": "Ketamine", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [10, 50, 200], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [50, 100, 200], "unit": "mg"},
    ]},

    # ── Others ────────────────────────────────────────────────────────────────
    {"generic": "Hydroxychloroquine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [200, 400], "unit": "mg"},
    ]},
    {"generic": "Colchicine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.5, 1], "unit": "mg"},
    ]},
    {"generic": "Allopurinol", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [100, 200, 300], "unit": "mg"},
    ]},
    {"generic": "Acetazolamide", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [250, 500], "unit": "mg"},
    ]},
    {"generic": "Magnesium Sulfate", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [1000, 2000, 4000], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [1000, 2000], "unit": "mg"},
    ]},
    {"generic": "Oxytocin", "forms": [
        {"form": "Inj",  "route": "IV", "doses": [5, 10], "unit": "units"},
        {"form": "Inj",  "route": "IM", "doses": [10], "unit": "units"},
    ]},
    {"generic": "Methylergonovine", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [0.125, 0.25], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [0.2], "unit": "mg"},
    ]},
    {"generic": "Tranexamic Acid", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [250, 500, 1000], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [500, 1000], "unit": "mg"},
    ]},
    {"generic": "Phytomenadione", "forms": [
        {"form": "Tab",  "route": "PO", "doses": [5, 10], "unit": "mg"},
        {"form": "Inj",  "route": "IV", "doses": [10], "unit": "mg"},
        {"form": "Inj",  "route": "IM", "doses": [1, 10], "unit": "mg"},
    ]},
]
