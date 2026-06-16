"""
Clinical & surgical procedures — curated for Indian hospital use.
Format: {display, specialty, synonyms}
Covers: diagnostic, therapeutic, surgical, obstetric, orthopaedic,
        cardiovascular, endoscopic, radiological, minor procedures.
"""

PROCEDURES = [
    # ── Diagnostic / General ──────────────────────────────────────────────────
    {"display": "Fine Needle Aspiration Cytology (FNAC)", "specialty": "general_medicine", "synonyms": "FNAC|fine needle aspiration|needle biopsy"},
    {"display": "Core Needle Biopsy", "specialty": "general_medicine", "synonyms": "core biopsy|trucut biopsy|needle core biopsy"},
    {"display": "Excisional Biopsy", "specialty": "general_medicine", "synonyms": "excision biopsy|open biopsy|excisional biopsy"},
    {"display": "Incisional Biopsy", "specialty": "general_medicine", "synonyms": "incision biopsy|tissue biopsy"},
    {"display": "Lumbar Puncture (Spinal tap)", "specialty": "neurology", "synonyms": "LP|lumbar puncture|spinal tap|CSF tap|cerebrospinal fluid tap"},
    {"display": "Bone Marrow Biopsy", "specialty": "hematology", "synonyms": "bone marrow|BM biopsy|trephine biopsy"},
    {"display": "Bone Marrow Aspiration", "specialty": "hematology", "synonyms": "BMA|bone marrow aspiration|marrow tap"},

    # ── Endoscopy ─────────────────────────────────────────────────────────────
    {"display": "Upper GI Endoscopy (OGD Scopy)", "specialty": "gastroenterology", "synonyms": "OGD|upper endoscopy|gastroscopy|oesophagogastroduodenoscopy|UGI scopy"},
    {"display": "Colonoscopy", "specialty": "gastroenterology", "synonyms": "colonoscopy|lower GI endoscopy|colon scope"},
    {"display": "Sigmoidoscopy", "specialty": "gastroenterology", "synonyms": "sigmoidoscopy|flexible sigmoidoscopy"},
    {"display": "ERCP (Endoscopic retrograde cholangiopancreatography)", "specialty": "gastroenterology", "synonyms": "ERCP|biliary endoscopy|endoscopic retrograde"},
    {"display": "Bronchoscopy", "specialty": "pulmonology", "synonyms": "bronchoscopy|airway endoscopy|bronchial scope"},
    {"display": "EBUS (Endobronchial ultrasound)", "specialty": "pulmonology", "synonyms": "EBUS|endobronchial ultrasound"},
    {"display": "Cystoscopy", "specialty": "urology", "synonyms": "cystoscopy|bladder scope|cystourethroscopy"},
    {"display": "Ureteroscopy", "specialty": "urology", "synonyms": "ureteroscopy|URS|ureter scope"},
    {"display": "Hysteroscopy", "specialty": "obstetrics/gynecology", "synonyms": "hysteroscopy|uterine scope"},
    {"display": "Laparoscopy (Diagnostic)", "specialty": "general_medicine", "synonyms": "diagnostic laparoscopy|keyhole camera|lap scope"},
    {"display": "Arthroscopy", "specialty": "orthopedics", "synonyms": "arthroscopy|joint scope|knee arthroscopy"},
    {"display": "Nasal endoscopy", "specialty": "ent", "synonyms": "nasal endoscopy|rhinoscopy|nasal scope"},

    # ── Cardiovascular procedures ─────────────────────────────────────────────
    {"display": "Coronary Angiography", "specialty": "cardiology", "synonyms": "CAG|angiography|coronary cath|heart catheter|cath lab"},
    {"display": "Percutaneous Coronary Intervention (PCI / Angioplasty)", "specialty": "cardiology", "synonyms": "PCI|angioplasty|PTCA|balloon angioplasty|stenting|coronary stent"},
    {"display": "Coronary Artery Bypass Graft (CABG)", "specialty": "cardiology", "synonyms": "CABG|bypass surgery|heart bypass|open heart bypass"},
    {"display": "Echocardiography (Echo)", "specialty": "cardiology", "synonyms": "echo|echocardiography|cardiac ultrasound|2D echo|Doppler echo"},
    {"display": "Transesophageal Echocardiography (TEE)", "specialty": "cardiology", "synonyms": "TEE|TOE|transesophageal echo|trans-oesophageal echocardiography"},
    {"display": "Pacemaker Implantation", "specialty": "cardiology", "synonyms": "pacemaker|PPM|permanent pacemaker|cardiac pacemaker"},
    {"display": "Implantable Cardioverter Defibrillator (ICD)", "specialty": "cardiology", "synonyms": "ICD implant|defibrillator|AICD"},
    {"display": "Cardiac Catheterization", "specialty": "cardiology", "synonyms": "cardiac cath|right heart cath|left heart cath"},
    {"display": "Cardioversion (DC cardioversion)", "specialty": "cardiology", "synonyms": "DC cardioversion|cardioversion|DCCV|electrical cardioversion"},
    {"display": "Ablation (Radiofrequency)", "specialty": "cardiology", "synonyms": "RF ablation|radiofrequency ablation|cardiac ablation|EPS ablation"},
    {"display": "Peripheral Angioplasty", "specialty": "cardiology", "synonyms": "peripheral angioplasty|limb angioplasty|PTA"},
    {"display": "Carotid Endarterectomy", "specialty": "cardiology", "synonyms": "CEA|carotid endarterectomy|carotid surgery"},
    {"display": "Valve Replacement (Mitral/Aortic)", "specialty": "cardiology", "synonyms": "valve replacement|MVR|AVR|TAVR|TAVI|prosthetic valve"},

    # ── General surgery ───────────────────────────────────────────────────────
    {"display": "Appendectomy", "specialty": "surgery", "synonyms": "appendectomy|appendicectomy|appendix removal"},
    {"display": "Cholecystectomy (Laparoscopic)", "specialty": "surgery", "synonyms": "lap chole|laparoscopic cholecystectomy|gallbladder removal"},
    {"display": "Open Cholecystectomy", "specialty": "surgery", "synonyms": "open chole|open cholecystectomy"},
    {"display": "Hernia Repair (Inguinal)", "specialty": "surgery", "synonyms": "inguinal hernia repair|herniorraphy|hernioplasty|hernia mesh"},
    {"display": "Hernia Repair (Umbilical)", "specialty": "surgery", "synonyms": "umbilical hernia repair|umbilical hernioplasty"},
    {"display": "Hernia Repair (Hiatal)", "specialty": "surgery", "synonyms": "hiatal hernia repair|Nissen fundoplication"},
    {"display": "Haemorrhoidectomy", "specialty": "surgery", "synonyms": "haemorrhoidectomy|hemorrhoidectomy|piles surgery"},
    {"display": "Fistulectomy / Fistulotomy", "specialty": "surgery", "synonyms": "fistulectomy|fistulotomy|fistula surgery|anal fistula"},
    {"display": "Colostomy", "specialty": "surgery", "synonyms": "colostomy|stoma|bowel diversion"},
    {"display": "Ileostomy", "specialty": "surgery", "synonyms": "ileostomy|ileal stoma"},
    {"display": "Colectomy", "specialty": "surgery", "synonyms": "colectomy|colon resection|bowel resection|hemicolectomy"},
    {"display": "Gastrectomy", "specialty": "surgery", "synonyms": "gastrectomy|stomach removal|partial gastrectomy|subtotal gastrectomy"},
    {"display": "Splenectomy", "specialty": "surgery", "synonyms": "splenectomy|spleen removal"},
    {"display": "Thyroidectomy", "specialty": "surgery", "synonyms": "thyroidectomy|total thyroidectomy|hemithyroidectomy|thyroid removal"},
    {"display": "Parathyroidectomy", "specialty": "surgery", "synonyms": "parathyroidectomy|parathyroid removal"},
    {"display": "Adrenalectomy", "specialty": "surgery", "synonyms": "adrenalectomy|adrenal gland removal"},
    {"display": "Mastectomy", "specialty": "surgery", "synonyms": "mastectomy|breast removal|radical mastectomy|modified radical mastectomy"},
    {"display": "Lumpectomy (Wide local excision)", "specialty": "surgery", "synonyms": "lumpectomy|wide local excision|WLE|breast lump removal"},
    {"display": "Sentinel Lymph Node Biopsy", "specialty": "surgery", "synonyms": "SLNB|sentinel node biopsy|sentinel biopsy"},
    {"display": "Liver Resection (Hepatectomy)", "specialty": "surgery", "synonyms": "hepatectomy|liver resection|partial hepatectomy"},
    {"display": "Whipple Procedure (Pancreaticoduodenectomy)", "specialty": "surgery", "synonyms": "Whipple|pancreaticoduodenectomy|pancreas surgery"},
    {"display": "Nephrectomy", "specialty": "urology", "synonyms": "nephrectomy|kidney removal|radical nephrectomy|partial nephrectomy"},

    # ── Orthopaedic procedures ────────────────────────────────────────────────
    {"display": "Total Hip Replacement (THR)", "specialty": "orthopedics", "synonyms": "THR|total hip replacement|hip arthroplasty|hip prosthesis"},
    {"display": "Total Knee Replacement (TKR)", "specialty": "orthopedics", "synonyms": "TKR|total knee replacement|knee arthroplasty|knee prosthesis"},
    {"display": "Partial Knee Replacement (UKR)", "specialty": "orthopedics", "synonyms": "UKR|unicompartmental knee|partial knee arthroplasty"},
    {"display": "ACL Reconstruction", "specialty": "orthopedics", "synonyms": "ACL repair|anterior cruciate ligament reconstruction|knee ligament surgery"},
    {"display": "Meniscectomy", "specialty": "orthopedics", "synonyms": "meniscectomy|meniscus surgery|meniscal repair"},
    {"display": "Open Reduction Internal Fixation (ORIF)", "specialty": "orthopedics", "synonyms": "ORIF|fracture fixation|internal fixation|plating"},
    {"display": "Intramedullary Nailing", "specialty": "orthopedics", "synonyms": "IM nail|intramedullary nail|nail fixation|tibial nail|femoral nail"},
    {"display": "External Fixation", "specialty": "orthopedics", "synonyms": "external fixator|Ilizarov|external frame"},
    {"display": "Spinal Fusion", "specialty": "orthopedics", "synonyms": "spinal fusion|PLIF|TLIF|ALIF|posterior fusion|vertebral fusion"},
    {"display": "Discectomy", "specialty": "orthopedics", "synonyms": "discectomy|disc removal|microdiscectomy|lumbar discectomy"},
    {"display": "Laminectomy", "specialty": "orthopedics", "synonyms": "laminectomy|decompression spine|lamina removal"},
    {"display": "Hemiarthroplasty (Hip)", "specialty": "orthopedics", "synonyms": "hemiarthroplasty|partial hip replacement|femoral head prosthesis|Austin Moore"},
    {"display": "Arthrodesis (Joint fusion)", "specialty": "orthopedics", "synonyms": "arthrodesis|joint fusion|ankle fusion"},
    {"display": "Amputation", "specialty": "orthopedics", "synonyms": "amputation|below knee amputation|above knee amputation|BKA|AKA"},
    {"display": "Rotator Cuff Repair", "specialty": "orthopedics", "synonyms": "rotator cuff repair|shoulder cuff repair|supraspinatus repair"},

    # ── Neurosurgical ─────────────────────────────────────────────────────────
    {"display": "Craniotomy", "specialty": "neurology", "synonyms": "craniotomy|brain surgery|open skull surgery"},
    {"display": "VP Shunt (Ventriculoperitoneal shunt)", "specialty": "neurology", "synonyms": "VP shunt|ventriculoperitoneal shunt|hydrocephalus shunt|CSF shunt"},
    {"display": "Burr Hole Drainage", "specialty": "neurology", "synonyms": "burr hole|skull drilling|subdural drainage"},
    {"display": "Endoscopic Third Ventriculostomy (ETV)", "specialty": "neurology", "synonyms": "ETV|ventriculostomy|endoscopic hydrocephalus"},

    # ── Urological procedures ─────────────────────────────────────────────────
    {"display": "Transurethral Resection of Prostate (TURP)", "specialty": "urology", "synonyms": "TURP|prostate resection|prostate shaving"},
    {"display": "PCNL (Percutaneous Nephrolithotomy)", "specialty": "urology", "synonyms": "PCNL|kidney stone surgery|percutaneous nephrolithotomy"},
    {"display": "ESWL (Extracorporeal Shock Wave Lithotripsy)", "specialty": "urology", "synonyms": "ESWL|lithotripsy|kidney stone crushing|shock wave"},
    {"display": "Circumcision", "specialty": "urology", "synonyms": "circumcision|prepuce removal|posthectomy"},
    {"display": "Vasectomy", "specialty": "urology", "synonyms": "vasectomy|male sterilisation|male family planning"},
    {"display": "Orchidectomy", "specialty": "urology", "synonyms": "orchidectomy|orchiectomy|testis removal"},

    # ── Gynaecological / Obstetric ────────────────────────────────────────────
    {"display": "Caesarean Section (LSCS)", "specialty": "obstetrics/gynecology", "synonyms": "LSCS|caesarean|C-section|lower segment caesarean"},
    {"display": "Normal Vaginal Delivery (NVD)", "specialty": "obstetrics/gynecology", "synonyms": "NVD|normal delivery|SVD|spontaneous vaginal delivery"},
    {"display": "Forceps Delivery", "specialty": "obstetrics/gynecology", "synonyms": "forceps delivery|instrumental delivery|outlet forceps"},
    {"display": "Vacuum Delivery", "specialty": "obstetrics/gynecology", "synonyms": "vacuum delivery|ventouse|suction delivery"},
    {"display": "Hysterectomy (Total)", "specialty": "obstetrics/gynecology", "synonyms": "total hysterectomy|TAH|uterus removal|womb removal"},
    {"display": "Hysterectomy (Laparoscopic)", "specialty": "obstetrics/gynecology", "synonyms": "laparoscopic hysterectomy|TLH|minimally invasive hysterectomy"},
    {"display": "Myomectomy", "specialty": "obstetrics/gynecology", "synonyms": "myomectomy|fibroid removal|fibroid surgery"},
    {"display": "Ovarian Cystectomy", "specialty": "obstetrics/gynecology", "synonyms": "ovarian cyst removal|cystectomy|oophorectomy"},
    {"display": "Tubal Ligation (Tubectomy)", "specialty": "obstetrics/gynecology", "synonyms": "tubectomy|tubal ligation|female sterilisation|fallopian tube tying"},
    {"display": "Dilatation & Curettage (D&C)", "specialty": "obstetrics/gynecology", "synonyms": "D&C|dilatation curettage|uterine curettage"},
    {"display": "LEEP / LLETZ (Cervical)", "specialty": "obstetrics/gynecology", "synonyms": "LEEP|LLETZ|cervical loop excision|cervical transformation zone"},
    {"display": "Episiotomy", "specialty": "obstetrics/gynecology", "synonyms": "episiotomy|perineal cut|perineotomy"},
    {"display": "Manual Removal of Placenta (MROP)", "specialty": "obstetrics/gynecology", "synonyms": "MROP|manual placenta removal|retained placenta"},

    # ── Chest / Pulmonary procedures ──────────────────────────────────────────
    {"display": "Chest Tube Insertion (Intercostal Drain)", "specialty": "pulmonology", "synonyms": "ICD|intercostal drain|chest tube|thoracostomy tube"},
    {"display": "Thoracocentesis (Pleural tap)", "specialty": "pulmonology", "synonyms": "pleural tap|thoracocentesis|pleurocentesis|fluid drainage chest"},
    {"display": "Pleurodesis", "specialty": "pulmonology", "synonyms": "pleurodesis|pleural sclerosis|talc pleurodesis"},
    {"display": "Video-Assisted Thoracoscopic Surgery (VATS)", "specialty": "pulmonology", "synonyms": "VATS|thoracoscopy|keyhole chest surgery"},
    {"display": "Thoracotomy", "specialty": "pulmonology", "synonyms": "thoracotomy|open chest surgery|chest opening"},
    {"display": "Tracheostomy", "specialty": "ent", "synonyms": "tracheostomy|tracheotomy|tracheal opening|neck breathing hole"},

    # ── Endocrine ─────────────────────────────────────────────────────────────
    {"display": "Radioiodine Therapy (I-131)", "specialty": "endocrinology", "synonyms": "radioiodine|I-131|radioactive iodine|thyroid ablation"},

    # ── Minor / Bedside procedures ────────────────────────────────────────────
    {"display": "Ascitic Tap (Paracentesis)", "specialty": "gastroenterology", "synonyms": "paracentesis|ascitic tap|abdominal tap|tapping ascites"},
    {"display": "Pericardiocentesis", "specialty": "cardiology", "synonyms": "pericardiocentesis|pericardial tap|cardiac tamponade drainage"},
    {"display": "Abscess Incision & Drainage (I&D)", "specialty": "general_medicine", "synonyms": "I&D|abscess drainage|incision drainage"},
    {"display": "Wound Debridement", "specialty": "general_medicine", "synonyms": "debridement|wound cleaning|wound excision"},
    {"display": "Skin Grafting", "specialty": "general_medicine", "synonyms": "skin graft|split thickness graft|STSG|full thickness graft|FTSG"},
    {"display": "Urinary Catheterisation (Foley)", "specialty": "urology", "synonyms": "Foley catheter|urinary catheter|catheterisation|IDC"},
    {"display": "Nasogastric Tube Insertion (NGT)", "specialty": "general_medicine", "synonyms": "NGT|nasogastric tube|Ryle's tube|NG tube"},
    {"display": "Central Venous Catheter (CVC)", "specialty": "general_medicine", "synonyms": "CVC|central line|central venous access|subclavian line|IJV line"},
    {"display": "Arterial Line Insertion", "specialty": "general_medicine", "synonyms": "arterial line|art line|intra-arterial catheter"},
    {"display": "Endotracheal Intubation", "specialty": "general_medicine", "synonyms": "intubation|ET tube|endotracheal intubation|airway tube"},
    {"display": "Intraosseous Access (IO)", "specialty": "general_medicine", "synonyms": "IO access|intraosseous line|bone needle"},
    {"display": "Peritoneal Dialysis Catheter Insertion", "specialty": "nephrology", "synonyms": "PD catheter|peritoneal dialysis|Tenckhoff catheter"},
    {"display": "Arteriovenous Fistula Creation (AVF)", "specialty": "nephrology", "synonyms": "AVF|AV fistula|haemodialysis access|dialysis fistula"},
    {"display": "Joint Aspiration (Arthrocentesis)", "specialty": "orthopedics", "synonyms": "joint aspiration|arthrocentesis|knee tap|joint fluid aspiration"},
    {"display": "Intra-articular Injection", "specialty": "orthopedics", "synonyms": "joint injection|steroid injection joint|intra-articular steroid"},
    {"display": "Nerve Block", "specialty": "general_medicine", "synonyms": "nerve block|regional block|local nerve block|epidural"},
    {"display": "Epidural Anaesthesia", "specialty": "general_medicine", "synonyms": "epidural|spinal epidural|epidural block|labour epidural"},
    {"display": "Spinal Anaesthesia", "specialty": "general_medicine", "synonyms": "spinal anaesthesia|subarachnoid block|SAB|spinal block"},
    {"display": "Electroconvulsive Therapy (ECT)", "specialty": "psychiatry", "synonyms": "ECT|electroconvulsive therapy|shock therapy"},

    # ── Ophthalmic ────────────────────────────────────────────────────────────
    {"display": "Cataract Surgery (Phacoemulsification)", "specialty": "ophthalmology", "synonyms": "cataract surgery|phaco|phacoemulsification|IOL implant|lens replacement"},
    {"display": "Trabeculectomy", "specialty": "ophthalmology", "synonyms": "trabeculectomy|glaucoma surgery"},
    {"display": "Vitrectomy", "specialty": "ophthalmology", "synonyms": "vitrectomy|vitreoretinal surgery"},
    {"display": "LASIK / Refractive Surgery", "specialty": "ophthalmology", "synonyms": "LASIK|laser eye surgery|refractive surgery|PRK"},

    # ── ENT procedures ────────────────────────────────────────────────────────
    {"display": "Tonsillectomy", "specialty": "ent", "synonyms": "tonsillectomy|tonsil removal"},
    {"display": "Adenoidectomy", "specialty": "ent", "synonyms": "adenoidectomy|adenoid removal"},
    {"display": "Septoplasty", "specialty": "ent", "synonyms": "septoplasty|nasal septum correction|DNS surgery"},
    {"display": "Functional Endoscopic Sinus Surgery (FESS)", "specialty": "ent", "synonyms": "FESS|sinus surgery|endoscopic sinus surgery"},
    {"display": "Myringotomy / Grommet Insertion", "specialty": "ent", "synonyms": "myringotomy|grommet|ear tube|ventilation tube"},
    {"display": "Mastoidectomy", "specialty": "ent", "synonyms": "mastoidectomy|mastoid surgery|cortical mastoidectomy"},
    {"display": "Cochlear Implant", "specialty": "ent", "synonyms": "cochlear implant|bionic ear|hearing implant"},

    # ── Dermatological procedures ─────────────────────────────────────────────
    {"display": "Cryotherapy (Cryoablation)", "specialty": "dermatology", "synonyms": "cryotherapy|cryoablation|liquid nitrogen|wart freezing"},
    {"display": "Electrocautery / Electrodesiccation", "specialty": "dermatology", "synonyms": "electrocautery|electrodesiccation|cauterisation|LASER ablation skin"},
    {"display": "Chemical Peel", "specialty": "dermatology", "synonyms": "chemical peel|peeling|TCA peel|salicylic peel"},
]
