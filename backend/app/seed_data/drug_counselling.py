"""
Per-drug patient counselling tips shown as clickable chips during prescription.
Each entry: { generic, tips: [str, ...] }
Tips are short, patient-facing sentences (not clinical jargon).
"""

DRUG_COUNSELLING = [
    # ── Analgesics / Antipyretics ─────────────────────────────────────────────
    {
        "generic": "Paracetamol",
        "tips": [
            "Do not exceed the prescribed dose",
            "Avoid alcohol while taking this medicine",
            "Space doses at least 4–6 hours apart",
            "Tell your doctor if you have liver problems",
        ],
    },
    {
        "generic": "Ibuprofen",
        "tips": [
            "Take with food or milk to avoid stomach upset",
            "Avoid alcohol while taking this medicine",
            "Do not take on an empty stomach",
            "Stay well-hydrated — drink plenty of water",
            "Tell your doctor if you have kidney or heart problems",
        ],
    },
    {
        "generic": "Diclofenac",
        "tips": [
            "Take with food to reduce stomach irritation",
            "Avoid alcohol while taking this medicine",
            "Do not use for more than the prescribed duration",
            "Tell your doctor if you notice swelling in legs or feet",
        ],
    },
    {
        "generic": "Aspirin",
        "tips": [
            "Take with food or a full glass of water",
            "Do not crush or chew enteric-coated tablets",
            "Inform your surgeon before any planned procedure",
            "Avoid alcohol — increases bleeding risk",
            "Do not give to children under 16 without doctor's advice",
        ],
    },
    {
        "generic": "Tramadol",
        "tips": [
            "May cause dizziness — avoid driving or operating machinery",
            "Do not drink alcohol with this medicine",
            "Do not stop suddenly without your doctor's guidance",
            "Take exactly as prescribed — risk of dependence",
        ],
    },
    {
        "generic": "Morphine",
        "tips": [
            "May cause severe drowsiness — do not drive",
            "Do not drink alcohol",
            "Do not stop suddenly — taper as directed",
            "Keep out of reach of children",
            "May cause constipation — increase fluids and fibre",
        ],
    },
    {
        "generic": "Ketorolac",
        "tips": [
            "Short-term use only — do not exceed 5 days",
            "Take with food to protect the stomach",
            "Stay well hydrated",
            "Report any unusual bleeding or dark stools",
        ],
    },
    {
        "generic": "Celecoxib",
        "tips": [
            "Take with food if stomach upset occurs",
            "Tell your doctor if you have heart disease or high blood pressure",
            "Report swelling in legs, feet, or sudden weight gain",
            "Avoid if you are allergic to sulfonamides",
        ],
    },
    {
        "generic": "Etoricoxib",
        "tips": [
            "Take at the same time each day",
            "Report chest pain, breathlessness, or leg swelling immediately",
            "Avoid in heart failure or uncontrolled high blood pressure",
            "Take with food if stomach discomfort occurs",
        ],
    },
    {
        "generic": "Mefenamic Acid",
        "tips": [
            "Take with food or milk",
            "Do not take for more than 7 days unless prescribed",
            "Report dark stools or stomach pain",
            "Avoid alcohol",
        ],
    },

    # ── Antibiotics ───────────────────────────────────────────────────────────
    {
        "generic": "Amoxicillin",
        "tips": [
            "Complete the full course even if you feel better",
            "Can be taken with or without food",
            "Tell your doctor if you are allergic to penicillin",
            "Report rash, hives, or difficulty breathing immediately",
        ],
    },
    {
        "generic": "Amoxicillin-Clavulanate",
        "tips": [
            "Take with food to reduce stomach upset",
            "Complete the full course as prescribed",
            "Report diarrhoea, rash, or yellowing of skin",
            "Store liquid formulation in the refrigerator",
        ],
    },
    {
        "generic": "Azithromycin",
        "tips": [
            "Take on an empty stomach or 1 hour before meals",
            "Complete the full course",
            "Avoid antacids within 2 hours of this medicine",
            "Report irregular heartbeat or severe diarrhoea",
        ],
    },
    {
        "generic": "Clarithromycin",
        "tips": [
            "Take with or without food",
            "Complete the full course",
            "Avoid grapefruit and grapefruit juice",
            "Report severe stomach pain or persistent diarrhoea",
        ],
    },
    {
        "generic": "Doxycycline",
        "tips": [
            "Take with a full glass of water",
            "Do not lie down for at least 30 minutes after taking",
            "Avoid dairy products and antacids within 2 hours",
            "Use sunscreen — increases sun sensitivity",
            "Complete the full course",
        ],
    },
    {
        "generic": "Ciprofloxacin",
        "tips": [
            "Drink plenty of water to prevent kidney crystals",
            "Avoid dairy products and antacids within 2 hours",
            "May cause dizziness — avoid driving if affected",
            "Use sunscreen — increases sun sensitivity",
            "Complete the full course",
        ],
    },
    {
        "generic": "Metronidazole",
        "tips": [
            "Strictly avoid alcohol during and for 48 hours after treatment",
            "Take with food to reduce nausea",
            "Complete the full course",
            "May cause metallic taste in the mouth — this is normal",
        ],
    },
    {
        "generic": "Levofloxacin",
        "tips": [
            "Take with a full glass of water",
            "Avoid antacids, calcium, and iron within 2 hours",
            "Use sunscreen — increases sun sensitivity",
            "Report tendon pain or swelling immediately",
            "Complete the full course",
        ],
    },
    {
        "generic": "Cefixime",
        "tips": [
            "Can be taken with or without food",
            "Complete the full course even if feeling better",
            "Report severe diarrhoea or stomach cramps",
            "Tell your doctor if allergic to penicillin",
        ],
    },
    {
        "generic": "Nitrofurantoin",
        "tips": [
            "Take with food or milk to reduce nausea",
            "Drink plenty of fluids",
            "Urine may turn dark yellow or brown — this is normal",
            "Complete the full course",
            "Do not use if kidney function is poor",
        ],
    },
    {
        "generic": "Clindamycin",
        "tips": [
            "Take with a full glass of water",
            "Report severe diarrhoea or bloody stools immediately",
            "Complete the full course",
            "Can be taken with or without food",
        ],
    },

    # ── Antihypertensives ────────────────────────────────────────────────────
    {
        "generic": "Amlodipine",
        "tips": [
            "Take at the same time each day",
            "Do not stop this medicine without your doctor's advice",
            "Avoid grapefruit and grapefruit juice",
            "Report ankle swelling or severe headache",
            "Monitor your blood pressure regularly",
        ],
    },
    {
        "generic": "Atenolol",
        "tips": [
            "Do not stop suddenly — taper under medical supervision",
            "Check your pulse before each dose",
            "Avoid alcohol",
            "May mask symptoms of low blood sugar in diabetics — check glucose regularly",
            "Monitor blood pressure regularly",
        ],
    },
    {
        "generic": "Metoprolol",
        "tips": [
            "Take with food to improve absorption",
            "Do not stop suddenly — taper as directed",
            "Check pulse before each dose",
            "May cause cold hands and feet",
            "Monitor blood pressure regularly",
        ],
    },
    {
        "generic": "Losartan",
        "tips": [
            "Take at the same time each day",
            "Stay well hydrated",
            "Avoid high-potassium foods (bananas, oranges) in excess",
            "Report swelling of face or throat immediately",
            "Monitor blood pressure and kidney function as advised",
        ],
    },
    {
        "generic": "Telmisartan",
        "tips": [
            "Take at the same time each day",
            "Can be taken with or without food",
            "Monitor blood pressure regularly",
            "Avoid potassium supplements unless advised",
            "Report swelling of lips or throat immediately",
        ],
    },
    {
        "generic": "Ramipril",
        "tips": [
            "May cause a dry cough — tell your doctor if this is bothersome",
            "Avoid high-potassium foods in excess",
            "Stay well hydrated",
            "Monitor blood pressure and kidney function regularly",
            "Report swelling of face, lips, or throat immediately",
        ],
    },
    {
        "generic": "Enalapril",
        "tips": [
            "A persistent dry cough is a common side effect",
            "Monitor blood pressure regularly",
            "Avoid potassium supplements unless prescribed",
            "Report swelling of lips, face, or throat immediately",
        ],
    },
    {
        "generic": "Hydrochlorothiazide",
        "tips": [
            "Take in the morning to avoid night-time urination",
            "Drink adequate fluids",
            "Eat potassium-rich foods (bananas, spinach) if not on potassium-sparing drugs",
            "Monitor blood pressure and electrolytes as advised",
            "Protect skin from sun — increases photosensitivity",
        ],
    },
    {
        "generic": "Furosemide",
        "tips": [
            "Take in the morning to avoid night-time urination",
            "Eat potassium-rich foods or take supplement as prescribed",
            "Monitor weight daily — report sudden gain of 2 kg or more",
            "Stay hydrated but follow fluid restriction if advised",
            "Monitor blood pressure and kidney function as advised",
        ],
    },
    {
        "generic": "Spironolactone",
        "tips": [
            "Take with food to reduce stomach upset",
            "Avoid high-potassium foods and potassium supplements",
            "Monitor kidney function and electrolytes regularly",
            "Report breast tenderness or irregular periods",
        ],
    },
    {
        "generic": "Nifedipine",
        "tips": [
            "Do not crush or chew extended-release tablets",
            "Avoid grapefruit and grapefruit juice",
            "Take at the same time each day",
            "Report ankle swelling, flushing, or palpitations",
        ],
    },
    {
        "generic": "Clonidine",
        "tips": [
            "Do not stop suddenly — can cause rebound high blood pressure",
            "May cause dry mouth and drowsiness",
            "Avoid alcohol",
            "Monitor blood pressure regularly",
        ],
    },

    # ── Antidiabetics ─────────────────────────────────────────────────────────
    {
        "generic": "Metformin",
        "tips": [
            "Take with food to reduce stomach upset",
            "Drink plenty of water",
            "Do not take if kidney function is poor",
            "Hold before contrast dye procedures — inform your radiologist",
            "Monitor blood sugar regularly",
        ],
    },
    {
        "generic": "Glimepiride",
        "tips": [
            "Take with breakfast or the first main meal",
            "Do not skip meals after taking this medicine",
            "Carry sugar or glucose tablets for hypoglycaemia",
            "Monitor blood sugar regularly",
            "Avoid alcohol — increases hypoglycaemia risk",
        ],
    },
    {
        "generic": "Glibenclamide",
        "tips": [
            "Take 30 minutes before meals",
            "Never skip meals after taking this medicine",
            "Carry a sugar source at all times",
            "Avoid alcohol",
            "Monitor blood sugar regularly",
        ],
    },
    {
        "generic": "Sitagliptin",
        "tips": [
            "Can be taken with or without food",
            "Report severe joint pain — rare but possible side effect",
            "Report blistering or painful skin rash",
            "Monitor kidney function as advised",
        ],
    },
    {
        "generic": "Empagliflozin",
        "tips": [
            "Take in the morning, with or without food",
            "Drink plenty of fluids to prevent dehydration",
            "Maintain good genital hygiene — can increase infection risk",
            "Hold before surgery or prolonged fasting — inform your doctor",
            "Monitor blood sugar and kidney function regularly",
        ],
    },
    {
        "generic": "Dapagliflozin",
        "tips": [
            "Take in the morning, with or without food",
            "Stay well hydrated",
            "Maintain good genital hygiene",
            "Hold before major procedures — inform your doctor",
            "Monitor blood sugar and kidney function regularly",
        ],
    },
    {
        "generic": "Insulin Glargine",
        "tips": [
            "Inject at the same time each day",
            "Rotate injection sites to prevent skin changes",
            "Do not shake the vial — gently roll",
            "Carry glucose tablets for hypoglycaemia",
            "Store unopened vials in the refrigerator; do not freeze",
        ],
    },
    {
        "generic": "Insulin Regular",
        "tips": [
            "Inject 15–30 minutes before meals",
            "Rotate injection sites regularly",
            "Carry sugar or glucose for hypoglycaemia",
            "Store in refrigerator — do not freeze",
            "Monitor blood sugar closely",
        ],
    },
    {
        "generic": "Pioglitazone",
        "tips": [
            "Can cause fluid retention — report ankle swelling",
            "Monitor weight weekly",
            "Report bone pain or fractures promptly",
            "Not for use in heart failure",
        ],
    },

    # ── Lipid-Lowering ───────────────────────────────────────────────────────
    {
        "generic": "Atorvastatin",
        "tips": [
            "Take at bedtime for best effect",
            "Avoid grapefruit and grapefruit juice",
            "Report unexplained muscle pain or weakness immediately",
            "Do not stop without your doctor's advice",
            "Liver function tests may be done periodically",
        ],
    },
    {
        "generic": "Rosuvastatin",
        "tips": [
            "Can be taken at any time of day",
            "Avoid grapefruit in large quantities",
            "Report muscle pain, tenderness, or weakness",
            "Do not stop without your doctor's advice",
        ],
    },
    {
        "generic": "Simvastatin",
        "tips": [
            "Take in the evening or at bedtime",
            "Strictly avoid grapefruit juice",
            "Report muscle pain or weakness immediately",
            "Do not stop without medical advice",
        ],
    },
    {
        "generic": "Fenofibrate",
        "tips": [
            "Take with food to improve absorption",
            "Report muscle pain promptly",
            "Monitor kidney function and liver enzymes as advised",
            "Do not take within 1 hour of a bile acid resin",
        ],
    },

    # ── Cardiac / Anti-anginal ────────────────────────────────────────────────
    {
        "generic": "Aspirin",
        "tips": [
            "Take with food or a full glass of water",
            "Do not crush enteric-coated tablets",
            "Inform any surgeon or dentist that you are on aspirin",
            "Avoid alcohol",
        ],
    },
    {
        "generic": "Clopidogrel",
        "tips": [
            "Do not stop without your doctor's advice — especially with a stent",
            "Inform any doctor or dentist that you are on clopidogrel",
            "Report unusual bleeding, bruising, or blood in urine/stool",
            "Avoid ibuprofen and other NSAIDs unless cleared by doctor",
        ],
    },
    {
        "generic": "Warfarin",
        "tips": [
            "Take at the same time each day",
            "Regular INR blood tests are essential",
            "Avoid drastic changes in diet — especially green leafy vegetables",
            "Strictly avoid alcohol",
            "Inform all doctors and dentists about warfarin use",
            "Report any unusual bleeding immediately",
        ],
    },
    {
        "generic": "Nitroglycerin",
        "tips": [
            "Use sublingual tablet under the tongue at onset of chest pain",
            "Sit or lie down before using — may cause sudden drop in blood pressure",
            "If chest pain persists after 3 doses (5 min apart) — call emergency services",
            "Store away from heat and light",
            "Headache after use is common and usually brief",
        ],
    },
    {
        "generic": "Isosorbide Mononitrate",
        "tips": [
            "Take as prescribed — do not take extra doses",
            "Do not stop suddenly",
            "Headache is a common early side effect and usually improves",
            "Avoid sildenafil and similar drugs — dangerous drop in blood pressure",
            "Change positions slowly to avoid dizziness",
        ],
    },
    {
        "generic": "Digoxin",
        "tips": [
            "Take at the same time each day",
            "Check your pulse before each dose — report if below 60",
            "Report nausea, blurred or yellow vision, irregular heartbeat immediately",
            "Avoid high-potassium and low-potassium extremes — keep potassium balanced",
            "Regular blood level monitoring is important",
        ],
    },
    {
        "generic": "Amiodarone",
        "tips": [
            "Take with food",
            "Use high-SPF sunscreen — severe photosensitivity",
            "Skin may turn bluish-grey with prolonged use",
            "Regular thyroid, liver, and lung function checks are essential",
            "Do not stop without your doctor's advice",
        ],
    },

    # ── Respiratory ───────────────────────────────────────────────────────────
    {
        "generic": "Salbutamol",
        "tips": [
            "Shake inhaler before each use",
            "Rinse mouth with water after inhalation",
            "Use as a rescue inhaler — not for daily prevention",
            "Report if you need more puffs than usual — seek review",
            "Keep a spare inhaler with you at all times",
        ],
    },
    {
        "generic": "Budesonide",
        "tips": [
            "Rinse mouth with water after each use — prevents oral thrush",
            "Use every day even when feeling well",
            "Do not use as a rescue inhaler",
            "Results may take 1–2 weeks to be fully felt",
        ],
    },
    {
        "generic": "Formoterol",
        "tips": [
            "Use as prescribed — not a rescue inhaler for sudden breathlessness",
            "Rinse mouth after inhalation",
            "Tell your doctor if you feel your heart beating fast after use",
        ],
    },
    {
        "generic": "Montelukast",
        "tips": [
            "Take in the evening for best effect",
            "Can be taken with or without food",
            "Report mood changes, vivid dreams, or sleep problems",
            "Do not stop without your doctor's advice",
        ],
    },
    {
        "generic": "Theophylline",
        "tips": [
            "Do not crush or chew sustained-release tablets",
            "Take at the same time each day",
            "Avoid excessive caffeine (tea, coffee, cola)",
            "Report nausea, palpitations, or restlessness",
            "Blood level monitoring may be required",
        ],
    },
    {
        "generic": "Prednisolone",
        "tips": [
            "Take with food or milk to protect the stomach",
            "Do not stop suddenly — taper as prescribed",
            "Monitor blood sugar — can raise glucose levels",
            "Avoid contact with anyone who has chickenpox or measles",
            "Report weight gain, swelling, or mood changes",
        ],
    },

    # ── GI / Antacids ─────────────────────────────────────────────────────────
    {
        "generic": "Omeprazole",
        "tips": [
            "Take 30–60 minutes before meals",
            "Swallow capsule whole — do not crush",
            "Long-term use — monitor magnesium and vitamin B12 levels",
            "Do not stop without your doctor's advice if on long-term therapy",
        ],
    },
    {
        "generic": "Pantoprazole",
        "tips": [
            "Take 30 minutes before breakfast",
            "Swallow tablet whole — do not crush or chew",
            "Tell your doctor if on long-term use for bone health monitoring",
        ],
    },
    {
        "generic": "Ranitidine",
        "tips": [
            "Can be taken with or without food",
            "Take at bedtime for nighttime acid relief",
            "Antacids may be used alongside — take separately",
        ],
    },
    {
        "generic": "Ondansetron",
        "tips": [
            "Can be taken with or without food",
            "Report irregular heartbeat or severe headache",
            "May cause constipation",
        ],
    },
    {
        "generic": "Domperidone",
        "tips": [
            "Take 15–30 minutes before meals",
            "Do not take longer than 1 week without medical review",
            "Report irregular heartbeat or fainting",
        ],
    },
    {
        "generic": "Metoclopramide",
        "tips": [
            "Take 30 minutes before meals",
            "May cause drowsiness — avoid driving if affected",
            "Do not take longer than 5 days without review",
            "Report involuntary muscle movements immediately",
        ],
    },
    {
        "generic": "Loperamide",
        "tips": [
            "Take after each loose stool",
            "Stay well hydrated — drink ORS",
            "Do not exceed maximum dose",
            "Stop and seek care if diarrhoea lasts more than 2 days",
        ],
    },

    # ── Neurological / Psychiatric ────────────────────────────────────────────
    {
        "generic": "Phenytoin",
        "tips": [
            "Take at the same time each day",
            "Do not stop without your doctor's advice — seizure risk",
            "Report rash, fever, or gum swelling",
            "Regular blood level monitoring is required",
            "Avoid alcohol",
        ],
    },
    {
        "generic": "Carbamazepine",
        "tips": [
            "Take with food",
            "Do not stop without your doctor's advice",
            "Avoid grapefruit juice",
            "Report rash, fever, or unusual bruising immediately",
            "Regular blood count and level monitoring required",
        ],
    },
    {
        "generic": "Valproate",
        "tips": [
            "Take with food to reduce stomach upset",
            "Swallow extended-release tablets whole — do not crush",
            "Do not stop without your doctor's advice",
            "Report unusual weight gain, hair thinning, or tremors",
            "Liver function monitoring required",
            "Not recommended in pregnancy — use effective contraception",
        ],
    },
    {
        "generic": "Levetiracetam",
        "tips": [
            "Can be taken with or without food",
            "Do not stop without your doctor's advice",
            "Report mood changes, irritability, or aggressive behaviour",
            "Take at the same time each day",
        ],
    },
    {
        "generic": "Sertraline",
        "tips": [
            "Take at the same time each day — morning or evening",
            "Full benefit may take 4–6 weeks",
            "Do not stop suddenly — taper as directed",
            "Avoid alcohol",
            "Report suicidal thoughts or unusual mood changes, especially at start",
        ],
    },
    {
        "generic": "Escitalopram",
        "tips": [
            "Can be taken with or without food",
            "Takes 2–4 weeks to start working fully",
            "Do not stop without your doctor's advice",
            "Avoid alcohol",
            "Report irregular heartbeat or sudden worsening of mood",
        ],
    },
    {
        "generic": "Amitriptyline",
        "tips": [
            "Take at bedtime — causes drowsiness",
            "Avoid driving or machinery if drowsy",
            "Do not stop suddenly",
            "Avoid alcohol",
            "Report difficulty urinating or irregular heartbeat",
        ],
    },
    {
        "generic": "Olanzapine",
        "tips": [
            "May cause significant weight gain — monitor diet",
            "Monitor blood sugar and cholesterol regularly",
            "May cause drowsiness — avoid driving if affected",
            "Do not stop without your doctor's advice",
            "Avoid alcohol",
        ],
    },
    {
        "generic": "Risperidone",
        "tips": [
            "Take at the same time each day",
            "May cause weight gain — maintain healthy diet",
            "Report muscle stiffness, tremors, or restlessness",
            "Do not stop without your doctor's advice",
            "Avoid alcohol",
        ],
    },
    {
        "generic": "Diazepam",
        "tips": [
            "Take exactly as prescribed — risk of dependence",
            "Do not drive or operate machinery",
            "Strictly avoid alcohol",
            "Do not stop suddenly after prolonged use",
            "For short-term use only unless otherwise directed",
        ],
    },
    {
        "generic": "Alprazolam",
        "tips": [
            "Short-term use only as prescribed",
            "Risk of dependence — do not exceed dose",
            "Do not drive or operate heavy machinery",
            "Strictly avoid alcohol",
            "Do not stop abruptly — taper as directed",
        ],
    },
    {
        "generic": "Zolpidem",
        "tips": [
            "Take immediately before bed — only if you have at least 7–8 hours to sleep",
            "Do not drive the morning after taking",
            "Strictly avoid alcohol",
            "For short-term use only",
            "Do not stop abruptly after prolonged use",
        ],
    },

    # ── Thyroid ───────────────────────────────────────────────────────────────
    {
        "generic": "Levothyroxine",
        "tips": [
            "Take on an empty stomach, 30–60 minutes before breakfast",
            "Take at the same time each day",
            "Avoid calcium and iron supplements within 4 hours",
            "Regular thyroid function tests are essential",
            "Do not stop without your doctor's advice",
        ],
    },
    {
        "generic": "Carbimazole",
        "tips": [
            "Take at the same time each day",
            "Report sore throat, fever, or mouth ulcers immediately — rare but serious",
            "Report yellowing of skin or eyes",
            "Regular blood count monitoring required",
        ],
    },

    # ── Vitamins / Minerals / Supplements ─────────────────────────────────────
    {
        "generic": "Iron",
        "tips": [
            "Take on an empty stomach for best absorption",
            "Take with vitamin C (orange juice) to improve absorption",
            "Avoid tea, coffee, dairy, or antacids within 2 hours",
            "Stools may turn dark — this is normal",
            "May cause constipation — increase fluids and fibre",
        ],
    },
    {
        "generic": "Folic Acid",
        "tips": [
            "Can be taken with or without food",
            "Take every day as directed",
            "Essential before and during early pregnancy",
        ],
    },
    {
        "generic": "Vitamin D3",
        "tips": [
            "Take with a meal containing fat for best absorption",
            "Regular calcium and vitamin D level monitoring as advised",
            "Do not take extra doses without your doctor's guidance",
        ],
    },
    {
        "generic": "Calcium Carbonate",
        "tips": [
            "Take with meals for better absorption",
            "Space doses if taking iron — at least 2 hours apart",
            "Drink plenty of water",
            "Do not exceed recommended dose — excess can cause kidney stones",
        ],
    },

    # ── Antihistamines ────────────────────────────────────────────────────────
    {
        "generic": "Cetirizine",
        "tips": [
            "Can be taken with or without food",
            "May cause mild drowsiness — avoid driving if affected",
            "Take at bedtime if drowsiness is a problem",
            "Avoid alcohol",
        ],
    },
    {
        "generic": "Fexofenadine",
        "tips": [
            "Take on an empty stomach for best effect",
            "Avoid fruit juice (grapefruit, orange, apple) within 4 hours",
            "Generally non-sedating — safe to drive",
        ],
    },
    {
        "generic": "Chlorpheniramine",
        "tips": [
            "Causes significant drowsiness — do not drive",
            "Avoid alcohol",
            "Take with food if stomach upset occurs",
        ],
    },
    {
        "generic": "Loratadine",
        "tips": [
            "Can be taken with or without food",
            "Non-sedating for most people",
            "Take at the same time each day",
        ],
    },

    # ── Antimalarials / Antiparasitics ────────────────────────────────────────
    {
        "generic": "Hydroxychloroquine",
        "tips": [
            "Take with food or milk to reduce stomach upset",
            "Annual eye check is recommended for long-term use",
            "Do not stop without your doctor's advice",
            "Report any changes in vision immediately",
        ],
    },
    {
        "generic": "Chloroquine",
        "tips": [
            "Take with food to reduce nausea",
            "Report vision changes or blurred vision",
            "Complete the full course for malaria",
        ],
    },
    {
        "generic": "Albendazole",
        "tips": [
            "Take with a fatty meal to improve absorption",
            "Complete the full course",
            "Avoid in pregnancy — use contraception during treatment",
        ],
    },

    # ── Urology / Prostate ────────────────────────────────────────────────────
    {
        "generic": "Tamsulosin",
        "tips": [
            "Take 30 minutes after the same meal each day",
            "Change positions slowly — can cause dizziness on standing",
            "Do not crush or chew modified-release capsules",
            "Inform your ophthalmologist before cataract surgery",
        ],
    },
    {
        "generic": "Finasteride",
        "tips": [
            "Pregnant women must not handle crushed tablets",
            "Takes 3–6 months to show full benefit",
            "Do not stop without your doctor's advice",
            "May affect PSA levels — inform your doctor during prostate screening",
        ],
    },

    # ── Gout ─────────────────────────────────────────────────────────────────
    {
        "generic": "Allopurinol",
        "tips": [
            "Take after meals",
            "Drink at least 2–3 litres of water per day",
            "Do not start or change dose during an acute gout attack",
            "Report skin rash immediately",
            "Avoid high-purine foods (red meat, organ meats, shellfish, alcohol)",
        ],
    },
    {
        "generic": "Colchicine",
        "tips": [
            "Take at the first sign of a gout attack",
            "Report diarrhoea, nausea, or muscle weakness",
            "Avoid grapefruit juice",
            "Do not exceed the prescribed dose",
        ],
    },

    # ── Osteoporosis ──────────────────────────────────────────────────────────
    {
        "generic": "Alendronate",
        "tips": [
            "Take on an empty stomach with a full glass of plain water",
            "Remain upright (sitting or standing) for at least 30 minutes after",
            "Do not take with food, other medicines, or drinks other than water",
            "Take calcium and vitamin D as prescribed",
            "Report jaw pain or difficulty swallowing",
        ],
    },

    # ── Anticoagulants / Antiplatelet ─────────────────────────────────────────
    {
        "generic": "Rivaroxaban",
        "tips": [
            "Take with the evening meal",
            "Do not stop without your doctor's advice",
            "Report unusual bleeding — cuts that won't stop, blood in urine or stool",
            "Inform all doctors and dentists about this medicine",
            "Avoid ibuprofen and other NSAIDs unless cleared by doctor",
        ],
    },
    {
        "generic": "Apixaban",
        "tips": [
            "Take at the same times each day",
            "Can be taken with or without food",
            "Do not stop without your doctor's advice",
            "Report unusual or prolonged bleeding",
            "Inform all healthcare providers about this medicine",
        ],
    },

    # ── Immunosuppressants ────────────────────────────────────────────────────
    {
        "generic": "Azathioprine",
        "tips": [
            "Take with food to reduce nausea",
            "Avoid exposure to sunlight — high skin cancer risk",
            "Report fever, unusual infections, or unusual bruising",
            "Regular blood count and liver function monitoring required",
            "Avoid live vaccines during treatment",
        ],
    },
    {
        "generic": "Methotrexate",
        "tips": [
            "Take exactly as prescribed — weekly, not daily",
            "Take folic acid on non-methotrexate days as prescribed",
            "Avoid alcohol — serious liver toxicity risk",
            "Report mouth ulcers, fever, or shortness of breath",
            "Regular blood and liver function tests are mandatory",
            "Use contraception — can harm an unborn baby",
        ],
    },
]
