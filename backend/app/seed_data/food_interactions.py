"""
Drug-food interactions for BharatCliniq seed data.
Severity: major | moderate | minor
"""

FOOD_INTERACTIONS = [
    # ── Warfarin ──────────────────────────────────────────────────────────────
    {
        "generic": "warfarin",
        "food": "Vitamin K rich foods (spinach, kale, broccoli, Brussels sprouts)",
        "effect": "Reduced anticoagulant effect — maintain consistent dietary intake of vitamin K rather than avoiding these foods entirely",
        "severity": "major",
    },
    {
        "generic": "warfarin",
        "food": "Cranberry juice",
        "effect": "Increased INR and bleeding risk via CYP2C9 inhibition — avoid large quantities; monitor INR closely if consumed regularly",
        "severity": "major",
    },
    {
        "generic": "warfarin",
        "food": "Grapefruit juice",
        "effect": "Increased warfarin plasma levels through CYP3A4 inhibition — may elevate INR unpredictably",
        "severity": "moderate",
    },
    {
        "generic": "warfarin",
        "food": "Alcohol (large amounts / binge drinking)",
        "effect": "Markedly increased bleeding risk — heavy alcohol inhibits warfarin metabolism and impairs clotting factor synthesis",
        "severity": "major",
    },
    {
        "generic": "warfarin",
        "food": "Alcohol (small, consistent amounts)",
        "effect": "Variable and unpredictable INR changes — even moderate alcohol use warrants closer INR monitoring",
        "severity": "moderate",
    },
    {
        "generic": "warfarin",
        "food": "Garlic (large culinary or supplement amounts)",
        "effect": "Additive antiplatelet effect combined with anticoagulation increases bleeding risk; large supplemental doses are of greatest concern",
        "severity": "moderate",
    },
    {
        "generic": "warfarin",
        "food": "Mango (large amounts)",
        "effect": "May increase INR, possibly via CYP2C9 modulation; monitor INR if intake changes substantially",
        "severity": "moderate",
    },
    {
        "generic": "warfarin",
        "food": "Green tea (large amounts)",
        "effect": "Contains vitamin K which may reduce anticoagulant effect; also has mild antiplatelet properties",
        "severity": "minor",
    },

    # ── Statins + grapefruit ──────────────────────────────────────────────────
    {
        "generic": "atorvastatin",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition by furanocoumarins increases atorvastatin AUC, raising myopathy risk — limit to small quantities or avoid",
        "severity": "moderate",
    },
    {
        "generic": "simvastatin",
        "food": "Grapefruit juice",
        "effect": "Markedly increased simvastatin exposure (AUC up to 16-fold) via CYP3A4 inhibition — severe rhabdomyolysis risk; avoid entirely",
        "severity": "major",
    },
    {
        "generic": "lovastatin",
        "food": "Grapefruit juice",
        "effect": "Markedly increased lovastatin levels via CYP3A4 inhibition — rhabdomyolysis and acute kidney injury risk; avoid entirely",
        "severity": "major",
    },

    # ── MAOIs + tyramine ──────────────────────────────────────────────────────
    {
        "generic": "phenelzine",
        "food": "Aged cheese (cheddar, brie, camembert, stilton)",
        "effect": "Hypertensive crisis from tyramine accumulation — MAOIs block tyramine breakdown, causing massive noradrenaline release; strict avoidance mandatory",
        "severity": "major",
    },
    {
        "generic": "phenelzine",
        "food": "Cured and smoked meats (salami, pepperoni, sausage, jerky)",
        "effect": "Hypertensive crisis from high tyramine content — potentially fatal; all cured/fermented meat products must be strictly avoided",
        "severity": "major",
    },
    {
        "generic": "phenelzine",
        "food": "Red wine, beer, vermouth, tap beer",
        "effect": "Hypertensive crisis from tyramine in fermented alcoholic beverages — even small quantities can precipitate a crisis",
        "severity": "major",
    },
    {
        "generic": "phenelzine",
        "food": "Fermented foods (sauerkraut, kimchi, soy sauce, miso, tempeh)",
        "effect": "Hypertensive crisis due to high tyramine content of fermented products — avoid all fermented condiments and sides",
        "severity": "major",
    },
    {
        "generic": "phenelzine",
        "food": "Overripe or dried fruits (raisins, figs, dried apricots, overripe bananas)",
        "effect": "Hypertensive crisis — tyramine concentrations rise sharply as fruit ages or dries; fresh, unripe fruit is acceptable",
        "severity": "major",
    },
    {
        "generic": "phenelzine",
        "food": "Broad beans (fava beans)",
        "effect": "Hypertensive crisis — fava beans contain dopamine precursors (L-DOPA) that bypass MAOI blockade, causing severe pressor response",
        "severity": "major",
    },
    {
        "generic": "tranylcypromine",
        "food": "Tyramine-rich foods (aged cheese, cured meats, fermented products, red wine)",
        "effect": "Hypertensive crisis via tyramine pressor effect — tranylcypromine is an irreversible MAOI; dietary tyramine restriction is mandatory",
        "severity": "major",
    },
    {
        "generic": "selegiline",
        "food": "Tyramine-rich foods (aged cheese, cured meats, fermented products)",
        "effect": "At low selective MAO-B doses the risk is lower than non-selective MAOIs, but at higher doses tyramine sensitivity increases — caution warranted",
        "severity": "moderate",
    },

    # ── SSRIs + alcohol ───────────────────────────────────────────────────────
    {
        "generic": "fluoxetine",
        "food": "Alcohol",
        "effect": "Enhanced CNS depression, impaired psychomotor performance and judgment — patients should be counselled to avoid or minimise alcohol",
        "severity": "moderate",
    },
    {
        "generic": "sertraline",
        "food": "Alcohol",
        "effect": "Additive CNS depression; alcohol may worsen underlying depression and reduce treatment efficacy — advise avoidance",
        "severity": "moderate",
    },
    {
        "generic": "escitalopram",
        "food": "Alcohol",
        "effect": "Enhanced CNS depression and impaired judgment — avoid concomitant use; alcohol exacerbates depressive symptoms",
        "severity": "moderate",
    },

    # ── Quinolones + dairy/calcium ─────────────────────────────────────────────
    {
        "generic": "ciprofloxacin",
        "food": "Dairy products (milk, yogurt, cheese)",
        "effect": "Chelation of ciprofloxacin by calcium reduces oral absorption by up to 50% — take at least 2 hours before or 6 hours after dairy",
        "severity": "major",
    },
    {
        "generic": "ciprofloxacin",
        "food": "Calcium-fortified foods and juices",
        "effect": "Calcium chelates ciprofloxacin in the GI tract, significantly reducing systemic absorption and antibiotic efficacy",
        "severity": "major",
    },
    {
        "generic": "levofloxacin",
        "food": "Dairy products (milk, yogurt)",
        "effect": "Calcium-mediated chelation reduces levofloxacin absorption — separate administration from calcium-rich foods by at least 2 hours",
        "severity": "moderate",
    },
    {
        "generic": "moxifloxacin",
        "food": "Dairy products and calcium-fortified foods",
        "effect": "Calcium chelation reduces moxifloxacin absorption — administer at least 2 hours before or after calcium-containing foods",
        "severity": "moderate",
    },

    # ── Tetracyclines + dairy ─────────────────────────────────────────────────
    {
        "generic": "tetracycline",
        "food": "Milk and dairy products",
        "effect": "Chelation with calcium, magnesium and iron in dairy reduces tetracycline absorption by 50–80% — take on an empty stomach, 1 hour before or 2 hours after dairy",
        "severity": "major",
    },
    {
        "generic": "doxycycline",
        "food": "Milk and dairy products",
        "effect": "Lesser chelation effect than tetracycline but absorption is still meaningfully reduced — take with a small amount of food if GI irritation occurs, but avoid full dairy meals",
        "severity": "moderate",
    },
    {
        "generic": "doxycycline",
        "food": "Antacids and calcium-containing supplements",
        "effect": "Divalent cation chelation markedly reduces doxycycline bioavailability — separate by at least 2–3 hours",
        "severity": "major",
    },

    # ── Iron + absorption inhibitors ──────────────────────────────────────────
    {
        "generic": "ferrous sulphate",
        "food": "Tea (tannins)",
        "effect": "Tannins in tea form insoluble complexes with iron, reducing absorption by 40–60% — avoid tea within 1–2 hours of iron dose",
        "severity": "moderate",
    },
    {
        "generic": "ferrous sulphate",
        "food": "Coffee",
        "effect": "Polyphenols in coffee inhibit non-haem iron absorption — take iron at least 1 hour before or 2 hours after coffee",
        "severity": "moderate",
    },
    {
        "generic": "ferrous sulphate",
        "food": "Dairy products (calcium)",
        "effect": "Calcium competes with iron at intestinal transporters, reducing iron absorption — avoid co-administration with dairy",
        "severity": "moderate",
    },
    {
        "generic": "ferrous sulphate",
        "food": "High-phytate foods (bran, whole grains, legumes)",
        "effect": "Phytic acid chelates iron forming insoluble phytate-iron complexes that reduce absorption — separate iron dose from high-bran meals",
        "severity": "minor",
    },

    # ── Metformin + alcohol ───────────────────────────────────────────────────
    {
        "generic": "metformin",
        "food": "Alcohol",
        "effect": "Alcohol potentiates metformin-induced lactic acidosis risk, particularly in patients with hepatic impairment or following binge drinking — advise limiting alcohol intake",
        "severity": "major",
    },

    # ── Metronidazole + alcohol ───────────────────────────────────────────────
    {
        "generic": "metronidazole",
        "food": "Alcohol",
        "effect": "Disulfiram-like reaction: flushing, nausea, vomiting, headache and tachycardia due to acetaldehyde accumulation — avoid alcohol during treatment and for 48 hours after",
        "severity": "major",
    },

    # ── Tinidazole + alcohol ──────────────────────────────────────────────────
    {
        "generic": "tinidazole",
        "food": "Alcohol",
        "effect": "Disulfiram-like reaction via the same acetaldehyde accumulation mechanism as metronidazole — avoid alcohol during treatment and for 72 hours after the last dose",
        "severity": "major",
    },

    # ── Cephalosporins with MTT side chain + alcohol ──────────────────────────
    {
        "generic": "cefoperazone",
        "food": "Alcohol",
        "effect": "Disulfiram-like reaction due to the N-methylthiotetrazole (MTT) side chain inhibiting aldehyde dehydrogenase — avoid alcohol during and for 72 hours after treatment",
        "severity": "major",
    },
    {
        "generic": "cefotetan",
        "food": "Alcohol",
        "effect": "Disulfiram-like reaction via MTT side chain inhibition of aldehyde dehydrogenase — avoid alcohol during treatment and for at least 72 hours after",
        "severity": "major",
    },

    # ── Digoxin ───────────────────────────────────────────────────────────────
    {
        "generic": "digoxin",
        "food": "High-fibre foods (oat bran, psyllium, wheat bran)",
        "effect": "Dietary fibre adsorbs digoxin in the GI tract, reducing oral bioavailability — take digoxin 1 hour before or 2 hours after high-fibre meals",
        "severity": "moderate",
    },
    {
        "generic": "digoxin",
        "food": "Liquorice (glycyrrhizin-containing)",
        "effect": "Liquorice causes pseudohyperaldosteronism leading to hypokalaemia; hypokalaemia sensitises the myocardium to digoxin, precipitating toxicity at therapeutic levels",
        "severity": "major",
    },

    # ── Lithium ───────────────────────────────────────────────────────────────
    {
        "generic": "lithium",
        "food": "Low-sodium diet or sodium-restricted foods",
        "effect": "Sodium depletion causes renal compensation by reabsorbing lithium in place of sodium, leading to lithium retention and toxicity — maintain consistent sodium intake",
        "severity": "major",
    },
    {
        "generic": "lithium",
        "food": "High caffeine intake followed by sudden caffeine withdrawal",
        "effect": "Caffeine increases renal lithium excretion; abrupt cessation raises lithium levels unpredictably — taper caffeine gradually and monitor serum lithium",
        "severity": "moderate",
    },
    {
        "generic": "lithium",
        "food": "High-sodium foods (processed foods, added salt)",
        "effect": "High sodium increases renal lithium excretion and may reduce therapeutic lithium levels — maintain a stable, moderate dietary sodium intake",
        "severity": "minor",
    },

    # ── ACE inhibitors + potassium ────────────────────────────────────────────
    {
        "generic": "enalapril",
        "food": "Potassium-rich foods (bananas, oranges, potatoes, avocados, tomatoes)",
        "effect": "ACE inhibitors reduce aldosterone secretion and potassium excretion; high dietary potassium intake may cause hyperkalaemia — monitor serum potassium",
        "severity": "moderate",
    },
    {
        "generic": "lisinopril",
        "food": "Salt substitutes containing potassium chloride",
        "effect": "Salt substitutes are high in potassium and when combined with ACE inhibitor-induced potassium retention can cause severe, life-threatening hyperkalaemia",
        "severity": "major",
    },
    {
        "generic": "ramipril",
        "food": "Potassium-rich foods (bananas, oranges, potatoes, avocados)",
        "effect": "Reduced aldosterone from ACE inhibition combined with high potassium intake risks hyperkalaemia — monitor electrolytes, particularly in renal impairment",
        "severity": "moderate",
    },

    # ── Potassium-sparing diuretics ───────────────────────────────────────────
    {
        "generic": "spironolactone",
        "food": "Potassium-rich foods (bananas, oranges, avocados, dark leafy greens)",
        "effect": "Spironolactone retains potassium; combined with high-potassium foods this risks hyperkalaemia, especially in elderly or renally impaired patients",
        "severity": "moderate",
    },
    {
        "generic": "spironolactone",
        "food": "Salt substitutes (potassium chloride)",
        "effect": "Severe hyperkalaemia risk — potassium-based salt substitutes should be strictly avoided in patients on spironolactone",
        "severity": "major",
    },
    {
        "generic": "amiloride",
        "food": "Potassium-rich foods and salt substitutes",
        "effect": "Amiloride blocks renal potassium excretion; high potassium intake can cause clinically significant hyperkalaemia — advise dietary potassium moderation",
        "severity": "moderate",
    },

    # ── Levothyroxine ─────────────────────────────────────────────────────────
    {
        "generic": "levothyroxine",
        "food": "Soy milk or soy products (tofu, soy flour)",
        "effect": "Soy isoflavones reduce levothyroxine absorption and may directly impair thyroid hormone synthesis — take levothyroxine at least 4 hours apart from soy-containing foods",
        "severity": "moderate",
    },
    {
        "generic": "levothyroxine",
        "food": "High-fibre foods (bran, high-fibre cereal)",
        "effect": "Dietary fibre binds levothyroxine in the gut and reduces absorption — take on an empty stomach 30–60 minutes before breakfast; separate from high-fibre foods",
        "severity": "moderate",
    },
    {
        "generic": "levothyroxine",
        "food": "Calcium-rich foods (dairy, fortified juices)",
        "effect": "Calcium chelates levothyroxine reducing absorption by up to 25% — separate levothyroxine from calcium-containing foods by at least 4 hours",
        "severity": "moderate",
    },
    {
        "generic": "levothyroxine",
        "food": "Coffee",
        "effect": "Coffee reduces levothyroxine intestinal absorption, likely via alteration of gastric motility and binding — take with plain water only; wait at least 30 minutes before coffee",
        "severity": "moderate",
    },

    # ── Phenytoin ─────────────────────────────────────────────────────────────
    {
        "generic": "phenytoin",
        "food": "Continuous enteral nutrition feeds",
        "effect": "Enteral feeds markedly reduce phenytoin absorption — hold feeds for 1–2 hours before and after each oral/NG phenytoin dose and monitor serum phenytoin levels closely",
        "severity": "major",
    },
    {
        "generic": "phenytoin",
        "food": "Folate-poor diet",
        "effect": "Phenytoin impairs folate absorption and metabolism; sustained folate deficiency may paradoxically worsen seizure control and cause megaloblastic anaemia",
        "severity": "moderate",
    },

    # ── Carbamazepine ─────────────────────────────────────────────────────────
    {
        "generic": "carbamazepine",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition by grapefruit furanocoumarins increases carbamazepine plasma levels, risking dose-related toxicity (diplopia, ataxia, nausea) — avoid grapefruit products",
        "severity": "moderate",
    },

    # ── CNS depressants + alcohol ─────────────────────────────────────────────
    {
        "generic": "phenobarbitone",
        "food": "Alcohol",
        "effect": "Additive CNS and respiratory depression — combined use can cause profound sedation, respiratory failure and death; avoid entirely",
        "severity": "major",
    },
    {
        "generic": "diazepam",
        "food": "Alcohol",
        "effect": "Profound synergistic CNS and respiratory depression — even modest alcohol consumption markedly potentiates diazepam sedation; combination is potentially fatal",
        "severity": "major",
    },
    {
        "generic": "lorazepam",
        "food": "Alcohol",
        "effect": "Synergistic CNS and respiratory depression; lorazepam and alcohol together significantly increase risk of over-sedation and respiratory arrest",
        "severity": "major",
    },
    {
        "generic": "morphine",
        "food": "Alcohol",
        "effect": "Additive CNS and respiratory depression — concurrent use can cause fatal respiratory arrest; strictly contraindicated in combination",
        "severity": "major",
    },
    {
        "generic": "codeine",
        "food": "Alcohol",
        "effect": "Additive CNS depression, increased sedation and respiratory depression risk — advise avoidance of alcohol throughout codeine therapy",
        "severity": "major",
    },
    {
        "generic": "tramadol",
        "food": "Alcohol",
        "effect": "Additive CNS and respiratory depression; alcohol also lowers the seizure threshold, compounding tramadol's pro-convulsant risk",
        "severity": "major",
    },
    {
        "generic": "opioids (general)",
        "food": "Alcohol",
        "effect": "Synergistic respiratory depression — alcohol and opioids together are a leading cause of overdose fatality; all patients on opioids must be counselled to abstain",
        "severity": "major",
    },

    # ── NSAIDs + alcohol ──────────────────────────────────────────────────────
    {
        "generic": "ibuprofen",
        "food": "Alcohol",
        "effect": "Increased risk of gastrointestinal bleeding and ulceration — both ibuprofen and alcohol are gastric irritants; concurrent use substantially increases GI haemorrhage risk",
        "severity": "moderate",
    },
    {
        "generic": "aspirin",
        "food": "Alcohol",
        "effect": "Increased GI bleeding risk and additive antiplatelet effect — combination raises risk of gastric mucosal haemorrhage; advise limiting alcohol",
        "severity": "moderate",
    },
    {
        "generic": "naproxen",
        "food": "Alcohol",
        "effect": "Increased risk of gastric ulceration and GI bleeding — NSAID-induced prostaglandin suppression combined with alcohol's mucosal toxicity is synergistic",
        "severity": "moderate",
    },

    # ── Paracetamol + alcohol ─────────────────────────────────────────────────
    {
        "generic": "paracetamol",
        "food": "Alcohol (chronic heavy use)",
        "effect": "Chronic alcohol induces CYP2E1, increasing formation of the hepatotoxic metabolite NAPQI — hepatotoxicity can occur at doses lower than standard toxic thresholds in alcoholics",
        "severity": "major",
    },

    # ── Antihypertensives + alcohol/liquorice ─────────────────────────────────
    {
        "generic": "amlodipine",
        "food": "Alcohol",
        "effect": "Excessive vasodilation and hypotension — alcohol augments the vasodilatory effect of amlodipine, causing pronounced dizziness and falls risk",
        "severity": "moderate",
    },
    {
        "generic": "atenolol",
        "food": "Alcohol",
        "effect": "Excessive hypotension and dizziness; alcohol may mask tachycardia that would otherwise signal hypoglycaemia in diabetic patients on beta-blockers",
        "severity": "moderate",
    },
    {
        "generic": "antihypertensives (general)",
        "food": "Liquorice (glycyrrhizin-containing, including liquorice candy and some herbal teas)",
        "effect": "Glycyrrhizin causes pseudohyperaldosteronism (sodium retention, potassium loss, fluid retention) which antagonises antihypertensive therapy and raises blood pressure",
        "severity": "moderate",
    },

    # ── PDE5 inhibitors ───────────────────────────────────────────────────────
    {
        "generic": "sildenafil",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition by grapefruit increases sildenafil AUC substantially — risk of excessive vasodilation, symptomatic hypotension and visual disturbance",
        "severity": "moderate",
    },

    # ── Immunosuppressants + grapefruit ───────────────────────────────────────
    {
        "generic": "cyclosporine",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 and P-glycoprotein inhibition by furanocoumarins markedly increases cyclosporine bioavailability — nephrotoxicity and excessive immunosuppression risk; avoid entirely",
        "severity": "major",
    },
    {
        "generic": "tacrolimus",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition substantially increases tacrolimus blood levels — nephrotoxicity, neurotoxicity and over-immunosuppression risk; grapefruit must be avoided",
        "severity": "major",
    },

    # ── Bisphosphonates ───────────────────────────────────────────────────────
    {
        "generic": "alendronate",
        "food": "Food, milk or any calcium-containing beverage",
        "effect": "Calcium chelation reduces alendronate absorption by over 60% — must be taken with plain water (200–250 mL) at least 30 minutes before any food, drink or medication",
        "severity": "major",
    },

    # ── Rifampicin ────────────────────────────────────────────────────────────
    {
        "generic": "rifampicin",
        "food": "Food (especially fatty meal)",
        "effect": "Food significantly delays and reduces rifampicin peak absorption — administer on an empty stomach 30 minutes before meals to ensure adequate systemic levels for TB/leprosy treatment",
        "severity": "moderate",
    },

    # ── Antifungals ───────────────────────────────────────────────────────────
    {
        "generic": "ketoconazole",
        "food": "Food and acidic beverages",
        "effect": "Ketoconazole requires an acidic gastric environment for dissolution and absorption — take with food or an acidic drink to improve bioavailability, particularly if on acid-suppressive therapy",
        "severity": "minor",
    },
    {
        "generic": "itraconazole",
        "food": "Food (capsule formulation)",
        "effect": "Itraconazole capsules require gastric acid and food for optimal absorption (up to 30% increase with a full meal) — always take capsules immediately after a meal; oral solution behaves differently and should be taken without food",
        "severity": "moderate",
    },

    # ── Antiplatelet ──────────────────────────────────────────────────────────
    {
        "generic": "clopidogrel",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition may impair conversion of clopidogrel prodrug to its active thiol metabolite, potentially reducing antiplatelet efficacy — avoid regular consumption",
        "severity": "moderate",
    },

    # ── Antiarrhythmics / calcium channel blockers ────────────────────────────
    {
        "generic": "amiodarone",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition increases amiodarone and desethylamiodarone levels, potentially exacerbating QT prolongation and thyroid/pulmonary side effects",
        "severity": "moderate",
    },
    {
        "generic": "nifedipine",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition increases nifedipine bioavailability markedly — excessive vasodilation, symptomatic hypotension and reflex tachycardia may result",
        "severity": "moderate",
    },

    # ── Oncology ──────────────────────────────────────────────────────────────
    {
        "generic": "methotrexate",
        "food": "Alcohol",
        "effect": "Additive hepatotoxicity — both methotrexate and alcohol are hepatotoxic; concurrent use is contraindicated and substantially increases the risk of liver fibrosis and cirrhosis",
        "severity": "major",
    },

    # ── Antipsychotics ────────────────────────────────────────────────────────
    {
        "generic": "chlorpromazine",
        "food": "Caffeine-containing beverages (tea, coffee, cola)",
        "effect": "Tannins in tea and coffee may precipitate chlorpromazine, reducing its oral absorption — advise separation of medication from caffeine-containing drinks by at least 1 hour",
        "severity": "moderate",
    },

    # ── MAOIs + caffeine ──────────────────────────────────────────────────────
    {
        "generic": "phenelzine",
        "food": "Large amounts of caffeine (strong coffee, energy drinks)",
        "effect": "Excessive caffeine intake in patients on MAOIs may potentiate sympathomimetic effects, contributing to hypertension and anxiety — moderate caffeine intake; avoid energy drinks",
        "severity": "moderate",
    },

    # ── Additional clinically important entries ───────────────────────────────
    {
        "generic": "isoniazid",
        "food": "Tyramine-rich foods (aged cheese, cured meats, red wine)",
        "effect": "Isoniazid inhibits monoamine oxidase — combined with high-tyramine foods this can cause flushing, palpitations and hypertension, though milder than with classical MAOIs",
        "severity": "moderate",
    },
    {
        "generic": "isoniazid",
        "food": "Histamine-rich foods (tuna, other scombroid fish, fermented products)",
        "effect": "Isoniazid inhibits histaminase; eating histamine-rich fish (tuna, mackerel) can cause flushing, headache, palpitations and hypotension — avoid scombroid fish during therapy",
        "severity": "moderate",
    },
    {
        "generic": "theophylline",
        "food": "Caffeine-containing beverages (coffee, tea, cola, energy drinks)",
        "effect": "Caffeine is a xanthine derivative that shares pharmacological properties with theophylline — additive risk of nausea, tachycardia, palpitations and seizures at higher combined intakes",
        "severity": "moderate",
    },
    {
        "generic": "theophylline",
        "food": "Charcoal-grilled foods",
        "effect": "Polycyclic aromatic hydrocarbons in charcoal-grilled meat induce CYP1A2, increasing theophylline metabolism and reducing plasma levels — monitor and adjust dose if dietary habits change",
        "severity": "minor",
    },
    {
        "generic": "theophylline",
        "food": "High-protein, low-carbohydrate diet",
        "effect": "High-protein diet induces CYP1A2 and accelerates theophylline clearance, potentially reducing therapeutic levels — maintain consistent dietary patterns",
        "severity": "minor",
    },
    {
        "generic": "fexofenadine",
        "food": "Grapefruit juice, orange juice, apple juice",
        "effect": "Fruit juices inhibit intestinal OATP1A2 uptake transporters, reducing fexofenadine oral bioavailability by up to 70% — take with water only",
        "severity": "major",
    },
    {
        "generic": "celiprolol",
        "food": "Orange juice",
        "effect": "Orange juice inhibits OATP1A2-mediated intestinal uptake, significantly reducing celiprolol absorption — take with water only, at least 2 hours from fruit juice",
        "severity": "moderate",
    },
    {
        "generic": "allopurinol",
        "food": "High-purine foods (organ meats, anchovies, sardines, red meat, beer)",
        "effect": "High-purine diet increases uric acid production, potentially counteracting the urate-lowering effect of allopurinol — advise dietary purine restriction as adjunct to therapy",
        "severity": "minor",
    },
    {
        "generic": "levodopa",
        "food": "High-protein meals (meat, eggs, dairy)",
        "effect": "Large neutral amino acids from dietary protein compete with levodopa for intestinal absorption and blood-brain barrier transport — take 30–45 minutes before meals for consistent motor response",
        "severity": "moderate",
    },
    {
        "generic": "levodopa",
        "food": "Broad beans (fava beans)",
        "effect": "Fava beans contain levodopa naturally — consumption can unpredictably increase total levodopa load, causing dyskinesias or on-off fluctuations",
        "severity": "moderate",
    },
    {
        "generic": "tetracycline",
        "food": "Iron-containing foods or supplements",
        "effect": "Iron chelates tetracycline, substantially reducing both iron and antibiotic absorption — separate administration by at least 3 hours",
        "severity": "major",
    },
    {
        "generic": "fluoride",
        "food": "Dairy products and calcium-rich foods",
        "effect": "Calcium forms insoluble calcium fluoride complexes, markedly reducing fluoride absorption — dental fluoride supplements should not be taken with milk or dairy products",
        "severity": "moderate",
    },
    {
        "generic": "erlotinib",
        "food": "High-fat meal",
        "effect": "High-fat food increases erlotinib AUC by approximately 100% — erlotinib should be taken on an empty stomach (at least 1 hour before or 2 hours after food) for consistent dosing",
        "severity": "major",
    },
    {
        "generic": "nilotinib",
        "food": "Food (any meal)",
        "effect": "Food increases nilotinib bioavailability substantially and unpredictably — must be taken on an empty stomach; taking with a high-fat meal can cause QT prolongation risk from elevated levels",
        "severity": "major",
    },
    {
        "generic": "dasatinib",
        "food": "Grapefruit juice",
        "effect": "CYP3A4 inhibition increases dasatinib plasma levels, raising risk of fluid retention, pleural effusion and haematological toxicity — avoid grapefruit products",
        "severity": "moderate",
    },
    {
        "generic": "lapatinib",
        "food": "Food (high-fat meal)",
        "effect": "Food, particularly a high-fat meal, increases lapatinib AUC by up to 325% compared to fasted state — take consistently under fasted conditions to avoid dose-variable toxicity",
        "severity": "major",
    },
    {
        "generic": "quinidine",
        "food": "Alkalinising foods (large amounts of citrus juice, antacid-rich diet)",
        "effect": "Alkaline urine decreases renal quinidine clearance, increasing plasma levels and risk of toxicity (QT prolongation, torsades de pointes) — maintain a normal, balanced diet",
        "severity": "moderate",
    },
    {
        "generic": "mexiletine",
        "food": "Food",
        "effect": "Food slows mexiletine absorption but reduces GI side effects — take with food or milk to improve tolerability without significantly altering overall bioavailability",
        "severity": "minor",
    },
    {
        "generic": "captopril",
        "food": "Food",
        "effect": "Food reduces captopril absorption by approximately 35–40% — take 1 hour before meals on an empty stomach for optimal antihypertensive effect",
        "severity": "moderate",
    },
    {
        "generic": "furosemide",
        "food": "Liquorice (glycyrrhizin-containing)",
        "effect": "Liquorice causes sodium retention and hypokalaemia via pseudohyperaldosteronism, directly opposing furosemide's diuretic and potassium-sparing goals",
        "severity": "moderate",
    },
    {
        "generic": "ketoconazole",
        "food": "Grapefruit juice",
        "effect": "Grapefruit inhibits CYP3A4-mediated first-pass metabolism of ketoconazole, potentially increasing systemic exposure and risk of QT prolongation and hepatotoxicity",
        "severity": "moderate",
    },
]
