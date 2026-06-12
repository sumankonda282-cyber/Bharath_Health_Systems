"""
Common allergens — SNOMED CT coded where available.
Each entry: {display, snomed (SNOMED code string, optional), group}
Groups: food, drug, environmental, insect, latex, other
"""

ALLERGENS = [
    # ── Food Allergens ────────────────────────────────────────────────────────
    {"display": "Peanuts", "snomed": "256349002", "group": "food"},
    {"display": "Tree Nuts (Cashew, Almond, Walnut)", "snomed": "256350002", "group": "food"},
    {"display": "Milk / Dairy Products", "snomed": "372460003", "group": "food"},
    {"display": "Eggs", "snomed": "414295006", "group": "food"},
    {"display": "Wheat / Gluten", "snomed": "412481005", "group": "food"},
    {"display": "Soybean / Soy", "snomed": "416098002", "group": "food"},
    {"display": "Fish (All types)", "snomed": "256400007", "group": "food"},
    {"display": "Shellfish (Prawn, Shrimp, Crab)", "snomed": "227305001", "group": "food"},
    {"display": "Sesame Seeds", "snomed": "762952008", "group": "food"},
    {"display": "Mustard Seeds", "group": "food"},
    {"display": "Chickpeas / Chana", "group": "food"},
    {"display": "Mango", "group": "food"},
    {"display": "Banana", "group": "food"},
    {"display": "Papaya", "group": "food"},
    {"display": "Strawberry", "group": "food"},
    {"display": "Chocolate / Cocoa", "group": "food"},
    {"display": "Maida (Refined Wheat Flour)", "group": "food"},
    {"display": "Rice", "group": "food"},
    {"display": "Corn / Maize", "group": "food"},
    {"display": "Garlic", "group": "food"},
    {"display": "Onion", "group": "food"},
    {"display": "Brinjal / Eggplant", "group": "food"},
    {"display": "Tomato", "group": "food"},
    {"display": "Citrus Fruits (Orange, Lemon)", "group": "food"},
    {"display": "Food Colouring / Additives", "group": "food"},
    {"display": "Sulphites (Preservatives)", "group": "food"},
    {"display": "MSG (Monosodium Glutamate)", "group": "food"},

    # ── Drug / Medication Allergens ───────────────────────────────────────────
    {"display": "Penicillin / Amoxicillin", "snomed": "372687004", "group": "drug"},
    {"display": "Sulfonamides (Sulpha Drugs)", "snomed": "387406002", "group": "drug"},
    {"display": "Aspirin / NSAIDs", "snomed": "372700008", "group": "drug"},
    {"display": "Ibuprofen", "snomed": "387207008", "group": "drug"},
    {"display": "Diclofenac", "group": "drug"},
    {"display": "Paracetamol (Acetaminophen)", "group": "drug"},
    {"display": "Cephalosporins", "snomed": "372687004", "group": "drug"},
    {"display": "Metronidazole", "group": "drug"},
    {"display": "Ciprofloxacin / Fluoroquinolones", "group": "drug"},
    {"display": "Codeine / Opioids", "group": "drug"},
    {"display": "Morphine", "snomed": "373529000", "group": "drug"},
    {"display": "Tramadol", "group": "drug"},
    {"display": "Contrast Dye (Iodine-based)", "snomed": "406817008", "group": "drug"},
    {"display": "Local Anaesthetics (Lignocaine)", "group": "drug"},
    {"display": "ACE Inhibitors (Enalapril, Ramipril)", "group": "drug"},
    {"display": "Metformin", "group": "drug"},
    {"display": "Insulin", "snomed": "67866001", "group": "drug"},
    {"display": "Statins (Atorvastatin, Rosuvastatin)", "group": "drug"},
    {"display": "Antiepileptics (Phenytoin, Carbamazepine)", "group": "drug"},
    {"display": "Allopurinol", "group": "drug"},
    {"display": "Hydroxychloroquine", "group": "drug"},
    {"display": "Bleomycin / Chemotherapy Agents", "group": "drug"},
    {"display": "Vancomycin (Red Man Syndrome)", "group": "drug"},

    # ── Environmental / Inhalant Allergens ────────────────────────────────────
    {"display": "Dust Mites (Dermatophagoides)", "snomed": "24683000", "group": "environmental"},
    {"display": "House Dust", "snomed": "232421001", "group": "environmental"},
    {"display": "Cockroach", "snomed": "410513001", "group": "environmental"},
    {"display": "Grass Pollen", "snomed": "418470001", "group": "environmental"},
    {"display": "Tree Pollen (Eucalyptus, Acacia)", "group": "environmental"},
    {"display": "Weed Pollen (Parthenium / Congress Grass)", "group": "environmental"},
    {"display": "Pet Dander (Dog, Cat)", "snomed": "303809000", "group": "environmental"},
    {"display": "Cat Hair / Dander", "snomed": "303809000", "group": "environmental"},
    {"display": "Dog Hair / Dander", "group": "environmental"},
    {"display": "Mould / Fungal Spores (Aspergillus)", "snomed": "406829008", "group": "environmental"},
    {"display": "Tobacco Smoke (Passive)", "group": "environmental"},
    {"display": "Perfume / Fragrance", "group": "environmental"},
    {"display": "Strong Chemical Odours / VOCs", "group": "environmental"},
    {"display": "Cold Air / Temperature Change", "group": "environmental"},
    {"display": "Wool / Synthetic Fabrics", "group": "environmental"},

    # ── Insect / Sting Allergens ───────────────────────────────────────────────
    {"display": "Bee / Wasp Sting", "snomed": "288328004", "group": "insect"},
    {"display": "Fire Ant Sting", "group": "insect"},
    {"display": "Mosquito Bite (Hypersensitivity)", "group": "insect"},

    # ── Latex ─────────────────────────────────────────────────────────────────
    {"display": "Latex / Rubber Products", "snomed": "406823001", "group": "latex"},

    # ── Contact / Other ───────────────────────────────────────────────────────
    {"display": "Nickel (Metal Contact)", "snomed": "406819006", "group": "other"},
    {"display": "Hair Dye (PPD)", "group": "other"},
    {"display": "Henna (Mehandi)", "group": "other"},
    {"display": "Soap / Detergent", "group": "other"},
    {"display": "Cosmetics / Skin Creams", "group": "other"},
    {"display": "Sunscreen / Photoallergy", "group": "other"},
    {"display": "Adhesive Tape / Bandage", "group": "other"},
    {"display": "Surgical Antiseptics (Povidone-iodine)", "group": "other"},
    {"display": "Blood / Blood Products (Transfusion Reaction)", "group": "other"},
]
