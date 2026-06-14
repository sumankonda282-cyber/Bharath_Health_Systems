# Comprehensive Drug Interactions for Indian Medical Application
# 300+ entries: drug-drug (200+), drug-food (50+), drug-condition (50+)

interactions = [
    # ── DRUG-DRUG (1-50) ──────────────────────────────────────────────────────
    {"drug1": "Warfarin", "drug2": "Aspirin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Concurrent use greatly increases bleeding risk due to additive anticoagulant and antiplatelet effects.",
     "mechanism": "Pharmacodynamic synergy; aspirin inhibits platelet COX-1 and displaces warfarin from plasma proteins."},

    {"drug1": "Warfarin", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin markedly reduces warfarin plasma levels, leading to loss of anticoagulation and thrombosis risk.",
     "mechanism": "Rifampicin is a potent inducer of CYP2C9 and CYP3A4, accelerating warfarin metabolism."},

    {"drug1": "Warfarin", "drug2": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluconazole markedly increases INR and bleeding risk when combined with warfarin.",
     "mechanism": "CYP2C9 inhibition by fluconazole reduces S-warfarin clearance."},

    {"drug1": "Warfarin", "drug2": "Metronidazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Metronidazole potentiates warfarin anticoagulation, increasing bleeding risk.",
     "mechanism": "Inhibition of CYP2C9 reduces warfarin metabolism; also inhibits CYP3A4."},

    {"drug1": "Warfarin", "drug2": "Cotrimoxazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Cotrimoxazole significantly elevates INR and risk of bleeding in patients on warfarin.",
     "mechanism": "Trimethoprim inhibits CYP2C9; sulfamethoxazole displaces warfarin from albumin binding."},

    {"drug1": "Warfarin", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amiodarone can double or triple INR; bleeding risk is severe and prolonged.",
     "mechanism": "Amiodarone and its metabolite inhibit CYP2C9 and CYP3A4; effect persists weeks after stopping amiodarone."},

    {"drug1": "Warfarin", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ciprofloxacin enhances warfarin effect, raising INR and bleeding risk.",
     "mechanism": "CYP1A2 and CYP2C9 inhibition plus reduction of vitamin K-producing gut flora."},

    {"drug1": "Warfarin", "drug2": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "NSAIDs increase GI bleeding risk and may displace warfarin from protein binding.",
     "mechanism": "COX-1 inhibition impairs platelet aggregation; protein displacement raises free warfarin."},

    {"drug1": "Methotrexate", "drug2": "Cotrimoxazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Potentially fatal pancytopenia due to additive folate antagonism.",
     "mechanism": "Both drugs inhibit dihydrofolate reductase; combined myelosuppression is severe."},

    {"drug1": "Methotrexate", "drug2": "Diclofenac",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Diclofenac reduces renal excretion of methotrexate, leading to toxicity.",
     "mechanism": "NSAIDs reduce renal blood flow and compete for tubular secretion, raising MTX levels."},

    {"drug1": "Methotrexate", "drug2": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ibuprofen reduces methotrexate clearance, increasing risk of mucositis and myelosuppression.",
     "mechanism": "NSAID-mediated reduction of glomerular filtration and tubular secretion of MTX."},

    {"drug1": "Clopidogrel", "drug2": "Omeprazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Omeprazole reduces clopidogrel antiplatelet effect by ~50%, increasing stent thrombosis risk.",
     "mechanism": "Competitive CYP2C19 inhibition prevents conversion of clopidogrel to active metabolite."},

    {"drug1": "Sildenafil", "drug2": "Isosorbide Mononitrate",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination causes profound, potentially fatal hypotension.",
     "mechanism": "Additive cGMP accumulation via nitric oxide pathway and PDE5 inhibition causes severe vasodilation."},

    {"drug1": "Sildenafil", "drug2": "Nitroglycerin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Severe hypotension; contraindicated within 24 hours of sildenafil use.",
     "mechanism": "Both increase cGMP in vascular smooth muscle leading to dangerous vasodilation."},

    {"drug1": "MAO Inhibitors", "drug2": "Tramadol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Potentially fatal serotonin syndrome: hyperthermia, rigidity, myoclonus, seizures.",
     "mechanism": "MAOIs prevent serotonin breakdown; tramadol inhibits serotonin reuptake — combined excess serotonergic activity."},

    {"drug1": "MAO Inhibitors", "drug2": "Fluoxetine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Potentially fatal serotonin syndrome.",
     "mechanism": "Combined inhibition of MAO and serotonin reuptake causes serotonin accumulation."},

    {"drug1": "MAO Inhibitors", "drug2": "Sertraline",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Serotonin syndrome risk; requires 14-day washout between agents.",
     "mechanism": "Additive serotonergic activity from MAO inhibition and SSRI-mediated reuptake blockade."},

    {"drug1": "MAO Inhibitors", "drug2": "Pethidine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Severe serotonin syndrome; hyperpyrexia, coma, cardiovascular collapse.",
     "mechanism": "Pethidine inhibits serotonin reuptake; MAOIs prevent catabolism — acute serotonin excess."},

    {"drug1": "Haloperidol", "drug2": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole raises haloperidol levels and both prolong QTc, risking Torsades de Pointes.",
     "mechanism": "CYP3A4 inhibition by ketoconazole combined with additive QT prolongation."},

    {"drug1": "Clozapine", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive bone marrow suppression; fatal agranulocytosis has been reported.",
     "mechanism": "Both drugs independently cause myelosuppression; combination is synergistically toxic."},

    {"drug1": "Clozapine", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ciprofloxacin can double clozapine levels, causing sedation, seizures, hypotension.",
     "mechanism": "CYP1A2 inhibition by ciprofloxacin slows clozapine metabolism."},

    {"drug1": "Lithium", "drug2": "Ibuprofen",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "NSAIDs increase lithium levels by reducing renal clearance, causing toxicity.",
     "mechanism": "Reduced prostaglandin synthesis decreases renal lithium excretion."},

    {"drug1": "Lithium", "drug2": "Diclofenac",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Diclofenac raises lithium plasma levels, risking neurotoxicity.",
     "mechanism": "NSAID-mediated reduction in renal lithium clearance via prostaglandin inhibition."},

    {"drug1": "Lithium", "drug2": "Enalapril",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "ACE inhibitors can cause lithium toxicity by reducing its renal excretion.",
     "mechanism": "ACE inhibition reduces aldosterone, decreasing sodium and lithium tubular reabsorption compensatorily."},

    {"drug1": "Lithium", "drug2": "Furosemide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Furosemide can precipitate lithium toxicity by causing sodium depletion.",
     "mechanism": "Sodium loss triggers compensatory lithium retention in the proximal tubule."},

    {"drug1": "Digoxin", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amiodarone roughly doubles digoxin levels, causing toxicity (bradycardia, nausea, arrhythmias).",
     "mechanism": "P-glycoprotein inhibition and CYP2D6 inhibition reduce digoxin clearance."},

    {"drug1": "Digoxin", "drug2": "Furosemide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Furosemide-induced hypokalaemia increases digoxin toxicity risk.",
     "mechanism": "Low potassium increases binding of digoxin to cardiac Na+/K+-ATPase, causing arrhythmias."},

    {"drug1": "Digoxin", "drug2": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Clarithromycin markedly increases digoxin plasma concentration.",
     "mechanism": "P-glycoprotein inhibition decreases digoxin elimination; gut flora alteration reduces digoxin degradation."},

    {"drug1": "Simvastatin", "drug2": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Dramatically increased simvastatin levels cause myopathy and rhabdomyolysis.",
     "mechanism": "CYP3A4 inhibition by clarithromycin blocks simvastatin metabolism."},

    {"drug1": "Simvastatin", "drug2": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole increases simvastatin levels >10-fold, causing severe myopathy.",
     "mechanism": "Potent CYP3A4 inhibition markedly reduces statin clearance."},

    {"drug1": "Simvastatin", "drug2": "Amlodipine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amlodipine increases simvastatin exposure; simvastatin dose should not exceed 20 mg.",
     "mechanism": "Weak CYP3A4 inhibition by amlodipine reduces simvastatin clearance."},

    {"drug1": "Atorvastatin", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin dramatically reduces atorvastatin levels, abolishing lipid-lowering effect.",
     "mechanism": "CYP3A4 induction and P-gp induction by rifampicin increase atorvastatin clearance."},

    {"drug1": "Rifampicin", "drug2": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces contraceptive efficacy, leading to unintended pregnancy.",
     "mechanism": "CYP3A4 induction accelerates oestrogen and progestogen metabolism."},

    {"drug1": "Rifampicin", "drug2": "Protease Inhibitors",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces protease inhibitor plasma levels by >75%, causing HIV treatment failure.",
     "mechanism": "Potent CYP3A4 and P-gp induction dramatically increases PI clearance."},

    {"drug1": "Rifampicin", "drug2": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces fluconazole AUC by ~25%; antifungal efficacy may be compromised.",
     "mechanism": "CYP3A4 and CYP2C9 induction increases fluconazole metabolism."},

    {"drug1": "Isoniazid", "drug2": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Isoniazid inhibits phenytoin metabolism, causing phenytoin toxicity (nystagmus, ataxia).",
     "mechanism": "CYP2C9 inhibition by isoniazid reduces phenytoin clearance."},

    {"drug1": "Isoniazid", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Isoniazid can cause carbamazepine toxicity; also hepatotoxicity risk is additive.",
     "mechanism": "CYP3A4 inhibition by isoniazid increases carbamazepine levels."},

    {"drug1": "Isoniazid", "drug2": "Alcohol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Daily alcohol use with isoniazid greatly increases hepatotoxicity risk.",
     "mechanism": "Alcohol induces CYP2E1, producing more hepatotoxic hydrazine metabolite of isoniazid."},

    {"drug1": "Pyrazinamide", "drug2": "Allopurinol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Pyrazinamide inhibits allopurinol efficacy, precipitating gout.",
     "mechanism": "Pyrazinamide reduces uric acid excretion; antagonises xanthine oxidase inhibitor effect."},

    {"drug1": "Aminoglycosides", "drug2": "Furosemide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination greatly increases risk of irreversible ototoxicity and nephrotoxicity.",
     "mechanism": "Additive damage to cochlear hair cells and renal tubules; furosemide raises aminoglycoside levels."},

    {"drug1": "Aminoglycosides", "drug2": "Vancomycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive nephrotoxicity; acute kidney injury risk is substantially elevated.",
     "mechanism": "Independent tubular toxicity mechanisms compound to cause AKI."},

    {"drug1": "Ciprofloxacin", "drug2": "Theophylline",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ciprofloxacin doubles theophylline levels, causing toxicity (seizures, arrhythmias).",
     "mechanism": "CYP1A2 inhibition by ciprofloxacin reduces theophylline clearance."},

    {"drug1": "Erythromycin", "drug2": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Erythromycin raises simvastatin levels, increasing myopathy risk.",
     "mechanism": "CYP3A4 inhibition by erythromycin."},

    {"drug1": "Erythromycin", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Erythromycin potentiates warfarin anticoagulation and bleeding risk.",
     "mechanism": "CYP3A4 and CYP1A2 inhibition; also reduces gut flora producing vitamin K."},

    {"drug1": "Chloroquine", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Both prolong QTc interval; combination risks fatal Torsades de Pointes.",
     "mechanism": "Additive blockade of cardiac hERG potassium channels."},

    {"drug1": "Chloroquine", "drug2": "Halofantrine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation with risk of ventricular arrhythmia.",
     "mechanism": "Both agents prolong cardiac repolarisation via hERG channel blockade."},

    {"drug1": "Metformin", "drug2": "Contrast Dye (Iodinated)",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Iodinated contrast agents can cause acute kidney injury, leading to metformin accumulation and lactic acidosis.",
     "mechanism": "Contrast nephropathy reduces metformin excretion; metformin accumulates and inhibits hepatic lactate metabolism."},

    {"drug1": "Metformin", "drug2": "Alcohol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Alcohol increases lactic acidosis risk in patients taking metformin.",
     "mechanism": "Alcohol impairs hepatic gluconeogenesis and lactate metabolism; combined with metformin, lactate accumulates."},

    {"drug1": "Glibenclamide", "drug2": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluconazole markedly increases glibenclamide plasma levels, causing severe hypoglycaemia.",
     "mechanism": "CYP2C9 inhibition reduces sulphonylurea metabolism."},

    {"drug1": "Glipizide", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ciprofloxacin can cause severe hypoglycaemia when combined with sulphonylureas.",
     "mechanism": "Stimulation of insulin secretion by fluoroquinolones combined with sulphonylurea action."},

    {"drug1": "ACE Inhibitors", "drug2": "Potassium-Sparing Diuretics",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination can cause dangerous hyperkalaemia, risking cardiac arrest.",
     "mechanism": "ACE inhibitors reduce aldosterone, decreasing potassium excretion; potassium-sparing diuretics add to this effect."},

    # ── DRUG-DRUG (51-100) ────────────────────────────────────────────────────
    {"drug1": "Enalapril", "drug2": "Spironolactone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Risk of life-threatening hyperkalaemia, particularly in renal impairment.",
     "mechanism": "Both reduce potassium excretion via aldosterone pathway; additive effect."},

    {"drug1": "Amlodipine", "drug2": "Cyclosporine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amlodipine increases cyclosporine levels, increasing nephrotoxicity and hypertension risk.",
     "mechanism": "CYP3A4 inhibition by amlodipine reduces cyclosporine metabolism."},

    {"drug1": "Carbamazepine", "drug2": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces contraceptive efficacy, risking unintended pregnancy.",
     "mechanism": "CYP3A4 induction increases oestrogen and progestogen metabolism."},

    {"drug1": "Carbamazepine", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces warfarin levels substantially, risking thromboembolism.",
     "mechanism": "CYP2C9 induction accelerates warfarin metabolism."},

    {"drug1": "Carbamazepine", "drug2": "Valproate",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces valproate levels; carbamazepine epoxide (toxic metabolite) may accumulate.",
     "mechanism": "Mutual CYP enzyme interactions; carbamazepine induces valproate metabolism."},

    {"drug1": "Phenytoin", "drug2": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenytoin reduces contraceptive plasma levels, causing contraceptive failure.",
     "mechanism": "CYP3A4 induction by phenytoin increases hormonal metabolism."},

    {"drug1": "Phenytoin", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Complex bidirectional interaction: phenytoin can initially increase then decrease warfarin effect.",
     "mechanism": "Phenytoin initially inhibits then induces CYP2C9; warfarin also alters phenytoin levels."},

    {"drug1": "Phenytoin", "drug2": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluconazole raises phenytoin levels, causing toxicity (nystagmus, ataxia, confusion).",
     "mechanism": "CYP2C9 inhibition by fluconazole reduces phenytoin clearance."},

    {"drug1": "Valproate", "drug2": "Lamotrigine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Valproate doubles lamotrigine plasma levels, risking Stevens-Johnson syndrome and toxicity.",
     "mechanism": "Valproate inhibits UGT1A4-mediated glucuronidation of lamotrigine."},

    {"drug1": "Phenobarbitone", "drug2": "Oral Contraceptives",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenobarbitone reduces contraceptive efficacy substantially.",
     "mechanism": "Potent CYP3A4 induction increases oestrogen and progestogen metabolism."},

    {"drug1": "Tacrolimus", "drug2": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Clarithromycin markedly raises tacrolimus levels, causing nephrotoxicity and neurotoxicity.",
     "mechanism": "CYP3A4 and P-gp inhibition dramatically reduces tacrolimus clearance."},

    {"drug1": "Tacrolimus", "drug2": "Fluconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluconazole substantially increases tacrolimus exposure and toxicity.",
     "mechanism": "CYP3A4 inhibition by fluconazole reduces tacrolimus hepatic metabolism."},

    {"drug1": "Cyclosporine", "drug2": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Clarithromycin can cause 2-3 fold increase in cyclosporine levels, risking nephrotoxicity.",
     "mechanism": "CYP3A4 inhibition by clarithromycin reduces cyclosporine clearance."},

    {"drug1": "Cyclosporine", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces cyclosporine levels by up to 90%, risking transplant rejection.",
     "mechanism": "CYP3A4 and P-gp induction by rifampicin dramatically increases cyclosporine metabolism."},

    {"drug1": "Theophylline", "drug2": "Erythromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Erythromycin increases theophylline levels, risking toxicity (nausea, seizures, arrhythmias).",
     "mechanism": "CYP1A2 inhibition reduces theophylline clearance."},

    {"drug1": "Theophylline", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ciprofloxacin raises theophylline levels by ~80%, causing toxicity.",
     "mechanism": "CYP1A2 inhibition by ciprofloxacin."},

    {"drug1": "Amiodarone", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amiodarone potentiates warfarin effect, causing INR to double or triple.",
     "mechanism": "CYP2C9 and CYP3A4 inhibition by amiodarone; effect persists weeks after amiodarone stopped."},

    {"drug1": "Amiodarone", "drug2": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amiodarone increases risk of simvastatin-induced myopathy.",
     "mechanism": "CYP3A4 inhibition raises simvastatin AUC; simvastatin dose should not exceed 20 mg."},

    {"drug1": "Amiodarone", "drug2": "Digoxin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amiodarone roughly doubles digoxin levels, causing toxicity.",
     "mechanism": "P-gp inhibition reduces digoxin renal and non-renal elimination."},

    {"drug1": "Metoprolol", "drug2": "Verapamil",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination causes severe bradycardia, heart block, and hypotension.",
     "mechanism": "Additive negative chronotropic and dromotropic effects on the AV node."},

    {"drug1": "Atenolol", "drug2": "Verapamil",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Risk of severe bradycardia, complete heart block, and cardiac arrest.",
     "mechanism": "Additive suppression of SA node automaticity and AV conduction."},

    {"drug1": "Diltiazem", "drug2": "Beta-Blockers",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Concurrent use risks severe bradycardia and heart block.",
     "mechanism": "Pharmacodynamic synergy in suppressing AV nodal conduction."},

    {"drug1": "Sotalol", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation with high risk of Torsades de Pointes.",
     "mechanism": "Both block cardiac hERG potassium channels and prolong repolarisation."},

    {"drug1": "Sotalol", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation; ventricular arrhythmia risk.",
     "mechanism": "Fluoroquinolones independently prolong QT; additive with class III antiarrhythmic."},

    {"drug1": "Haloperidol", "drug2": "Metoclopramide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive dopamine blockade causing severe extrapyramidal effects.",
     "mechanism": "Both drugs antagonise dopamine D2 receptors in the striatum."},

    {"drug1": "Clozapine", "drug2": "Benzodiazepines",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combined use can cause respiratory arrest, hypotension, and excessive sedation.",
     "mechanism": "Additive CNS and respiratory depression."},

    {"drug1": "Trazodone", "drug2": "SSRIs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Serotonin syndrome risk when trazodone is combined with SSRIs.",
     "mechanism": "Additive serotonergic activity; trazodone is a serotonin reuptake inhibitor and partial 5-HT agonist."},

    {"drug1": "Tramadol", "drug2": "SSRIs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Serotonin syndrome risk; also lowered seizure threshold.",
     "mechanism": "Tramadol inhibits serotonin reuptake; SSRIs do the same — excess serotonin accumulation."},

    {"drug1": "Fentanyl", "drug2": "Erythromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Erythromycin raises fentanyl levels, causing respiratory depression.",
     "mechanism": "CYP3A4 inhibition reduces fentanyl clearance."},

    {"drug1": "Heparin", "drug2": "Aspirin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive bleeding risk; high-dose aspirin combined with heparin substantially increases haemorrhage.",
     "mechanism": "Pharmacodynamic synergy: anticoagulation plus antiplatelet/anticoagulant effects of aspirin."},

    {"drug1": "Rivaroxaban", "drug2": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole increases rivaroxaban levels by ~160%, greatly increasing bleeding risk.",
     "mechanism": "Combined CYP3A4 and P-gp inhibition reduces rivaroxaban clearance."},

    {"drug1": "Dabigatran", "drug2": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Clarithromycin raises dabigatran levels significantly via P-gp inhibition.",
     "mechanism": "P-glycoprotein inhibition reduces dabigatran efflux and renal elimination."},

    {"drug1": "Apixaban", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces apixaban exposure by ~54%, risking thromboembolism.",
     "mechanism": "CYP3A4 and P-gp induction markedly increases apixaban clearance."},

    {"drug1": "Hydroxychloroquine", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QTc prolongation raising risk of ventricular tachyarrhythmia.",
     "mechanism": "Both prolong cardiac action potential duration via hERG channel effects."},

    {"drug1": "Quinine", "drug2": "Digoxin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Quinine raises digoxin plasma levels, causing toxicity.",
     "mechanism": "P-gp inhibition by quinine reduces digoxin renal elimination."},

    {"drug1": "Artemether", "drug2": "Mefloquine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation and risk of seizures.",
     "mechanism": "Both agents affect cardiac repolarisation; mefloquine lowers seizure threshold."},

    {"drug1": "Fluoxetine", "drug2": "Tamoxifen",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluoxetine reduces tamoxifen conversion to its active metabolite endoxifen, reducing anticancer efficacy.",
     "mechanism": "CYP2D6 inhibition by fluoxetine reduces tamoxifen metabolism to endoxifen."},

    {"drug1": "Paroxetine", "drug2": "Tamoxifen",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Paroxetine is the strongest CYP2D6 inhibitor among SSRIs; reduces endoxifen by ~90%.",
     "mechanism": "Potent CYP2D6 inhibition essentially abolishes tamoxifen activation."},

    {"drug1": "Terbinafine", "drug2": "Tamoxifen",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Terbinafine reduces tamoxifen efficacy by inhibiting its activation to endoxifen.",
     "mechanism": "CYP2D6 inhibition by terbinafine."},

    {"drug1": "Linezolid", "drug2": "SSRIs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Serotonin syndrome risk; linezolid is a weak, reversible MAO inhibitor.",
     "mechanism": "MAO-A inhibition combined with SSRI-mediated serotonin reuptake blockade."},

    {"drug1": "Linezolid", "drug2": "Tramadol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Risk of serotonin syndrome due to linezolid's MAO inhibitory properties.",
     "mechanism": "Combined serotonergic activity from MAO inhibition and tramadol's serotonin effects."},

    {"drug1": "Efavirenz", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces efavirenz plasma levels by ~25%, potentially causing HIV virologic failure.",
     "mechanism": "CYP3A4 induction by rifampicin accelerates efavirenz metabolism."},

    {"drug1": "Lopinavir/Ritonavir", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces lopinavir levels by >75%, causing HIV treatment failure.",
     "mechanism": "Potent CYP3A4 and P-gp induction by rifampicin."},

    {"drug1": "Tenofovir", "drug2": "NSAIDs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "NSAIDs increase risk of tenofovir-associated nephrotoxicity.",
     "mechanism": "NSAIDs reduce renal perfusion; tenofovir accumulates in proximal tubular cells."},

    {"drug1": "Zidovudine", "drug2": "Cotrimoxazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive myelosuppression causing neutropenia and anaemia.",
     "mechanism": "Both drugs suppress bone marrow; cotrimoxazole impairs folate synthesis."},

    {"drug1": "Phenytoin", "drug2": "Isoniazid",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Isoniazid inhibits phenytoin metabolism, causing phenytoin toxicity.",
     "mechanism": "CYP2C9 inhibition by isoniazid reduces phenytoin clearance."},

    {"drug1": "Dapsone", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces dapsone plasma levels by ~50%, potentially reducing efficacy in leprosy treatment.",
     "mechanism": "CYP enzyme induction by rifampicin accelerates dapsone metabolism."},

    {"drug1": "Amlodipine", "drug2": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amlodipine increases simvastatin exposure; max simvastatin dose 20 mg/day.",
     "mechanism": "Mild CYP3A4 inhibition by amlodipine."},

    {"drug1": "Spironolactone", "drug2": "Potassium Supplements",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combined use causes hyperkalaemia with risk of cardiac arrhythmias.",
     "mechanism": "Spironolactone reduces renal potassium excretion; added exogenous potassium overloads capacity."},

    {"drug1": "Metronidazole", "drug2": "Alcohol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Disulfiram-like reaction: flushing, tachycardia, nausea, vomiting, hypotension.",
     "mechanism": "Metronidazole inhibits aldehyde dehydrogenase, causing acetaldehyde accumulation."},

    {"drug1": "Probenecid", "drug2": "Penicillin",
     "interaction_type": "drug-drug", "severity": "moderate",
     "description": "Probenecid increases penicillin plasma levels — intentionally used to prolong penicillin action.",
     "mechanism": "Probenecid blocks OAT transporters that mediate renal tubular secretion of penicillin."},

    # ── DRUG-DRUG (101-150) ───────────────────────────────────────────────────
    {"drug1": "Fluconazole", "drug2": "Midazolam",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluconazole markedly increases oral midazolam exposure, causing prolonged sedation.",
     "mechanism": "CYP3A4 inhibition reduces midazolam clearance."},

    {"drug1": "Ketoconazole", "drug2": "Midazolam",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole increases oral midazolam AUC >10-fold, causing excessive and prolonged sedation.",
     "mechanism": "Potent CYP3A4 inhibition by ketoconazole."},

    {"drug1": "Carbamazepine", "drug2": "Haloperidol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces haloperidol plasma levels by >50%, risking psychotic relapse.",
     "mechanism": "CYP3A4 induction by carbamazepine accelerates haloperidol metabolism."},

    {"drug1": "Rifampicin", "drug2": "Methadone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin drastically reduces methadone levels, precipitating opioid withdrawal.",
     "mechanism": "CYP3A4 and CYP2B6 induction increases methadone clearance."},

    {"drug1": "Rifampicin", "drug2": "Dexamethasone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces dexamethasone levels by ~50%, potentially worsening inflammatory conditions.",
     "mechanism": "CYP3A4 induction by rifampicin accelerates corticosteroid metabolism."},

    {"drug1": "Isoniazid", "drug2": "Alcohol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Daily alcohol greatly increases isoniazid hepatotoxicity.",
     "mechanism": "Alcohol-induced CYP2E1 increases formation of hepatotoxic isoniazid metabolites."},

    {"drug1": "Pyrazinamide", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive hepatotoxicity risk when combined in standard ATT regimen; monitor LFTs.",
     "mechanism": "Independent hepatotoxic mechanisms compound when combined."},

    {"drug1": "Allopurinol", "drug2": "Azathioprine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Allopurinol inhibits azathioprine metabolism, causing severe bone marrow suppression.",
     "mechanism": "Xanthine oxidase inhibition by allopurinol prevents 6-mercaptopurine (active metabolite) inactivation."},

    {"drug1": "Allopurinol", "drug2": "Mercaptopurine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Allopurinol raises 6-mercaptopurine levels 3-4 fold, causing myelosuppression.",
     "mechanism": "Xanthine oxidase inhibition blocks mercaptopurine catabolism."},

    {"drug1": "Chlorpromazine", "drug2": "Lithium",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination may cause neurotoxicity and mask lithium toxicity signs.",
     "mechanism": "Phenothiazines may reduce renal lithium clearance and mask early toxicity symptoms."},

    {"drug1": "Verapamil", "drug2": "Digoxin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Verapamil raises digoxin levels by ~40-70% and additively slows the heart.",
     "mechanism": "P-gp inhibition reduces digoxin renal clearance; additive AV node suppression."},

    {"drug1": "Amoxicillin", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Amoxicillin may enhance warfarin effect by reducing vitamin K-producing gut flora.",
     "mechanism": "Disruption of intestinal flora reduces bacterial vitamin K synthesis."},

    {"drug1": "Azithromycin", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation; risk of ventricular tachycardia.",
     "mechanism": "Both drugs prolong cardiac repolarisation; azithromycin blocks hERG channels."},

    {"drug1": "Azithromycin", "drug2": "Hydroxychloroquine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation with risk of Torsades de Pointes.",
     "mechanism": "Both agents prolong QTc independently; combined effect is additive."},

    {"drug1": "Haloperidol", "drug2": "Lithium",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Neurotoxicity: encephalopathy, irreversible tardive dyskinesia, and brain damage reported.",
     "mechanism": "Pharmacodynamic interaction at dopaminergic and lithium-sensitive pathways; mechanism not fully elucidated."},

    {"drug1": "Olanzapine", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces olanzapine levels by ~50%, risking psychiatric decompensation.",
     "mechanism": "CYP1A2 and CYP3A4 induction by carbamazepine increases olanzapine clearance."},

    {"drug1": "Quetiapine", "drug2": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole raises quetiapine levels >5-fold; excessive sedation and QT prolongation.",
     "mechanism": "CYP3A4 inhibition markedly reduces quetiapine metabolism."},

    {"drug1": "Quetiapine", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces quetiapine levels by ~87%, making therapeutic dosing unreliable.",
     "mechanism": "Potent CYP3A4 induction by carbamazepine."},

    {"drug1": "Risperidone", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces risperidone and 9-hydroxyrisperidone levels; antipsychotic efficacy reduced.",
     "mechanism": "CYP2D6 and CYP3A4 induction."},

    {"drug1": "Valproate", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces valproate levels; carbamazepine-10,11-epoxide (toxic) may accumulate.",
     "mechanism": "CYP enzyme induction of valproate metabolism; epoxide hydrolase inhibition by valproate."},

    {"drug1": "Sodium Valproate", "drug2": "Aspirin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "High-dose aspirin displaces valproate from protein binding, increasing free fraction and toxicity.",
     "mechanism": "Protein binding displacement at albumin sites."},

    {"drug1": "Phenytoin", "drug2": "Valproate",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Complex interaction: valproate can raise or lower phenytoin levels unpredictably.",
     "mechanism": "Valproate displaces phenytoin from protein binding and inhibits CYP2C9."},

    {"drug1": "Gentamicin", "drug2": "Cisplatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive ototoxicity and nephrotoxicity; irreversible hearing loss reported.",
     "mechanism": "Both cause oxidative damage to hair cells and renal tubular cells."},

    {"drug1": "NSAIDs", "drug2": "ACE Inhibitors",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "NSAIDs blunt antihypertensive effect and increase risk of AKI when combined with ACEi.",
     "mechanism": "NSAIDs reduce prostaglandin-mediated afferent arteriolar dilation; combined with ACEi efferent vasodilation, GFR drops."},

    {"drug1": "NSAIDs", "drug2": "ARBs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Triple whammy (NSAID + ARB + diuretic) causes acute kidney injury.",
     "mechanism": "Reduced renal blood flow from NSAID and efferent arteriolar dilation from ARB reduces GFR."},

    {"drug1": "Ketoconazole", "drug2": "Atorvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole raises atorvastatin exposure, increasing myopathy risk.",
     "mechanism": "CYP3A4 inhibition reduces atorvastatin metabolism."},

    {"drug1": "Itraconazole", "drug2": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Itraconazole raises simvastatin levels >10-fold; severe myopathy or rhabdomyolysis risk.",
     "mechanism": "Potent CYP3A4 inhibition."},

    {"drug1": "Ritonavir", "drug2": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ritonavir dramatically raises simvastatin levels; combination is contraindicated.",
     "mechanism": "Ritonavir is among the most potent CYP3A4 inhibitors."},

    {"drug1": "Colchicine", "drug2": "Clarithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Clarithromycin can cause fatal colchicine toxicity by markedly increasing its plasma levels.",
     "mechanism": "CYP3A4 and P-gp inhibition dramatically reduces colchicine clearance."},

    {"drug1": "Colchicine", "drug2": "Cyclosporine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Cyclosporine raises colchicine levels, risking neuromuscular and GI toxicity.",
     "mechanism": "P-gp inhibition and CYP3A4 inhibition by cyclosporine."},

    {"drug1": "Domperidone", "drug2": "Erythromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation with risk of ventricular arrhythmia.",
     "mechanism": "Both prolong QTc; erythromycin also raises domperidone levels via CYP3A4 inhibition."},

    {"drug1": "Ondansetron", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation; risk of Torsades de Pointes.",
     "mechanism": "Both drugs block hERG potassium channels."},

    {"drug1": "Metoclopramide", "drug2": "Haloperidol",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive extrapyramidal side effects: acute dystonia, akathisia.",
     "mechanism": "Both antagonise central dopamine D2 receptors."},

    {"drug1": "Opioids", "drug2": "Benzodiazepines",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination markedly increases risk of respiratory depression and death.",
     "mechanism": "Additive CNS and respiratory depression via opioid and GABA-A receptors."},

    {"drug1": "Morphine", "drug2": "Gabapentin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive CNS depression and respiratory depression risk.",
     "mechanism": "Morphine and gabapentin both depress CNS via different mechanisms; synergistic interaction."},

    {"drug1": "Tramadol", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine lowers tramadol levels and reduces seizure threshold.",
     "mechanism": "CYP3A4 induction reduces tramadol; carbamazepine-induced seizure threshold lowering is additive."},

    {"drug1": "Codeine", "drug2": "Fluoxetine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluoxetine blocks codeine conversion to morphine, reducing analgesia.",
     "mechanism": "CYP2D6 inhibition by fluoxetine prevents codeine O-demethylation to morphine."},

    {"drug1": "Ticagrelor", "drug2": "Aspirin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "High-dose aspirin (>100 mg) reduces ticagrelor efficacy; combination increases bleeding.",
     "mechanism": "High aspirin doses interfere with ticagrelor's P2Y12 binding and increase bleeding."},

    {"drug1": "Aliskiren", "drug2": "ACE Inhibitors",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Dual RAAS blockade causes hyperkalaemia, hypotension, and acute kidney injury.",
     "mechanism": "Additive RAAS suppression: aliskiren blocks renin, ACEi blocks angiotensin I conversion."},

    {"drug1": "Doxycycline", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces doxycycline half-life by >50%, risking antimicrobial failure.",
     "mechanism": "CYP3A4 induction by carbamazepine accelerates doxycycline metabolism."},

    {"drug1": "Doxycycline", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces doxycycline efficacy; used in brucellosis, this can cause treatment failure.",
     "mechanism": "CYP induction by rifampicin accelerates doxycycline elimination."},

    {"drug1": "Clarithromycin", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation; serious ventricular arrhythmia risk.",
     "mechanism": "Both prolong cardiac repolarisation via hERG channel blockade."},

    {"drug1": "Levofloxacin", "drug2": "Antipsychotics",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation with risk of Torsades de Pointes.",
     "mechanism": "Both fluoroquinolones and most antipsychotics block hERG potassium channels."},

    {"drug1": "Moxifloxacin", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Moxifloxacin has intrinsic QT prolonging effect; additive with amiodarone.",
     "mechanism": "Combined hERG channel blockade prolongs QTc to dangerous levels."},

    {"drug1": "Lithium", "drug2": "Hydrochlorothiazide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Thiazides increase lithium levels, risking toxicity.",
     "mechanism": "Sodium depletion from thiazides triggers compensatory lithium reabsorption in the proximal tubule."},

    {"drug1": "Clindamycin", "drug2": "Neuromuscular Blockers",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Clindamycin potentiates neuromuscular blockade, prolonging paralysis.",
     "mechanism": "Direct blockade of nicotinic receptors at the neuromuscular junction."},

    {"drug1": "Fluconazole", "drug2": "Sulfonylureas",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluconazole inhibits sulphonylurea metabolism, causing prolonged severe hypoglycaemia.",
     "mechanism": "CYP2C9 inhibition reduces clearance of glibenclamide, glipizide, and gliclazide."},

    {"drug1": "Gemfibrozil", "drug2": "Simvastatin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination greatly increases risk of myopathy and rhabdomyolysis.",
     "mechanism": "Gemfibrozil inhibits CYP2C8 and OATP1B1, raising simvastatin acid levels."},

    {"drug1": "Gemfibrozil", "drug2": "Repaglinide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Gemfibrozil raises repaglinide levels >8-fold; severe prolonged hypoglycaemia.",
     "mechanism": "CYP2C8 and OATP1B1 inhibition dramatically reduces repaglinide clearance."},

    {"drug1": "Valsartan", "drug2": "Potassium Chloride",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "ARBs combined with potassium supplementation risk dangerous hyperkalaemia.",
     "mechanism": "ARBs reduce aldosterone, decreasing potassium excretion; added potassium overloads."},

    # ── DRUG-DRUG (151-210) ───────────────────────────────────────────────────
    {"drug1": "Atenolol", "drug2": "Insulin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Beta-blockers mask hypoglycaemia symptoms (tachycardia, tremor) while leaving sweating; hypoglycaemia may go unrecognised.",
     "mechanism": "Beta-blockade prevents sympathetically-mediated warning signs of hypoglycaemia."},

    {"drug1": "Metoprolol", "drug2": "Verapamil",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Severe bradycardia, hypotension, and complete heart block risk.",
     "mechanism": "Additive negative chronotropic, dromotropic, and inotropic effects."},

    {"drug1": "Furosemide", "drug2": "NSAIDs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "NSAIDs reduce the diuretic and antihypertensive effects of furosemide.",
     "mechanism": "NSAIDs block prostaglandin-mediated renal vasodilation, reducing furosemide's efficacy."},

    {"drug1": "Chlorothiazide", "drug2": "Lithium",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Thiazide diuretics substantially raise lithium plasma levels.",
     "mechanism": "Sodium depletion increases proximal tubular lithium reabsorption."},

    {"drug1": "Gentamicin", "drug2": "Furosemide",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive ototoxicity and nephrotoxicity; irreversible hearing loss.",
     "mechanism": "Both damage cochlear endothelium and renal proximal tubule cells."},

    {"drug1": "Nifedipine", "drug2": "Cyclosporine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Nifedipine raises cyclosporine levels and can cause gingival overgrowth when combined.",
     "mechanism": "CYP3A4 inhibition by nifedipine; pharmacodynamic gingival overgrowth is additive."},

    {"drug1": "Prednisolone", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin reduces corticosteroid levels by up to 50%, risking disease flare-up.",
     "mechanism": "CYP3A4 induction by rifampicin increases corticosteroid metabolism."},

    {"drug1": "Prednisolone", "drug2": "NSAIDs",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive risk of GI ulceration and bleeding.",
     "mechanism": "Corticosteroids thin gastric mucosa; NSAIDs inhibit COX-1 reducing protective prostaglandins."},

    {"drug1": "Dexamethasone", "drug2": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenytoin reduces dexamethasone levels substantially; steroid-dependent conditions may flare.",
     "mechanism": "CYP3A4 induction by phenytoin accelerates dexamethasone metabolism."},

    {"drug1": "Warfarin", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces warfarin INR substantially, risking thromboembolism.",
     "mechanism": "CYP2C9 and CYP3A4 induction accelerates warfarin metabolism."},

    {"drug1": "Warfarin", "drug2": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenytoin initially inhibits then induces warfarin metabolism; INR is unpredictable.",
     "mechanism": "Biphasic interaction: initial CYP2C9 inhibition then induction; protein binding displacement."},

    {"drug1": "Chloramphenicol", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Chloramphenicol potentiates warfarin anticoagulation, causing bleeding.",
     "mechanism": "CYP2C9 inhibition reduces warfarin clearance; gut flora reduction lowers vitamin K."},

    {"drug1": "Chloramphenicol", "drug2": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Chloramphenicol raises phenytoin levels causing toxicity.",
     "mechanism": "CYP2C9 inhibition by chloramphenicol."},

    {"drug1": "Fluoxetine", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Fluoxetine can increase warfarin effect via CYP inhibition plus antiplatelet activity of SSRIs.",
     "mechanism": "CYP2C9/CYP3A4 inhibition and platelet serotonin depletion."},

    {"drug1": "Sertraline", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "SSRIs inhibit platelet serotonin uptake and may alter warfarin metabolism.",
     "mechanism": "Platelet serotonin depletion impairs platelet aggregation; minor CYP2C9 inhibition."},

    {"drug1": "Acetazolamide", "drug2": "Lithium",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Acetazolamide increases renal lithium excretion initially, then sodium loss causes lithium retention.",
     "mechanism": "Carbonic anhydrase inhibition alters sodium and lithium renal handling."},

    {"drug1": "Quinolones", "drug2": "Antacids",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Antacids reduce quinolone absorption by up to 90%, causing antimicrobial failure.",
     "mechanism": "Chelation of quinolone by divalent/trivalent cations (Al3+, Mg2+, Ca2+) prevents GI absorption."},

    {"drug1": "Doxycycline", "drug2": "Antacids",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Antacids markedly reduce doxycycline absorption, risking treatment failure.",
     "mechanism": "Metal ion chelation prevents doxycycline from being absorbed."},

    {"drug1": "Iron Supplements", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Iron reduces ciprofloxacin absorption by >50%.",
     "mechanism": "Iron chelates ciprofloxacin, forming insoluble complex preventing GI absorption."},

    {"drug1": "Iron Supplements", "drug2": "Levothyroxine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Iron significantly reduces levothyroxine absorption; hypothyroidism may worsen.",
     "mechanism": "Iron chelates levothyroxine in the gut, forming insoluble complex."},

    {"drug1": "Levothyroxine", "drug2": "Calcium Carbonate",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Calcium carbonate reduces levothyroxine absorption, potentially worsening hypothyroidism.",
     "mechanism": "Calcium chelates or adsorbs thyroxine in the gastrointestinal tract."},

    {"drug1": "Levothyroxine", "drug2": "Rifampicin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Rifampicin increases levothyroxine clearance; patients may require dose increases.",
     "mechanism": "CYP3A4 and UGT enzyme induction accelerates levothyroxine metabolism."},

    {"drug1": "Levothyroxine", "drug2": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenytoin reduces serum total T4 and may increase levothyroxine requirements.",
     "mechanism": "Protein binding displacement and CYP induction."},

    {"drug1": "Antacids (Al/Mg)", "drug2": "Tetracycline",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Antacids reduce tetracycline absorption by chelation.",
     "mechanism": "Divalent and trivalent metal ions form insoluble tetracycline chelates in the GI tract."},

    {"drug1": "Sucralfate", "drug2": "Ciprofloxacin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Sucralfate reduces ciprofloxacin absorption by up to 90%.",
     "mechanism": "Sucralfate binds ciprofloxacin in the gut lumen, preventing absorption."},

    {"drug1": "Carbamazepine", "drug2": "Itraconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces itraconazole plasma levels substantially, risking antifungal failure.",
     "mechanism": "CYP3A4 induction by carbamazepine increases itraconazole metabolism."},

    {"drug1": "Itraconazole", "drug2": "Midazolam",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Itraconazole raises oral midazolam levels >10-fold; prolonged and potentially life-threatening sedation.",
     "mechanism": "Potent CYP3A4 inhibition."},

    {"drug1": "Erythromycin", "drug2": "Amiodarone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation; Torsades de Pointes risk.",
     "mechanism": "Both block hERG channels; erythromycin also raises amiodarone levels via CYP inhibition."},

    {"drug1": "Lamivudine", "drug2": "Trimethoprim",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Trimethoprim increases lamivudine AUC by ~43% via competition for renal secretion.",
     "mechanism": "Trimethoprim blocks OCT2-mediated renal tubular secretion of lamivudine."},

    {"drug1": "Methotrexate", "drug2": "Probenecid",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Probenecid reduces methotrexate renal clearance, causing toxicity.",
     "mechanism": "Probenecid blocks OAT3 transporter-mediated renal secretion of MTX."},

    {"drug1": "Tacrolimus", "drug2": "Erythromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Erythromycin raises tacrolimus levels, increasing nephrotoxicity risk.",
     "mechanism": "CYP3A4 inhibition and P-gp inhibition reduce tacrolimus clearance."},

    # ── DRUG-FOOD INTERACTIONS (1-50) ──────────────────────────────────────────
    {"drug1": "Warfarin", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice inhibits CYP3A4, raising warfarin levels and increasing bleeding risk.",
     "mechanism": "Furanocoumarins in grapefruit irreversibly inhibit intestinal CYP3A4."},

    {"drug1": "Warfarin", "drug2": "Vitamin K-rich foods (Spinach, Kale, Broccoli)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Large or inconsistent amounts of vitamin K-rich foods reduce warfarin anticoagulant effect.",
     "mechanism": "Dietary vitamin K directly competes with warfarin's mechanism of blocking vitamin K-dependent clotting factor synthesis."},

    {"drug1": "Simvastatin", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice can increase simvastatin exposure several-fold, causing myopathy.",
     "mechanism": "Furanocoumarins inhibit intestinal CYP3A4, reducing first-pass statin metabolism."},

    {"drug1": "Atorvastatin", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Large amounts of grapefruit juice can raise atorvastatin levels significantly.",
     "mechanism": "CYP3A4 inhibition by furanocoumarins in grapefruit."},

    {"drug1": "Felodipine", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice increases felodipine AUC up to 3-fold, causing excessive hypotension and tachycardia.",
     "mechanism": "Intestinal CYP3A4 inhibition by grapefruit furanocoumarins."},

    {"drug1": "Cyclosporine", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises cyclosporine plasma levels, risking nephrotoxicity and toxicity.",
     "mechanism": "CYP3A4 and P-gp inhibition by grapefruit."},

    {"drug1": "MAO Inhibitors", "drug2": "Tyramine-rich foods (Aged Cheese, Pickles, Fermented Foods)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Hypertensive crisis: severe headache, hypertension, intracerebral haemorrhage risk.",
     "mechanism": "MAO inhibition prevents gut/liver tyramine metabolism; tyramine displaces noradrenaline from nerve terminals causing massive sympathetic surge."},

    {"drug1": "MAO Inhibitors", "drug2": "Red Wine",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Tyramine in red wine causes hypertensive crisis in patients taking MAOIs.",
     "mechanism": "Unmetabolised tyramine releases catecholamines from sympathetic neurons."},

    {"drug1": "Isoniazid", "drug2": "Tuna/Skipjack Fish (Histamine-rich)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Fish scombroid poisoning-like reaction: flushing, sweating, palpitations, headache.",
     "mechanism": "Isoniazid inhibits diamine oxidase (DAO) and MAO, preventing histamine degradation; histamine accumulates."},

    {"drug1": "Isoniazid", "drug2": "Aged Cheese (Tyramine)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Isoniazid is a weak MAO inhibitor; tyramine in aged cheese can cause hypertensive crisis.",
     "mechanism": "Partial MAO inhibition reduces tyramine clearance, raising blood pressure."},

    {"drug1": "Methotrexate", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol significantly increases methotrexate hepatotoxicity.",
     "mechanism": "Additive liver toxicity; alcohol and MTX independently cause hepatic damage."},

    {"drug1": "Metronidazole", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Disulfiram-like reaction: severe flushing, headache, nausea, vomiting, tachycardia.",
     "mechanism": "Metronidazole inhibits aldehyde dehydrogenase; acetaldehyde accumulates after alcohol ingestion."},

    {"drug1": "Tinidazole", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Disulfiram-like reaction similar to metronidazole.",
     "mechanism": "Inhibition of aldehyde dehydrogenase causes acetaldehyde accumulation."},

    {"drug1": "Disulfiram", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Intense nausea, vomiting, flushing, hypotension, respiratory depression — basis for aversion therapy.",
     "mechanism": "Irreversible ALDH inhibition leads to severe acetaldehyde toxicity after alcohol ingestion."},

    {"drug1": "Tacrolimus", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises tacrolimus levels, increasing nephrotoxicity risk.",
     "mechanism": "CYP3A4 inhibition in the gut wall reduces first-pass tacrolimus metabolism."},

    {"drug1": "Midazolam", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises oral midazolam levels, causing excessive sedation.",
     "mechanism": "Intestinal CYP3A4 inhibition by grapefruit furanocoumarins."},

    {"drug1": "Carbamazepine", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises carbamazepine plasma levels, causing neurotoxicity.",
     "mechanism": "CYP3A4 inhibition by grapefruit increases carbamazepine levels."},

    {"drug1": "Sildenafil", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises sildenafil levels, increasing hypotension and adverse effect risk.",
     "mechanism": "CYP3A4 inhibition by grapefruit reduces sildenafil first-pass metabolism."},

    {"drug1": "Metformin", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol increases lactic acidosis risk, especially with excessive intake or liver disease.",
     "mechanism": "Alcohol impairs hepatic lactate clearance; combined with metformin's inhibition of mitochondrial respiration."},

    {"drug1": "Glibenclamide", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol masks and prolongs hypoglycaemia in patients on sulphonylureas.",
     "mechanism": "Alcohol inhibits hepatic gluconeogenesis; combined with sulphonylurea-driven insulin release, hypoglycaemia is severe and prolonged."},

    {"drug1": "Ciprofloxacin", "drug2": "Dairy Products",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Dairy significantly reduces ciprofloxacin absorption.",
     "mechanism": "Calcium in dairy chelates ciprofloxacin, reducing bioavailability by up to 36%."},

    {"drug1": "Ciprofloxacin", "drug2": "Caffeine",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Ciprofloxacin inhibits caffeine metabolism, leading to caffeine toxicity symptoms.",
     "mechanism": "CYP1A2 inhibition by ciprofloxacin blocks caffeine metabolism."},

    {"drug1": "Tetracycline", "drug2": "Dairy Products",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Dairy products reduce tetracycline absorption by ~50%.",
     "mechanism": "Calcium in dairy chelates tetracycline, forming insoluble complex."},

    {"drug1": "Bisphosphonates (Alendronate)", "drug2": "Calcium-rich foods",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Food and calcium-rich products reduce alendronate absorption by >80%.",
     "mechanism": "Calcium chelates bisphosphonates; must be taken 30-60 min before food or any liquid except water."},

    {"drug1": "Levothyroxine", "drug2": "Soy Products",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Soy may reduce levothyroxine absorption, worsening hypothyroidism.",
     "mechanism": "Phytoestrogens in soy may bind levothyroxine or reduce its intestinal absorption."},

    {"drug1": "Levothyroxine", "drug2": "High-Fibre foods (Bran, Whole Grains)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Dietary fibre reduces levothyroxine absorption.",
     "mechanism": "Fibre binds levothyroxine in the GI tract, preventing absorption."},

    {"drug1": "Iron Supplements", "drug2": "Tea/Coffee",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Tea and coffee reduce iron absorption significantly.",
     "mechanism": "Polyphenols and tannins chelate iron, forming insoluble complexes."},

    {"drug1": "Folic Acid", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol impairs folate absorption, metabolism, and renal conservation.",
     "mechanism": "Alcohol interferes with folate intestinal absorption and increases renal folate excretion."},

    {"drug1": "Theophylline", "drug2": "Caffeine",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Caffeine and theophylline have additive methylxanthine effects; increases toxicity risk.",
     "mechanism": "Both are adenosine antagonists and phosphodiesterase inhibitors; pharmacodynamic synergy."},

    {"drug1": "Lithium", "drug2": "Low-Sodium Diet",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Low-sodium diets increase lithium reabsorption and toxicity risk.",
     "mechanism": "Sodium depletion triggers compensatory lithium reabsorption in the proximal tubule."},

    {"drug1": "ACE Inhibitors", "drug2": "Potassium-rich foods (Bananas, Coconut Water)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "High potassium intake with ACEi increases risk of hyperkalaemia.",
     "mechanism": "ACEi reduces aldosterone, decreasing potassium excretion; dietary potassium overloads system."},

    {"drug1": "Doxycycline", "drug2": "Dairy Products",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Dairy reduces doxycycline absorption (less than tetracycline, but significant with milk).",
     "mechanism": "Calcium chelation reduces doxycycline bioavailability."},

    {"drug1": "Linezolid", "drug2": "Tyramine-rich foods",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Linezolid's MAO inhibitory properties mean tyramine-rich foods risk hypertensive crisis.",
     "mechanism": "MAO-A inhibition by linezolid prevents gut tyramine catabolism, causing noradrenaline surge."},

    {"drug1": "Phenytoin", "drug2": "Alcohol (acute ingestion)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Acute alcohol ingestion raises phenytoin levels, worsening CNS toxicity.",
     "mechanism": "Acute alcohol inhibits CYP2C9, reducing phenytoin metabolism."},

    {"drug1": "Quinolones", "drug2": "Milk/Dairy",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Dairy reduces fluoroquinolone absorption by chelation; take 2 hours apart.",
     "mechanism": "Calcium forms non-absorbable chelate with fluoroquinolone in the gut."},

    {"drug1": "Riluzole", "drug2": "Chargrilled Meat",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Charbroiled foods induce CYP1A2, reducing riluzole plasma levels.",
     "mechanism": "Heterocyclic amines in chargrilled meat induce CYP1A2, increasing riluzole clearance."},

    {"drug1": "Tacrolimus", "drug2": "Pomelo/Pomegranate Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "These juices raise tacrolimus levels similar to grapefruit via CYP3A4 inhibition.",
     "mechanism": "Furanocoumarins and other constituents inhibit intestinal CYP3A4."},

    {"drug1": "Anticoagulants", "drug2": "Garlic (high dose supplements)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "High-dose garlic supplements enhance anticoagulant and antiplatelet effect.",
     "mechanism": "Garlic inhibits platelet aggregation and may modestly inhibit CYP2C9."},

    {"drug1": "Warfarin", "drug2": "Ginger (high dose)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "High-dose ginger supplements may increase bleeding risk with warfarin.",
     "mechanism": "Ginger has antiplatelet properties and may inhibit thromboxane synthesis."},

    {"drug1": "Warfarin", "drug2": "Turmeric/Curcumin",
     "interaction_type": "drug-food", "severity": "major",
     "description": "High-dose turmeric supplements may enhance warfarin's anticoagulant effect.",
     "mechanism": "Curcumin inhibits platelet aggregation and may inhibit CYP2C9."},

    {"drug1": "Lithium", "drug2": "Caffeine (high intake)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "High caffeine intake may reduce lithium plasma levels; sudden caffeine withdrawal can raise them.",
     "mechanism": "Caffeine increases renal lithium excretion via competing sodium transport."},

    {"drug1": "Nifedipine", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises nifedipine levels, causing excessive hypotension.",
     "mechanism": "CYP3A4 inhibition by grapefruit furanocoumarins reduces nifedipine first-pass metabolism."},

    {"drug1": "Oral Contraceptives", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises ethinyl oestradiol levels, increasing side effect risk.",
     "mechanism": "CYP3A4 inhibition by grapefruit increases ethinyl oestradiol bioavailability."},

    {"drug1": "Amlodipine", "drug2": "Grapefruit Juice",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Grapefruit juice raises amlodipine plasma concentration, increasing hypotension risk.",
     "mechanism": "CYP3A4 inhibition reduces amlodipine metabolism."},

    {"drug1": "Chlorpromazine", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Additive CNS depression; excessive sedation, respiratory depression.",
     "mechanism": "Pharmacodynamic synergy between phenothiazine-mediated sedation and alcohol CNS depression."},

    {"drug1": "Benzodiazepines", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Additive CNS depression; can cause fatal respiratory depression.",
     "mechanism": "Both potentiate GABA-A receptor chloride influx; synergistic CNS and respiratory depression."},

    {"drug1": "Opioids", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol combined with opioids dramatically increases risk of respiratory depression and death.",
     "mechanism": "Additive CNS and respiratory depression."},

    {"drug1": "Paracetamol", "drug2": "Alcohol (chronic heavy use)",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Chronic heavy alcohol use increases hepatotoxicity risk from paracetamol even at standard doses.",
     "mechanism": "Chronic alcohol induces CYP2E1, increasing toxic NAPQI metabolite from paracetamol."},

    {"drug1": "Methotrexate", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Combination markedly increases hepatotoxicity; hepatic fibrosis and cirrhosis risk.",
     "mechanism": "Additive hepatotoxic mechanisms; alcohol and MTX both cause liver injury independently."},

    {"drug1": "Isoniazid", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Daily alcohol greatly increases isoniazid-induced hepatotoxicity.",
     "mechanism": "Alcohol-induced CYP2E1 produces excess hepatotoxic hydrazine metabolite from isoniazid."},

    {"drug1": "Carbamazepine", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol can lower seizure threshold and impairs carbamazepine absorption pattern.",
     "mechanism": "CNS depression synergy; alcohol may also induce CYP3A4 chronically, altering carbamazepine levels."},

    {"drug1": "Rifampicin", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Additive hepatotoxicity when taking rifampicin in ATT regimen.",
     "mechanism": "Independent hepatotoxic pathways compound when combined with alcohol."},

    {"drug1": "Glipizide", "drug2": "Alcohol",
     "interaction_type": "drug-food", "severity": "major",
     "description": "Alcohol can cause disulfiram-like reaction with some sulphonylureas and prolongs hypoglycaemia.",
     "mechanism": "Glipizide-related flush reaction; alcohol inhibits gluconeogenesis prolonging hypoglycaemia."},

    # ── DRUG-CONDITION INTERACTIONS (1-50) ────────────────────────────────────
    {"drug1": "NSAIDs (Ibuprofen, Diclofenac)", "drug2": "Peptic Ulcer Disease",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "NSAIDs are contraindicated in active peptic ulcer; cause GI bleeding and perforation.",
     "mechanism": "COX-1 inhibition reduces prostaglandin-mediated gastric mucosal protection and bicarbonate secretion."},

    {"drug1": "NSAIDs", "drug2": "Chronic Kidney Disease",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "NSAIDs worsen renal function in CKD, can precipitate acute-on-chronic kidney injury.",
     "mechanism": "Inhibition of prostaglandin-mediated afferent arteriolar dilation reduces GFR in prostaglandin-dependent states."},

    {"drug1": "Metformin", "drug2": "Severe Renal Impairment (eGFR <30)",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Metformin is contraindicated in severe CKD due to lactic acidosis risk from drug accumulation.",
     "mechanism": "Metformin is renally excreted unchanged; accumulation inhibits mitochondrial complex I, impairing lactate metabolism."},

    {"drug1": "Metformin", "drug2": "Liver Failure",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Metformin is contraindicated in hepatic failure due to lactic acidosis risk.",
     "mechanism": "Impaired hepatic lactate clearance combined with metformin's inhibition of gluconeogenesis."},

    {"drug1": "Warfarin", "drug2": "Active Bleeding",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Warfarin is contraindicated in active bleeding; worsens haemorrhage and can be fatal.",
     "mechanism": "Anticoagulation prevents clot formation and fibrin cross-linking needed to stop bleeding."},

    {"drug1": "ACE Inhibitors", "drug2": "Bilateral Renal Artery Stenosis",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "ACEi cause acute kidney injury in bilateral renal artery stenosis.",
     "mechanism": "ACEi abolish angiotensin II-mediated efferent arteriolar tone; when afferent flow is restricted, GFR collapses."},

    {"drug1": "ACE Inhibitors", "drug2": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "ACEi are fetotoxic; cause oligohydramnios, fetal renal failure, limb contractures, skull hypoplasia, and death.",
     "mechanism": "Angiotensin II is essential for fetal renal development and amniotic fluid regulation."},

    {"drug1": "ARBs", "drug2": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "ARBs have same fetotoxic profile as ACE inhibitors; contraindicated in all trimesters.",
     "mechanism": "Angiotensin II receptor blockade impairs fetal renal development."},

    {"drug1": "Statins", "drug2": "Active Liver Disease",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Statins are contraindicated in active liver disease due to risk of hepatotoxicity.",
     "mechanism": "Statins undergo hepatic metabolism; pre-existing liver injury plus statin-related hepatic effects compound damage."},

    {"drug1": "Statins", "drug2": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Statins are contraindicated in pregnancy due to teratogenicity.",
     "mechanism": "Cholesterol is essential for fetal development; HMG-CoA reductase inhibition impairs embryogenesis."},

    {"drug1": "Methotrexate", "drug2": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Methotrexate is a known teratogen and abortifacient; absolutely contraindicated in pregnancy.",
     "mechanism": "Folate antagonism prevents cell division in rapidly dividing fetal tissue."},

    {"drug1": "Thalidomide", "drug2": "Pregnancy",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Extremely potent teratogen causing phocomelia and multiple birth defects.",
     "mechanism": "Inhibits angiogenesis and has IMiD effects disrupting fetal limb and organ development."},

    {"drug1": "Tetracyclines", "drug2": "Pregnancy (2nd/3rd trimester)",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Tetracyclines cause fetal tooth discolouration, enamel hypoplasia, and impaired bone growth.",
     "mechanism": "Tetracyclines chelate calcium and bind to developing tooth and bone matrix in the fetus."},

    {"drug1": "Fluoroquinolones", "drug2": "Children under 18 years",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Fluoroquinolones cause cartilage damage and tendon disorders in paediatric patients.",
     "mechanism": "Fluoroquinolones chelate magnesium, impairing cartilage matrix integrity in growth plates."},

    {"drug1": "Aminoglycosides", "drug2": "Pre-existing Renal Impairment",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Aminoglycosides markedly worsen renal function in patients with pre-existing CKD.",
     "mechanism": "Direct proximal tubular toxicity; reduced clearance leads to drug accumulation."},

    {"drug1": "Spironolactone", "drug2": "Hyperkalaemia",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Spironolactone is contraindicated in patients with existing hyperkalaemia.",
     "mechanism": "Aldosterone antagonism further reduces potassium excretion, potentially causing fatal arrhythmias."},

    {"drug1": "Beta-Blockers", "drug2": "Asthma",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Non-selective beta-blockers precipitate severe bronchospasm in asthmatic patients.",
     "mechanism": "Beta-2 receptor blockade in bronchial smooth muscle causes bronchoconstriction."},

    {"drug1": "Beta-Blockers", "drug2": "Second-degree AV Block",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Beta-blockers can precipitate complete heart block in patients with existing AV conduction disease.",
     "mechanism": "Beta-blockade further suppresses AV nodal conduction."},

    {"drug1": "Digoxin", "drug2": "Hypokalaemia",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Hypokalaemia greatly increases digoxin toxicity risk even at therapeutic levels.",
     "mechanism": "Potassium and digoxin compete for same binding site on Na+/K+-ATPase; low potassium increases digoxin binding."},

    {"drug1": "Thiazide Diuretics", "drug2": "Gout",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Thiazides precipitate gout flares by increasing serum uric acid levels.",
     "mechanism": "Thiazides reduce renal uric acid excretion and promote reabsorption in the proximal tubule."},

    {"drug1": "Clozapine", "drug2": "History of Drug-induced Agranulocytosis",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Patients with prior drug-induced agranulocytosis should not receive clozapine.",
     "mechanism": "Pre-existing susceptibility to myelosuppression dramatically increases fatal agranulocytosis risk."},

    {"drug1": "Fluoroquinolones", "drug2": "QT Prolongation Syndrome",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Fluoroquinolones prolong QTc; contraindicated in patients with congenital or acquired long QT.",
     "mechanism": "hERG channel blockade further prolongs repolarisation in already vulnerable patients."},

    {"drug1": "Tramadol", "drug2": "Epilepsy",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Tramadol lowers seizure threshold; contraindicated or use with extreme caution in epilepsy.",
     "mechanism": "Tramadol inhibits GABA and serotonin/noradrenaline pathways, reducing seizure threshold."},

    {"drug1": "Chloroquine", "drug2": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Chloroquine can trigger haemolytic anaemia in G6PD-deficient patients.",
     "mechanism": "Oxidative stress from chloroquine exceeds the protective capacity of G6PD-deficient red cells."},

    {"drug1": "Primaquine", "drug2": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Primaquine causes severe acute haemolytic anaemia in G6PD-deficient individuals.",
     "mechanism": "Reactive quinone metabolites cause oxidative haemolysis in G6PD-deficient red blood cells."},

    {"drug1": "Dapsone", "drug2": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Dapsone causes severe methaemoglobinaemia and haemolysis in G6PD-deficient patients.",
     "mechanism": "Hydroxylamine metabolite of dapsone oxidises haemoglobin to methaemoglobin; haemolysis follows."},

    {"drug1": "Sulphonamides", "drug2": "G6PD Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Sulphonamides cause haemolytic anaemia in G6PD-deficient patients.",
     "mechanism": "Oxidative metabolites precipitate haemoglobin denaturation in enzyme-deficient red cells."},

    {"drug1": "Oral Contraceptives", "drug2": "History of DVT/PE",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Combined oral contraceptives are contraindicated in patients with history of venous thromboembolism.",
     "mechanism": "Oestrogen increases clotting factors II, VII, X and reduces protein S; thrombotic risk multiplies."},

    {"drug1": "Oral Contraceptives", "drug2": "Migraine with Aura",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Combined OCP is contraindicated in migraine with aura due to stroke risk.",
     "mechanism": "Oestrogen-induced procoagulant state combined with aura-associated cortical spreading depression increases ischaemic stroke risk."},

    {"drug1": "Oestrogens (HRT/OCP)", "drug2": "Active Breast Cancer",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Oestrogen-containing therapies are contraindicated in active or recent oestrogen receptor-positive breast cancer.",
     "mechanism": "Exogenous oestrogen drives ER-positive tumour growth and proliferation."},

    {"drug1": "Corticosteroids", "drug2": "Systemic Fungal Infections",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Corticosteroids worsen systemic fungal infections by impairing immune response.",
     "mechanism": "Glucocorticoid-mediated immunosuppression impairs neutrophil and macrophage fungal killing."},

    {"drug1": "Corticosteroids", "drug2": "Active Tuberculosis (untreated)",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Corticosteroids (without anti-TB cover) can cause fatal dissemination of tuberculosis.",
     "mechanism": "Immunosuppression permits mycobacterial replication and dissemination; only use with appropriate anti-TB treatment."},

    {"drug1": "Immunosuppressants", "drug2": "Active Infection",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Starting immunosuppressants during active infection can cause life-threatening dissemination.",
     "mechanism": "Immunosuppression prevents effective pathogen clearance; infection spreads uncontrolled."},

    {"drug1": "NSAIDs", "drug2": "Heart Failure",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "NSAIDs cause sodium and water retention, worsening heart failure.",
     "mechanism": "Prostaglandin inhibition impairs renal water and sodium excretion, increasing preload and afterload."},

    {"drug1": "Verapamil", "drug2": "Severe LV Systolic Dysfunction",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Verapamil's negative inotropic effect can precipitate acute decompensation in heart failure.",
     "mechanism": "Calcium channel blockade reduces myocardial contractility in an already compromised ventricle."},

    {"drug1": "Chlorpropamide", "drug2": "Renal Failure",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Chlorpropamide accumulates in renal failure, causing prolonged severe hypoglycaemia.",
     "mechanism": "Chlorpropamide is renally cleared; accumulation causes persistent insulin secretion."},

    {"drug1": "Nitrofurantoin", "drug2": "Severe Renal Failure",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Nitrofurantoin is ineffective and toxic in severe CKD (eGFR <30 ml/min).",
     "mechanism": "Drug does not achieve therapeutic urinary concentrations and accumulates systemically causing toxicity."},

    {"drug1": "Lithium", "drug2": "Renal Impairment",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Lithium accumulates in renal impairment; narrow therapeutic index makes toxicity likely.",
     "mechanism": "Lithium is entirely renally excreted; reduced GFR causes accumulation and neurotoxicity."},

    {"drug1": "Opioids", "drug2": "Severe Respiratory Depression",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Opioids are contraindicated in pre-existing severe respiratory depression.",
     "mechanism": "Opioid-mediated mu receptor activation in the brainstem further reduces respiratory drive."},

    {"drug1": "Anticholinergics", "drug2": "Closed-angle Glaucoma",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Anticholinergics precipitate acute angle-closure glaucoma attack by causing pupil dilation.",
     "mechanism": "Mydriasis narrows the iridocorneal angle, obstructing aqueous drainage and acutely raising IOP."},

    {"drug1": "Anticholinergics", "drug2": "Urinary Retention/BPH",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Anticholinergics worsen urinary retention in patients with benign prostatic hypertrophy.",
     "mechanism": "Muscarinic blockade reduces detrusor muscle contractility, impeding bladder emptying."},

    {"drug1": "Potassium-Sparing Diuretics", "drug2": "Addison's Disease",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Already hyperkalaemic patients with Addison's risk fatal hyperkalaemia from aldosterone antagonists.",
     "mechanism": "Addison's disease reduces aldosterone; adding potassium-sparing diuretics eliminates remaining potassium excretion."},

    {"drug1": "Alpha-1 Blockers", "drug2": "Pre-existing Orthostatic Hypotension",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Alpha-1 blockers worsen orthostatic hypotension, increasing fall risk.",
     "mechanism": "Vasodilation from alpha-1 blockade in arterioles impairs the pressor response to standing."},

    {"drug1": "Amiodarone", "drug2": "Thyroid Disease",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Amiodarone causes both hypothyroidism and hyperthyroidism; unpredictable in pre-existing thyroid disease.",
     "mechanism": "Amiodarone contains 37% iodine by weight and inhibits T4-T3 conversion; iodine load can cause either effect."},

    {"drug1": "Methotrexate", "drug2": "Hepatic Fibrosis/Cirrhosis",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Methotrexate is hepatotoxic and is contraindicated in existing hepatic fibrosis or cirrhosis.",
     "mechanism": "MTX accumulates in hepatocytes causing lysosomal damage; existing liver damage multiplies this risk."},

    {"drug1": "Quinine", "drug2": "Myasthenia Gravis",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Quinine may worsen myasthenia gravis by impairing neuromuscular transmission.",
     "mechanism": "Quinine has curare-like blocking properties at the neuromuscular junction."},

    {"drug1": "Aminoglycosides", "drug2": "Myasthenia Gravis",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Aminoglycosides worsen neuromuscular blockade in myasthenia gravis, precipitating crisis.",
     "mechanism": "Inhibition of presynaptic acetylcholine release and postsynaptic receptor binding."},

    {"drug1": "Chloroquine", "drug2": "Psoriasis",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Chloroquine and hydroxychloroquine can trigger or worsen psoriatic flares.",
     "mechanism": "Unknown exact mechanism; may involve lysosomal effects on keratinocyte function."},

    {"drug1": "Beta-Blockers (non-selective)", "drug2": "Phaeochromocytoma (without alpha-blockade)",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Non-selective beta-blockers cause paradoxical severe hypertension in phaeochromocytoma.",
     "mechanism": "Blocking peripheral beta-2 vasodilation unmasks alpha-mediated vasoconstriction from excess catecholamines."},

    {"drug1": "Corticosteroids", "drug2": "Diabetes Mellitus",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Corticosteroids worsen glycaemic control, often requiring insulin in diabetic patients.",
     "mechanism": "Glucocorticoids increase gluconeogenesis, reduce peripheral glucose uptake, and impair pancreatic beta-cell function."},

    {"drug1": "Aspirin", "drug2": "Gout",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Low-dose aspirin raises serum uric acid, precipitating gout attacks.",
     "mechanism": "Low-dose aspirin competitively inhibits renal uric acid secretion via URAT1 transporter."},

    {"drug1": "Thiazide Diuretics", "drug2": "Hyponatraemia",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Thiazides cause symptomatic hyponatraemia, especially in elderly patients.",
     "mechanism": "Impairment of free water excretion via aquaporin dilutional mechanism in the distal tubule."},

    {"drug1": "Trimethoprim", "drug2": "Folate Deficiency",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Trimethoprim worsens folate deficiency, precipitating megaloblastic anaemia.",
     "mechanism": "Dihydrofolate reductase inhibition further depletes folate in already deficient patients."},

    {"drug1": "Tetracyclines", "drug2": "Renal Failure",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Most tetracyclines worsen uraemia in renal failure (exception: doxycycline).",
     "mechanism": "Tetracyclines are anti-anabolic and increase blood urea nitrogen; accumulate in renal impairment."},

    {"drug1": "Fluoroquinolones", "drug2": "Tendon Disease/Rupture History",
     "interaction_type": "drug-condition", "severity": "major",
     "description": "Fluoroquinolones increase risk of tendon rupture, especially the Achilles tendon.",
     "mechanism": "Fluoroquinolones inhibit collagen synthesis and induce matrix metalloproteinases in tenocytes."},
    # ── DRUG-DRUG (additional to reach 200+) ─────────────────────────────────
    {"drug1": "Sildenafil", "drug2": "Alpha-Blockers (Tamsulosin)",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination causes severe symptomatic hypotension.",
     "mechanism": "Additive vasodilation via different pathways: PDE5 inhibition and alpha-1 blockade."},

    {"drug1": "Nifedipine", "drug2": "Beta-Blockers",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination may cause excessive hypotension and bradycardia.",
     "mechanism": "Additive negative chronotropic and hypotensive effects; less severe than with verapamil/diltiazem."},

    {"drug1": "Ritonavir", "drug2": "Midazolam",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ritonavir raises oral midazolam levels >36-fold; life-threatening prolonged sedation.",
     "mechanism": "Potent CYP3A4 inhibition by ritonavir eliminates midazolam first-pass metabolism."},

    {"drug1": "Fluconazole", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Even a single dose of fluconazole can significantly elevate INR in warfarin patients.",
     "mechanism": "CYP2C9 inhibition reduces S-warfarin clearance; effect persists days after fluconazole stopped."},

    {"drug1": "Erythromycin", "drug2": "Domperidone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Additive QT prolongation; erythromycin also raises domperidone levels.",
     "mechanism": "CYP3A4 inhibition increases domperidone levels; both prolong cardiac repolarisation."},

    {"drug1": "Phenobarbitone", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenobarbitone induces warfarin metabolism, reducing anticoagulant effect.",
     "mechanism": "CYP2C9 and CYP3A4 induction by phenobarbitone increases warfarin clearance."},

    {"drug1": "Phenobarbitone", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenobarbitone reduces carbamazepine plasma levels; carbamazepine induces phenobarbitone metabolism.",
     "mechanism": "Mutual CYP3A4 induction reduces plasma levels of both drugs."},

    {"drug1": "Valproate", "drug2": "Phenobarbitone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Valproate inhibits phenobarbitone metabolism, causing excessive sedation.",
     "mechanism": "Inhibition of CYP2C9 and glucuronidation raises phenobarbitone levels significantly."},

    {"drug1": "Chloramphenicol", "drug2": "Sulphonylureas",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Chloramphenicol enhances hypoglycaemic effect of sulphonylureas.",
     "mechanism": "CYP2C9 inhibition reduces sulphonylurea metabolism."},

    {"drug1": "Proton Pump Inhibitors", "drug2": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "PPIs raise gastric pH, markedly reducing ketoconazole absorption.",
     "mechanism": "Ketoconazole requires acidic environment for dissolution; PPIs abolish this."},

    {"drug1": "Rivaroxaban", "drug2": "Carbamazepine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Carbamazepine reduces rivaroxaban exposure by ~50%, risking thromboembolism.",
     "mechanism": "CYP3A4 and P-gp induction by carbamazepine increases rivaroxaban clearance."},

    {"drug1": "Apixaban", "drug2": "Ketoconazole",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Ketoconazole doubles apixaban exposure, substantially increasing bleeding risk.",
     "mechanism": "Combined CYP3A4 and P-gp inhibition by ketoconazole."},

    {"drug1": "Valproate", "drug2": "Aspirin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Aspirin displaces valproate from albumin and inhibits its beta-oxidation, causing valproate toxicity.",
     "mechanism": "Protein binding displacement and inhibition of valproate mitochondrial metabolism."},

    {"drug1": "Colchicine", "drug2": "Azithromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Azithromycin raises colchicine levels; colchicine toxicity (GI, neuromuscular, bone marrow) risk.",
     "mechanism": "P-gp inhibition by azithromycin reduces colchicine elimination."},

    {"drug1": "Methotrexate", "drug2": "Sulfasalazine",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Combination may cause additive myelosuppression (also used intentionally in RA).",
     "mechanism": "Additive bone marrow toxicity; sulfasalazine inhibits folate absorption."},

    {"drug1": "Warfarin", "drug2": "Phenobarbitone",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Phenobarbitone reduces warfarin efficacy, risking thrombosis.",
     "mechanism": "Potent CYP2C9 induction accelerates S-warfarin metabolism."},

    {"drug1": "Clindamycin", "drug2": "Erythromycin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Both compete for the same 50S ribosomal binding site; antagonism reduces antibacterial efficacy.",
     "mechanism": "Competitive binding to 23S rRNA of the bacterial 50S ribosomal subunit."},

    {"drug1": "Cimetidine", "drug2": "Warfarin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Cimetidine markedly potentiates warfarin anticoagulation.",
     "mechanism": "CYP2C9 and CYP3A4 inhibition by cimetidine reduces warfarin clearance."},

    {"drug1": "Cimetidine", "drug2": "Theophylline",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Cimetidine raises theophylline levels, causing toxicity.",
     "mechanism": "CYP1A2 inhibition by cimetidine reduces theophylline metabolism."},

    {"drug1": "Cimetidine", "drug2": "Phenytoin",
     "interaction_type": "drug-drug", "severity": "major",
     "description": "Cimetidine inhibits phenytoin metabolism, causing toxicity.",
     "mechanism": "CYP2C9 inhibition by cimetidine."},
]
