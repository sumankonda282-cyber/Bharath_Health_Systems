"""
Comprehensive drug interaction data for Indian clinical EMR system.
Covers drug-drug, drug-food, and drug-condition interactions.

Each entry fields:
  drug_a           : primary drug (string)
  drug_b           : interacting drug / food / condition (string)
  interaction_type : 'drug-drug' | 'drug-food' | 'drug-condition'
  severity         : 'contraindicated' | 'major' | 'moderate' | 'minor'
  effect           : clinical consequence (string)
  management       : recommended clinical action (string)

Sources: FDA, Drugs.com, Medscape, BNF, PMC/PubMed, AHA, WHO Formulary,
         Indian pharmacology guidelines (KD Tripathi basis), CDC TB guidelines
"""

INTERACTIONS = [

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 1: DRUG-DRUG INTERACTIONS — CONTRAINDICATED
    # ═══════════════════════════════════════════════════════════════════════════

    {"drug_a": "Warfarin", "drug_b": "Aspirin",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Greatly increased bleeding risk; dual anticoagulant + antiplatelet effect synergises haemorrhage risk",
     "management": "Avoid combination; if specialist-mandated (e.g. mechanical heart valve), monitor INR closely, use lowest aspirin dose, add PPI"},

    {"drug_a": "MAO Inhibitors (Phenelzine/Tranylcypromine)", "drug_b": "Tramadol",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Serotonin syndrome — hyperthermia, rigidity, myoclonus, seizures, death",
     "management": "Absolutely contraindicated; allow ≥14-day MAOI washout before tramadol"},

    {"drug_a": "MAO Inhibitors (Phenelzine/Tranylcypromine)", "drug_b": "Fluoxetine",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Potentially fatal serotonin syndrome",
     "management": "14-day washout from MAOI before starting fluoxetine; 5-week washout after stopping fluoxetine before MAOI"},

    {"drug_a": "MAO Inhibitors (Phenelzine/Tranylcypromine)", "drug_b": "Sertraline",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Serotonin syndrome; potentially fatal",
     "management": "14-day washout between MAOI and sertraline in either direction"},

    {"drug_a": "MAO Inhibitors (Phenelzine/Tranylcypromine)", "drug_b": "Pethidine (Meperidine)",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Severe serotonin syndrome; hyperpyrexia, coma, cardiovascular collapse",
     "management": "Absolutely contraindicated; use morphine cautiously if opioid needed"},

    {"drug_a": "Sildenafil", "drug_b": "Isosorbide Mononitrate",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Profound, potentially fatal hypotension — synergistic cGMP elevation causes severe vasodilation",
     "management": "Absolutely contraindicated; never co-prescribe any PDE-5 inhibitor with any nitrate"},

    {"drug_a": "Sildenafil", "drug_b": "Nitroglycerin (GTN)",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Severe, potentially fatal hypotension",
     "management": "Absolutely contraindicated; if patient on sildenafil arrives with chest pain, nitrates must not be given within 24 hours"},

    {"drug_a": "Tadalafil", "drug_b": "Isosorbide Dinitrate",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Severe hypotension via additive nitric oxide/cGMP pathway",
     "management": "Contraindicated; maintain 48-hour gap if tadalafil is stopped before emergency nitrate use"},

    {"drug_a": "Methotrexate", "drug_b": "Aspirin (anti-inflammatory doses)",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "NSAIDs reduce renal methotrexate clearance → toxicity: bone marrow suppression, mucositis, hepatotoxicity",
     "management": "Avoid high-dose aspirin/NSAIDs with methotrexate; use paracetamol; monitor FBC and LFTs"},

    {"drug_a": "Methotrexate", "drug_b": "Cotrimoxazole (Trimethoprim-Sulfamethoxazole)",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Both are folate antagonists; additive myelosuppression → fatal pancytopenia reported",
     "management": "Contraindicated together; choose alternative antibiotic; case reports of death at even low MTX doses"},

    {"drug_a": "Warfarin", "drug_b": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Rifampicin is the most potent CYP450 inducer; warfarin levels fall dramatically → loss of anticoagulation → thrombosis",
     "management": "Avoid; if TB treatment needed, switch to heparin or seek specialist review for DOAC use"},

    {"drug_a": "Clozapine", "drug_b": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Both suppress bone marrow; additive risk of fatal agranulocytosis",
     "management": "Absolutely contraindicated; use alternative anticonvulsant if seizure prophylaxis needed in clozapine patients"},

    {"drug_a": "Haloperidol", "drug_b": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Ketoconazole inhibits CYP3A4 raising haloperidol levels; both prolong QTc → Torsades de Pointes",
     "management": "Avoid; use fluconazole cautiously or choose antifungal without QT risk"},

    {"drug_a": "Clopidogrel", "drug_b": "Omeprazole",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "Omeprazole inhibits CYP2C19 reducing clopidogrel activation by ~50%; loss of antiplatelet protection → stent thrombosis risk",
     "management": "Contraindicated per FDA; use pantoprazole or rabeprazole instead"},

    {"drug_a": "Methotrexate", "drug_b": "Diclofenac",
     "interaction_type": "drug-drug", "severity": "contraindicated",
     "effect": "NSAID reduces methotrexate clearance → accumulation → severe toxicity",
     "management": "Avoid; use paracetamol for pain; if NSAID essential, monitor MTX levels and FBC daily"},

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 2: DRUG-DRUG INTERACTIONS — MAJOR/SERIOUS
    # ═══════════════════════════════════════════════════════════════════════════

    {"drug_a": "Amiodarone", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Amiodarone inhibits CYP2C9; warfarin levels rise 30-50% → bleeding risk including intracranial haemorrhage",
     "management": "Reduce warfarin dose by 30-50% when starting amiodarone; monitor INR every 2-3 days initially; effect persists months after amiodarone stopped"},

    {"drug_a": "Amiodarone", "drug_b": "Digoxin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Amiodarone inhibits P-glycoprotein; digoxin levels double → nausea, vomiting, bradycardia, heart block, arrhythmias",
     "management": "Reduce digoxin dose by 50% when starting amiodarone; monitor digoxin levels and ECG"},

    {"drug_a": "Amiodarone", "drug_b": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "CYP3A4 inhibition by amiodarone raises simvastatin levels; myopathy and rhabdomyolysis risk",
     "management": "Simvastatin dose must not exceed 20mg/day with amiodarone; consider switching to pravastatin or rosuvastatin"},

    {"drug_a": "Amiodarone", "drug_b": "Atorvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Amiodarone inhibits CYP3A4; statin levels rise → myopathy/rhabdomyolysis",
     "management": "Limit atorvastatin to 40mg/day; monitor CK; advise patient to report muscle pain"},

    {"drug_a": "Amiodarone", "drug_b": "Azithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Additive QTc prolongation → Torsades de Pointes, potentially fatal ventricular arrhythmia",
     "management": "Avoid combination; use alternative antibiotic (e.g. amoxicillin); if unavoidable, get baseline ECG and monitor QTc"},

    {"drug_a": "Digoxin", "drug_b": "Furosemide",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Furosemide causes hypokalaemia and hypomagnesaemia → increased myocardial sensitivity to digoxin → toxicity at normal levels",
     "management": "Monitor electrolytes; supplement potassium; keep K+ >3.5 mmol/L; monitor digoxin levels"},

    {"drug_a": "Digoxin", "drug_b": "Verapamil",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Verapamil increases digoxin levels by 50-75% via P-gp inhibition; additive AV node slowing → heart block",
     "management": "Reduce digoxin dose by 50%; monitor digoxin levels and ECG; be alert to bradycardia"},

    {"drug_a": "Digoxin", "drug_b": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Digoxin levels rise ~70%; risk of toxicity and heart block",
     "management": "Halve digoxin dose; monitor serum levels; ECG monitoring"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Theophylline",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Ciprofloxacin inhibits CYP1A2; theophylline levels rise → nausea, seizures, arrhythmias",
     "management": "Reduce theophylline dose by ~50%; monitor theophylline levels; use alternative antibiotic if possible"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Fluoroquinolones reduce Vitamin K-producing gut flora and may inhibit CYP2C9 → elevated INR → bleeding",
     "management": "Monitor INR 2-3 times during and after antibiotic course; adjust warfarin dose accordingly"},

    {"drug_a": "Carbamazepine", "drug_b": "Valproate (Sodium Valproate)",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Carbamazepine reduces valproate levels; valproate inhibits carbamazepine-epoxide hydrolase → carbamazepine-epoxide toxicity (diplopia, ataxia)",
     "management": "Monitor drug levels; watch for CBZ toxicity even with normal CBZ levels; specialist management"},

    {"drug_a": "Phenytoin", "drug_b": "Valproate (Sodium Valproate)",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Valproate displaces phenytoin from protein binding and inhibits metabolism; total phenytoin falls but free (active) drug rises → toxicity",
     "management": "Monitor free (unbound) phenytoin rather than total; complex interaction requiring neurologist oversight"},

    {"drug_a": "Phenytoin", "drug_b": "Isoniazid",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Isoniazid inhibits CYP2C19 reducing phenytoin metabolism → phenytoin toxicity (nystagmus, ataxia, drowsiness)",
     "management": "Monitor phenytoin levels closely when starting/stopping INH; reduce phenytoin dose if needed"},

    {"drug_a": "Phenytoin", "drug_b": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Fluconazole inhibits CYP2C9; phenytoin levels rise significantly → toxicity",
     "management": "Monitor phenytoin levels closely; reduce phenytoin dose; consider alternative antifungal"},

    {"drug_a": "Rifampicin", "drug_b": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Rifampicin markedly induces CYP3A4 → OCP failure → unintended pregnancy",
     "management": "Use barrier contraception or injectable/IUD; continue barrier method for 4 weeks after rifampicin stops"},

    {"drug_a": "Rifampicin", "drug_b": "Prednisolone",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Rifampicin induces CYP3A4; prednisolone levels drop dramatically → loss of anti-inflammatory effect",
     "management": "Double or triple corticosteroid dose when rifampicin is co-prescribed; taper back when rifampicin is stopped"},

    {"drug_a": "Rifampicin", "drug_b": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Rifampicin induces CYP enzymes; phenytoin levels fall → seizure risk",
     "management": "Monitor phenytoin levels; increase dose during rifampicin therapy"},

    {"drug_a": "Rifampicin", "drug_b": "Efavirenz",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Rifampicin reduces efavirenz levels by ~25-75% → HIV treatment failure",
     "management": "Increase efavirenz dose to 800mg/day in patients >60kg; monitor viral load"},

    {"drug_a": "Rifampicin", "drug_b": "Lopinavir/Ritonavir",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Rifampicin reduces lopinavir AUC by ~75% → HIV treatment failure",
     "management": "Avoid combination; if TB+HIV co-treatment needed, use efavirenz-based regimen instead"},

    {"drug_a": "Lithium Carbonate", "drug_b": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "NSAIDs reduce renal lithium excretion by 25-40% → lithium toxicity (tremors, ataxia, confusion, arrhythmia)",
     "management": "Avoid NSAIDs with lithium; use paracetamol; if NSAID essential, reduce lithium dose and monitor levels every 3-4 days"},

    {"drug_a": "Lithium Carbonate", "drug_b": "Enalapril",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "ACE inhibitors reduce renal lithium clearance → lithium toxicity; effect may be delayed up to 2 months",
     "management": "Monitor lithium levels closely for 2 months after starting ACE inhibitor; reduce lithium dose if needed"},

    {"drug_a": "Lithium Carbonate", "drug_b": "Hydrochlorothiazide",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Thiazide diuretics increase lithium reabsorption in proximal tubule → toxicity",
     "management": "Reduce lithium dose by 25-50%; check levels every 5-7 days initially; use loop diuretics if diuresis needed"},

    {"drug_a": "Atorvastatin", "drug_b": "Itraconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Itraconazole potently inhibits CYP3A4; atorvastatin levels rise dramatically → rhabdomyolysis",
     "management": "Avoid combination; if antifungal needed, use fluconazole with caution or suspend statin for antifungal course duration"},

    {"drug_a": "Simvastatin", "drug_b": "Itraconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Itraconazole causes up to 20-fold increase in simvastatin exposure → severe rhabdomyolysis, renal failure",
     "management": "Absolutely contraindicated; switch to pravastatin (not CYP3A4 metabolised) or rosuvastatin"},

    {"drug_a": "Simvastatin", "drug_b": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Ketoconazole is a potent CYP3A4 inhibitor; massive increase in simvastatin levels → rhabdomyolysis",
     "management": "Contraindicated; suspend simvastatin during ketoconazole therapy; use pravastatin or rosuvastatin"},

    {"drug_a": "Tacrolimus", "drug_b": "Itraconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "CYP3A4 inhibition causes several-fold rise in tacrolimus levels → nephrotoxicity, neurotoxicity",
     "management": "Reduce tacrolimus dose empirically by 50-75% when starting itraconazole; frequent level monitoring"},

    {"drug_a": "Tacrolimus", "drug_b": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Clarithromycin inhibits CYP3A4; tacrolimus levels spike → nephrotoxicity",
     "management": "Monitor tacrolimus levels immediately; reduce dose; use azithromycin as alternative macrolide"},

    {"drug_a": "Cyclosporine", "drug_b": "Itraconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Itraconazole inhibits CYP3A4; cyclosporine levels rise 3-4 fold → nephrotoxicity",
     "management": "Reduce cyclosporine dose; frequent trough level monitoring; consider alternative antifungal"},

    {"drug_a": "Cyclosporine", "drug_b": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Rifampicin induces CYP3A4; cyclosporine levels drop dramatically → transplant rejection",
     "management": "Avoid; if essential, may need to increase cyclosporine dose 3-5 fold; frequent monitoring"},

    {"drug_a": "Methotrexate", "drug_b": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Ibuprofen reduces renal methotrexate clearance → toxicity: mucositis, myelosuppression",
     "management": "Avoid NSAIDs with MTX; use paracetamol; monitor FBC and LFTs every 1-2 weeks"},

    {"drug_a": "Enalapril", "drug_b": "Spironolactone",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Both raise serum potassium; hyperkalaemia → cardiac arrhythmia especially with renal impairment",
     "management": "Monitor K+ and creatinine within 1 week of starting/changing doses; avoid in eGFR <30"},

    {"drug_a": "Ramipril", "drug_b": "Spironolactone",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Synergistic hyperkalaemia risk; can cause life-threatening cardiac arrhythmia",
     "management": "Monitor K+ closely; keep K+ <5.5 mmol/L; regular renal function checks"},

    {"drug_a": "Amoxicillin-Clavulanate", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Broad-spectrum antibiotics disrupt gut flora reducing Vitamin K synthesis → INR elevation → bleeding",
     "management": "Monitor INR during antibiotics and 1 week after; adjust warfarin dose as needed"},

    {"drug_a": "Dexamethasone", "drug_b": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Additive GI ulceration and perforation risk; haemorrhage",
     "management": "Co-prescribe PPI (omeprazole 20mg daily); prefer paracetamol for pain; use combination only when necessary"},

    {"drug_a": "Prednisolone", "drug_b": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Additive risk of peptic ulceration and upper GI haemorrhage",
     "management": "Add gastroprotection with PPI; use lowest effective NSAID dose; prefer paracetamol"},

    {"drug_a": "Isoniazid", "drug_b": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Isoniazid inhibits CYP3A4 → carbamazepine toxicity (diplopia, ataxia, drowsiness)",
     "management": "Monitor CBZ levels; reduce carbamazepine dose as needed"},

    {"drug_a": "Isoniazid", "drug_b": "Pyrazinamide",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Combined hepatotoxicity; isoniazid + PZA combination is especially hepatotoxic",
     "management": "Monitor LFTs at baseline, monthly; stop both immediately if LFTs rise >3x ULN with symptoms"},

    {"drug_a": "Isoniazid", "drug_b": "Valproate",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Isoniazid inhibits CYP2C9/2C19; valproate levels rise → sedation, hepatotoxicity risk",
     "management": "Monitor valproate levels; watch for sedation; LFT monitoring"},

    {"drug_a": "Lopinavir/Ritonavir", "drug_b": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Ritonavir is a potent CYP3A4 inhibitor; simvastatin levels increase dramatically → rhabdomyolysis",
     "management": "Contraindicated; switch to pravastatin or rosuvastatin (minimal CYP3A4 metabolism)"},

    {"drug_a": "Metronidazole", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Metronidazole inhibits CYP2C9 → warfarin accumulation → INR rise → bleeding risk",
     "management": "Reduce warfarin dose by ~30%; check INR every 2-3 days during metronidazole course and after stopping"},

    {"drug_a": "Fluconazole", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Fluconazole inhibits CYP2C9 → significantly elevated warfarin levels → bleeding",
     "management": "Monitor INR closely; reduce warfarin dose; effect persists for days after fluconazole stopped"},

    {"drug_a": "Carbamazepine", "drug_b": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "CYP3A4 induction reduces ethinylestradiol and progestogen levels → OCP failure",
     "management": "Use barrier contraception; consider depo-provera injection or Mirena IUD; avoid OCP reliance"},

    {"drug_a": "Haloperidol", "drug_b": "Ondansetron",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Both prolong QTc interval; combined risk of Torsades de Pointes",
     "management": "Monitor ECG; avoid combination in patients with prolonged QT at baseline or electrolyte imbalance"},

    {"drug_a": "Quetiapine", "drug_b": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Clarithromycin inhibits CYP3A4 raising quetiapine levels; additive QTc prolongation",
     "management": "Reduce quetiapine dose; ECG monitoring; use azithromycin as alternative"},

    {"drug_a": "Tacrolimus", "drug_b": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Fluconazole inhibits CYP3A4; tacrolimus levels rise 2-4 fold → nephrotoxicity",
     "management": "Reduce tacrolimus dose by 50%; monitor trough levels every 2-3 days"},

    {"drug_a": "Efavirenz", "drug_b": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Carbamazepine induces CYP3A4; efavirenz levels decrease → HIV treatment failure",
     "management": "Avoid; use alternative anticonvulsant (e.g. levetiracetam, lamotrigine)"},

    {"drug_a": "Nevirapine", "drug_b": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Carbamazepine decreases nevirapine plasma levels → HIV treatment failure",
     "management": "Avoid co-administration; use levetiracetam instead"},

    {"drug_a": "Furosemide", "drug_b": "Aminoglycosides (Gentamicin/Amikacin)",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Additive ototoxicity (hearing loss, tinnitus, vestibular damage); both are ototoxic",
     "management": "Avoid combination if possible; if unavoidable, use lowest effective doses, monitor renal function and hearing"},

    {"drug_a": "Aminoglycosides (Gentamicin/Amikacin)", "drug_b": "Vancomycin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Additive nephrotoxicity; acute kidney injury risk significantly increased",
     "management": "Monitor creatinine and urine output daily; dose both drugs based on renal function and levels; hydrate patient"},

    {"drug_a": "Allopurinol", "drug_b": "Azathioprine",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Allopurinol inhibits xanthine oxidase; azathioprine metabolites accumulate → severe, potentially fatal myelosuppression",
     "management": "Reduce azathioprine to 25-33% of usual dose; monitor FBC weekly initially"},

    {"drug_a": "Colchicine", "drug_b": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Clarithromycin inhibits CYP3A4 and P-gp; colchicine levels rise dramatically → colchicine toxicity (neuromuscular, GI, multi-organ failure)",
     "management": "Avoid in patients with renal or hepatic impairment; if essential, reduce colchicine dose dramatically; deaths reported"},

    {"drug_a": "Warfarin", "drug_b": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Fluconazole raises warfarin levels via CYP2C9 inhibition → bleeding risk",
     "management": "Monitor INR; reduce warfarin; effect persists several days after fluconazole ends"},

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 3: DRUG-DRUG INTERACTIONS — MODERATE
    # ═══════════════════════════════════════════════════════════════════════════

    {"drug_a": "Amlodipine", "drug_b": "Atorvastatin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Amlodipine mildly inhibits CYP3A4 causing modest increase in atorvastatin levels",
     "management": "Generally safe; cap atorvastatin at 40mg/day; monitor for myalgia"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Antacids (Aluminium/Magnesium hydroxide)",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Antacid cations chelate ciprofloxacin in GIT; absorption reduced by up to 90%",
     "management": "Take ciprofloxacin 2 hours before or 6 hours after antacids"},

    {"drug_a": "Levothyroxine", "drug_b": "Ferrous Sulphate",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Iron forms insoluble complex with levothyroxine in GIT → reduced thyroid hormone absorption → hypothyroidism worsening",
     "management": "Separate doses by at least 4 hours; give levothyroxine first on empty stomach"},

    {"drug_a": "Levothyroxine", "drug_b": "Calcium Carbonate",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Calcium chelates levothyroxine → impaired absorption → elevated TSH",
     "management": "Take levothyroxine 4 hours before or after calcium supplements; recheck TSH 6-8 weeks after any change"},

    {"drug_a": "Levothyroxine", "drug_b": "Omeprazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "PPIs raise gastric pH reducing levothyroxine dissolution and absorption",
     "management": "Take levothyroxine 30-60 minutes before PPI dose; monitor TSH every 6-8 weeks"},

    {"drug_a": "Metformin", "drug_b": "Hydrochlorothiazide",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Thiazides cause hyperglycaemia by reducing insulin secretion; oppose metformin's glucose-lowering effect",
     "management": "Monitor fasting glucose and HbA1c; may need metformin dose increase or insulin addition"},

    {"drug_a": "Metformin", "drug_b": "Prednisolone",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Corticosteroids raise blood glucose, opposing metformin efficacy; steroid-induced diabetes risk",
     "management": "Increase glucose monitoring; consider insulin for steroid-induced hyperglycaemia"},

    {"drug_a": "Metformin", "drug_b": "Furosemide",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Furosemide can impair renal function → metformin accumulation → lactic acidosis",
     "management": "Monitor renal function (eGFR); hold metformin if eGFR <30; check after any diuretic dose change"},

    {"drug_a": "Allopurinol", "drug_b": "Cotrimoxazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive risk of skin rashes (Stevens-Johnson) and haematological toxicity",
     "management": "Use with caution; monitor for rash, fever; check FBC"},

    {"drug_a": "Doxycycline", "drug_b": "Ferrous Sulphate",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Iron chelates doxycycline in GIT; antibiotic absorption reduced by 50-90%",
     "management": "Separate doses by at least 3 hours; administer doxycycline first"},

    {"drug_a": "Tetracycline", "drug_b": "Antacids",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Divalent/trivalent cations (Mg, Al, Ca) chelate tetracycline → reduced absorption",
     "management": "Take tetracycline 2 hours before or 6 hours after any antacid or calcium supplement"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Metronidazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive QTc prolongation risk; possible cardiac arrhythmia",
     "management": "Monitor ECG; avoid in patients with cardiac disease or electrolyte disturbances"},

    {"drug_a": "Ondansetron", "drug_b": "Metronidazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Both prolong QTc interval; risk of Torsades de Pointes",
     "management": "Avoid combination; use domperidone or metoclopramide as antiemetic with metronidazole"},

    {"drug_a": "Sertraline", "drug_b": "Tramadol",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Serotonin syndrome risk; SSRIs inhibit tramadol activation via CYP2D6; also seizure threshold lowering",
     "management": "Use alternative analgesic; if unavoidable, use lowest tramadol dose, monitor closely for serotonin signs"},

    {"drug_a": "Fluoxetine", "drug_b": "Tramadol",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Fluoxetine inhibits CYP2D6 reducing tramadol conversion to active metabolite; also serotonin syndrome risk",
     "management": "Avoid; use alternative analgesic such as paracetamol, codeine, or opioids not requiring CYP2D6"},

    {"drug_a": "Valproate (Sodium Valproate)", "drug_b": "Lamotrigine",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Valproate doubles/triples lamotrigine half-life → lamotrigine toxicity (rash, dizziness, diplopia)",
     "management": "Start lamotrigine at half the usual dose when valproate is co-prescribed; titrate slowly"},

    {"drug_a": "Colchicine", "drug_b": "Atorvastatin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Both carry myopathy risk; pharmacokinetic interaction via CYP3A4 increases colchicine exposure",
     "management": "Use lowest effective doses; monitor CK; advise patient to report muscle pain or weakness"},

    {"drug_a": "Losartan", "drug_b": "Potassium Supplements",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "ARBs raise serum potassium; supplemental K+ compounds hyperkalaemia risk",
     "management": "Monitor serum K+ weekly when initiating; avoid supplementation unless documented hypokalaemia"},

    {"drug_a": "Metoprolol", "drug_b": "Verapamil",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive negative chronotropy and dromotropy; severe bradycardia, AV block, cardiac arrest reported",
     "management": "Avoid combination IV; if oral combination needed (uncommon), start with low doses, monitor HR and ECG"},

    {"drug_a": "Ceftriaxone", "drug_b": "Calcium (IV Solutions)",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Ceftriaxone-calcium precipitate forms in IV lines and can cause fatal pulmonary/renal complications especially in neonates",
     "management": "Never administer in same IV line; flush thoroughly between drugs; use separate IV lines"},

    {"drug_a": "Aspirin", "drug_b": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Ibuprofen competitively antagonises aspirin's irreversible COX-1 inhibition → loss of cardioprotective antiplatelet effect",
     "management": "Give aspirin at least 30 minutes before ibuprofen; prefer celecoxib if anti-inflammatory needed"},

    {"drug_a": "Hydroxychloroquine", "drug_b": "Metoprolol",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Both prolong QTc interval; additive risk of arrhythmia",
     "management": "Baseline ECG before starting; monitor QTc periodically; avoid in patients with prolonged QT"},

    {"drug_a": "Valproate", "drug_b": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Carbamazepine induces valproate metabolism → lowered valproate levels and possible seizure breakthrough",
     "management": "Monitor valproate levels; may need higher valproate doses when co-prescribed with CBZ"},

    {"drug_a": "Warfarin", "drug_b": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Ciprofloxacin may inhibit warfarin metabolism and reduces gut Vitamin K; INR elevation",
     "management": "Monitor INR during and 1 week post-antibiotic; anticipate warfarin dose reduction need"},

    {"drug_a": "Warfarin", "drug_b": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Clarithromycin inhibits CYP3A4 and displaces warfarin; INR may rise",
     "management": "Monitor INR; adjust warfarin dose; preferably use azithromycin instead"},

    {"drug_a": "Atenolol", "drug_b": "Verapamil",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive AV nodal suppression; bradycardia and heart block",
     "management": "Avoid combination; if both required for legitimate indications, use lowest doses and monitor ECG"},

    {"drug_a": "Lisinopril", "drug_b": "Trimethoprim",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Both increase serum potassium; trimethoprim blocks renal K+ secretion similar to amiloride → hyperkalaemia",
     "management": "Monitor K+ and renal function; particular risk in elderly and diabetics"},

    {"drug_a": "Diltiazem", "drug_b": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Diltiazem inhibits CYP3A4; simvastatin exposure increases → myopathy risk",
     "management": "Limit simvastatin to 40mg/day; consider switching to pravastatin or rosuvastatin"},

    {"drug_a": "Omeprazole", "drug_b": "Methotrexate",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "PPIs increase methotrexate levels by reducing renal tubular secretion → toxicity",
     "management": "Stop PPI 5 days before high-dose MTX; monitor MTX levels; use lansoprazole/rabeprazole if PPI essential"},

    {"drug_a": "Chlorpropamide", "drug_b": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Fluconazole inhibits CYP2C9; sulfonylurea levels rise → severe hypoglycaemia",
     "management": "Monitor blood glucose closely; reduce sulfonylurea dose; prefer alternative antifungal"},

    {"drug_a": "Glibenclamide", "drug_b": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "CYP2C9 inhibition raises glibenclamide levels → hypoglycaemia",
     "management": "Reduce sulfonylurea dose; frequent blood glucose monitoring during antifungal course"},

    {"drug_a": "Carbamazepine", "drug_b": "Doxycycline",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Carbamazepine induces CYP3A4 → reduced doxycycline levels → antibiotic treatment failure",
     "management": "Double doxycycline dose or choose alternative antibiotic not affected by enzyme induction"},

    {"drug_a": "Phenytoin", "drug_b": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "CYP induction reduces OCP hormone levels → contraceptive failure",
     "management": "Use barrier or alternative contraception; consider high-dose OCP under specialist advice"},

    {"drug_a": "Methotrexate", "drug_b": "Amoxicillin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Penicillins reduce renal tubular methotrexate secretion → MTX accumulation → potential toxicity",
     "management": "Avoid short-term high-dose penicillins with MTX; if needed, monitor for toxicity signs; short-course (≤10 days) may be cautiously used for low-dose MTX"},

    {"drug_a": "Warfarin", "drug_b": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Amiodarone is a potent CYP2C9 inhibitor; warfarin t½ doubles → bleeding risk",
     "management": "Anticipate 30-50% dose reduction; INR monitoring every 2-3 days for first 4-6 weeks"},

    {"drug_a": "Chloroquine", "drug_b": "Methotrexate",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Possible additive anti-folate effects; both potentially hepatotoxic",
     "management": "Monitor LFTs; avoid in hepatic impairment"},

    {"drug_a": "Glipizide", "drug_b": "Metronidazole",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Metronidazole inhibits CYP2C9; sulfonylurea levels rise → hypoglycaemia",
     "management": "Monitor blood glucose; reduce glipizide dose if necessary"},

    {"drug_a": "Nifedipine", "drug_b": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Rifampicin induces CYP3A4; nifedipine levels drop → loss of blood pressure control",
     "management": "Increase nifedipine dose with monitoring; or switch to amlodipine which is less affected"},

    {"drug_a": "Amlodipine", "drug_b": "Diltiazem",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Both are calcium channel blockers; additive hypotension and peripheral oedema",
     "management": "Avoid combination unless specialist indication; monitor BP closely"},

    {"drug_a": "Spironolactone", "drug_b": "ACE Inhibitors",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Both reduce potassium excretion; hyperkalaemia risk particularly in elderly and renal impairment",
     "management": "Check K+ and creatinine 1 week after initiation; keep K+ <5.5 mmol/L; use low-dose spironolactone (25mg)"},

    {"drug_a": "Aspirin", "drug_b": "Enalapril",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "NSAIDs including aspirin may attenuate ACE inhibitor's antihypertensive effect by blocking renal prostaglandin synthesis",
     "management": "Use minimum aspirin dose; monitor BP; consider adding amlodipine if BP not controlled"},

    {"drug_a": "Sildenafil", "drug_b": "Amlodipine",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive vasodilation → significant hypotension, especially with first dose",
     "management": "Start sildenafil at 25mg; advise sitting/lying for 2 hours after dose; monitor BP"},

    {"drug_a": "Warfarin", "drug_b": "Paracetamol (>2g/day)",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "High-dose regular paracetamol can elevate INR by 40-50% through NAPQI inhibiting CYP2C9",
     "management": "Limit paracetamol to <2g/day; monitor INR if prolonged regular use required"},

    {"drug_a": "Cetirizine", "drug_b": "Diazepam",
     "interaction_type": "drug-drug", "severity": "minor",
     "effect": "Additive CNS depression and sedation",
     "management": "Warn patient about drowsiness; avoid driving or operating heavy machinery"},

    {"drug_a": "Metoclopramide", "drug_b": "Haloperidol",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive dopamine receptor blockade → increased risk of extrapyramidal side effects (akathisia, dystonia, tardive dyskinesia)",
     "management": "Avoid combination if possible; use ondansetron as antiemetic instead"},

    {"drug_a": "Phenobarbitone", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Phenobarbitone induces CYP2C9; warfarin levels fall → loss of anticoagulation",
     "management": "Monitor INR; increase warfarin dose as needed; monitor for rebound when phenobarbitone stopped"},

    {"drug_a": "Rifampicin", "drug_b": "Digoxin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Rifampicin induces P-gp and CYP3A4; digoxin levels drop → loss of cardiac effect",
     "management": "Monitor digoxin levels; increase digoxin dose during rifampicin co-administration"},

    {"drug_a": "Clopidogrel", "drug_b": "Aspirin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Dual antiplatelet therapy increases bleeding risk (GI bleeding, intracranial haemorrhage)",
     "management": "Dual antiplatelet therapy necessary post-ACS/stent; add PPI; limit to 12 months if possible"},

    {"drug_a": "Heparin", "drug_b": "Aspirin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive bleeding risk; aspirin inhibits platelet function while heparin impairs coagulation cascade",
     "management": "Necessary in ACS management; monitor for bleeding; use lowest aspirin dose (75-100mg)"},

    {"drug_a": "Heparin", "drug_b": "Clopidogrel",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive anticoagulant and antiplatelet effects → major bleeding risk",
     "management": "Monitor closely for bleeding; use combination only when clinically indicated (ACS management)"},

    {"drug_a": "Tramadol", "drug_b": "Benzodiazepines (Diazepam/Clonazepam)",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Additive CNS and respiratory depression; increased overdose risk",
     "management": "Avoid combination; if necessary, use lowest doses; warn patient; do not take alcohol"},

    {"drug_a": "Morphine", "drug_b": "Benzodiazepines",
     "interaction_type": "drug-drug", "severity": "major",
     "effect": "Profound CNS and respiratory depression; increased risk of fatal overdose",
     "management": "Avoid combination; if necessary, have naloxone available; ensure ventilatory support access"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Sucralfate",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Sucralfate binds ciprofloxacin in GIT; bioavailability reduced by up to 40%",
     "management": "Take ciprofloxacin at least 2 hours before sucralfate"},

    {"drug_a": "Phenytoin", "drug_b": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Rifampicin induces CYP2C9 → reduced phenytoin levels → seizure risk",
     "management": "Monitor phenytoin levels; increase dose during rifampicin; monitor after stopping"},

    {"drug_a": "Enalapril", "drug_b": "Furosemide",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "First-dose hypotension; volume-depleted patients may have profound BP drop when ACE inhibitor is added",
     "management": "Reduce diuretic dose before starting ACE inhibitor; give first ACE inhibitor dose at bedtime; hydrate patient"},

    {"drug_a": "Glibenclamide", "drug_b": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Fluoroquinolones potentiate insulin release from beta cells → hypoglycaemia",
     "management": "Monitor blood glucose closely during ciprofloxacin course; patient education about hypoglycaemia symptoms"},

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 4: DRUG-DRUG INTERACTIONS — MINOR
    # ═══════════════════════════════════════════════════════════════════════════

    {"drug_a": "Paracetamol", "drug_b": "Warfarin",
     "interaction_type": "drug-drug", "severity": "minor",
     "effect": "Regular high-dose paracetamol (>2g/day) can modestly raise INR",
     "management": "Use minimum effective paracetamol dose; monitor INR if prolonged use required"},

    {"drug_a": "Cetirizine", "drug_b": "Diazepam",
     "interaction_type": "drug-drug", "severity": "minor",
     "effect": "Additive mild sedation",
     "management": "Warn patient about drowsiness; avoid driving"},

    {"drug_a": "Aspirin (low dose)", "drug_b": "Lisinopril",
     "interaction_type": "drug-drug", "severity": "minor",
     "effect": "Low-dose aspirin minimally reduces ACE inhibitor antihypertensive effect",
     "management": "Generally acceptable at doses ≤100mg/day; monitor BP if aspirin dose is higher"},

    {"drug_a": "Paracetamol", "drug_b": "Metoclopramide",
     "interaction_type": "drug-drug", "severity": "minor",
     "effect": "Metoclopramide increases gastric motility → faster paracetamol absorption → faster onset of analgesia",
     "management": "This is generally a beneficial interaction used in migraine combinations (Migraleve); be aware of potentially quicker effect"},

    {"drug_a": "Losartan", "drug_b": "Aspirin (low dose)",
     "interaction_type": "drug-drug", "severity": "minor",
     "effect": "Minimal attenuation of losartan's BP-lowering effect at low aspirin doses",
     "management": "No specific action needed at low aspirin doses; monitor BP"},

    {"drug_a": "Atorvastatin", "drug_b": "Erythromycin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Erythromycin inhibits CYP3A4; atorvastatin levels increase moderately → myopathy risk",
     "management": "Monitor for muscle symptoms; use short erythromycin courses; consider azithromycin as alternative"},

    {"drug_a": "Metoprolol", "drug_b": "Fluoxetine",
     "interaction_type": "drug-drug", "severity": "moderate",
     "effect": "Fluoxetine inhibits CYP2D6 → metoprolol accumulation → bradycardia, hypotension",
     "management": "Monitor pulse and BP; consider reducing metoprolol dose; use bisoprolol if possible (less CYP2D6)"},

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 5: DRUG-FOOD INTERACTIONS
    # ═══════════════════════════════════════════════════════════════════════════

    {"drug_a": "Warfarin", "drug_b": "Vitamin K-rich foods (spinach, methi, mustard greens, broccoli, cabbage)",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Vitamin K antagonises warfarin's anticoagulant action → reduced INR → thromboembolism risk if intake suddenly increases",
     "management": "Advise consistent (not zero) intake of green leafy vegetables; sudden changes in diet affect INR; monitor INR if dietary habits change"},

    {"drug_a": "MAO Inhibitors (Phenelzine/Tranylcypromine)", "drug_b": "Tyramine-rich foods (aged cheese, matured paneer, fermented foods, red wine, overripe banana, soy sauce)",
     "interaction_type": "drug-food", "severity": "contraindicated",
     "effect": "MAOIs block tyramine breakdown → sympathetic surge → hypertensive crisis (severe headache, BP >180/120, stroke, death)",
     "management": "Strict avoidance of all tyramine-containing foods and beverages during MAOI therapy and for 2 weeks after stopping; provide complete food list to patient"},

    {"drug_a": "Simvastatin", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Furanocoumarins in grapefruit irreversibly inhibit CYP3A4 → simvastatin levels rise dramatically → rhabdomyolysis",
     "management": "Avoid all grapefruit and grapefruit juice; even small amounts can have prolonged effect (>24 hours); switch to rosuvastatin or pravastatin if patient cannot avoid grapefruit"},

    {"drug_a": "Atorvastatin", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "CYP3A4 inhibition by grapefruit increases atorvastatin exposure → myopathy risk",
     "management": "Avoid regular large amounts of grapefruit juice; occasional single glass may be acceptable but discourage habit"},

    {"drug_a": "Tetracycline", "drug_b": "Dairy products (milk, curd, paneer)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Calcium ions in dairy chelate tetracycline in GIT → reduced absorption by 50-65%",
     "management": "Take tetracycline on empty stomach 1 hour before or 2 hours after meals; avoid dairy within 2 hours of dose"},

    {"drug_a": "Doxycycline", "drug_b": "Milk/Dairy products",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Dairy reduces doxycycline absorption to lesser extent than tetracycline",
     "management": "Can be taken with food (reduces GI upset) but avoid large dairy intake at same time; water preferred"},

    {"drug_a": "Ferrous Sulphate (Iron)", "drug_b": "Tea and coffee",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Tannins in tea and coffee complex with iron → absorption reduced by 40-90%; very common in India",
     "management": "Take iron supplement 1 hour before or 2 hours after tea/coffee; take with Vitamin C-rich juice instead; major education point in India"},

    {"drug_a": "Ferrous Sulphate (Iron)", "drug_b": "Phytic acid foods (chapati, roti, whole grains)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Phytic acid chelates iron → impaired iron absorption; major issue with cereal-based Indian diets",
     "management": "Take iron supplement 1 hour before main meal or 2 hours after; separate from wheat/grain intake"},

    {"drug_a": "Metformin", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Alcohol inhibits hepatic gluconeogenesis and impairs lactate clearance → increased risk of potentially fatal lactic acidosis with metformin",
     "management": "Advise total alcohol avoidance; even moderate intake (>2 units/day) significantly increases lactic acidosis risk"},

    {"drug_a": "Metronidazole", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Metronidazole inhibits aldehyde dehydrogenase → acetaldehyde accumulation (disulfiram-like reaction): flushing, tachycardia, vomiting, hypotension",
     "management": "Absolutely avoid alcohol during metronidazole therapy and for 48-72 hours after stopping; counsel every patient"},

    {"drug_a": "Tinidazole", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Same disulfiram-like reaction as metronidazole; flushing, nausea, vomiting, hypotension",
     "management": "Avoid alcohol during and for 72 hours after tinidazole; counsel patient explicitly"},

    {"drug_a": "Levothyroxine", "drug_b": "Calcium-rich foods (dairy, fortified foods)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Calcium binds to levothyroxine in gut → impaired thyroid hormone absorption → rising TSH",
     "management": "Take levothyroxine on empty stomach 30-60 minutes before breakfast; separate from calcium-rich foods by 4 hours"},

    {"drug_a": "Levothyroxine", "drug_b": "Coffee",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Coffee reduces levothyroxine absorption if taken simultaneously",
     "management": "Take levothyroxine at least 30-60 minutes before coffee; take with water only"},

    {"drug_a": "Levothyroxine", "drug_b": "Soy products (soy milk, tofu, soy flour)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Soy isoflavones may inhibit thyroid hormone absorption and thyroid function",
     "management": "Take levothyroxine well separated from soy-containing foods; monitor TSH; common in vegetarian Indian diets"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Dairy products",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Calcium in dairy chelates ciprofloxacin → reduced antibiotic bioavailability by up to 30-40%",
     "management": "Take ciprofloxacin 2 hours before or 6 hours after dairy products"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Caffeine (tea, coffee)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Ciprofloxacin inhibits CYP1A2 → impaired caffeine metabolism → caffeine toxicity (palpitations, anxiety, insomnia)",
     "management": "Reduce tea/coffee intake during ciprofloxacin therapy; advise patient about potential caffeine side effects"},

    {"drug_a": "Itraconazole", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Grapefruit inhibits CYP3A4 increasing itraconazole exposure → greater side effects",
     "management": "Avoid grapefruit juice during itraconazole therapy; take with acidic beverage (cola) to enhance absorption"},

    {"drug_a": "Felodipine", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Grapefruit inhibits CYP3A4; felodipine AUC increases 2-3 fold → severe hypotension, reflex tachycardia",
     "management": "Avoid all grapefruit products; this was the original grapefruit interaction discovery"},

    {"drug_a": "Amlodipine", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Minor CYP3A4 inhibition; small increase in amlodipine exposure",
     "management": "Generally clinically insignificant; advise patient to avoid regular large amounts"},

    {"drug_a": "Cyclosporine", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Grapefruit inhibits CYP3A4 → cyclosporine levels increase 3-4 fold → nephrotoxicity, neurotoxicity",
     "management": "Avoid grapefruit completely during cyclosporine therapy; monitor trough levels"},

    {"drug_a": "Buspirone", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Grapefruit CYP3A4 inhibition increases buspirone levels 4-fold → excessive sedation, dizziness",
     "management": "Avoid grapefruit juice during buspirone therapy; use other fruit juices"},

    {"drug_a": "Warfarin", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Acute alcohol inhibits warfarin metabolism → INR rise → bleeding; chronic heavy alcohol induces CYP2C9 → reduced warfarin effect",
     "management": "Advise minimal alcohol intake; regular INR monitoring if patient drinks occasionally; abstinence strongly recommended"},

    {"drug_a": "Phenytoin", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Acute: alcohol inhibits phenytoin metabolism → toxicity; Chronic: alcohol induces CYP → reduced phenytoin → seizures",
     "management": "Strong counsel for alcohol abstinence in epileptics; alcohol also lowers seizure threshold independently"},

    {"drug_a": "Isoniazid", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Alcohol potentiates isoniazid hepatotoxicity → hepatitis, liver failure; also increases peripheral neuropathy risk",
     "management": "Advise complete alcohol abstinence during TB treatment; monthly LFT monitoring"},

    {"drug_a": "Metronidazole", "drug_b": "Tyramine-rich foods",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Weak MAOI-like activity may rarely cause mild symptoms with tyramine foods",
     "management": "Generally not clinically significant but advise caution"},

    {"drug_a": "Lithium Carbonate", "drug_b": "Sodium-restricted diet (low salt diet)",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Low sodium intake causes compensatory renal lithium reabsorption → lithium toxicity",
     "management": "Advise against drastic sodium restriction; maintain consistent dietary sodium; adjust lithium dose if sodium intake changes"},

    {"drug_a": "Lithium Carbonate", "drug_b": "Caffeine (high intake > 5 cups/day)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "High caffeine increases renal lithium excretion; abrupt caffeine reduction → lithium levels rise → toxicity",
     "management": "Maintain consistent caffeine intake; if patient wishes to reduce caffeine, monitor lithium levels closely"},

    {"drug_a": "Quinolones (Ciprofloxacin/Levofloxacin)", "drug_b": "Iron supplements",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Iron chelates fluoroquinolones → reduced antibiotic absorption → treatment failure",
     "management": "Separate doses by at least 2 hours; take antibiotic first"},

    {"drug_a": "Alendronate", "drug_b": "Food (any food including water with minerals)",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Food dramatically reduces bisphosphonate absorption from <1% to negligible amounts",
     "management": "Take on empty stomach with plain water 30 minutes before any food/drink; remain upright for 30 minutes to prevent oesophageal irritation"},

    {"drug_a": "Captopril", "drug_b": "Food",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Food reduces captopril absorption by up to 35-40%",
     "management": "Take captopril 1 hour before meals for maximum effect; not applicable to other ACE inhibitors"},

    {"drug_a": "Ampicillin", "drug_b": "Food",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Food reduces ampicillin absorption by 50%",
     "management": "Take ampicillin 30-60 minutes before meals"},

    {"drug_a": "Rifampicin", "drug_b": "Food",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Food (especially high-fat) significantly reduces and delays rifampicin absorption",
     "management": "Take rifampicin on empty stomach 30 minutes before meals; important for TB treatment efficacy"},

    {"drug_a": "Itraconazole (capsules)", "drug_b": "High-fat food",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "High-fat meal doubles itraconazole absorption from capsules",
     "management": "Give itraconazole capsules immediately after a full meal; itraconazole solution should be taken without food (opposite behavior)"},

    {"drug_a": "Griseofulvin", "drug_b": "High-fat food",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "High-fat meal increases griseofulvin absorption — beneficial interaction",
     "management": "Take with a fatty meal to improve absorption and efficacy"},

    {"drug_a": "Carbamazepine", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Grapefruit inhibits CYP3A4 → increased carbamazepine levels → toxicity (diplopia, ataxia, dizziness)",
     "management": "Avoid grapefruit and grapefruit juice during carbamazepine therapy"},

    {"drug_a": "Tacrolimus", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "CYP3A4 inhibition raises tacrolimus levels → nephrotoxicity, neurotoxicity",
     "management": "Complete avoidance of grapefruit; monitor trough levels"},

    {"drug_a": "Phenelzine (MAOI)", "drug_b": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "effect": "Unpredictable CNS depression and BP changes; alcohol contains tyramine in some forms",
     "management": "Complete alcohol avoidance during MAOI therapy"},

    {"drug_a": "Warfarin", "drug_b": "Garlic supplements/large amounts",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Garlic has antiplatelet and possible anticoagulant properties → additive bleeding risk with warfarin",
     "management": "Counsel against garlic supplements; cooking amounts generally safe; monitor INR if garlic intake increases significantly"},

    {"drug_a": "Warfarin", "drug_b": "Ginger (high doses as supplement)",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Ginger has antiplatelet properties; potential additive effect on bleeding",
     "management": "Dietary ginger generally safe; high-dose ginger supplements should be avoided; cooking use acceptable"},

    {"drug_a": "Warfarin", "drug_b": "Papaya (large amounts)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Papain enzyme may enhance warfarin effect; cases of elevated INR reported with large papaya consumption",
     "management": "Advise consistent moderate papaya consumption; monitor INR if large intake"},

    {"drug_a": "Isoniazid", "drug_b": "Tyramine-rich foods (fish, cheese)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Isoniazid has mild MAOI activity and inhibits plasma amine oxidase → mild pressor response with tyramine foods; flushing, headache, sweating reported",
     "management": "Advise against large amounts of aged fish (particularly tuna, mackerel) and cheese during INH therapy; Indian context: avoid pickled fish products"},

    {"drug_a": "Isoniazid", "drug_b": "Food (any food)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Food reduces isoniazid absorption by 20-40%",
     "management": "Take isoniazid on empty stomach at least 30 minutes before meals for optimal absorption"},

    {"drug_a": "Spironolactone", "drug_b": "High-potassium foods (banana, coconut water, avocado, potatoes)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Spironolactone retains potassium; high dietary K+ intake compounds hyperkalaemia risk",
     "management": "Advise patient to avoid potassium-rich foods; in Indian context: coconut water, banana overuse; monitor serum K+"},

    {"drug_a": "ACE Inhibitors (Enalapril/Lisinopril)", "drug_b": "High-potassium foods (coconut water, banana, potatoes)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "ACE inhibitors reduce aldosterone → potassium retention; dietary potassium excess → hyperkalaemia",
     "management": "Counsel on moderation of K+-rich foods; monitor serum K+ especially in renal impairment"},

    {"drug_a": "Tetracycline", "drug_b": "Iron supplements",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Iron chelates tetracycline → absorption reduced by up to 80%",
     "management": "Separate doses by 3 hours; take tetracycline first; do not co-administer"},

    {"drug_a": "Fluoride supplements", "drug_b": "Dairy products",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "Calcium in dairy forms insoluble calcium fluoride reducing fluoride absorption",
     "management": "Take fluoride supplements away from dairy"},

    {"drug_a": "Ketoconazole", "drug_b": "Antacids/Food",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Ketoconazole requires acid for dissolution; food and antacids raise gastric pH → reduced absorption",
     "management": "Take with acidic drink (orange juice, cola); avoid antacids within 2 hours"},

    {"drug_a": "Posaconazole (suspension)", "drug_b": "High-fat food",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "High-fat meal increases posaconazole absorption 4-fold → important for therapeutic levels",
     "management": "Administer with high-fat meal or nutritional supplement; split into 4 daily doses if needed"},

    {"drug_a": "Theophylline", "drug_b": "Caffeine (tea, coffee, cola)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Both are methylxanthines with additive CNS and cardiac stimulant effects → palpitations, insomnia, anxiety, seizures",
     "management": "Limit caffeine intake; educate patients on tea and coffee restriction; particularly relevant in India where tea consumption is very high"},

    {"drug_a": "MAO Inhibitors", "drug_b": "Chocolate",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Chocolate contains tyramine and phenylethylamine → pressor response with MAOIs → headache, hypertension",
     "management": "Avoid large amounts of chocolate during MAOI therapy; milk chocolate in small amounts may be acceptable"},

    {"drug_a": "Warfarin", "drug_b": "Cranberry juice (large amounts)",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "Cranberry may inhibit CYP2C9 → raised INR; mechanism debated but case reports of serious bleeding exist",
     "management": "Advise against large/regular cranberry juice consumption; monitor INR if intake changes"},

    {"drug_a": "Calcium Channel Blockers (Nifedipine/Amlodipine)", "drug_b": "Grapefruit juice",
     "interaction_type": "drug-food", "severity": "moderate",
     "effect": "CYP3A4 inhibition raises CCB levels → excessive vasodilation → hypotension, flushing, headache",
     "management": "Avoid grapefruit juice with calcium channel blockers"},

    {"drug_a": "Sildenafil", "drug_b": "High-fat food",
     "interaction_type": "drug-food", "severity": "minor",
     "effect": "High-fat meal delays sildenafil absorption by up to 1 hour and reduces Cmax by 29%",
     "management": "Take sildenafil on empty stomach or with light meal for quicker/more reliable effect"},

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 6: DRUG-CONDITION CONTRAINDICATIONS
    # ═══════════════════════════════════════════════════════════════════════════

    {"drug_a": "Non-selective Beta Blockers (Propranolol/Atenolol)", "drug_b": "Bronchial Asthma",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Beta-2 blockade causes bronchoconstriction → severe bronchospasm, acute asthma attack, potentially fatal",
     "management": "Contraindicated; use calcium channel blocker (amlodipine) or alpha blocker for hypertension in asthma patients; if beta-blocker absolutely required, use cardioselective (bisoprolol) at lowest dose with extreme caution"},

    {"drug_a": "Beta Blockers (any)", "drug_b": "Severe COPD",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Bronchoconstriction worsens airflow obstruction; may precipitate acute exacerbation",
     "management": "Avoid non-selective beta blockers; cardioselective (bisoprolol, metoprolol) may be cautiously used if cardiac benefit outweighs risk; monitor FEV1"},

    {"drug_a": "Metformin", "drug_b": "Severe Renal Impairment (eGFR <30 mL/min)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Metformin accumulates in renal failure → potentially fatal lactic acidosis",
     "management": "Contraindicated when eGFR <30; reduce dose at eGFR 30-45; stop if creatinine rises acutely"},

    {"drug_a": "Metformin", "drug_b": "IV Contrast Media (iodinated)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Contrast can cause acute kidney injury → metformin accumulation → lactic acidosis",
     "management": "Hold metformin 48 hours before and 48 hours after IV contrast; restart only after renal function confirmed normal"},

    {"drug_a": "NSAIDs (Ibuprofen/Diclofenac/Naproxen)", "drug_b": "Chronic Kidney Disease (eGFR <60)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "NSAIDs reduce renal prostaglandin synthesis → renal vasoconstriction → AKI superimposed on CKD; sodium and water retention",
     "management": "Avoid regular NSAID use in CKD; use paracetamol for analgesia; if NSAID essential, use lowest dose, shortest duration, monitor creatinine"},

    {"drug_a": "NSAIDs (Ibuprofen/Diclofenac)", "drug_b": "Peptic Ulcer Disease (active)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "NSAIDs inhibit COX-1 → reduced gastric mucus and prostaglandin protection → ulcer exacerbation, perforation, haemorrhage",
     "management": "Contraindicated in active PUD; use paracetamol; if NSAID unavoidable, use COX-2 selective (celecoxib) with high-dose PPI"},

    {"drug_a": "NSAIDs", "drug_b": "Heart Failure (NYHA II-IV)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "NSAIDs cause sodium and water retention → fluid overload, worsened cardiac function, decompensation",
     "management": "Avoid NSAIDs in heart failure; use paracetamol for analgesia; opioids for severe pain if necessary"},

    {"drug_a": "ACE Inhibitors (Enalapril/Ramipril/Lisinopril)", "drug_b": "Pregnancy (2nd/3rd trimester)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Fetopathy: oligohydramnios, fetal renal failure, limb contractures, neonatal anuria, fetal death",
     "management": "Absolutely contraindicated from 2nd trimester; switch to methyldopa or labetalol for hypertension in pregnancy"},

    {"drug_a": "ARBs (Losartan/Telmisartan/Valsartan)", "drug_b": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Same fetopathy as ACE inhibitors; fetal renal hypoperfusion, oligohydramnios, death",
     "management": "Contraindicated throughout pregnancy; switch to methyldopa or labetalol"},

    {"drug_a": "Warfarin", "drug_b": "Pregnancy (especially 1st trimester)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Warfarin embryopathy (nasal hypoplasia, stippled epiphyses) in 1st trimester; fetal intracranial haemorrhage later",
     "management": "Switch to heparin/LMWH throughout pregnancy; specialist haematology/obstetric management required"},

    {"drug_a": "Isotretinoin", "drug_b": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Highly teratogenic (Category X); causes severe birth defects — craniofacial, cardiac, CNS malformations; spontaneous abortion",
     "management": "Absolutely contraindicated in pregnancy; require 2 forms of contraception; monthly pregnancy tests; iPLEDGE-equivalent counselling"},

    {"drug_a": "Statins (Atorvastatin/Simvastatin/Rosuvastatin)", "drug_b": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Cholesterol is essential for fetal development; statins cross placenta → potential teratogenicity",
     "management": "Stop statins when planning pregnancy or immediately on discovering pregnancy; restart after breastfeeding completes"},

    {"drug_a": "Methotrexate", "drug_b": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Folate antagonist; causes severe fetal abnormalities and miscarriage; also used therapeutically for ectopic pregnancy termination",
     "management": "Absolutely contraindicated for RA treatment in pregnancy; effective contraception for both sexes during and 3 months after MTX"},

    {"drug_a": "Ciprofloxacin", "drug_b": "Paediatric patients (<18 years) / Growing children",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Fluoroquinolones deposit in growing cartilage → arthropathy, tendon damage; avoided in paediatrics except specific indications",
     "management": "Avoid unless no suitable alternative; used in serious Pseudomonas infections in CF; paediatric ID specialist consultation required"},

    {"drug_a": "Tetracyclines (Doxycycline)", "drug_b": "Children under 8 years",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Tetracyclines chelate calcium in developing teeth and bones → permanent yellow/brown tooth discolouration, enamel hypoplasia",
     "management": "Contraindicated under 8 years (except rickettsial infections where benefit exceeds risk); use amoxicillin, erythromycin, or co-trimoxazole instead"},

    {"drug_a": "Tetracyclines (Doxycycline)", "drug_b": "Pregnancy (after 15 weeks)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Teeth and bone formation impairment in fetus; hepatotoxicity in pregnant women (high IV doses)",
     "management": "Contraindicated in pregnancy; use amoxicillin or erythromycin instead"},

    {"drug_a": "Aspirin", "drug_b": "Children with viral illness (Reye's syndrome risk)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Aspirin in children with viral illness (chickenpox, influenza) → Reye's syndrome: acute encephalopathy and liver failure",
     "management": "Never use aspirin in children <16 years for fever or viral illness; use paracetamol instead"},

    {"drug_a": "Spironolactone", "drug_b": "Severe Renal Impairment (eGFR <30)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Potassium sparing in severe CKD → dangerous hyperkalaemia → cardiac arrhythmia, cardiac arrest",
     "management": "Contraindicated in severe CKD; use with extreme caution and close K+ monitoring in moderate CKD"},

    {"drug_a": "Atenolol", "drug_b": "Second/Third Degree Heart Block",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Beta blockers further slow AV conduction → complete heart block, Stokes-Adams attacks, asystole",
     "management": "Absolutely contraindicated; use temporary pacing if rate control needed; investigate for pacemaker insertion"},

    {"drug_a": "Verapamil (IV)", "drug_b": "WPW (Wolff-Parkinson-White) Syndrome",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Verapamil slows AV node but not accessory pathway → rapid conduction through bypass tract → ventricular fibrillation",
     "management": "Absolutely contraindicated in WPW; use procainamide or DC cardioversion; adenosine may be cautiously tried"},

    {"drug_a": "Digoxin", "drug_b": "Hypertrophic Obstructive Cardiomyopathy (HOCM)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Digoxin increases myocardial contractility → worsens LVOT obstruction → haemodynamic deterioration",
     "management": "Contraindicated in HOCM; use beta blockers or verapamil for rate control"},

    {"drug_a": "Thiazolidinediones (Pioglitazone)", "drug_b": "Heart Failure (NYHA Class III/IV)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Pioglitazone causes fluid retention → oedema worsening → cardiac decompensation",
     "management": "Contraindicated in heart failure; use metformin, DPP-4 inhibitors or SGLT-2 inhibitors as safer alternatives"},

    {"drug_a": "Clopidogrel", "drug_b": "Active Pathological Bleeding",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Irreversible platelet inhibition → inability to form platelet plug → uncontrolled haemorrhage",
     "management": "Contraindicated in active bleeding; stop 5-7 days before elective surgery; transfuse platelets if urgent reversal needed"},

    {"drug_a": "NSAID (Naproxen/Diclofenac)", "drug_b": "Aspirin Sensitivity/Aspirin-Exacerbated Respiratory Disease (AERD)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Cross-reactivity: NSAIDs trigger bronchoconstriction, urticaria, anaphylaxis in aspirin-sensitive patients",
     "management": "Avoid all COX-1 inhibiting NSAIDs; use paracetamol; celecoxib is generally safe but use initial test dose with monitoring"},

    {"drug_a": "Chloroquine/Hydroxychloroquine", "drug_b": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Oxidative stress in G6PD-deficient RBCs → acute haemolytic anaemia",
     "management": "G6PD testing before treatment; use alternative antimalarial; if unavoidable, monitor haematocrit closely; common in India"},

    {"drug_a": "Primaquine", "drug_b": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Primaquine causes severe haemolytic anaemia in G6PD-deficient patients; life-threatening haemolysis",
     "management": "Screen for G6PD deficiency before prescribing primaquine (for P. vivax radical cure); use supervised weekly dosing in mild G6PD deficiency under specialist care"},

    {"drug_a": "Metformin", "drug_b": "Hepatic Failure (severe)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Hepatic failure impairs lactate clearance; metformin increases lactate production → lactic acidosis",
     "management": "Contraindicated in hepatic failure; use insulin instead"},

    {"drug_a": "Pyrazinamide", "drug_b": "Severe Hepatic Disease",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Pyrazinamide is the most hepatotoxic TB drug; severe/fulminant hepatitis in pre-existing liver disease",
     "management": "Contraindicated in severe hepatic disease; use 9-month INH-rifampicin regimen without PZA"},

    {"drug_a": "Isoniazid", "drug_b": "Active Hepatitis",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Isoniazid is hepatotoxic; can worsen active hepatitis and precipitate liver failure",
     "management": "Defer TB treatment until hepatitis resolves if possible; use specialist hepatology input; monitor LFTs very closely"},

    {"drug_a": "Valproate (Sodium Valproate)", "drug_b": "Liver Disease / Hepatic Impairment",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Valproate causes hepatotoxicity; fatal hepatic failure with pre-existing disease",
     "management": "Contraindicated in liver disease; use levetiracetam or lamotrigine instead"},

    {"drug_a": "Valproate", "drug_b": "Mitochondrial Disease (POLG mutations)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Valproate inhibits mitochondrial fatty acid oxidation → acute liver failure; deaths reported particularly in Alpers syndrome",
     "management": "Absolute contraindication in POLG-related mitochondrial disease; use levetiracetam"},

    {"drug_a": "Clozapine", "drug_b": "Granulocytopenia/Agranulocytosis History",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Clozapine causes agranulocytosis in ~1-2% of patients; prior agranulocytosis dramatically increases risk of fatal bone marrow failure",
     "management": "Absolutely contraindicated; mandatory neutrophil count monitoring weekly for 18 weeks, then monthly; stop if ANC <1500/mm3"},

    {"drug_a": "NSAIDs (Diclofenac/Indomethacin)", "drug_b": "Third Trimester of Pregnancy",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Premature closure of fetal ductus arteriosus → pulmonary hypertension; oligohydramnios; delayed/inhibited labour",
     "management": "Contraindicated after 28 weeks gestation; use paracetamol for pain in pregnancy"},

    {"drug_a": "Fluoroquinolones (Ciprofloxacin/Levofloxacin)", "drug_b": "QT Prolongation Syndrome / Long QT",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Fluoroquinolones prolong QTc interval; in pre-existing long QT → Torsades de Pointes, ventricular fibrillation",
     "management": "Avoid fluoroquinolones in long QT; if essential, continuous ECG monitoring; correct electrolytes first"},

    {"drug_a": "Tricyclic Antidepressants (Amitriptyline/Imipramine)", "drug_b": "Acute Narrow-Angle Glaucoma",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Anticholinergic effects cause mydriasis → increased intraocular pressure → acute glaucoma attack",
     "management": "Contraindicated; use SSRIs instead for depression; ophthalmology review before any anticholinergic drug"},

    {"drug_a": "Tricyclic Antidepressants", "drug_b": "Urinary Retention / Benign Prostatic Hyperplasia",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Anticholinergic action worsens urinary retention → acute urinary retention requiring catheterisation",
     "management": "Avoid TCAs in BPH/urinary retention; use SSRIs or SNRIs; if unavoidable, choose low-anticholinergic agent like nortriptyline"},

    {"drug_a": "Opioids (Morphine/Tramadol/Codeine)", "drug_b": "Severe Hepatic Impairment",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Hepatic metabolism impaired → opioid accumulation → prolonged CNS/respiratory depression, hepatic encephalopathy precipitation",
     "management": "Reduce dose significantly; increase dosing intervals; monitor closely; avoid codeine and tramadol; use careful titration"},

    {"drug_a": "Opioids (Morphine)", "drug_b": "Raised Intracranial Pressure",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Morphine causes CO2 retention (respiratory depression) → cerebral vasodilation → further rise in ICP",
     "management": "Use with extreme caution in TBI/raised ICP; maintain adequate ventilation; use short-acting agents under neurosurgical guidance"},

    {"drug_a": "Oral Contraceptives (OCP)", "drug_b": "History of DVT/PE or Thrombophilia",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Oestrogen-containing OCPs activate coagulation factors → VTE risk increased 3-4 fold; very high risk in known thrombophilia",
     "management": "Contraindicated; use progesterone-only pill, Mirena IUS, barrier methods, or copper IUD instead"},

    {"drug_a": "Oral Contraceptives (OCP)", "drug_b": "Migraine with Aura",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Combined OCP in migraine with aura increases ischaemic stroke risk ~6-9 fold",
     "management": "Contraindicated (WHO MEC Category 4); use progesterone-only methods; review smoking and other vascular risk factors"},

    {"drug_a": "Oral Contraceptives (OCP)", "drug_b": "Hepatic Adenoma / Liver Tumours",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Oestrogen promotes hepatic adenoma growth; rupture can cause intra-abdominal haemorrhage",
     "management": "Contraindicated; use non-hormonal contraception"},

    {"drug_a": "Chloramphenicol", "drug_b": "Bone Marrow Suppression / Aplastic Anaemia",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Chloramphenicol causes dose-independent aplastic anaemia (~1:10,000-1:30,000); risk extremely high in pre-existing bone marrow suppression",
     "management": "Avoid chloramphenicol in haematological conditions; restrict to sight-threatening/life-threatening infections only where no alternative exists"},

    {"drug_a": "Sulfonamides (Cotrimoxazole)", "drug_b": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Oxidative haemolysis in G6PD-deficient patients; acute haemolytic anaemia",
     "management": "G6PD screen before prescribing; use alternative antibiotics; common concern in India where G6PD deficiency prevalence is high"},

    {"drug_a": "Nitrofurantoin", "drug_b": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Haemolytic anaemia due to oxidative stress on enzyme-deficient RBCs",
     "management": "Avoid nitrofurantoin in G6PD deficiency; use alternative UTI treatment (trimethoprim if not G6PD-contraindicated, cephalexin)"},

    {"drug_a": "Nitrofurantoin", "drug_b": "Severe Renal Impairment (eGFR <30)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Nitrofurantoin requires adequate renal concentrations for antibacterial effect; accumulates in renal failure → peripheral neuropathy, pulmonary fibrosis",
     "management": "Contraindicated in severe CKD; use alternative UTI antibiotic"},

    {"drug_a": "Aminoglycosides (Gentamicin/Amikacin)", "drug_b": "Pre-existing Renal Impairment",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Aminoglycosides are nephrotoxic; cumulative damage in already compromised kidneys → AKI, dialysis",
     "management": "Use with extreme caution; once-daily dosing; drug level monitoring essential; alternative if possible; daily creatinine monitoring"},

    {"drug_a": "Aminoglycosides (Gentamicin)", "drug_b": "Pre-existing Hearing Loss / Ototoxicity Risk",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Aminoglycosides are ototoxic; cumulative toxicity → permanent hearing loss and vestibular damage",
     "management": "Avoid if pre-existing sensorineural hearing loss; if unavoidable, drug level monitoring, audiometry, shortest effective duration"},

    {"drug_a": "Phenytoin", "drug_b": "Porphyria",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Phenytoin can precipitate acute porphyric attack; hepatic enzyme induction increases porphyrin synthesis",
     "management": "Avoid in acute porphyria; use levetiracetam, gabapentin or vigabatrin instead"},

    {"drug_a": "Carbamazepine", "drug_b": "Porphyria",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Enzyme induction precipitates acute porphyric attacks",
     "management": "Contraindicated in porphyria; use levetiracetam or sodium valproate instead"},

    {"drug_a": "Lithium", "drug_b": "Severe Renal Impairment",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Lithium is renally excreted; accumulates in renal failure → toxicity (tremor, encephalopathy, cardiac dysrhythmia)",
     "management": "Contraindicated in severe CKD; use alternative mood stabiliser (valproate, lamotrigine) with nephrology input"},

    {"drug_a": "NSAIDs (Selective COX-2 / Diclofenac)", "drug_b": "Recent MI / Coronary Artery Disease",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "COX-2 inhibitors increase cardiovascular risk; diclofenac shows highest CV risk among NSAIDs; increased MI and stroke risk",
     "management": "Avoid diclofenac and COX-2 inhibitors post-MI; use naproxen if NSAID necessary (lowest CV risk) with PPI; prefer paracetamol"},

    {"drug_a": "Quinine", "drug_b": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Oxidative haemolysis in G6PD-deficient patients; acute haemolytic anaemia",
     "management": "Use with caution; monitor haematocrit; artemisinin-based therapy preferred in India"},

    {"drug_a": "Tramadol", "drug_b": "Seizure Disorder / Epilepsy",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Tramadol lowers seizure threshold; increased seizure frequency in epileptics",
     "management": "Avoid tramadol in epileptics; use alternative opioid analgesics (codeine, oxycodone) or paracetamol"},

    {"drug_a": "Metoclopramide", "drug_b": "Parkinson's Disease",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Dopamine antagonism worsens Parkinsonian symptoms; severe rigidity, akinesia",
     "management": "Absolutely contraindicated; use domperidone (does not cross blood-brain barrier) for nausea in Parkinson's patients"},

    {"drug_a": "Haloperidol", "drug_b": "Parkinson's Disease",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Dopamine blockade severely worsens Parkinson's → neuroleptic malignant syndrome, severe rigidity",
     "management": "Contraindicated; if antipsychotic needed in Parkinson's (for psychosis), use quetiapine or clozapine (low doses, with monitoring)"},

    {"drug_a": "Angiotensin Converting Enzyme Inhibitors", "drug_b": "Bilateral Renal Artery Stenosis",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "ACE inhibitors remove angiotensin II-dependent efferent arteriolar tone needed for GFR maintenance → acute renal failure",
     "management": "Contraindicated in bilateral RAS or RAS in solitary kidney; use amlodipine or other antihypertensives"},

    {"drug_a": "Digoxin", "drug_b": "Hypertrophic Cardiomyopathy with obstruction",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Increased contractility worsens LVOT gradient → haemodynamic deterioration",
     "management": "Avoid digoxin in HOCM; use beta blockers or verapamil"},

    {"drug_a": "Metformin", "drug_b": "Acute/Decompensated Heart Failure",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Hepatic hypoperfusion in heart failure impairs lactate clearance; metformin increases lactate → lactic acidosis risk",
     "management": "Hold metformin during acute heart failure exacerbation; restart once haemodynamically stable; insulin as bridge"},

    {"drug_a": "Anticholinergics (Oxybutynin/Tolterodine)", "drug_b": "Dementia / Cognitive Impairment",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Anticholinergics worsen cognitive function in dementia; acute confusion, delirium",
     "management": "Avoid in dementia; use mirabegron (beta-3 agonist) for overactive bladder instead; review all anticholinergic burden"},

    {"drug_a": "Benzodiazepines (Diazepam/Lorazepam)", "drug_b": "Myasthenia Gravis",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Benzodiazepines reduce neuromuscular transmission efficiency → respiratory muscle weakness → respiratory failure",
     "management": "Avoid in myasthenia gravis; if essential for seizure control, use with ICU respiratory support available"},

    {"drug_a": "Fluoroquinolones", "drug_b": "Myasthenia Gravis",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Fluoroquinolones impair neuromuscular junction → may precipitate respiratory crisis in myasthenia gravis",
     "management": "Avoid fluoroquinolones in myasthenia gravis; use alternative antibiotics; FDA black box warning"},

    {"drug_a": "Aminoglycosides (Gentamicin)", "drug_b": "Myasthenia Gravis",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Aminoglycosides block presynaptic ACh release → neuromuscular blockade → respiratory failure in MG",
     "management": "Avoid aminoglycosides in myasthenia gravis; use alternative antibiotics"},

    {"drug_a": "Chloroquine", "drug_b": "Psoriasis",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Chloroquine can precipitate severe psoriatic flares; exfoliative dermatitis",
     "management": "Generally avoid chloroquine/hydroxychloroquine in psoriasis; if malaria treatment necessary, use alternative antimalarial"},

    {"drug_a": "Opioids (Codeine)", "drug_b": "CYP2D6 Ultra-Rapid Metabolisers",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Ultra-rapid conversion of codeine to morphine → toxic morphine levels → respiratory depression, death (especially in breastfed infants)",
     "management": "Pharmacogenomic testing where available; avoid codeine in ultra-rapid metabolisers; use alternative opioids; FDA black box warning for nursing mothers"},

    {"drug_a": "Thalidomide", "drug_b": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Extremely teratogenic; phocomelia (limb defects), internal organ malformations, stillbirth",
     "management": "Absolutely contraindicated; strict pregnancy prevention programs mandatory; used in India for leprosy reactions/multiple myeloma"},

    {"drug_a": "ACE Inhibitors", "drug_b": "Angioedema History (from prior ACE inhibitor)",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Bradykinin-mediated angioedema can recur and worsen with re-challenge → laryngeal oedema, asphyxiation",
     "management": "Absolutely contraindicated after any prior ACE inhibitor-induced angioedema; switch to ARB (low cross-reactivity ~2%)"},

    {"drug_a": "Thiazide Diuretics (Hydrochlorothiazide)", "drug_b": "Gout",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Thiazides reduce renal urate excretion → hyperuricaemia → gout flares",
     "management": "Avoid thiazides in gout if possible; use amlodipine or losartan (mildly uricosuric) instead; treat gout adequately if thiazide essential"},

    {"drug_a": "Ethambutol", "drug_b": "Pre-existing Optic Neuritis / Visual Impairment",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Ethambutol causes dose-dependent optic neuritis → colour blindness, visual field defects → permanent blindness",
     "management": "Avoid in pre-existing optic neuritis; baseline and monthly visual acuity testing; reduce dose in renal impairment; stop immediately if vision changes"},

    {"drug_a": "Linezolid", "drug_b": "Uncontrolled Hypertension / Phaeochromocytoma",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Linezolid has MAOI properties; sympathomimetic foods/drugs trigger hypertensive crisis",
     "management": "Avoid in uncontrolled hypertension; control BP before linezolid; provide tyramine-avoidance counselling"},

    {"drug_a": "Methotrexate", "drug_b": "Significant Renal Impairment (eGFR <60)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Methotrexate is renally excreted; impaired clearance → toxic accumulation → myelosuppression, mucositis, nephrotoxicity",
     "management": "Adjust dose based on eGFR; avoid if eGFR <40; monitor LFTs, FBC, and creatinine regularly"},

    {"drug_a": "Sulfasalazine", "drug_b": "Sulfonamide Allergy",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Sulfasalazine contains sulfonamide moiety → cross-reactivity in sulfa-allergic patients → severe hypersensitivity reactions",
     "management": "Contraindicated in documented sulfonamide allergy; use hydroxychloroquine or leflunomide instead for RA"},

    {"drug_a": "Calcitriol (Vitamin D active)", "drug_b": "Hypercalcaemia",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "Active Vitamin D increases calcium absorption → worsens hypercalcaemia → renal calculi, cardiac arrhythmia, mental status changes",
     "management": "Absolutely contraindicated in hypercalcaemia; identify and treat underlying cause; regular calcium monitoring with any Vitamin D supplement"},

    {"drug_a": "Corticosteroids (long-term)", "drug_b": "Active Tuberculosis (untreated)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Immunosuppression reactivates latent TB; disseminated TB infection",
     "management": "Screen with TST/IGRA before starting; if LTBI, provide prophylactic INH 6 months; if active TB, treat with anti-TB first"},

    {"drug_a": "Biologics (TNF inhibitors - Adalimumab/Infliximab)", "drug_b": "Active Tuberculosis / Untreated LTBI",
     "interaction_type": "drug-condition", "severity": "contraindicated",
     "effect": "TNF-alpha is critical for granuloma maintenance; TNF blockade → rapid TB reactivation → disseminated/miliary TB; very high risk in India where TB burden is high",
     "management": "Mandatory TB screening (IGRA + CXR) before starting; treat LTBI with isoniazid for at least 4 weeks before biologic; monitor during therapy"},

    {"drug_a": "Ibuprofen/NSAIDs", "drug_b": "Hypertension (uncontrolled)",
     "interaction_type": "drug-condition", "severity": "moderate",
     "effect": "NSAIDs cause sodium and water retention → BP rise of 3-5 mmHg on average; blunts antihypertensive drug effects",
     "management": "Prefer paracetamol for analgesia in hypertensive patients; if NSAID necessary, monitor BP more frequently and adjust antihypertensive dose"},

    {"drug_a": "Glibenclamide / Sulfonylureas", "drug_b": "Elderly patients (>70 years) / Irregular meals",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Prolonged hypoglycaemia from long-acting sulfonylureas in elderly; glibenclamide is particularly dangerous; altered awareness of hypoglycaemia symptoms",
     "management": "Avoid glibenclamide in elderly; use shorter-acting agents (glipizide, gliclazide MR) or metformin, DPP-4 inhibitors; education on meal timing"},

    {"drug_a": "Opioids (Morphine/Tramadol)", "drug_b": "Acute Asthma Attack",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "Histamine release from morphine can trigger bronchospasm; respiratory depression masks hypoxia assessment",
     "management": "Avoid morphine in acute asthma; use fentanyl (minimal histamine release) if opioid analgesia essential; monitor O2 saturation"},

    {"drug_a": "Carbamazepine", "drug_b": "Asian Patients (HLA-B*1502 carriers)",
     "interaction_type": "drug-condition", "severity": "major",
     "effect": "HLA-B*1502 allele (common in South/East Asian populations including Indian subcontinent) is strongly associated with carbamazepine-induced Stevens-Johnson Syndrome and Toxic Epidermal Necrolysis",
     "management": "Genetic screening for HLA-B*1502 before starting carbamazepine in Asian patients; if positive, use alternative AED (levetiracetam, lamotrigine); high clinical relevance in India"},

]


# ──────────────────────────────────────────────────────────────────────────────
# Legacy compatibility alias (drug-drug only, older format with 'contraindicated'
# mapped to 'major'). Used by existing seed.py imports.
# ──────────────────────────────────────────────────────────────────────────────
DRUG_DRUG_INTERACTIONS = [
    {
        "drug_a": entry["drug_a"],
        "drug_b": entry["drug_b"],
        "severity": "major" if entry["severity"] == "contraindicated" else entry["severity"],
        "effect": entry["effect"],
        "management": entry["management"],
    }
    for entry in INTERACTIONS
    if entry["interaction_type"] == "drug-drug"
]

DRUG_FOOD_INTERACTIONS = [e for e in INTERACTIONS if e["interaction_type"] == "drug-food"]
DRUG_CONDITION_CONTRAINDICATIONS = [e for e in INTERACTIONS if e["interaction_type"] == "drug-condition"]
