"""
Pregnancy drug categories and India schedules for BharatCliniq seed data.
Categories: A (safest) → B → C → D → X (contraindicated).
India Schedule: H (prescription), H1 (additional record), X (controlled).
"""

PREGNANCY_CATEGORIES = [
    # ─── ANTIBIOTICS ───────────────────────────────────────────────────────────
    {"generic": "amoxicillin", "category": "B", "schedule": "H", "notes": "Penicillin antibiotic; generally safe throughout pregnancy for common infections"},
    {"generic": "amoxicillin-clavulanate", "category": "B", "schedule": "H", "notes": "Augmentin; safe but avoid near term due to risk of necrotizing enterocolitis in preterm neonates"},
    {"generic": "azithromycin", "category": "B", "schedule": "H", "notes": "Macrolide; considered safe; preferred over erythromycin for GI tolerability"},
    {"generic": "ciprofloxacin", "category": "C", "schedule": "H", "notes": "Fluoroquinolone; avoid unless no alternative; theoretical risk of cartilage damage in fetus"},
    {"generic": "levofloxacin", "category": "C", "schedule": "H", "notes": "Fluoroquinolone; avoid in pregnancy if safer alternatives exist; arthropathy risk"},
    {"generic": "doxycycline", "category": "D", "schedule": "H", "notes": "Tetracycline class; avoid after 15 weeks — causes permanent tooth discolouration and inhibits bone growth"},
    {"generic": "tetracycline", "category": "D", "schedule": "H", "notes": "Avoid throughout pregnancy; tooth staining and skeletal dysplasia risk; use alternative"},
    {"generic": "cotrimoxazole", "category": "C", "schedule": "H", "notes": "Trimethoprim-sulfamethoxazole; avoid in 1st trimester (folate antagonism) and near term (neonatal jaundice)"},
    {"generic": "nitrofurantoin", "category": "B", "schedule": "H", "notes": "Safe for UTI in 1st and 2nd trimester; avoid at term (haemolytic anaemia risk in neonate)"},
    {"generic": "metronidazole", "category": "B", "schedule": "H", "notes": "Nitroimidazole; safe after 1st trimester; commonly used for bacterial vaginosis and anaerobic infections"},
    {"generic": "clindamycin", "category": "B", "schedule": "H", "notes": "Lincosamide; considered safe; used for bacterial vaginosis and skin infections in pregnancy"},
    {"generic": "gentamicin", "category": "D", "schedule": "H", "notes": "Aminoglycoside; ototoxicity and nephrotoxicity risk to fetus; use only for life-threatening infections with monitoring"},
    {"generic": "vancomycin", "category": "C", "schedule": "H", "notes": "Glycopeptide; use for serious MRSA infections; monitor fetal renal function; auditory toxicity possible"},
    {"generic": "rifampicin", "category": "C", "schedule": "H", "notes": "Anti-TB drug; part of standard TB regimen in pregnancy; may cause neonatal haemorrhage — give vitamin K at delivery"},
    {"generic": "isoniazid", "category": "C", "schedule": "H", "notes": "Anti-TB; use with pyridoxine (vitamin B6) supplementation to prevent peripheral neuropathy; safe in pregnancy"},
    {"generic": "ethambutol", "category": "B", "schedule": "H", "notes": "Anti-TB; considered safe; monitor for optic neuritis; part of standard TB regimen in pregnancy"},
    {"generic": "ceftriaxone", "category": "B", "schedule": "H", "notes": "3rd-generation cephalosporin; safe in all trimesters; widely used for serious bacterial infections"},
    {"generic": "cefuroxime", "category": "B", "schedule": "H", "notes": "2nd-generation cephalosporin; safe throughout pregnancy; used for respiratory and UTI"},
    {"generic": "cephalexin", "category": "B", "schedule": "H", "notes": "1st-generation cephalosporin; safe; commonly used for skin and urinary tract infections"},
    {"generic": "cefixime", "category": "B", "schedule": "H", "notes": "3rd-generation oral cephalosporin; safe in pregnancy; used for UTI and respiratory infections"},
    {"generic": "cefpodoxime", "category": "B", "schedule": "H", "notes": "3rd-generation oral cephalosporin; considered safe; limited human data but animal studies reassuring"},
    {"generic": "erythromycin", "category": "B", "schedule": "H", "notes": "Macrolide; considered safe; avoid estolate salt (hepatotoxicity risk); GI side effects common"},
    {"generic": "clarithromycin", "category": "C", "schedule": "H", "notes": "Macrolide; animal data shows teratogenicity; avoid in 1st trimester; use azithromycin if possible"},
    {"generic": "linezolid", "category": "C", "schedule": "H1", "notes": "Oxazolidinone; limited human data; use only when no safer alternative for resistant infections"},
    {"generic": "meropenem", "category": "B", "schedule": "H", "notes": "Carbapenem; limited but reassuring data; reserved for serious multidrug-resistant infections"},
    {"generic": "piperacillin-tazobactam", "category": "B", "schedule": "H", "notes": "Beta-lactam/beta-lactamase inhibitor; considered safe; used for polymicrobial serious infections"},
    {"generic": "imipenem", "category": "C", "schedule": "H", "notes": "Carbapenem; animal data shows some adverse effects; use only when clearly needed for resistant organisms"},

    # ─── ANTIHYPERTENSIVES ─────────────────────────────────────────────────────
    {"generic": "methyldopa", "category": "B", "schedule": "H", "notes": "Central alpha-agonist; drug of choice for chronic hypertension in pregnancy; extensive safety record"},
    {"generic": "hydralazine", "category": "C", "schedule": "H", "notes": "Vasodilator; used IV for acute severe hypertension in pregnancy; oral use for chronic hypertension"},
    {"generic": "labetalol", "category": "C", "schedule": "H", "notes": "Alpha+beta blocker; first-line for acute and chronic hypertension in pregnancy; monitor neonatal bradycardia"},
    {"generic": "nifedipine", "category": "C", "schedule": "H", "notes": "Calcium channel blocker; widely used for both hypertension and tocolysis in preterm labour; well-studied"},
    {"generic": "amlodipine", "category": "C", "schedule": "H", "notes": "Calcium channel blocker; limited data; use nifedipine preferentially if CCB needed in pregnancy"},
    {"generic": "atenolol", "category": "D", "schedule": "H", "notes": "Beta-blocker; associated with intrauterine growth restriction; avoid — use labetalol instead"},
    {"generic": "metoprolol", "category": "C", "schedule": "H", "notes": "Beta-1 selective blocker; used cautiously; monitor neonate for bradycardia and hypoglycaemia"},
    {"generic": "bisoprolol", "category": "C", "schedule": "H", "notes": "Beta-1 selective blocker; limited pregnancy data; use labetalol as preferred beta-blocker"},
    {"generic": "carvedilol", "category": "C", "schedule": "H", "notes": "Alpha+beta blocker; limited pregnancy data; labetalol preferred; monitor neonate for bradycardia"},
    {"generic": "enalapril", "category": "D", "schedule": "H", "notes": "ACE inhibitor; CONTRAINDICATED in 2nd and 3rd trimester — causes fetal renal failure, oligohydramnios, skull defects"},
    {"generic": "ramipril", "category": "D", "schedule": "H", "notes": "ACE inhibitor; CONTRAINDICATED after 1st trimester; fetal/neonatal renal failure and death reported"},
    {"generic": "lisinopril", "category": "D", "schedule": "H", "notes": "ACE inhibitor; CONTRAINDICATED in pregnancy; switch to methyldopa or labetalol before conception"},
    {"generic": "captopril", "category": "D", "schedule": "H", "notes": "ACE inhibitor; CONTRAINDICATED in 2nd and 3rd trimester; switch to safer antihypertensive"},
    {"generic": "losartan", "category": "D", "schedule": "H", "notes": "ARB; CONTRAINDICATED after 1st trimester; same fetal renal toxicity as ACE inhibitors"},
    {"generic": "valsartan", "category": "D", "schedule": "H", "notes": "ARB; CONTRAINDICATED in pregnancy; causes fetal renal injury, oligohydramnios, and neonatal death"},
    {"generic": "telmisartan", "category": "D", "schedule": "H", "notes": "ARB; CONTRAINDICATED in pregnancy; fetal renal toxicity; switch to safer antihypertensive"},
    {"generic": "furosemide", "category": "C", "schedule": "H", "notes": "Loop diuretic; use with caution; reduces placental perfusion; reserved for pulmonary oedema in pregnancy"},
    {"generic": "spironolactone", "category": "D", "schedule": "H", "notes": "Aldosterone antagonist; anti-androgenic — risk of feminisation of male fetus; avoid in pregnancy"},
    {"generic": "hydrochlorothiazide", "category": "B", "schedule": "H", "notes": "Thiazide diuretic; relatively safe in 1st/2nd trimester but classified D if used in 3rd trimester; may cause neonatal thrombocytopenia"},
    {"generic": "magnesium sulphate", "category": "A", "schedule": "H", "notes": "Standard of care for eclampsia prevention and treatment; also used for fetal neuroprotection before 32 weeks"},

    # ─── ANTIDIABETICS ─────────────────────────────────────────────────────────
    {"generic": "insulin", "category": "A", "schedule": "H", "notes": "Does not cross placenta; safest antidiabetic in pregnancy; drug of choice for T1DM and T2DM in pregnancy"},
    {"generic": "metformin", "category": "B", "schedule": "H", "notes": "Biguanide; commonly used for gestational diabetes; crosses placenta but no teratogenicity shown; monitor closely"},
    {"generic": "glibenclamide", "category": "C", "schedule": "H", "notes": "Sulfonylurea; used for GDM as alternative to insulin; crosses placenta — neonatal hypoglycaemia risk"},
    {"generic": "gliclazide", "category": "B", "schedule": "H", "notes": "Sulfonylurea; limited pregnancy data; avoid if possible; insulin preferred for glycaemic control"},
    {"generic": "glipizide", "category": "C", "schedule": "H", "notes": "Sulfonylurea; crosses placenta; neonatal hypoglycaemia possible; insulin preferred in pregnancy"},
    {"generic": "sitagliptin", "category": "B", "schedule": "H", "notes": "DPP-4 inhibitor; animal data reassuring but limited human data; avoid — insulin preferred"},
    {"generic": "empagliflozin", "category": "C", "schedule": "H", "notes": "SGLT2 inhibitor; avoid in pregnancy — risk of adverse renal effects in fetus in 2nd and 3rd trimester"},
    {"generic": "dapagliflozin", "category": "C", "schedule": "H", "notes": "SGLT2 inhibitor; avoid in pregnancy; renal developmental risk; switch to insulin"},
    {"generic": "liraglutide", "category": "C", "schedule": "H", "notes": "GLP-1 agonist; avoid in pregnancy; animal data shows birth defects at high doses; switch to insulin"},

    # ─── NSAIDs / ANALGESICS ───────────────────────────────────────────────────
    {"generic": "ibuprofen", "category": "C", "schedule": "H", "notes": "NSAID; category C in 1st/2nd trimester; AVOID in 3rd trimester — premature ductus arteriosus closure and oligohydramnios"},
    {"generic": "diclofenac", "category": "C", "schedule": "H", "notes": "NSAID; avoid in 3rd trimester; risk of premature ductus closure; use paracetamol for pain relief instead"},
    {"generic": "naproxen", "category": "C", "schedule": "H", "notes": "NSAID; similar risks to ibuprofen; avoid in 3rd trimester; short-term use only in earlier trimesters"},
    {"generic": "celecoxib", "category": "C", "schedule": "H", "notes": "COX-2 inhibitor; avoid in 3rd trimester (ductus arteriosus closure); limited 1st trimester data — caution"},
    {"generic": "aspirin", "category": "C", "schedule": None, "notes": "Low-dose (75-150 mg) used for pre-eclampsia prevention from 12 weeks; high-dose category D in 3rd trimester — avoid"},
    {"generic": "ketorolac", "category": "C", "schedule": "H", "notes": "NSAID; avoid in 3rd trimester; premature ductus arteriosus closure risk; use only if absolutely necessary"},
    {"generic": "indomethacin", "category": "C", "schedule": "H", "notes": "NSAID; used as tocolytic before 32 weeks; avoid after 32 weeks — significant ductus constriction and oligohydramnios"},
    {"generic": "paracetamol", "category": "B", "schedule": None, "notes": "Analgesic/antipyretic of choice in pregnancy; extensive safety record; use lowest effective dose for shortest duration"},

    # ─── OPIOIDS ───────────────────────────────────────────────────────────────
    {"generic": "morphine", "category": "C", "schedule": "H1", "notes": "Opioid; crosses placenta; neonatal abstinence syndrome with chronic use; respiratory depression at delivery"},
    {"generic": "codeine", "category": "C", "schedule": "H1", "notes": "Opioid prodrug; neonatal opioid withdrawal syndrome risk; ultra-rapid metabolisers at risk of toxicity; short-term only"},
    {"generic": "tramadol", "category": "C", "schedule": "H", "notes": "Opioid analgesic; neonatal seizures and withdrawal reported; avoid near term; short-term use with caution"},
    {"generic": "fentanyl", "category": "C", "schedule": "H1", "notes": "Potent opioid; used in obstetric anaesthesia and labour analgesia; neonatal respiratory depression if used near delivery"},
    {"generic": "pethidine", "category": "C", "schedule": "H1", "notes": "Opioid; used in labour analgesia; accumulation of active metabolite norpethidine in neonate — prefer alternatives"},
    {"generic": "buprenorphine", "category": "C", "schedule": "H1", "notes": "Partial opioid agonist; used for opioid use disorder in pregnancy; neonatal abstinence syndrome expected but manageable"},
    {"generic": "naloxone", "category": "B", "schedule": "H", "notes": "Opioid antagonist; used to reverse neonatal respiratory depression from maternal opioids; generally safe"},

    # ─── ANTICOAGULANTS ────────────────────────────────────────────────────────
    {"generic": "warfarin", "category": "X", "schedule": "H", "notes": "CONTRAINDICATED in 1st trimester — warfarin embryopathy (nasal hypoplasia, stippled epiphyses); use heparin instead"},
    {"generic": "heparin", "category": "C", "schedule": "H", "notes": "Unfractionated heparin; does not cross placenta; safe alternative to warfarin; requires close aPTT monitoring"},
    {"generic": "enoxaparin", "category": "B", "schedule": "H", "notes": "LMWH; preferred anticoagulant in pregnancy for DVT/PE prophylaxis and treatment; does not cross placenta"},
    {"generic": "rivaroxaban", "category": "X", "schedule": "H", "notes": "Direct factor Xa inhibitor; CONTRAINDICATED in pregnancy; crosses placenta; embryotoxic in animal studies"},
    {"generic": "apixaban", "category": "X", "schedule": "H", "notes": "Direct factor Xa inhibitor; CONTRAINDICATED in pregnancy; use LMWH instead; no human safety data"},
    {"generic": "dabigatran", "category": "X", "schedule": "H", "notes": "Direct thrombin inhibitor; CONTRAINDICATED in pregnancy; embryotoxic in animals; switch to enoxaparin"},
    {"generic": "clopidogrel", "category": "B", "schedule": "H", "notes": "Antiplatelet; limited pregnancy data; use only if clearly needed (e.g. recent coronary stent); low-dose aspirin preferred"},

    # ─── STATINS ───────────────────────────────────────────────────────────────
    {"generic": "atorvastatin", "category": "X", "schedule": "H", "notes": "Statin; CONTRAINDICATED in pregnancy; cholesterol needed for fetal development; discontinue when pregnancy confirmed"},
    {"generic": "rosuvastatin", "category": "X", "schedule": "H", "notes": "Statin; CONTRAINDICATED; teratogenic in animal studies; stop before or immediately on pregnancy confirmation"},
    {"generic": "simvastatin", "category": "X", "schedule": "H", "notes": "Statin; CONTRAINDICATED in pregnancy; limb defects reported; stop immediately when pregnancy detected"},
    {"generic": "pravastatin", "category": "X", "schedule": "H", "notes": "Statin; CONTRAINDICATED; however some evidence of possible benefit in pre-eclampsia prevention — investigational only"},
    {"generic": "lovastatin", "category": "X", "schedule": "H", "notes": "Statin; CONTRAINDICATED; CNS and skeletal defects in animal studies; discontinue immediately in pregnancy"},
    {"generic": "fenofibrate", "category": "C", "schedule": "H", "notes": "Fibrate; avoid in pregnancy; limited data; discontinue when pregnancy confirmed; dietary management preferred"},
    {"generic": "ezetimibe", "category": "C", "schedule": "H", "notes": "Cholesterol absorption inhibitor; avoid in pregnancy; limited safety data; discontinue when pregnancy confirmed"},
    {"generic": "colestyramine", "category": "C", "schedule": None, "notes": "Bile acid sequestrant; not systemically absorbed; may reduce absorption of fat-soluble vitamins — supplement accordingly"},

    # ─── ANTIDEPRESSANTS ───────────────────────────────────────────────────────
    {"generic": "fluoxetine", "category": "C", "schedule": "H", "notes": "SSRI; most studied antidepressant in pregnancy; neonatal adaptation syndrome; persistent pulmonary hypertension risk at term"},
    {"generic": "sertraline", "category": "C", "schedule": "H", "notes": "SSRI; preferred antidepressant in pregnancy due to extensive data; neonatal jitteriness may occur"},
    {"generic": "escitalopram", "category": "C", "schedule": "H", "notes": "SSRI; generally considered safe; neonatal adaptation syndrome possible; discuss risk-benefit for ongoing depression"},
    {"generic": "citalopram", "category": "C", "schedule": "H", "notes": "SSRI; use with caution; some cardiac defect signal in early studies though weak; sertraline preferred"},
    {"generic": "paroxetine", "category": "D", "schedule": "H", "notes": "SSRI; avoid in 1st trimester — associated with cardiac septal defects; neonatal withdrawal syndrome common"},
    {"generic": "venlafaxine", "category": "C", "schedule": "H", "notes": "SNRI; use if SSRI inadequate; neonatal abstinence syndrome; monitor for neonatal withdrawal"},
    {"generic": "duloxetine", "category": "C", "schedule": "H", "notes": "SNRI; limited pregnancy data; neonatal adaptation syndrome; switch to sertraline if possible"},
    {"generic": "amitriptyline", "category": "C", "schedule": "H", "notes": "Tricyclic antidepressant; long history of use; neonatal withdrawal and anticholinergic effects at delivery"},
    {"generic": "clomipramine", "category": "C", "schedule": "H", "notes": "Tricyclic; neonatal jitteriness, seizures, and hypoglycaemia reported; monitor neonate closely"},
    {"generic": "mirtazapine", "category": "C", "schedule": "H", "notes": "NaSSA antidepressant; used for depression with hyperemesis; limited data but no clear teratogenicity signal"},
    {"generic": "bupropion", "category": "C", "schedule": "H", "notes": "NDRI; some signal for cardiac defects in early studies; avoid in 1st trimester if possible; not for smoking cessation"},

    # ─── ANTICONVULSANTS ───────────────────────────────────────────────────────
    {"generic": "phenytoin", "category": "D", "schedule": "H", "notes": "Hydantoin; fetal hydantoin syndrome (cleft lip, cardiac defects, digital hypoplasia); use only if no alternative"},
    {"generic": "carbamazepine", "category": "D", "schedule": "H", "notes": "Associated with neural tube defects and craniofacial abnormalities; supplement folic acid 5 mg/day pre-conception"},
    {"generic": "valproate", "category": "X", "schedule": "H", "notes": "CONTRAINDICATED — highest teratogenic risk: neural tube defects, cardiac malformations, cognitive impairment (fetal valproate syndrome)"},
    {"generic": "levetiracetam", "category": "C", "schedule": "H", "notes": "Newer AED; relatively favourable pregnancy data; preferred over older agents; supplement folic acid"},
    {"generic": "lamotrigine", "category": "C", "schedule": "H", "notes": "Relatively safe option; dose requires increase during pregnancy (increased clearance); monitor levels; supplement folic acid"},
    {"generic": "phenobarbitone", "category": "D", "schedule": "H", "notes": "Barbiturate; neonatal withdrawal and coagulation defects; vitamin K recommended for neonate at birth"},
    {"generic": "clonazepam", "category": "D", "schedule": "H1", "notes": "Benzodiazepine anticonvulsant; neonatal floppy infant syndrome and withdrawal; use only when essential"},
    {"generic": "topiramate", "category": "D", "schedule": "H", "notes": "Associated with cleft lip/palate and SGA infants; avoid in pregnancy; change to safer AED"},
    {"generic": "gabapentin", "category": "C", "schedule": "H", "notes": "Limited pregnancy data; neonatal abstinence syndrome reported; use cautiously; supplement folic acid"},
    {"generic": "pregabalin", "category": "C", "schedule": "H", "notes": "Limited data; possible increased risk of malformations; avoid if possible; register exposure with pregnancy registry"},

    # ─── BENZODIAZEPINES ───────────────────────────────────────────────────────
    {"generic": "diazepam", "category": "D", "schedule": "H1", "notes": "Benzodiazepine; cleft palate risk debated; neonatal floppy syndrome and withdrawal; avoid chronic use in pregnancy"},
    {"generic": "lorazepam", "category": "D", "schedule": "H1", "notes": "Benzodiazepine; used for eclampsia seizures acutely; chronic use — neonatal withdrawal and respiratory depression"},
    {"generic": "alprazolam", "category": "D", "schedule": "H1", "notes": "Benzodiazepine; neonatal withdrawal syndrome; avoid in pregnancy; taper slowly if currently on treatment"},
    {"generic": "midazolam", "category": "D", "schedule": "H1", "notes": "Short-acting benzodiazepine; used for procedural sedation and induction; neonatal respiratory depression if used near delivery"},
    {"generic": "temazepam", "category": "X", "schedule": "H1", "notes": "Benzodiazepine hypnotic; CONTRAINDICATED in pregnancy; neonatal withdrawal; avoid completely"},

    # ─── CORTICOSTEROIDS ───────────────────────────────────────────────────────
    {"generic": "prednisolone", "category": "C", "schedule": "H", "notes": "Oral corticosteroid; largely inactivated by placenta; risk of cleft palate in 1st trimester; used for autoimmune conditions"},
    {"generic": "dexamethasone", "category": "C", "schedule": "H", "notes": "Crosses placenta readily; used for fetal lung maturation 24-34 weeks; systemic use in pregnancy requires clear indication"},
    {"generic": "betamethasone", "category": "C", "schedule": "H", "notes": "Standard for fetal lung maturation before preterm delivery (24-34+6 weeks); given as two IM doses 24 hours apart"},
    {"generic": "hydrocortisone", "category": "C", "schedule": "H", "notes": "Used for adrenal insufficiency replacement in pregnancy; physiologic doses safe; stress dosing needed during labour"},
    {"generic": "methylprednisolone", "category": "C", "schedule": "H", "notes": "IV corticosteroid; used for severe inflammatory conditions in pregnancy; largely metabolised by placenta"},
    {"generic": "budesonide", "category": "C", "schedule": "H", "notes": "Inhaled budesonide preferred for asthma in pregnancy; minimal systemic absorption; safe for long-term inhaled use"},
    {"generic": "fluticasone", "category": "C", "schedule": "H", "notes": "Inhaled corticosteroid; safe at standard inhaled doses for asthma; poorly absorbed systemically when inhaled"},
    {"generic": "beclomethasone", "category": "C", "schedule": "H", "notes": "Inhaled corticosteroid; extensive pregnancy safety data; preferred choice for asthma maintenance in pregnancy"},

    # ─── ANTIHISTAMINES ────────────────────────────────────────────────────────
    {"generic": "cetirizine", "category": "B", "schedule": None, "notes": "2nd-generation antihistamine; generally safe; preferred for allergic rhinitis and urticaria in pregnancy"},
    {"generic": "loratadine", "category": "B", "schedule": None, "notes": "2nd-generation antihistamine; considered safe throughout pregnancy; no teratogenicity signal in large studies"},
    {"generic": "fexofenadine", "category": "C", "schedule": None, "notes": "2nd-generation antihistamine; limited human data; use loratadine or cetirizine preferentially"},
    {"generic": "chlorpheniramine", "category": "B", "schedule": None, "notes": "1st-generation antihistamine; long history of use; sedating; avoid large doses near delivery (neonatal withdrawal)"},
    {"generic": "promethazine", "category": "C", "schedule": "H", "notes": "Phenothiazine antihistamine; used for nausea and vomiting of pregnancy; avoid near delivery — neonatal respiratory depression"},
    {"generic": "diphenhydramine", "category": "B", "schedule": None, "notes": "1st-generation antihistamine; commonly used for allergies and insomnia; avoid near term — neonatal withdrawal"},
    {"generic": "hydroxyzine", "category": "C", "schedule": "H", "notes": "Antihistamine with anxiolytic properties; avoid in 1st trimester; possible neonatal withdrawal with late use"},

    # ─── PPIs AND H2 BLOCKERS ──────────────────────────────────────────────────
    {"generic": "omeprazole", "category": "C", "schedule": "H", "notes": "PPI; most commonly used; generally reassuring data but category C; pantoprazole preferred in some guidelines"},
    {"generic": "pantoprazole", "category": "B", "schedule": "H", "notes": "PPI; often preferred in pregnancy based on category B classification and reassuring safety data for GORD"},
    {"generic": "esomeprazole", "category": "B", "schedule": "H", "notes": "PPI; considered safe; S-isomer of omeprazole; used for GORD and peptic ulcer disease in pregnancy"},
    {"generic": "rabeprazole", "category": "B", "schedule": "H", "notes": "PPI; limited pregnancy data; use pantoprazole or omeprazole preferentially due to more available data"},
    {"generic": "ranitidine", "category": "B", "schedule": None, "notes": "H2 blocker; previously widely used; now withdrawn in many markets (NDMA contamination); famotidine preferred"},
    {"generic": "famotidine", "category": "B", "schedule": None, "notes": "H2 blocker; considered safe throughout pregnancy for heartburn and GORD; preferred H2 blocker currently"},
    {"generic": "sucralfate", "category": "B", "schedule": None, "notes": "Mucosal protectant; minimal systemic absorption; safe for use in peptic ulcer disease and GORD in pregnancy"},

    # ─── THYROID DRUGS ─────────────────────────────────────────────────────────
    {"generic": "levothyroxine", "category": "A", "schedule": "H", "notes": "Thyroid hormone replacement; essential in hypothyroidism — untreated hypothyroidism is harmful to fetal brain development; dose often needs increase"},
    {"generic": "propylthiouracil", "category": "D", "schedule": "H", "notes": "Antithyroid; preferred in 1st trimester for hyperthyroidism; risk of maternal hepatotoxicity; switch to carbimazole after 1st trimester"},
    {"generic": "methimazole", "category": "D", "schedule": "H", "notes": "Antithyroid; avoid in 1st trimester (aplasia cutis and choanal atresia); preferred in 2nd and 3rd trimester"},
    {"generic": "carbimazole", "category": "D", "schedule": "H", "notes": "Prodrug of methimazole; avoid in 1st trimester; use PTU in 1st trimester then switch; monitor fetal thyroid"},

    # ─── ANTIFUNGALS ───────────────────────────────────────────────────────────
    {"generic": "clotrimazole", "category": "B", "schedule": None, "notes": "Topical azole antifungal; safe for vulvovaginal candidiasis; minimal systemic absorption; first-line in pregnancy"},
    {"generic": "miconazole", "category": "C", "schedule": None, "notes": "Topical antifungal; systemic absorption minimal; topical use considered safe; oral gel — avoid in 1st trimester"},
    {"generic": "nystatin", "category": "B", "schedule": None, "notes": "Polyene antifungal; not absorbed systemically; safe for oral and vaginal candidiasis throughout pregnancy"},
    {"generic": "fluconazole", "category": "C", "schedule": "H", "notes": "Azole; single oral 150 mg dose for vaginal candidiasis relatively safe; prolonged high-dose use (400 mg) — fetal craniosynostosis risk; avoid"},
    {"generic": "ketoconazole", "category": "C", "schedule": "H", "notes": "Azole antifungal; avoid systemic use; anti-androgenic — may feminise male fetus; topical use only if necessary"},
    {"generic": "amphotericin b", "category": "B", "schedule": "H", "notes": "Polyene antifungal; used for serious systemic fungal infections; does not readily cross placenta; preferred systemic antifungal in pregnancy"},
    {"generic": "voriconazole", "category": "D", "schedule": "H", "notes": "Azole; teratogenic in animal studies; AVOID in pregnancy; use amphotericin B for systemic fungal infections instead"},
    {"generic": "itraconazole", "category": "C", "schedule": "H", "notes": "Azole; avoid in 1st trimester — possible teratogenicity; topical antifungals preferred in pregnancy"},

    # ─── ANTIVIRALS ────────────────────────────────────────────────────────────
    {"generic": "acyclovir", "category": "B", "schedule": "H", "notes": "Antiviral; safe for HSV and varicella in pregnancy; does not appear teratogenic; use for primary or severe outbreaks"},
    {"generic": "valacyclovir", "category": "B", "schedule": "H", "notes": "Prodrug of acyclovir; safe in pregnancy; used for HSV suppression and varicella-zoster; good oral bioavailability"},
    {"generic": "oseltamivir", "category": "C", "schedule": "H", "notes": "Neuraminidase inhibitor; benefits outweigh risks in influenza during pregnancy; start early; pregnancy is high-risk for severe flu"},
    {"generic": "tenofovir", "category": "B", "schedule": "H1", "notes": "Nucleotide reverse transcriptase inhibitor; preferred ARV for HIV in pregnancy; also used for hepatitis B"},
    {"generic": "zidovudine", "category": "C", "schedule": "H1", "notes": "NRTI; used in HIV management in pregnancy; reduces mother-to-child transmission; anaemia risk — monitor haemoglobin"},
    {"generic": "nevirapine", "category": "B", "schedule": "H1", "notes": "NNRTI; used in HIV in pregnancy; risk of hepatotoxicity in women with high CD4 counts — monitor liver function"},
    {"generic": "efavirenz", "category": "D", "schedule": "H1", "notes": "NNRTI; AVOID in 1st trimester — neural tube defect risk; may be continued if started before pregnancy after risk discussion"},
    {"generic": "ganciclovir", "category": "C", "schedule": "H", "notes": "Antiviral for CMV; teratogenic and embryotoxic in animals; use only for life-threatening CMV disease in pregnancy"},
    {"generic": "ribavirin", "category": "X", "schedule": "H", "notes": "CONTRAINDICATED in pregnancy; highly teratogenic; causes embryo-fetal death and malformations; requires strict contraception"},

    # ─── IRON, VITAMINS, AND NUTRITIONAL SUPPLEMENTS ──────────────────────────
    {"generic": "ferrous sulphate", "category": "A", "schedule": None, "notes": "Iron supplement; essential for prevention and treatment of iron deficiency anaemia in pregnancy; take between meals"},
    {"generic": "folic acid", "category": "A", "schedule": None, "notes": "B-vitamin; 400 mcg daily pre-conception and in 1st trimester reduces neural tube defect risk; 5 mg for high-risk women"},
    {"generic": "calcium carbonate", "category": "A", "schedule": None, "notes": "Calcium supplement; 1000-1200 mg/day recommended; also reduces pre-eclampsia risk in low-calcium populations"},
    {"generic": "vitamin d", "category": "A", "schedule": None, "notes": "Physiologic replacement (400-800 IU) safe and recommended; high doses (>4000 IU) may cause hypercalcaemia; supplement throughout"},
    {"generic": "vitamin b12", "category": "A", "schedule": None, "notes": "Essential during pregnancy; deficiency in vegetarians/vegans — supplement; important for fetal neural development"},
    {"generic": "vitamin c", "category": "A", "schedule": None, "notes": "Physiologic doses (85 mg/day RDA) safe and beneficial; megadoses theoretically may cause neonatal scurvy; avoid excess"},
    {"generic": "pyridoxine", "category": "A", "schedule": None, "notes": "Vitamin B6; used with doxylamine for nausea and vomiting of pregnancy (NVP); 10-25 mg three times daily; safe"},
    {"generic": "doxylamine", "category": "A", "schedule": None, "notes": "Antihistamine; combined with pyridoxine (Diclegis/Bonjesta); first-line pharmacotherapy for NVP; extensive safety record"},

    # ─── ANTIEMETICS / GI DRUGS ───────────────────────────────────────────────
    {"generic": "ondansetron", "category": "B", "schedule": "H", "notes": "5-HT3 antagonist; used for hyperemesis gravidarum; caution in 1st trimester — possible small cardiac septal defect risk; use after risk discussion"},
    {"generic": "metoclopramide", "category": "B", "schedule": "H", "notes": "Dopamine antagonist; used for nausea and vomiting in pregnancy and hyperemesis; generally safe; extrapyramidal effects with prolonged use"},
    {"generic": "domperidone", "category": "C", "schedule": "H", "notes": "Dopamine antagonist; limited pregnancy data; avoid in 1st trimester; metoclopramide preferred for nausea in pregnancy"},
    {"generic": "loperamide", "category": "B", "schedule": None, "notes": "Antidiarrhoeal; minimal systemic absorption; generally considered safe; avoid chronic use; treat underlying cause"},
    {"generic": "bisacodyl", "category": "C", "schedule": None, "notes": "Stimulant laxative; avoid prolonged use; lactulose or bulking agents preferred for constipation in pregnancy"},
    {"generic": "lactulose", "category": "B", "schedule": None, "notes": "Osmotic laxative; not absorbed; safe for constipation throughout pregnancy; first-line osmotic laxative"},
    {"generic": "mesalamine", "category": "B", "schedule": "H", "notes": "5-ASA; used for IBD (ulcerative colitis, Crohn's) in pregnancy; disease control in IBD reduces adverse pregnancy outcomes"},
    {"generic": "sulfasalazine", "category": "B", "schedule": "H", "notes": "Sulfonamide + 5-ASA; used for IBD and rheumatoid arthritis; supplement folic acid 5 mg/day (folate antagonism)"},
    {"generic": "n-acetylcysteine", "category": "B", "schedule": "H", "notes": "Mucolytic and antidote; used for paracetamol overdose in pregnancy; safe; N-acetylcysteine should not be withheld in overdose"},

    # ─── OXYTOCICS AND REPRODUCTIVE DRUGS ─────────────────────────────────────
    {"generic": "oxytocin", "category": "C", "schedule": "H", "notes": "Used for induction of labour and management of postpartum haemorrhage; standard obstetric drug; monitor for water intoxication"},
    {"generic": "misoprostol", "category": "X", "schedule": "H", "notes": "Prostaglandin E1; CONTRAINDICATED as abortifacient outside approved medical use; used medically for PPH, cervical ripening under supervision"},
    {"generic": "mifepristone", "category": "X", "schedule": "H1", "notes": "Antiprogestogen; CONTRAINDICATED for continuation of pregnancy; used only for medical termination of pregnancy under strict protocols"},
    {"generic": "progesterone", "category": "B", "schedule": "H", "notes": "Naturally occurring hormone; used for luteal phase support, recurrent miscarriage prevention, and threatened preterm labour"},
    {"generic": "hydroxyprogesterone caproate", "category": "B", "schedule": "H", "notes": "Synthetic progestogen; used for prevention of preterm birth in women with prior preterm delivery; weekly IM injections"},

    # ─── ANTIPSYCHOTICS ────────────────────────────────────────────────────────
    {"generic": "haloperidol", "category": "C", "schedule": "H", "notes": "Typical antipsychotic; limb reduction defect reports (weak signal); neonatal extrapyramidal effects at delivery; use lowest dose"},
    {"generic": "olanzapine", "category": "C", "schedule": "H", "notes": "Atypical antipsychotic; neonatal metabolic effects; gestational diabetes risk increased; monitor blood glucose"},
    {"generic": "quetiapine", "category": "C", "schedule": "H", "notes": "Atypical antipsychotic; commonly used in pregnancy for bipolar and psychosis; monitor for neonatal adaptation syndrome"},
    {"generic": "risperidone", "category": "C", "schedule": "H", "notes": "Atypical antipsychotic; limited data but used when benefits outweigh risks; neonatal extrapyramidal effects possible"},
    {"generic": "clozapine", "category": "B", "schedule": "H1", "notes": "Atypical antipsychotic; limited pregnancy data; neonatal seizures and agranulocytosis reported; use only for treatment-resistant schizophrenia"},

    # ─── MOOD STABILISERS ──────────────────────────────────────────────────────
    {"generic": "lithium", "category": "D", "schedule": "H", "notes": "Mood stabiliser; Ebstein's anomaly risk (cardiac malformation) in 1st trimester; neonatal toxicity; monitor levels carefully throughout"},

    # ─── ANTIMALARIALS / RHEUMATOLOGY ──────────────────────────────────────────
    {"generic": "hydroxychloroquine", "category": "C", "schedule": "H", "notes": "Antimalarial; used for SLE and rheumatoid arthritis in pregnancy; generally safe; associated with improved SLE outcomes"},
    {"generic": "chloroquine", "category": "C", "schedule": "H", "notes": "Antimalarial; used for malaria prophylaxis and treatment; crosses placenta; safe at antimalarial doses; avoid large doses"},
    {"generic": "colchicine", "category": "C", "schedule": "H", "notes": "Used for familial Mediterranean fever and gout; limited data; some teratogenicity concern; use only if clearly needed"},
    {"generic": "allopurinol", "category": "C", "schedule": "H", "notes": "Xanthine oxidase inhibitor for gout; animal data shows teratogenicity; avoid in pregnancy; manage gout with dietary measures"},

    # ─── CARDIAC DRUGS ─────────────────────────────────────────────────────────
    {"generic": "digoxin", "category": "C", "schedule": "H", "notes": "Cardiac glycoside; used for rate control in AF and heart failure; crosses placenta; monitor maternal and fetal levels"},
    {"generic": "amiodarone", "category": "D", "schedule": "H", "notes": "Antiarrhythmic; avoid unless life-threatening arrhythmia; causes neonatal hypothyroidism, bradycardia, and IUGR; iodine content"},
    {"generic": "ivabradine", "category": "C", "schedule": "H", "notes": "If channel blocker; NOT recommended in pregnancy; discontinue when pregnancy confirmed; embryotoxic in animal studies"},

    # ─── RESPIRATORY DRUGS ─────────────────────────────────────────────────────
    {"generic": "salbutamol", "category": "C", "schedule": "H", "notes": "Short-acting beta-2 agonist; used for acute asthma and tocolysis (preterm labour); generally safe; tachycardia and tremor"},
    {"generic": "salmeterol", "category": "C", "schedule": "H", "notes": "Long-acting beta-2 agonist; use with inhaled corticosteroid for uncontrolled asthma; preferred over oral bronchodilators"},
    {"generic": "formoterol", "category": "C", "schedule": "H", "notes": "Long-acting beta-2 agonist; used for asthma control; inhaled route minimises systemic exposure; data limited but reassuring"},
    {"generic": "tiotropium", "category": "C", "schedule": "H", "notes": "Long-acting anticholinergic bronchodilator; limited human pregnancy data; use only if COPD/asthma not controlled otherwise"},
    {"generic": "ipratropium", "category": "B", "schedule": "H", "notes": "Short-acting anticholinergic bronchodilator; minimal systemic absorption; used for COPD and acute asthma adjunct; generally safe"},
    {"generic": "montelukast", "category": "B", "schedule": "H", "notes": "Leukotriene receptor antagonist; limited data but no clear teratogenicity signal; continue if needed for asthma control"},

    # ─── IMMUNOSUPPRESSANTS / ONCOLOGY ────────────────────────────────────────
    {"generic": "methotrexate", "category": "X", "schedule": "H", "notes": "CONTRAINDICATED; potent teratogen and abortifacient; causes fetal death and malformations; requires reliable contraception"},
    {"generic": "cyclophosphamide", "category": "D", "schedule": "H1", "notes": "Alkylating agent; teratogenic especially in 1st trimester; used for life-threatening conditions only; neonatal myelosuppression"},
    {"generic": "azathioprine", "category": "D", "schedule": "H", "notes": "Immunosuppressant; used for IBD, transplant, and autoimmune conditions; generally continued in pregnancy if controlling disease"},
    {"generic": "cyclosporine", "category": "C", "schedule": "H1", "notes": "Calcineurin inhibitor; used in transplant recipients in pregnancy; IUGR and premature birth risk; monitor levels closely"},
    {"generic": "tacrolimus", "category": "C", "schedule": "H1", "notes": "Calcineurin inhibitor; transplant recipients — do not stop in pregnancy; neonatal hyperkalaemia and renal impairment reported"},
    {"generic": "tamoxifen", "category": "D", "schedule": "H", "notes": "SERM; avoid in pregnancy; embryotoxic and teratogenic; effective contraception required; delay conception 2 months after stopping"},

    # ─── DERMATOLOGY / TERATOGENIC DRUGS ──────────────────────────────────────
    {"generic": "isotretinoin", "category": "X", "schedule": "H1", "notes": "CONTRAINDICATED; extremely teratogenic — CNS, cardiac, and craniofacial defects; iPledge programme mandatory; stop 1 month before conception"},
    {"generic": "thalidomide", "category": "X", "schedule": "H1", "notes": "CONTRAINDICATED; causes severe limb reduction defects (phocomelia); strict pregnancy prevention programme required"},
    {"generic": "finasteride", "category": "X", "schedule": "H", "notes": "5-alpha reductase inhibitor; CONTRAINDICATED; feminisation of male fetus; women should not handle crushed tablets"},

    # ─── UROLOGY / SEXUAL HEALTH ───────────────────────────────────────────────
    {"generic": "sildenafil", "category": "B", "schedule": "H", "notes": "PDE5 inhibitor; investigational use for fetal growth restriction and pulmonary hypertension in pregnancy; not routine use"},
    {"generic": "tadalafil", "category": "B", "schedule": "H", "notes": "PDE5 inhibitor; used off-label for pulmonary arterial hypertension in pregnancy; limited data; specialist supervision only"},

    # ─── EMERGENCY AND CRITICAL CARE ──────────────────────────────────────────
    {"generic": "adrenaline", "category": "C", "schedule": "H", "notes": "Epinephrine; used in anaphylaxis — do NOT withhold in emergency; may reduce uterine blood flow transiently; life-saving benefit overrides risk"},
    {"generic": "atropine", "category": "C", "schedule": "H", "notes": "Anticholinergic; used in bradycardia and anaesthesia; crosses placenta causing fetal tachycardia; brief use in emergency acceptable"},

    # ─── ADDITIONAL COMMONLY ENCOUNTERED DRUGS ────────────────────────────────
    {"generic": "iodine (povidone)", "category": "D", "schedule": None, "notes": "Topical iodine; avoid prolonged use — iodine crosses placenta and may cause neonatal hypothyroidism; use chlorhexidine instead"},
    {"generic": "zinc", "category": "A", "schedule": None, "notes": "Micronutrient; supplementation safe at recommended doses; deficiency associated with IUGR; part of prenatal vitamins"},
    {"generic": "magnesium oxide", "category": "A", "schedule": None, "notes": "Magnesium supplement; constipation relief and leg cramp management in pregnancy; safe at nutritional doses"},
    {"generic": "clonidine", "category": "C", "schedule": "H", "notes": "Central alpha-2 agonist; used for hypertension; limited pregnancy data; methyldopa preferred; neonatal withdrawal reported"},
    {"generic": "nystatin (oral)", "category": "B", "schedule": None, "notes": "Oral antifungal for oropharyngeal candidiasis; not absorbed systemically; safe throughout pregnancy"},
    {"generic": "docusate sodium", "category": "C", "schedule": None, "notes": "Stool softener; generally considered safe for constipation in pregnancy; use lactulose as first-line osmotic agent"},
    {"generic": "senna", "category": "C", "schedule": None, "notes": "Stimulant laxative; avoid prolonged use in pregnancy; short-term use acceptable if bulk laxatives ineffective"},
    {"generic": "betahistine", "category": "C", "schedule": "H", "notes": "Histamine analogue for Meniere's disease; limited pregnancy data; avoid unless clearly necessary"},
    {"generic": "cinnarizine", "category": "C", "schedule": None, "notes": "Antihistamine/antivertigo; limited pregnancy data; avoid in 1st trimester; promethazine preferred for nausea"},
    {"generic": "cetirizine levo (levocetirizine)", "category": "B", "schedule": None, "notes": "R-enantiomer of cetirizine; considered safe based on cetirizine data; use cetirizine if available"},
    {"generic": "chlorhexidine", "category": "B", "schedule": None, "notes": "Antiseptic; topical use safe; vaginal chlorhexidine not proven to reduce GBS transmission; safe for wound care"},
    {"generic": "povidone iodine vaginal", "category": "D", "schedule": None, "notes": "Avoid vaginal use in pregnancy; significant iodine absorption can cause neonatal thyroid suppression"},
    {"generic": "tranexamic acid", "category": "B", "schedule": "H", "notes": "Antifibrinolytic; used for postpartum haemorrhage; crosses placenta but no evidence of fetal harm; PPH indication is established"},
    {"generic": "carboprost", "category": "C", "schedule": "H", "notes": "Prostaglandin F2alpha; used for refractory postpartum haemorrhage; not for fetal use; uterotonic in obstetric emergency"},
    {"generic": "ergometrine", "category": "C", "schedule": "H", "notes": "Ergot alkaloid; used for postpartum haemorrhage; not for use before delivery — causes sustained uterine contraction"},
    {"generic": "methylergometrine", "category": "C", "schedule": "H", "notes": "Ergot alkaloid; used postpartum for uterine atony; AVOID in hypertension; do not use before delivery of placenta"},
    {"generic": "dexamethasone (antenatal)", "category": "C", "schedule": "H", "notes": "Single course for fetal lung maturation 24-34+6 weeks; repeat courses discouraged — neonatal adrenal suppression and IUGR risk"},
    {"generic": "ritodrine", "category": "B", "schedule": "H", "notes": "Beta-2 agonist tocolytic; used for preterm labour suppression; maternal tachycardia and pulmonary oedema risk; largely replaced by nifedipine"},
    {"generic": "terbutaline", "category": "B", "schedule": "H", "notes": "Beta-2 agonist; used as tocolytic for acute preterm labour; not for prolonged use (maternal cardiac risk); nifedipine preferred"},
    {"generic": "indometacin (rectal)", "category": "C", "schedule": "H", "notes": "NSAID tocolytic; effective before 32 weeks; avoid after 32 weeks (premature ductus arteriosus closure); monitor amniotic fluid"},
    {"generic": "atosiban", "category": "B", "schedule": "H", "notes": "Oxytocin receptor antagonist tocolytic; used for preterm labour 24-33+6 weeks; fewer maternal side effects than beta-2 agonists"},
    {"generic": "naltrexone", "category": "C", "schedule": "H", "notes": "Opioid antagonist; used for alcohol and opioid use disorder; limited pregnancy data; buprenorphine/methadone preferred for OUD"},
    {"generic": "methadone", "category": "C", "schedule": "H1", "notes": "Opioid agonist; used for opioid use disorder maintenance; neonatal abstinence syndrome expected but managed; do not abruptly stop"},
    {"generic": "acitretin", "category": "X", "schedule": "H", "notes": "Retinoid for psoriasis; CONTRAINDICATED; teratogenic like isotretinoin; avoid conception for 3 years after stopping"},
    {"generic": "leflunomide", "category": "X", "schedule": "H", "notes": "DMARD; CONTRAINDICATED in pregnancy; teratogenic; requires washout with cholestyramine before conception is attempted"},
    {"generic": "hydroxyzine pamoate", "category": "C", "schedule": "H", "notes": "Antihistamine anxiolytic; avoid in 1st trimester; neonatal withdrawal with late use; use cetirizine for allergy"},
    {"generic": "betamethasone valerate (topical)", "category": "C", "schedule": "H", "notes": "Topical corticosteroid for skin conditions; use weakest effective preparation; avoid large areas or occlusion in pregnancy"},
    {"generic": "hydrocortisone cream (topical)", "category": "C", "schedule": None, "notes": "Mild topical corticosteroid; safe for short-term use on limited skin areas in pregnancy; preferred topical steroid"},
    {"generic": "permethrin", "category": "B", "schedule": None, "notes": "Topical antiparasitic for scabies and lice; minimal systemic absorption; considered safe in pregnancy"},
    {"generic": "ivermectin", "category": "C", "schedule": "H", "notes": "Antiparasitic; limited human data; avoid in 1st trimester; permethrin topical preferred for scabies in pregnancy"},
    {"generic": "albendazole", "category": "C", "schedule": "H", "notes": "Anthelmintic; AVOID in 1st trimester (embryotoxic in animals); use in 2nd/3rd trimester for helminthiasis if needed"},
    {"generic": "mebendazole", "category": "C", "schedule": "H", "notes": "Anthelmintic; minimal absorption; avoid in 1st trimester; single dose acceptable after 1st trimester for pinworm"},
    {"generic": "praziquantel", "category": "B", "schedule": "H", "notes": "Anthelmintic for schistosomiasis and tapeworm; limited pregnancy data; use when benefit clearly outweighs risk"},
    {"generic": "dapsone", "category": "C", "schedule": "H", "notes": "Antimicrobial/antiparasitic; used for leprosy and dermatitis herpetiformis; neonatal haemolytic anaemia risk; supplement folic acid"},
    {"generic": "rifaximin", "category": "C", "schedule": "H", "notes": "Non-absorbable antibiotic for traveller's diarrhoea; minimal systemic absorption; limited pregnancy data; use only if needed"},
    {"generic": "tinidazole", "category": "C", "schedule": "H", "notes": "Nitroimidazole; similar to metronidazole; avoid in 1st trimester; use metronidazole as it has more pregnancy safety data"},
    {"generic": "secnidazole", "category": "C", "schedule": "H", "notes": "Nitroimidazole; single dose for bacterial vaginosis; avoid in 1st trimester; prefer metronidazole for BV in pregnancy"},
    {"generic": "nalidixic acid", "category": "C", "schedule": "H", "notes": "Old quinolone; avoid — arthropathy risk and haemolytic anaemia in G6PD-deficient neonates; use nitrofurantoin for UTI"},
    {"generic": "fosfomycin", "category": "B", "schedule": "H", "notes": "Phosphonic acid antibiotic; single-dose oral treatment for uncomplicated UTI in pregnancy; considered safe; limited data"},
    {"generic": "pivmecillinam", "category": "B", "schedule": "H", "notes": "Penicillin-class; used for uncomplicated UTI; considered safe in pregnancy; avoid near term (carnitine depletion)"},
    {"generic": "cefazolin", "category": "B", "schedule": "H", "notes": "1st-generation cephalosporin; used for surgical prophylaxis including caesarean section; safe in pregnancy"},
    {"generic": "ampicillin", "category": "B", "schedule": "H", "notes": "Aminopenicillin; used for GBS prophylaxis in labour and UTI; safe; ampicillin + sulbactam for polymicrobial infection"},
    {"generic": "cloxacillin", "category": "B", "schedule": "H", "notes": "Anti-staphylococcal penicillin; safe in pregnancy for skin and soft tissue infections caused by MSSA"},
    {"generic": "doxylamine-pyridoxine", "category": "A", "schedule": None, "notes": "Combination for nausea and vomiting of pregnancy; most evidence-based pharmacotherapy for NVP; safe in 1st trimester"},
    {"generic": "thiamine", "category": "A", "schedule": None, "notes": "Vitamin B1; high-dose IV thiamine essential in hyperemesis gravidarum before glucose to prevent Wernicke's encephalopathy"},
    {"generic": "magnesium trisilicate", "category": "B", "schedule": None, "notes": "Antacid; safe for heartburn in pregnancy; magnesium-containing antacids preferred over sodium bicarbonate"},
    {"generic": "aluminium hydroxide", "category": "B", "schedule": None, "notes": "Antacid; generally safe; avoid prolonged high-dose use (phosphate depletion); occasional use acceptable for heartburn"},
    {"generic": "sodium bicarbonate", "category": "C", "schedule": None, "notes": "Antacid; avoid regular use in pregnancy — sodium loading and metabolic alkalosis risk; use magnesium antacids instead"},
]
