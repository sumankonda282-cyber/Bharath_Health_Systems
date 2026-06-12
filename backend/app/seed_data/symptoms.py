"""
Common clinical symptoms — no ICD-10 required (symptoms = category 'symptom').
Each entry: {display, specialty (optional), synonyms (pipe-sep)}
"""

SYMPTOMS = [
    # General
    {"display": "Fever", "synonyms": "pyrexia|high temperature|bukhar|temperature"},
    {"display": "Chills and Rigors", "synonyms": "chills|rigors|shivering|kaampna"},
    {"display": "Fatigue / Weakness", "synonyms": "fatigue|weakness|tiredness|kamzori|lethargy|malaise"},
    {"display": "Weight Loss (unintentional)", "synonyms": "unexplained weight loss|wasting|cachexia|vajan kam"},
    {"display": "Weight Gain", "synonyms": "weight gain|increased weight|motapa"},
    {"display": "Night Sweats", "synonyms": "night sweats|nocturnal sweating|sweating at night"},
    {"display": "Loss of Appetite", "synonyms": "anorexia|loss of appetite|bhookh nahi|no hunger"},
    {"display": "Nausea", "synonyms": "nausea|feeling sick|jee machalna|queasiness"},
    {"display": "Vomiting", "synonyms": "vomiting|emesis|vomit|ulti"},
    {"display": "Diarrhoea", "synonyms": "loose motion|diarrhoea|diarrhea|watery stools"},
    {"display": "Constipation", "synonyms": "constipation|hard stool|kabz|no bowel motion"},
    {"display": "Abdominal Pain", "synonyms": "stomach pain|belly pain|abdominal pain|pet dard|tummy ache"},
    {"display": "Abdominal Bloating / Distension", "synonyms": "bloating|distension|gas|flatulence|afara"},
    {"display": "Heartburn / Acid Reflux", "synonyms": "heartburn|acid reflux|burning sensation|acidity|GERD symptoms"},
    {"display": "Headache", "synonyms": "headache|sir dard|cephalgia|head pain"},
    {"display": "Dizziness / Vertigo", "synonyms": "dizziness|vertigo|chakkar|lightheadedness|giddiness"},
    {"display": "Syncope (Fainting)", "synonyms": "fainting|syncope|blackout|loss of consciousness|behoshi"},
    {"display": "Sweating (Excessive)", "synonyms": "hyperhidrosis|excessive sweating|paseena"},
    {"display": "Pallor / Anaemia Symptoms", "synonyms": "pallor|pale|anaemia symptoms|fatigue anaemia|khoon ki kami"},
    {"display": "Jaundice (Yellow Eyes / Skin)", "synonyms": "jaundice|yellow eyes|yellow skin|icterus|peeliya"},
    {"display": "Oedema (Swelling of Legs / Face)", "synonyms": "edema|oedema|swelling|leg swelling|puffiness|sujan"},
    {"display": "Lymph Node Swelling", "synonyms": "lymphadenopathy|gland swelling|lymph nodes|swollen glands"},

    # Cardiovascular
    {"display": "Chest Pain", "specialty": "cardiology", "synonyms": "chest pain|chest tightness|angina symptoms|seene mein dard"},
    {"display": "Palpitations", "specialty": "cardiology", "synonyms": "palpitation|heart racing|fast heartbeat|irregular heartbeat|dhadkan"},
    {"display": "Shortness of Breath (Dyspnoea)", "specialty": "cardiology", "synonyms": "dyspnoea|breathlessness|saans ki taklif|SOB|winded"},
    {"display": "Orthopnoea (Breathlessness Lying Flat)", "specialty": "cardiology", "synonyms": "orthopnoea|PND|paroxysmal nocturnal dyspnoea|breathlessness lying down"},
    {"display": "Leg Swelling (Bilateral)", "specialty": "cardiology", "synonyms": "bilateral leg oedema|ankle swelling|paon mein sujan|peripheral oedema"},

    # Respiratory
    {"display": "Cough (Dry)", "specialty": "pulmonology", "synonyms": "dry cough|nonproductive cough|khansi"},
    {"display": "Cough with Sputum (Productive)", "specialty": "pulmonology", "synonyms": "productive cough|cough with phlegm|balgam wali khansi"},
    {"display": "Haemoptysis (Coughing Blood)", "specialty": "pulmonology", "synonyms": "haemoptysis|coughing blood|blood in sputum|khoon ki khansi"},
    {"display": "Wheezing", "specialty": "pulmonology", "synonyms": "wheeze|wheezing|saans mein seeti|bronchospasm"},
    {"display": "Stridor (Noisy Breathing)", "specialty": "pulmonology", "synonyms": "stridor|noisy breathing|inspiratory noise"},
    {"display": "Pleuritic Chest Pain", "specialty": "pulmonology", "synonyms": "pleuritic pain|chest pain on breathing|pleuritis"},

    # Neurological
    {"display": "Headache (Severe / Thunderclap)", "specialty": "neurology", "synonyms": "thunderclap headache|worst headache of life|sudden headache"},
    {"display": "Memory Loss / Forgetfulness", "specialty": "neurology", "synonyms": "memory loss|forgetfulness|amnesia|bhool jaana|dementia symptoms"},
    {"display": "Confusion / Disorientation", "specialty": "neurology", "synonyms": "confusion|delirium|disorientation|altered sensorium"},
    {"display": "Seizures / Convulsions / Fits", "specialty": "neurology", "synonyms": "seizure|convulsions|fits|mirgi|epileptic attack"},
    {"display": "Weakness of Limbs (Hemiplegia / Paraplegia)", "specialty": "neurology", "synonyms": "hemiplegia|weakness arm|weakness leg|paralysis|lakwa"},
    {"display": "Numbness / Tingling (Paraesthesia)", "specialty": "neurology", "synonyms": "numbness|tingling|paraesthesia|pins and needles|jhunjhunahat"},
    {"display": "Tremor (Shaking)", "specialty": "neurology", "synonyms": "tremor|shaking|hand tremor|resting tremor|kaampna"},
    {"display": "Slurred Speech (Dysarthria)", "specialty": "neurology", "synonyms": "slurred speech|dysarthria|difficulty speaking|speech problems"},
    {"display": "Visual Disturbance (Blurring / Diplopia)", "specialty": "neurology", "synonyms": "blurred vision|double vision|diplopia|visual loss|dhundla dikhna"},
    {"display": "Loss of Balance / Ataxia", "specialty": "neurology", "synonyms": "ataxia|balance problems|gait unsteadiness|drunken walk"},

    # Gastrointestinal
    {"display": "Haematemesis (Blood Vomiting)", "specialty": "gastroenterology", "synonyms": "blood vomiting|haematemesis|hematemesis|upper GI bleed|khoon ki ulti"},
    {"display": "Melaena (Black Tarry Stools)", "specialty": "gastroenterology", "synonyms": "melaena|black stools|tarry stools|digested blood stool"},
    {"display": "Rectal Bleeding / Blood in Stool", "specialty": "gastroenterology", "synonyms": "rectal bleeding|blood in stool|haematochezia|piles bleeding"},
    {"display": "Dysphagia (Difficulty Swallowing)", "specialty": "gastroenterology", "synonyms": "dysphagia|difficulty swallowing|food sticking|nigalne mein taklif"},
    {"display": "Odynophagia (Painful Swallowing)", "specialty": "gastroenterology", "synonyms": "odynophagia|painful swallowing|throat pain on eating"},
    {"display": "Abdominal Distension (Ascites)", "specialty": "gastroenterology", "synonyms": "ascites|fluid in abdomen|pot belly|abdominal distension|pet phoolna"},
    {"display": "Tenesmus (Feeling of Incomplete Evacuation)", "specialty": "gastroenterology", "synonyms": "tenesmus|incomplete evacuation|urgency stool"},

    # Urological
    {"display": "Dysuria (Painful Urination)", "specialty": "urology", "synonyms": "dysuria|painful urination|burning urination|peshab mein jalan"},
    {"display": "Haematuria (Blood in Urine)", "specialty": "urology", "synonyms": "haematuria|blood in urine|red urine|peshab mein khoon"},
    {"display": "Frequency / Urgency of Urination", "specialty": "urology", "synonyms": "urinary frequency|urgency|frequent urination|baar baar peshab"},
    {"display": "Urinary Incontinence", "specialty": "urology", "synonyms": "incontinence|urine leakage|urge incontinence|stress incontinence"},
    {"display": "Nocturia (Waking at Night to Urinate)", "specialty": "urology", "synonyms": "nocturia|nocturnal urination|waking to urinate"},
    {"display": "Poor Urinary Stream / Retention", "specialty": "urology", "synonyms": "poor stream|urinary retention|hesitancy|incomplete emptying|ruk ruk peshab"},
    {"display": "Scrotal Swelling / Testicular Pain", "specialty": "urology", "synonyms": "scrotal swelling|testicular pain|orchitis|andkosh mein sujan"},

    # Musculoskeletal
    {"display": "Joint Pain (Arthralgia)", "specialty": "orthopedics", "synonyms": "joint pain|arthralgia|jodo mein dard|joint ache"},
    {"display": "Joint Swelling (Arthritis)", "specialty": "orthopedics", "synonyms": "joint swelling|arthritis|hot joint|inflamed joint"},
    {"display": "Back Pain (Low Back Pain)", "specialty": "orthopedics", "synonyms": "low back pain|LBP|lumbar pain|kamar dard|lumbago"},
    {"display": "Neck Pain / Cervical Pain", "specialty": "orthopedics", "synonyms": "neck pain|cervical pain|cervicalgia|gardan dard"},
    {"display": "Muscle Pain (Myalgia)", "synonyms": "myalgia|muscle pain|body ache|badan dard"},
    {"display": "Morning Stiffness (>1 hour)", "specialty": "rheumatology", "synonyms": "morning stiffness|joint stiffness morning|inflammatory arthritis"},
    {"display": "Sciatica / Radicular Pain", "specialty": "orthopedics", "synonyms": "sciatica|radicular pain|shooting leg pain|nerve pain leg"},
    {"display": "Limping / Antalgic Gait", "specialty": "orthopedics", "synonyms": "limping|antalgic gait|difficulty walking|lad lad ke chalna"},

    # Skin
    {"display": "Rash / Skin Eruption", "specialty": "dermatology", "synonyms": "rash|skin rash|eruption|chalne|daane"},
    {"display": "Itching (Pruritus)", "specialty": "dermatology", "synonyms": "itching|pruritus|khujli|skin itching"},
    {"display": "Skin Discolouration (Patches)", "specialty": "dermatology", "synonyms": "skin patches|discolouration|white patches|pigmentation"},
    {"display": "Alopecia (Hair Loss)", "specialty": "dermatology", "synonyms": "hair loss|alopecia|baal girna|baldness"},
    {"display": "Nail Changes", "specialty": "dermatology", "synonyms": "nail changes|onychomycosis|pitting nails|nail discolouration"},
    {"display": "Wound / Ulcer Not Healing", "specialty": "dermatology", "synonyms": "non-healing wound|chronic ulcer|diabetic foot|ghav nahi bharna"},

    # Endocrine
    {"display": "Polyuria (Excessive Urination)", "specialty": "endocrinology", "synonyms": "polyuria|excessive urination|frequent urination diabetic|bahumutra"},
    {"display": "Polydipsia (Excessive Thirst)", "specialty": "endocrinology", "synonyms": "polydipsia|excessive thirst|zyada pyaas|increased thirst"},
    {"display": "Polyphagia (Excessive Hunger)", "specialty": "endocrinology", "synonyms": "polyphagia|excessive hunger|zyada bhookh|increased appetite"},
    {"display": "Heat / Cold Intolerance", "specialty": "endocrinology", "synonyms": "heat intolerance|cold intolerance|temperature intolerance|thyroid symptoms"},
    {"display": "Excessive Weight Gain (Cushing-like)", "specialty": "endocrinology", "synonyms": "weight gain|central obesity|moon face|Cushing features"},
    {"display": "Hirsutism (Excessive Facial Hair in Women)", "specialty": "endocrinology", "synonyms": "hirsutism|facial hair women|excessive hair|PCOS hair"},
    {"display": "Galactorrhoea (Nipple Discharge Not Pregnant)", "specialty": "endocrinology", "synonyms": "galactorrhoea|nipple discharge|prolactin|breast milk not pregnant"},

    # Gynaecological
    {"display": "Menstrual Irregularity", "specialty": "gynecology", "synonyms": "irregular periods|menstrual irregularity|cycle disturbance|mashik gadbad"},
    {"display": "Vaginal Discharge", "specialty": "gynecology", "synonyms": "vaginal discharge|leucorrhoea|white discharge|safed pani"},
    {"display": "Pelvic Pain (Chronic)", "specialty": "gynecology", "synonyms": "pelvic pain|lower abdominal pain woman|chronic pelvic pain|pet ke neeche dard"},
    {"display": "Post-coital Bleeding", "specialty": "gynecology", "synonyms": "post-coital bleeding|bleeding after sex|intermenstrual bleeding"},
    {"display": "Breast Lump / Mastalgia", "specialty": "gynecology", "synonyms": "breast lump|mastalgia|breast pain|breast swelling"},
    {"display": "Hot Flushes / Flushing", "specialty": "gynecology", "synonyms": "hot flushes|hot flash|menopause symptoms|flushing"},
    {"display": "Infertility (Female)", "specialty": "gynecology", "synonyms": "female infertility|failure to conceive|banjhpan|subfertility"},

    # ENT
    {"display": "Ear Pain (Otalgia)", "specialty": "ent", "synonyms": "ear pain|otalgia|kaan mein dard|earache"},
    {"display": "Hearing Loss", "specialty": "ent", "synonyms": "hearing loss|deafness|hard of hearing|baharapan"},
    {"display": "Tinnitus (Ringing in Ears)", "specialty": "ent", "synonyms": "tinnitus|ringing ears|kaan mein awaaz|buzzing ears"},
    {"display": "Nasal Obstruction / Congestion", "specialty": "ent", "synonyms": "nasal congestion|blocked nose|stuffy nose|nasal obstruction|naak band"},
    {"display": "Nasal Discharge / Rhinorrhoea", "specialty": "ent", "synonyms": "runny nose|rhinorrhoea|nasal discharge|naak behna"},
    {"display": "Epistaxis (Nosebleed)", "specialty": "ent", "synonyms": "nosebleed|epistaxis|naak se khoon|nasal bleeding"},
    {"display": "Hoarseness of Voice", "specialty": "ent", "synonyms": "hoarse voice|dysphonia|voice change|awaaz baiThna"},
    {"display": "Sore Throat", "specialty": "ent", "synonyms": "sore throat|throat pain|pharyngitis symptoms|gale mein dard"},

    # Ophthalmology
    {"display": "Red Eye", "specialty": "ophthalmology", "synonyms": "red eye|conjunctivitis|bloodshot eye|aankh laal"},
    {"display": "Blurred Vision", "specialty": "ophthalmology", "synonyms": "blurred vision|dhundla dikhna|foggy vision|visual blurring"},
    {"display": "Eye Pain / Periorbital Pain", "specialty": "ophthalmology", "synonyms": "eye pain|periorbital pain|aankh mein dard|orbital pain"},
    {"display": "Floaters / Flashes", "specialty": "ophthalmology", "synonyms": "floaters|photopsia|flashes|retinal symptoms"},
    {"display": "Photophobia (Light Sensitivity)", "specialty": "ophthalmology", "synonyms": "photophobia|light sensitivity|roshan ni bardaasht"},
    {"display": "Watering Eyes (Epiphora)", "specialty": "ophthalmology", "synonyms": "epiphora|watering eyes|excessive tears|aankh se paani"},

    # Psychiatric
    {"display": "Low Mood / Sadness", "specialty": "psychiatry", "synonyms": "low mood|sadness|depressed mood|udaas rehna|blues"},
    {"display": "Anxiety / Excessive Worry", "specialty": "psychiatry", "synonyms": "anxiety|worry|restlessness|ghabrahat|nervousness"},
    {"display": "Insomnia (Difficulty Sleeping)", "specialty": "psychiatry", "synonyms": "insomnia|can't sleep|nind nahi|sleeplessness|sleep difficulty"},
    {"display": "Auditory / Visual Hallucinations", "specialty": "psychiatry", "synonyms": "hallucinations|hearing voices|seeing things|psychosis symptoms"},
    {"display": "Suicidal Ideation / Self-Harm", "specialty": "psychiatry", "synonyms": "suicidal thoughts|self-harm|khud ko nuksaan|suicide risk"},
    {"display": "Substance Craving / Withdrawal", "specialty": "psychiatry", "synonyms": "craving|withdrawal|addiction symptoms|substance use"},
    {"display": "Panic Attacks", "specialty": "psychiatry", "synonyms": "panic attack|panic|sudden fear|heart racing anxiety"},

    # Paediatric
    {"display": "Crying Excessively (Infant)", "specialty": "pediatrics", "synonyms": "excessive crying infant|colic|inconsolable cry|infantile colic"},
    {"display": "Feeding Difficulties (Infant)", "specialty": "pediatrics", "synonyms": "feeding difficulty|poor feeding|infant not eating|latching problem"},
    {"display": "Delayed Milestones", "specialty": "pediatrics", "synonyms": "developmental delay|delayed milestones|late walking|late talking"},
    {"display": "Failure to Thrive", "specialty": "pediatrics", "synonyms": "failure to thrive|FTT|poor weight gain|underweight child"},
    {"display": "Rash in Child (Exanthem)", "specialty": "pediatrics", "synonyms": "childhood rash|exanthem|viral rash child|measles rash|chickenpox rash"},
]
