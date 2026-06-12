"""
India-priority drug formulary — generic names, ATC codes, common Indian brands.
Each entry: {generic, atc, drug_class, routes, brands, rx_only}
routes and brands are pipe-separated strings.
"""

DRUGS = [
    # ── Analgesics / Antipyretics ─────────────────────────────────────────────
    {"generic": "Paracetamol", "atc": "N02BE01", "drug_class": "Analgesic/Antipyretic", "routes": "oral|rectal|IV", "brands": "Crocin|Dolo|Calpol|Tylenol|Panadol|Fepanil", "rx_only": False},
    {"generic": "Ibuprofen", "atc": "M01AE01", "drug_class": "NSAID", "routes": "oral|topical", "brands": "Brufen|Combiflam|Ibugesic|Advil|Anafen", "rx_only": False},
    {"generic": "Diclofenac", "atc": "M01AB05", "drug_class": "NSAID", "routes": "oral|IM|topical", "brands": "Voveran|Voltaren|Diclomol|Reactine", "rx_only": True},
    {"generic": "Naproxen", "atc": "M01AE02", "drug_class": "NSAID", "routes": "oral", "brands": "Naprosyn|Xenobid|Flanax", "rx_only": True},
    {"generic": "Aspirin", "atc": "B01AC06", "drug_class": "Antiplatelet/NSAID", "routes": "oral", "brands": "Ecosprin|Disprin|Aspilets|Cardace Asp", "rx_only": False},
    {"generic": "Tramadol", "atc": "N02AX02", "drug_class": "Opioid Analgesic", "routes": "oral|IM|IV", "brands": "Tramazac|Contramal|Ultram|Dolotram", "rx_only": True},
    {"generic": "Morphine", "atc": "N02AA01", "drug_class": "Opioid Analgesic", "routes": "oral|IV|IM|SC", "brands": "Morphine Sulphate|MST Continus|Sevredol", "rx_only": True},
    {"generic": "Fentanyl", "atc": "N01AH01", "drug_class": "Opioid Analgesic", "routes": "IV|transdermal|intranasal", "brands": "Durogesic|Fentanyl Patch|Actiq", "rx_only": True},
    {"generic": "Ketorolac", "atc": "M01AB15", "drug_class": "NSAID", "routes": "oral|IM|IV", "brands": "Toradol|Ketanov|Ketorol", "rx_only": True},
    {"generic": "Celecoxib", "atc": "M01AH01", "drug_class": "COX-2 Inhibitor NSAID", "routes": "oral", "brands": "Celebrex|Celact|Cobix", "rx_only": True},
    {"generic": "Etoricoxib", "atc": "M01AH05", "drug_class": "COX-2 Inhibitor NSAID", "routes": "oral", "brands": "Nucoxia|Arcoxia|Etova", "rx_only": True},
    {"generic": "Mefenamic Acid", "atc": "M01AG01", "drug_class": "NSAID", "routes": "oral", "brands": "Ponstan|Mefkind|Meftal Spas", "rx_only": False},

    # ── Antibiotics ───────────────────────────────────────────────────────────
    {"generic": "Amoxicillin", "atc": "J01CA04", "drug_class": "Penicillin", "routes": "oral|IV|IM", "brands": "Novamox|Mox|Amoxil|Trimox", "rx_only": True},
    {"generic": "Amoxicillin-Clavulanate", "atc": "J01CR02", "drug_class": "Penicillin + Beta-lactamase inhibitor", "routes": "oral|IV", "brands": "Augmentin|Amoxclav|Moxclav|Clavam", "rx_only": True},
    {"generic": "Ampicillin", "atc": "J01CA01", "drug_class": "Penicillin", "routes": "oral|IV|IM", "brands": "Ampilox|Ampicyn|Binotal", "rx_only": True},
    {"generic": "Azithromycin", "atc": "J01FA10", "drug_class": "Macrolide Antibiotic", "routes": "oral|IV", "brands": "Azee|Azithral|Zithromax|Azifast", "rx_only": True},
    {"generic": "Clarithromycin", "atc": "J01FA09", "drug_class": "Macrolide Antibiotic", "routes": "oral|IV", "brands": "Claribid|Klaricid|Clarbest", "rx_only": True},
    {"generic": "Erythromycin", "atc": "J01FA01", "drug_class": "Macrolide Antibiotic", "routes": "oral|IV|topical", "brands": "Althrocin|Erythrocin|Erytop", "rx_only": True},
    {"generic": "Doxycycline", "atc": "J01AA02", "drug_class": "Tetracycline Antibiotic", "routes": "oral|IV", "brands": "Doxrid|Doxt-SL|Vibramycin|Biodoxi", "rx_only": True},
    {"generic": "Ciprofloxacin", "atc": "J01MA02", "drug_class": "Fluoroquinolone", "routes": "oral|IV|topical", "brands": "Cifran|Ciplox|Ciprobid|Quintor", "rx_only": True},
    {"generic": "Levofloxacin", "atc": "J01MA12", "drug_class": "Fluoroquinolone", "routes": "oral|IV", "brands": "Tavanic|Levoflox|Levorid|L-Cin", "rx_only": True},
    {"generic": "Norfloxacin", "atc": "J01MA06", "drug_class": "Fluoroquinolone", "routes": "oral", "brands": "Norflox|Uroflox|Norilet", "rx_only": True},
    {"generic": "Metronidazole", "atc": "J01XD01", "drug_class": "Nitroimidazole", "routes": "oral|IV|topical|rectal", "brands": "Flagyl|Metrogyl|Aristogyl|Aldezol", "rx_only": True},
    {"generic": "Tinidazole", "atc": "J01XD02", "drug_class": "Nitroimidazole", "routes": "oral", "brands": "Tiniba|Fasigyn|Tinidazole Mankind", "rx_only": True},
    {"generic": "Ceftriaxone", "atc": "J01DD04", "drug_class": "Third-gen Cephalosporin", "routes": "IV|IM", "brands": "Monocef|Rocephin|Xone|Ceftriaxone Inj", "rx_only": True},
    {"generic": "Cefuroxime", "atc": "J01DC02", "drug_class": "Second-gen Cephalosporin", "routes": "oral|IV|IM", "brands": "Zinnat|Ceftin|Cefurox|Supacef", "rx_only": True},
    {"generic": "Cefixime", "atc": "J01DD08", "drug_class": "Third-gen Cephalosporin", "routes": "oral", "brands": "Taxim-O|Zifi|Omnatax|Cefodrox", "rx_only": True},
    {"generic": "Cefpodoxime", "atc": "J01DD13", "drug_class": "Third-gen Cephalosporin", "routes": "oral", "brands": "Cepodem|Cefoprox|Zocdox", "rx_only": True},
    {"generic": "Meropenem", "atc": "J01DH02", "drug_class": "Carbapenem", "routes": "IV|IM", "brands": "Meronem|Merop|Meromer|Carbomer", "rx_only": True},
    {"generic": "Imipenem-Cilastatin", "atc": "J01DH51", "drug_class": "Carbapenem", "routes": "IV", "brands": "Tienam|Imipenem Inj|Carbopen", "rx_only": True},
    {"generic": "Vancomycin", "atc": "J01XA01", "drug_class": "Glycopeptide Antibiotic", "routes": "IV|oral", "brands": "Vancomet|Vancomycin Inj|Vance", "rx_only": True},
    {"generic": "Linezolid", "atc": "J01XX08", "drug_class": "Oxazolidinone Antibiotic", "routes": "oral|IV", "brands": "Linox|Lizolid|Zyvox|Linospan", "rx_only": True},
    {"generic": "Cotrimoxazole (Trimethoprim-Sulfamethoxazole)", "atc": "J01EE01", "drug_class": "Sulfonamide Combination", "routes": "oral|IV", "brands": "Bactrim|Septran|Zotrim|Truvirox", "rx_only": True},
    {"generic": "Rifampicin", "atc": "J04AB02", "drug_class": "Rifamycin (Anti-TB)", "routes": "oral|IV", "brands": "Rimactane|Rifadin|Macox|Rifampicin", "rx_only": True},
    {"generic": "Isoniazid", "atc": "J04AC01", "drug_class": "Anti-TB", "routes": "oral|IM", "brands": "Isonex|INH|Stanozide", "rx_only": True},
    {"generic": "Pyrazinamide", "atc": "J04AK01", "drug_class": "Anti-TB", "routes": "oral", "brands": "PZA-Ciba|Pyrazinamide|Rifater", "rx_only": True},
    {"generic": "Ethambutol", "atc": "J04AK02", "drug_class": "Anti-TB", "routes": "oral", "brands": "Myambutol|Combutol|Pediamycin", "rx_only": True},
    {"generic": "Chloroquine", "atc": "P01BA01", "drug_class": "Antimalarial", "routes": "oral|IM", "brands": "Lariago|Resochin|Chloroquine", "rx_only": True},
    {"generic": "Artemether-Lumefantrine", "atc": "P01BF01", "drug_class": "Antimalarial", "routes": "oral", "brands": "Coartem|Arterak|Lumether", "rx_only": True},
    {"generic": "Hydroxychloroquine", "atc": "P01BA02", "drug_class": "Antimalarial/DMARD", "routes": "oral", "brands": "Hcqs|Plaquenil|Hydroxychloroquine", "rx_only": True},

    # ── Antidiabetic Drugs ────────────────────────────────────────────────────
    {"generic": "Metformin", "atc": "A10BA02", "drug_class": "Biguanide (Antidiabetic)", "routes": "oral", "brands": "Glycomet|Glucophage|Gluconorm|Obimet", "rx_only": True},
    {"generic": "Glibenclamide", "atc": "A10BB01", "drug_class": "Sulfonylurea", "routes": "oral", "brands": "Daonil|Glucovance|Semi-Daonil", "rx_only": True},
    {"generic": "Glimepiride", "atc": "A10BB12", "drug_class": "Sulfonylurea", "routes": "oral", "brands": "Amaryl|Glimer|Zoryl|Glimpid", "rx_only": True},
    {"generic": "Gliclazide", "atc": "A10BB09", "drug_class": "Sulfonylurea", "routes": "oral", "brands": "Glizid|Diamicron|Gliclazide MR", "rx_only": True},
    {"generic": "Sitagliptin", "atc": "A10BH01", "drug_class": "DPP-4 Inhibitor", "routes": "oral", "brands": "Januvia|Zitamet|Istamet|Sitagliptin", "rx_only": True},
    {"generic": "Vildagliptin", "atc": "A10BH02", "drug_class": "DPP-4 Inhibitor", "routes": "oral", "brands": "Galvus|Zomelis|Vildamet", "rx_only": True},
    {"generic": "Dapagliflozin", "atc": "A10BK01", "drug_class": "SGLT-2 Inhibitor", "routes": "oral", "brands": "Forxiga|Dapaglyn|Clenbu|Synjardy", "rx_only": True},
    {"generic": "Empagliflozin", "atc": "A10BK03", "drug_class": "SGLT-2 Inhibitor", "routes": "oral", "brands": "Jardiance|Empamed|Empagliflozin", "rx_only": True},
    {"generic": "Insulin Glargine", "atc": "A10AE04", "drug_class": "Long-acting Insulin", "routes": "SC", "brands": "Lantus|Glaritus|Basalog|Toujeo", "rx_only": True},
    {"generic": "Insulin Regular (Soluble)", "atc": "A10AB01", "drug_class": "Short-acting Insulin", "routes": "SC|IV|IM", "brands": "Actrapid|Insugen R|Huminsulin R", "rx_only": True},
    {"generic": "Insulin NPH (Isophane)", "atc": "A10AC01", "drug_class": "Intermediate Insulin", "routes": "SC", "brands": "Insulatard|Huminsulin N|Insugen N", "rx_only": True},

    # ── Antihypertensives ─────────────────────────────────────────────────────
    {"generic": "Amlodipine", "atc": "C08CA01", "drug_class": "Calcium Channel Blocker", "routes": "oral", "brands": "Amlodac|Amlip|Norvasc|Stamlo", "rx_only": True},
    {"generic": "Enalapril", "atc": "C09AA02", "drug_class": "ACE Inhibitor", "routes": "oral|IV", "brands": "Envas|Enaril|Vasotec|Enam", "rx_only": True},
    {"generic": "Ramipril", "atc": "C09AA05", "drug_class": "ACE Inhibitor", "routes": "oral", "brands": "Ramipres|Cardace|Altace|Hopace", "rx_only": True},
    {"generic": "Losartan", "atc": "C09CA01", "drug_class": "ARB (Angiotensin Receptor Blocker)", "routes": "oral", "brands": "Losacar|Covance|Cozaar|Losar", "rx_only": True},
    {"generic": "Telmisartan", "atc": "C09CA07", "drug_class": "ARB", "routes": "oral", "brands": "Telma|Telmikind|Micardis|Telsartan", "rx_only": True},
    {"generic": "Olmesartan", "atc": "C09CA08", "drug_class": "ARB", "routes": "oral", "brands": "Olsar|Olvance|Benicar|Olmighty", "rx_only": True},
    {"generic": "Atenolol", "atc": "C07AB03", "drug_class": "Beta Blocker (Cardioselective)", "routes": "oral|IV", "brands": "Aten|Tenormin|Atekind|Beta-1", "rx_only": True},
    {"generic": "Metoprolol", "atc": "C07AB02", "drug_class": "Beta Blocker (Cardioselective)", "routes": "oral|IV", "brands": "Metolar|Seloken|Betaloc|Lopressor", "rx_only": True},
    {"generic": "Carvedilol", "atc": "C07AG02", "drug_class": "Alpha-Beta Blocker", "routes": "oral", "brands": "Carloc|Carca|Coreg|Carvil", "rx_only": True},
    {"generic": "Bisoprolol", "atc": "C07AB07", "drug_class": "Beta Blocker (Cardioselective)", "routes": "oral", "brands": "Biselect|Bisocor|Concor|Bisomol", "rx_only": True},
    {"generic": "Hydrochlorothiazide", "atc": "C03AA03", "drug_class": "Thiazide Diuretic", "routes": "oral", "brands": "HCTZ|Aquazide|Esidrex|Hydrochlorot", "rx_only": True},
    {"generic": "Furosemide", "atc": "C03CA01", "drug_class": "Loop Diuretic", "routes": "oral|IV|IM", "brands": "Lasix|Frusenex|Frusemide|Diuril", "rx_only": True},
    {"generic": "Spironolactone", "atc": "C03DA01", "drug_class": "Potassium-sparing Diuretic", "routes": "oral", "brands": "Aldactone|Spiromide|Lasilactone", "rx_only": True},
    {"generic": "Nifedipine", "atc": "C08CA05", "drug_class": "Calcium Channel Blocker (Dihydropyridine)", "routes": "oral", "brands": "Depin|Adalat|Calcigard|Nicardia", "rx_only": True},
    {"generic": "Clonidine", "atc": "C02AC01", "drug_class": "Central Alpha-2 Agonist", "routes": "oral|transdermal", "brands": "Catapres|Catapresan|Clonidine", "rx_only": True},

    # ── Lipid-Lowering Drugs ──────────────────────────────────────────────────
    {"generic": "Atorvastatin", "atc": "C10AA05", "drug_class": "Statin (HMG-CoA reductase inhibitor)", "routes": "oral", "brands": "Atorlip|Lipitor|Sortis|Tonact", "rx_only": True},
    {"generic": "Rosuvastatin", "atc": "C10AA07", "drug_class": "Statin", "routes": "oral", "brands": "Rozucor|Crestor|Rosutor|Rosave", "rx_only": True},
    {"generic": "Simvastatin", "atc": "C10AA01", "drug_class": "Statin", "brands": "Zocor|Simlup|Simcard|Lipex", "routes": "oral", "rx_only": True},
    {"generic": "Fenofibrate", "atc": "C10AB05", "drug_class": "Fibrate", "routes": "oral", "brands": "Tricor|Lypanthyl|Lipanthyl|Fibnorm", "rx_only": True},
    {"generic": "Ezetimibe", "atc": "C10AX09", "drug_class": "Cholesterol Absorption Inhibitor", "routes": "oral", "brands": "Ezetrol|Ezedoc|Eze|Zetia", "rx_only": True},

    # ── Cardiac / Antiarrhythmic ───────────────────────────────────────────────
    {"generic": "Digoxin", "atc": "C01AA05", "drug_class": "Cardiac Glycoside", "routes": "oral|IV", "brands": "Lanoxin|Digoxin|Digitek", "rx_only": True},
    {"generic": "Amiodarone", "atc": "C01BD01", "drug_class": "Class III Antiarrhythmic", "routes": "oral|IV", "brands": "Cordarone|Amiodar|Tachyra", "rx_only": True},
    {"generic": "Warfarin", "atc": "B01AA03", "drug_class": "Oral Anticoagulant (Vitamin K antagonist)", "routes": "oral", "brands": "Warf|Coumadin|Notomol|Warfarin", "rx_only": True},
    {"generic": "Rivaroxaban", "atc": "B01AF01", "drug_class": "Direct Oral Anticoagulant (DOAC)", "routes": "oral", "brands": "Xarelto|Xarelplex|Rivarox", "rx_only": True},
    {"generic": "Apixaban", "atc": "B01AF02", "drug_class": "Direct Oral Anticoagulant (DOAC)", "routes": "oral", "brands": "Eliquis|Apigat|Apirab", "rx_only": True},
    {"generic": "Clopidogrel", "atc": "B01AC04", "drug_class": "Antiplatelet (Thienopyridine)", "routes": "oral", "brands": "Clopilet|Plavix|Deplatt|Clopitab", "rx_only": True},
    {"generic": "Isosorbide Mononitrate", "atc": "C01DA14", "drug_class": "Nitrate (Antianginal)", "routes": "oral", "brands": "Imdur|Ismo|Monosorb|Isotrate", "rx_only": True},
    {"generic": "Nitroglycerin (GTN)", "atc": "C01DA02", "drug_class": "Nitrate (Antianginal)", "routes": "sublingual|transdermal|IV", "brands": "Nitrostat|Minitran|GTN Spray|Transderm-Nitro", "rx_only": True},

    # ── GI Drugs ──────────────────────────────────────────────────────────────
    {"generic": "Omeprazole", "atc": "A02BC01", "drug_class": "Proton Pump Inhibitor (PPI)", "routes": "oral|IV", "brands": "Omez|Prilosec|Ocid|Lomac", "rx_only": False},
    {"generic": "Pantoprazole", "atc": "A02BC02", "drug_class": "Proton Pump Inhibitor (PPI)", "routes": "oral|IV", "brands": "Pan|Pantodac|Protonix|Pantop", "rx_only": False},
    {"generic": "Rabeprazole", "atc": "A02BC04", "drug_class": "Proton Pump Inhibitor (PPI)", "routes": "oral", "brands": "Razo|Rablet|Aciphex|Rabeloc", "rx_only": False},
    {"generic": "Esomeprazole", "atc": "A02BC05", "drug_class": "Proton Pump Inhibitor (PPI)", "routes": "oral|IV", "brands": "Nexium|Esomac|Neksium|Sompraz", "rx_only": False},
    {"generic": "Ranitidine", "atc": "A02BA02", "drug_class": "H2 Receptor Blocker", "routes": "oral|IV|IM", "brands": "Rantac|Zinetac|Zantac|Aciloc", "rx_only": False},
    {"generic": "Ondansetron", "atc": "A04AA01", "drug_class": "5-HT3 Antagonist (Antiemetic)", "routes": "oral|IV|IM", "brands": "Emeset|Zofran|Ondem|Vomino", "rx_only": True},
    {"generic": "Domperidone", "atc": "A03FA03", "drug_class": "Dopamine Antagonist (Prokinetic)", "routes": "oral|rectal", "brands": "Domstal|Motilium|Domperi|Vomistop", "rx_only": False},
    {"generic": "Metoclopramide", "atc": "A03FA01", "drug_class": "Dopamine Antagonist (Prokinetic/Antiemetic)", "routes": "oral|IV|IM", "brands": "Perinorm|Reglan|Maxolon|Emeprid", "rx_only": True},
    {"generic": "Loperamide", "atc": "A07DA03", "drug_class": "Antidiarrhoeal", "routes": "oral", "brands": "Imodium|Lopamide|Lomodal|Eldoper", "rx_only": False},
    {"generic": "Lactulose", "atc": "A06AD11", "drug_class": "Osmotic Laxative", "routes": "oral|rectal", "brands": "Duphalac|Lactulax|Cremaffin|Lilac", "rx_only": False},
    {"generic": "Sucralfate", "atc": "A02BX02", "drug_class": "Mucosal Protectant", "routes": "oral", "brands": "Sucral|Sucrafil|Ulcuplex|Sucrose Sulfate", "rx_only": True},

    # ── Respiratory Drugs ─────────────────────────────────────────────────────
    {"generic": "Salbutamol (Albuterol)", "atc": "R03AC02", "drug_class": "Short-acting Beta-2 Agonist (SABA)", "routes": "inhaled|oral|IV|nebuliser", "brands": "Asthalin|Ventolin|Salbutamol|Derihaler", "rx_only": True},
    {"generic": "Formoterol", "atc": "R03AC13", "drug_class": "Long-acting Beta-2 Agonist (LABA)", "routes": "inhaled", "brands": "Foradil|Forair|Formoterol", "rx_only": True},
    {"generic": "Salmeterol", "atc": "R03AC12", "drug_class": "Long-acting Beta-2 Agonist (LABA)", "routes": "inhaled", "brands": "Seretide|Serevent|Salmet", "rx_only": True},
    {"generic": "Ipratropium Bromide", "atc": "R03BB01", "drug_class": "Short-acting Muscarinic Antagonist (SAMA)", "routes": "inhaled|nebuliser", "brands": "Ipravent|Ipratrop|Atrovent", "rx_only": True},
    {"generic": "Tiotropium", "atc": "R03BB04", "drug_class": "Long-acting Muscarinic Antagonist (LAMA)", "routes": "inhaled", "brands": "Spiriva|Tiova|Tiovent|Spiova", "rx_only": True},
    {"generic": "Budesonide", "atc": "R03BA02", "drug_class": "Inhaled Corticosteroid (ICS)", "routes": "inhaled|nebuliser|nasal", "brands": "Budecort|Pulmicort|Budenase|Rhinocort", "rx_only": True},
    {"generic": "Fluticasone", "atc": "R03BA05", "drug_class": "Inhaled Corticosteroid (ICS)", "routes": "inhaled|nasal", "brands": "Flomist|Flixotide|Flovent|Fluticasone", "rx_only": True},
    {"generic": "Montelukast", "atc": "R03DC03", "drug_class": "Leukotriene Receptor Antagonist", "routes": "oral", "brands": "Montair|Singulair|Montek|Montigen", "rx_only": True},
    {"generic": "Theophylline", "atc": "R03DA04", "drug_class": "Methylxanthine (Bronchodilator)", "routes": "oral|IV", "brands": "Theo-Dur|Uniphyllin|Theobid|Theolong", "rx_only": True},
    {"generic": "Dextromethorphan", "atc": "R05DA09", "drug_class": "Antitussive", "routes": "oral", "brands": "Dextrocin|Alex|Benadryl DM|Tossex", "rx_only": False},

    # ── Endocrine / Thyroid ───────────────────────────────────────────────────
    {"generic": "Levothyroxine", "atc": "H03AA01", "drug_class": "Thyroid Hormone Replacement", "routes": "oral|IV", "brands": "Thyrox|Eltroxin|Levothyrox|Thyronorm", "rx_only": True},
    {"generic": "Carbimazole", "atc": "H03BB01", "drug_class": "Antithyroid Drug", "routes": "oral", "brands": "Neo-Mercazole|Carbimazole|Methimazole", "rx_only": True},
    {"generic": "Propylthiouracil", "atc": "H03BA02", "drug_class": "Antithyroid Drug", "routes": "oral", "brands": "PTU|Propylthiouracil", "rx_only": True},
    {"generic": "Prednisolone", "atc": "H02AB06", "drug_class": "Corticosteroid", "routes": "oral|IV|IM", "brands": "Omnacortil|Wysolone|Deltacortril|Prelone", "rx_only": True},
    {"generic": "Dexamethasone", "atc": "H02AB02", "drug_class": "Corticosteroid", "routes": "oral|IV|IM", "brands": "Dexona|Decadron|Dexamethasone Inj|Solodex", "rx_only": True},
    {"generic": "Hydrocortisone", "atc": "H02AB09", "drug_class": "Corticosteroid", "routes": "IV|IM|topical|oral", "brands": "Efcorlin|Solu-Cortef|Cortef|Hytone", "rx_only": True},
    {"generic": "Methylprednisolone", "atc": "H02AB04", "drug_class": "Corticosteroid", "routes": "oral|IV|IM", "brands": "Medrol|Solu-Medrol|Methylpred|Depomedrol", "rx_only": True},

    # ── Neurological / Psychiatric ────────────────────────────────────────────
    {"generic": "Phenytoin", "atc": "N03AB02", "drug_class": "Antiepileptic", "routes": "oral|IV", "brands": "Eptoin|Dilantin|Phenytoin Inj|Fenitoina", "rx_only": True},
    {"generic": "Carbamazepine", "atc": "N03AF01", "drug_class": "Antiepileptic / Mood Stabiliser", "routes": "oral", "brands": "Mazetol|Tegretol|Carbitrol|Carbagen", "rx_only": True},
    {"generic": "Valproate (Sodium Valproate)", "atc": "N03AG01", "drug_class": "Antiepileptic / Mood Stabiliser", "routes": "oral|IV", "brands": "Valparin|Depakene|Epilim|Encorate", "rx_only": True},
    {"generic": "Levetiracetam", "atc": "N03AX14", "drug_class": "Antiepileptic", "routes": "oral|IV", "brands": "Levera|Keppra|Levetiracetam|Levetam", "rx_only": True},
    {"generic": "Clonazepam", "atc": "N03AE01", "drug_class": "Benzodiazepine Antiepileptic", "routes": "oral|IV", "brands": "Clonapax|Rivotril|Clonazepam|Lonazep", "rx_only": True},
    {"generic": "Diazepam", "atc": "N05BA01", "drug_class": "Benzodiazepine Anxiolytic", "routes": "oral|IV|IM|rectal", "brands": "Calmpose|Valium|Diastat|Loridem", "rx_only": True},
    {"generic": "Alprazolam", "atc": "N05BA12", "drug_class": "Benzodiazepine Anxiolytic", "routes": "oral", "brands": "Alprax|Alprazolam|Xanax|Alzolam", "rx_only": True},
    {"generic": "Lorazepam", "atc": "N05BA06", "drug_class": "Benzodiazepine", "routes": "oral|IV|IM", "brands": "Ativan|Larpose|Lorazepam|Calmese", "rx_only": True},
    {"generic": "Sertraline", "atc": "N06AB06", "drug_class": "SSRI Antidepressant", "routes": "oral", "brands": "Serta|Zoloft|Sertraline|Daxid", "rx_only": True},
    {"generic": "Escitalopram", "atc": "N06AB10", "drug_class": "SSRI Antidepressant", "routes": "oral", "brands": "Nexito|Stalopam|Cipralex|Escitalopram", "rx_only": True},
    {"generic": "Fluoxetine", "atc": "N06AB03", "drug_class": "SSRI Antidepressant", "routes": "oral", "brands": "Fludac|Prodep|Prozac|Flunil", "rx_only": True},
    {"generic": "Amitriptyline", "atc": "N06AA09", "drug_class": "Tricyclic Antidepressant (TCA)", "routes": "oral", "brands": "Amitone|Sarotena|Tryptomer|Elavil", "rx_only": True},
    {"generic": "Risperidone", "atc": "N05AX08", "drug_class": "Atypical Antipsychotic", "routes": "oral|IM", "brands": "Sizodon|Risperdal|Risperidon|Rispen", "rx_only": True},
    {"generic": "Olanzapine", "atc": "N05AH03", "drug_class": "Atypical Antipsychotic", "routes": "oral|IM", "brands": "Oleanz|Zyprexa|Olanzapine|Olimelt", "rx_only": True},
    {"generic": "Lithium Carbonate", "atc": "N05AN01", "drug_class": "Mood Stabiliser", "routes": "oral", "brands": "Lithocarb|Lithium|Eskalith|Lithobid", "rx_only": True},
    {"generic": "Levodopa-Carbidopa", "atc": "N04BA02", "drug_class": "Dopaminergic (Parkinson)", "routes": "oral", "brands": "Syndopa|Sinemet|Dopanol|Tidomet", "rx_only": True},
    {"generic": "Donepezil", "atc": "N06DA02", "drug_class": "Cholinesterase Inhibitor (Dementia)", "routes": "oral", "brands": "Donep|Aricept|Alzil|Donecept", "rx_only": True},
    {"generic": "Zolpidem", "atc": "N05CF02", "drug_class": "Non-benzodiazepine Hypnotic", "routes": "oral", "brands": "Nitrest|Ambien|Stilnoct|Zoldem", "rx_only": True},

    # ── Antihistamines / Allergy ───────────────────────────────────────────────
    {"generic": "Cetirizine", "atc": "R06AE07", "drug_class": "Second-gen Antihistamine", "routes": "oral", "brands": "Zyrtec|Cetriz|Okacet|Alerid", "rx_only": False},
    {"generic": "Fexofenadine", "atc": "R06AX26", "drug_class": "Second-gen Antihistamine", "routes": "oral", "brands": "Allegra|Fexofenadine|Telekast-F|Fastofen", "rx_only": False},
    {"generic": "Loratadine", "atc": "R06AX13", "drug_class": "Second-gen Antihistamine", "routes": "oral", "brands": "Alavert|Claritin|Lorfast|Loratadine", "rx_only": False},
    {"generic": "Chlorpheniramine", "atc": "R06AB04", "drug_class": "First-gen Antihistamine", "routes": "oral|IV|IM", "brands": "Piriton|Avil|Chlorphenamine|Cadistin", "rx_only": False},
    {"generic": "Promethazine", "atc": "R06AD02", "drug_class": "First-gen Antihistamine/Antiemetic", "routes": "oral|IV|IM|rectal", "brands": "Phenergan|Promethazine|Avomine|Diphergan", "rx_only": True},
    {"generic": "Epinephrine (Adrenaline)", "atc": "C01CA24", "drug_class": "Adrenergic (Anaphylaxis/Emergency)", "routes": "IV|SC|IM|nebuliser", "brands": "Epinephrine Inj|Adrenaline|EpiPen|Anapen", "rx_only": True},

    # ── Vitamins / Minerals / Supplements ─────────────────────────────────────
    {"generic": "Ferrous Sulphate", "atc": "B03AA07", "drug_class": "Iron Supplement", "routes": "oral|IV", "brands": "Ferium|Fesovit|Albfer|Autrin", "rx_only": False},
    {"generic": "Folic Acid", "atc": "B03BB01", "drug_class": "Folate Supplement", "routes": "oral|IV|IM", "brands": "Folvite|Folic Acid|Folinext|Befol", "rx_only": False},
    {"generic": "Vitamin D3 (Cholecalciferol)", "atc": "A11CC05", "drug_class": "Vitamin D Supplement", "routes": "oral|IM", "brands": "D-Rise|Uprise-D3|Calcirol|Arachitol", "rx_only": False},
    {"generic": "Calcium Carbonate + Vitamin D3", "atc": "A12AA04", "drug_class": "Calcium Supplement", "routes": "oral", "brands": "Shelcal|Calcimax|Calcitas|Ostocalcium", "rx_only": False},
    {"generic": "Vitamin B12 (Methylcobalamin)", "atc": "B03BA01", "drug_class": "B12 Supplement", "routes": "oral|IM|IV", "brands": "Nurokind|Methycobal|Mecobalamin|Cobadex", "rx_only": False},
    {"generic": "Zinc Sulphate", "atc": "A12CB01", "drug_class": "Zinc Supplement", "routes": "oral", "brands": "Zincovit|Zinconia|Zinc-ORS|Zinovet", "rx_only": False},
    {"generic": "ORS (Oral Rehydration Salts)", "atc": "A07CA", "drug_class": "Rehydration Therapy", "routes": "oral", "brands": "Electral|Glucon-D ORS|ORS WHO|Pedialyte", "rx_only": False},

    # ── Antivirals ────────────────────────────────────────────────────────────
    {"generic": "Acyclovir", "atc": "J05AB01", "drug_class": "Antiviral (Herpesvirus)", "routes": "oral|IV|topical", "brands": "Acivir|Zovirax|Acyclovir|Herpex", "rx_only": True},
    {"generic": "Oseltamivir", "atc": "J05AH02", "drug_class": "Neuraminidase Inhibitor (Anti-influenza)", "routes": "oral", "brands": "Tamiflu|Fluvir|Antiflu|Oseltamivir", "rx_only": True},
    {"generic": "Tenofovir-Lamivudine (TLE)", "atc": "J05AR", "drug_class": "Antiretroviral (NRTI combination)", "routes": "oral", "brands": "Tavin-EM|TLD|Tenof-EM|Tafero EM", "rx_only": True},
    {"generic": "Sofosbuvir-Velpatasvir", "atc": "J05AX65", "drug_class": "Direct-acting Antiviral (HCV)", "routes": "oral", "brands": "Sofosvel|Epclusa|Vosevi|Sofovir", "rx_only": True},

    # ── Antifungals ───────────────────────────────────────────────────────────
    {"generic": "Fluconazole", "atc": "J02AC01", "drug_class": "Triazole Antifungal", "routes": "oral|IV", "brands": "Flucos|Diflucan|Forcan|Syscan", "rx_only": True},
    {"generic": "Itraconazole", "atc": "J02AC02", "drug_class": "Triazole Antifungal", "routes": "oral|IV", "brands": "Canditral|Sporanox|Itraconazole|Itaspor", "rx_only": True},
    {"generic": "Clotrimazole", "atc": "D01AC01", "drug_class": "Imidazole Antifungal (Topical)", "routes": "topical|vaginal", "brands": "Candid|Clotrimazole|Lotrisone|Canasten", "rx_only": False},
    {"generic": "Terbinafine", "atc": "D01BA02", "drug_class": "Allylamine Antifungal", "routes": "oral|topical", "brands": "Terbicip|Lamisil|Terbinaf|Fungo", "rx_only": True},

    # ── Urology / Renal ───────────────────────────────────────────────────────
    {"generic": "Tamsulosin", "atc": "G04CA02", "drug_class": "Alpha-1 Blocker (BPH)", "routes": "oral", "brands": "Urimax|Veltam|Flomax|Tamsulosine", "rx_only": True},
    {"generic": "Sildenafil", "atc": "G04BE03", "drug_class": "PDE-5 Inhibitor (ED / PAH)", "routes": "oral|IV", "brands": "Viagra|Penegra|Manforce|Caverta", "rx_only": True},
    {"generic": "Allopurinol", "atc": "M04AA01", "drug_class": "Xanthine Oxidase Inhibitor (Gout)", "routes": "oral", "brands": "Zyloric|Allopurinol|Allostat|Zyloprim", "rx_only": True},
    {"generic": "Colchicine", "atc": "M04AC01", "drug_class": "Anti-gout (Acute)", "routes": "oral", "brands": "Colchicine|Colchicum|Colchi", "rx_only": True},

    # ── Anti-rheumatic / DMARD ────────────────────────────────────────────────
    {"generic": "Methotrexate", "atc": "L04AX03", "drug_class": "DMARD / Antimetabolite", "routes": "oral|IM|SC|IV", "brands": "Folitrax|Methotrexate|Mexate|Biotrexate", "rx_only": True},
    {"generic": "Hydroxychloroquine", "atc": "P01BA02", "drug_class": "DMARD / Antimalarial", "routes": "oral", "brands": "Hcqs|Plaquenil|Hydroxychloroquine", "rx_only": True},
    {"generic": "Sulfasalazine", "atc": "A07EC01", "drug_class": "DMARD / 5-ASA", "routes": "oral|rectal", "brands": "Saaz|Salazopyrin|Azulfidine|Sulfazine", "rx_only": True},
    {"generic": "Azathioprine", "atc": "L04AX01", "drug_class": "Immunosuppressant", "routes": "oral|IV", "brands": "Azoran|Imuran|Azathioprine|Imurel", "rx_only": True},
    {"generic": "Mycophenolate Mofetil", "atc": "L04AA06", "drug_class": "Immunosuppressant", "routes": "oral|IV", "brands": "Cellcept|Mycophenolate|Myfenax|Mycept", "rx_only": True},
    {"generic": "Cyclosporine", "atc": "L04AD01", "drug_class": "Calcineurin Inhibitor (Immunosuppressant)", "routes": "oral|IV", "brands": "Panimun|Sandimmun|Cycloderm|Cyclosporine", "rx_only": True},
    {"generic": "Tacrolimus", "atc": "L04AD02", "drug_class": "Calcineurin Inhibitor", "routes": "oral|IV|topical", "brands": "Pangraf|Tacrolimus|Prograf|Protopic", "rx_only": True},
]
