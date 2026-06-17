/**
 * @shared-pool
 * PediatricHaematologyOncologyForm — Pediatric haematology & oncology assessment
 * Scoring: Hb/severity grading, ITP platelet thresholds, Caprini VTE risk,
 *   aplastic anaemia (SAA/VSAA), Kocher criteria, ALL BFM risk stratification
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, ChevronDown, ChevronUp, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700',
  pill: 'bg-red-100 border-red-300 text-red-800',
  active: 'bg-red-600 border-red-700 text-white',
};

function Pills({ options, value, onChange, accent = A, multi = false }) {
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const sel = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button"
            onClick={() => {
              if (multi) {
                onChange(sel ? vals.filter(x => x !== o) : [...vals, o]);
              } else { onChange(o); }
            }}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${sel ? accent.active : accent.pill}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function FL({ label, sub, children }) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-semibold text-gray-700">
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Gate({ label, value, onChange, accent = A, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <Pills options={['Yes', 'No']} value={value} onChange={onChange} accent={accent} />
      </div>
      {value === 'Yes' && <div className="pl-4 border-l-2 border-gray-200 space-y-3">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = A, children }) {
  return (
    <div className={`rounded-xl border-2 ${applicable === 'N/A' ? 'border-gray-200 bg-gray-50' : accent.border + ' ' + accent.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className={`font-bold text-base ${applicable === 'N/A' ? 'text-gray-400' : accent.text}`}>{title}</h3>
        <div className="flex items-center gap-2">
          {applicable === 'N/A' && <Lock size={14} className="text-gray-400" />}
          <Pills options={['Applicable', 'N/A']} value={applicable} onChange={onApplicable} accent={accent} />
        </div>
      </div>
      {applicable === 'N/A' && (
        <div className="px-4 pb-3 text-xs text-gray-400 italic flex items-center gap-1">
          <Lock size={12} /> Not applicable · section locked
        </div>
      )}
      {applicable === 'Applicable' && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

function ScoreRow({ label, options, value, onChange, accent = A }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <span className="text-sm text-gray-700 w-48 shrink-0">{label}</span>
      <Pills options={options} value={value} onChange={onChange} accent={accent} />
    </div>
  );
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400";
const ta = inp + " min-h-[72px] resize-y";

export default function PediatricHaematologyOncologyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    anaemia: 'Applicable', sicklecell: 'N/A', thalassaemia: 'N/A',
    itp: 'N/A', haemophilia: 'N/A', g6pd: 'N/A',
    malignancy: 'N/A', lymphoma: 'N/A', aplastic: 'N/A',
    neutropenia: 'N/A', transfusion: 'N/A', bmt: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Anaemia
  const [hb, setHb] = useState('');
  const [anaemiaType, setAnaemiaType] = useState('');
  const [anaemiaCause, setAnaemiaCause] = useState([]);
  const [mchMcv, setMchMcv] = useState('');
  const [retic, setRetic] = useState('');
  const [peripheralSmear, setPeripheralSmear] = useState([]);
  const [ironStudies, setIronStudies] = useState('');
  const [vitB12, setVitB12] = useState('');
  const [folate, setFolate] = useState('');
  const [coombsDirect, setCoombsDirect] = useState('');
  const [anaemiaTx, setAnaemiaTx] = useState([]);

  // Sickle Cell
  const [sickleType, setSickleType] = useState('');
  const [sickleDiagnosis, setSickleDiagnosis] = useState('');
  const [vocFeatures, setVocFeatures] = useState([]);
  const [acsFeatures, setAcsFeatures] = useState([]);
  const [hydroxyurea, setHydroxyurea] = useState('');
  const [huDose, setHuDose] = useState('');
  const [hbFLevel, setHbFLevel] = useState('');
  const [sickleComplications, setSickleComplications] = useState([]);
  const [sickleTx, setSickleTx] = useState([]);
  const [sickleLastCrisis, setSickleLastCrisis] = useState('');

  // Thalassaemia
  const [thalType, setThalType] = useState('');
  const [thalHb, setThalHb] = useState('');
  const [thalTransfusionFreq, setThalTransfusionFreq] = useState('');
  const [hbElectro, setHbElectro] = useState('');
  const [chelation, setChelation] = useState('');
  const [chelationDrug, setChelationDrug] = useState('');
  const [ferritin, setFerritin] = useState('');
  const [liverIron, setLiverIron] = useState('');
  const [thalComplications, setThalComplications] = useState([]);
  const [splenomegaly, setSplenomegaly] = useState('');

  // ITP
  const [platelets, setPlatelets] = useState('');
  const [itpType, setItpType] = useState('');
  const [bleedingScore, setBleedingScore] = useState('');
  const [itpFeatures, setItpFeatures] = useState([]);
  const [itpTx, setItpTx] = useState([]);
  const [itpIvigDose, setItpIvigDose] = useState('');

  // Haemophilia
  const [haemType, setHaemType] = useState('');
  const [factorLevel, setFactorLevel] = useState('');
  const [haemSeverity, setHaemSeverity] = useState('');
  const [bleedType, setBleedType] = useState([]);
  const [factorProduct, setFactorProduct] = useState('');
  const [inhibitor, setInhibitor] = useState('');
  const [prophylaxis, setProphylaxis] = useState('');
  const [vwdType, setVwdType] = useState('');
  const [vwfAg, setVwfAg] = useState('');

  // G6PD
  const [g6pdStatus, setG6pdStatus] = useState('');
  const [g6pdVariant, setG6pdVariant] = useState('');
  const [g6pdTrigger, setG6pdTrigger] = useState([]);
  const [haemolysisSigns, setHaemolysisSigns] = useState([]);
  const [g6pdManagement, setG6pdManagement] = useState([]);

  // Malignancy — ALL/AML/Other
  const [malignancyType, setMalignancyType] = useState('');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [allRisk, setAllRisk] = useState('');
  const [cytogenetics, setCytogenetics] = useState([]);
  const [mrdStatus, setMrdStatus] = useState('');
  const [chemoPhase, setChemoPhase] = useState('');
  const [chemoProtocol, setChemoProtocol] = useState('');
  const [cnsStatus, setCnsStatus] = useState('');
  const [bonemarrowResult, setBonemarrowResult] = useState('');
  const [malignancyComplications, setMalignancyComplications] = useState([]);
  const [oncologyNotes, setOncologyNotes] = useState('');
  const [neutrophilCount, setNeutrophilCount] = useState('');
  const [febrileNeutropenia, setFebrileNeutropenia] = useState('');

  // Lymphoma
  const [lymphomaType, setLymphomaType] = useState('');
  const [annArborStage, setAnnArborStage] = useState('');
  const [bulkyDisease, setBulkyDisease] = useState('');
  const [ldhLevel, setLdhLevel] = useState('');
  const [bSymptoms, setBSymptoms] = useState('');
  const [lymphomaProtocol, setLymphomaProtocol] = useState('');
  const [responseAssessment, setResponseAssessment] = useState('');

  // Aplastic Anaemia
  const [aaType, setAaType] = useState('');
  const [aaHb, setAaHb] = useState('');
  const [aaPlatelets, setAaPlatelets] = useState('');
  const [aaNeutrophils, setAaNeutrophils] = useState('');
  const [aaReticulocytes, setAaReticulocytes] = useState('');
  const [aaCellularity, setAaCellularity] = useState('');
  const [aaCause, setAaCause] = useState([]);
  const [aaTx, setAaTx] = useState([]);

  // Neutropenia
  const [neutropeniaCause, setNeutropeniaCause] = useState('');
  const [neutropeniaANC, setNeutropeniaANC] = useState('');
  const [neutropeniaSeverity, setNeutropeniaSeverity] = useState('');
  const [gcsf, setGcsf] = useState('');

  // Transfusion
  const [transfusionType, setTransfusionType] = useState([]);
  const [transfusionReason, setTransfusionReason] = useState('');
  const [crossmatch, setCrossmatch] = useState('');
  const [transfusionReaction, setTransfusionReaction] = useState('');
  const [reactionType, setReactionType] = useState('');

  // BMT
  const [bmtType, setBmtType] = useState('');
  const [bmtIndication, setBmtIndication] = useState('');
  const [bmtDay, setBmtDay] = useState('');
  const [engraftment, setEngraftment] = useState('');
  const [gvhd, setGvhd] = useState('');
  const [gvhdGrade, setGvhdGrade] = useState('');

  // Auto-derived
  const hbSeverity = useMemo(() => {
    const h = parseFloat(hb);
    if (isNaN(h)) return '';
    if (h < 4) return 'Very severe (<4 g/dL) — emergency transfusion';
    if (h < 7) return 'Severe (4–6.9 g/dL)';
    if (h < 10) return 'Moderate (7–9.9 g/dL)';
    if (h < 11) return 'Mild (10–10.9 g/dL)';
    return 'Normal/borderline';
  }, [hb]);

  const aaClass = useMemo(() => {
    const anc = parseFloat(aaNeutrophils);
    const plt = parseFloat(aaPlatelets);
    const retic = parseFloat(aaReticulocytes);
    const cellularity = parseFloat(aaCellularity);
    if (isNaN(anc) && isNaN(plt)) return '';
    if (anc < 0.2 && plt < 20 && retic < 20) return 'VSAA (Very Severe AA) — urgent BMT/ATG';
    if (anc < 0.5 && plt < 20 && retic < 60 && cellularity < 25) return 'SAA (Severe AA) — BMT or IST';
    if (anc >= 0.5 && plt >= 20) return 'Non-severe AA (NSAA) — watch or eltrombopag';
    return 'Classify manually';
  }, [aaNeutrophils, aaPlatelets, aaReticulocytes, aaCellularity]);

  const plateletRisk = useMemo(() => {
    const p = parseFloat(platelets);
    if (isNaN(p)) return '';
    if (p < 10) return 'Critical (<10k) — treat regardless';
    if (p < 20) return 'High risk — treatment indicated';
    if (p < 50) return 'Moderate — monitor, treat if wet purpura/active bleeding';
    if (p < 100) return 'Low-normal — usually observe';
    return 'Normal';
  }, [platelets]);

  const allRiskClass = useMemo(() => {
    if (!allRisk || !cytogenetics.length) return '';
    if (cytogenetics.includes('BCR-ABL1 (Ph+)') || cytogenetics.includes('KMT2A rearrangement') || allRisk === 'High')
      return 'High-risk ALL — intensive BFM protocol + TKI if Ph+';
    if (cytogenetics.includes('ETV6-RUNX1') || cytogenetics.includes('Hyperdiploid (>50)'))
      return 'Standard/Low-risk ALL — standard BFM';
    return `${allRisk}-risk ALL`;
  }, [allRisk, cytogenetics]);

  const criticalAlert = useMemo(() => {
    const h = parseFloat(hb);
    const plt = parseFloat(platelets);
    const anc = parseFloat(neutrophilCount || aaNeutrophils);
    if (h < 4) return 'Critical anaemia — emergency transfusion indicated';
    if (plt < 10) return 'Platelet <10k — immediate platelet transfusion';
    if (febrileNeutropenia === 'Yes') return 'Febrile neutropenia — empirical antibiotics within 60 min (PALS/IDSA)';
    if (aaClass.includes('VSAA')) return 'Very severe aplastic anaemia — urgent haematology referral, BMT work-up';
    return '';
  }, [hb, platelets, neutrophilCount, aaNeutrophils, febrileNeutropenia, aaClass]);

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-haematology-oncology',
      patientId, encounterId,
      data: {
        anaemia: { hb, hbSeverity, anaemiaType, anaemiaCause, mchMcv, retic, peripheralSmear, ironStudies, vitB12, folate, coombsDirect, anaemiaTx },
        sicklecell: { sickleType, sickleDiagnosis, vocFeatures, acsFeatures, hydroxyurea, huDose, hbFLevel, sickleComplications, sickleTx, sickleLastCrisis },
        thalassaemia: { thalType, thalHb, thalTransfusionFreq, hbElectro, chelation, chelationDrug, ferritin, liverIron, thalComplications, splenomegaly },
        itp: { platelets, plateletRisk, itpType, bleedingScore, itpFeatures, itpTx, itpIvigDose },
        haemophilia: { haemType, factorLevel, haemSeverity, bleedType, factorProduct, inhibitor, prophylaxis, vwdType, vwfAg },
        g6pd: { g6pdStatus, g6pdVariant, g6pdTrigger, haemolysisSigns, g6pdManagement },
        malignancy: { malignancyType, diagnosisDate, allRisk, allRiskClass, cytogenetics, mrdStatus, chemoPhase, chemoProtocol, cnsStatus, bonemarrowResult, malignancyComplications, neutrophilCount, febrileNeutropenia, oncologyNotes },
        lymphoma: { lymphomaType, annArborStage, bulkyDisease, ldhLevel, bSymptoms, lymphomaProtocol, responseAssessment },
        aplastic: { aaType, aaHb, aaPlatelets, aaNeutrophils, aaReticulocytes, aaCellularity, aaClass, aaCause, aaTx },
        neutropenia: { neutropeniaCause, neutropeniaANC, neutropeniaSeverity, gcsf },
        transfusion: { transfusionType, transfusionReason, crossmatch, transfusionReaction, reactionType },
        bmt: { bmtType, bmtIndication, bmtDay, engraftment, gvhd, gvhdGrade },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-red-600 to-rose-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Pediatric Haematology & Oncology</h1>
            <p className="text-red-100 text-sm">Anaemia · Haemoglobinopathies · ITP · Haemophilia · Malignancy · BMT</p>
          </div>
        </div>
      </div>

      {/* India Context */}
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Sickle cell belt: Chhattisgarh, Jharkhand, Odisha, MP, Maharashtra tribal regions. National Sickle Cell Anaemia Elimination Mission (2023, target 2047). Thalassaemia prevention: NHM-funded carrier testing & counselling. G6PD deficiency prevalence ~10% (higher in malaria-endemic states). ALL is the commonest childhood cancer (~25% of all pediatric cancers). NHM RBSK screens congenital conditions. Major centres: AIIMS Delhi, Tata Memorial Mumbai, CMC Vellore, PGIMER Chandigarh (BMT). PM-JAY covers many paediatric haem-onc procedures.</p>
      </div>

      {/* Critical Alert */}
      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div>
            <div className="font-bold text-red-700">HAEMATOLOGY EMERGENCY</div>
            <div className="text-red-800 text-sm">{criticalAlert}</div>
          </div>
        </div>
      )}

      {/* ── ANAEMIA ── */}
      <Section title="Anaemia Assessment" applicable={sec.anaemia} onApplicable={v => sa('anaemia', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Haemoglobin" sub="g/dL">
            <input className={inp} value={hb} onChange={e => setHb(e.target.value)} placeholder="e.g. 6.5" />
          </FL>
          <FL label="MCV / MCH" sub="fL / pg">
            <input className={inp} value={mchMcv} onChange={e => setMchMcv(e.target.value)} placeholder="e.g. 62fL / 19pg" />
          </FL>
        </div>
        {hbSeverity && (
          <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${hbSeverity.includes('Very severe') ? 'bg-red-100 text-red-700' : hbSeverity.includes('Severe') ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
            Severity: {hbSeverity}
          </div>
        )}
        <FL label="Anaemia Type (morphological)">
          <Pills options={['Microcytic hypochromic', 'Normocytic normochromic', 'Macrocytic', 'Dimorphic', 'Haemolytic', 'Aplastic']}
            value={anaemiaType} onChange={setAnaemiaType} />
        </FL>
        <FL label="Likely Cause(s)" >
          <Pills options={['Iron deficiency', 'B12/folate deficiency', 'Haemolysis (AIHA)', 'G6PD deficiency', 'Haemoglobinopathy', 'Bone marrow failure', 'Chronic disease/inflammation', 'Renal anaemia', 'Lead poisoning']}
            value={anaemiaCause} onChange={setAnaemiaCause} multi />
        </FL>
        <FL label="Reticulocyte count" sub="%">
          <input className={inp} value={retic} onChange={e => setRetic(e.target.value)} placeholder="e.g. 2.5%" />
        </FL>
        <FL label="Peripheral Smear Findings">
          <Pills options={['Target cells', 'Sickle cells', 'Spherocytes', 'Schistocytes', 'Elliptocytes', 'Bite cells', 'Blasts', 'Hypersegmented neutrophils', 'Basophilic stippling', 'Rouleaux', 'Heinz bodies']}
            value={peripheralSmear} onChange={setPeripheralSmear} multi />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Iron/Ferritin" sub="µg/L"><input className={inp} value={ironStudies} onChange={e => setIronStudies(e.target.value)} placeholder="Serum iron/TIBC/ferritin" /></FL>
          <FL label="Vit B12" sub="pg/mL"><input className={inp} value={vitB12} onChange={e => setVitB12(e.target.value)} placeholder="e.g. 120" /></FL>
          <FL label="Folate" sub="ng/mL"><input className={inp} value={folate} onChange={e => setFolate(e.target.value)} placeholder="e.g. 3.5" /></FL>
        </div>
        <FL label="Direct Coombs Test (DAT)">
          <Pills options={['Positive', 'Negative', 'Not done']} value={coombsDirect} onChange={setCoombsDirect} />
        </FL>
        <FL label="Treatment">
          <Pills options={['Iron oral', 'IV iron', 'B12 injection', 'Folic acid', 'Transfusion (packed RBC)', 'Erythropoietin', 'Prednisolone (AIHA)', 'Specific cause treatment']}
            value={anaemiaTx} onChange={setAnaemiaTx} multi />
        </FL>
      </Section>

      {/* ── SICKLE CELL ── */}
      <Section title="Sickle Cell Disease" applicable={sec.sicklecell} onApplicable={v => sa('sicklecell', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Genotype">
            <Pills options={['HbSS', 'HbSC', 'HbS/β-thal', 'HbSD', 'Sickle trait (AS)']} value={sickleType} onChange={setSickleType} />
          </FL>
          <FL label="Diagnosis method">
            <Pills options={['HPLC', 'Hb electrophoresis', 'Sickling test', 'Newborn screening', 'Molecular']} value={sickleDiagnosis} onChange={setSickleDiagnosis} />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="HbF level" sub="%"><input className={inp} value={hbFLevel} onChange={e => setHbFLevel(e.target.value)} placeholder="e.g. 12%" /></FL>
          <FL label="Last crisis date"><input className={inp} type="date" value={sickleLastCrisis} onChange={e => setSickleLastCrisis(e.target.value)} /></FL>
        </div>
        <FL label="Vaso-occlusive Crisis (VOC) Features">
          <Pills options={['Bone pain', 'Acute abdomen', 'Acute chest (fever+hypoxia+infiltrate)', 'Priapism', 'Dactylitis', 'Stroke/TIA', 'Splenic sequestration', 'Aplastic crisis']}
            value={vocFeatures} onChange={setVocFeatures} multi />
        </FL>
        <Gate label="Acute Chest Syndrome suspected?" value={acsFeatures.length > 0 ? 'Yes' : 'No'}
          onChange={v => v === 'No' && setAcsFeatures([])}>
          <FL label="ACS Features">
            <Pills options={['Fever', 'Chest pain', 'Respiratory distress', 'New infiltrate on CXR', 'O2 sat drop', 'Pleural effusion']}
              value={acsFeatures} onChange={setAcsFeatures} multi />
          </FL>
        </Gate>
        <FL label="Chronic Complications">
          <Pills options={['Stroke', 'Silent cerebral infarct', 'Pulmonary hypertension', 'Nephropathy', 'Avascular necrosis', 'Retinopathy', 'Cardiomegaly', 'Leg ulcers', 'Gallstones']}
            value={sickleComplications} onChange={setSickleComplications} multi />
        </FL>
        <FL label="Hydroxyurea">
          <Pills options={['Yes — on therapy', 'No — not indicated', 'No — refused', 'Starting']} value={hydroxyurea} onChange={setHydroxyurea} />
        </FL>
        {hydroxyurea?.includes('Yes') && (
          <FL label="Hydroxyurea dose" sub="mg/kg/day">
            <input className={inp} value={huDose} onChange={e => setHuDose(e.target.value)} placeholder="e.g. 20 mg/kg/day" />
          </FL>
        )}
        <FL label="Current Treatment">
          <Pills options={['Hydroxyurea', 'Prophylactic penicillin V', 'Folic acid', 'Transfusion programme', 'Exchange transfusion', 'Voxelotor', 'Crizanlizumab', 'SCT/BMT']}
            value={sickleTx} onChange={setSickleTx} multi />
        </FL>
      </Section>

      {/* ── THALASSAEMIA ── */}
      <Section title="Thalassaemia" applicable={sec.thalassaemia} onApplicable={v => sa('thalassaemia', v)}>
        <FL label="Type">
          <Pills options={['β-thalassaemia major (TDT)', 'β-thalassaemia intermedia (NTDT)', 'β-thalassaemia minor/trait', 'HbH disease (α-thal 3-gene)', 'Hb Barts (α-thal 4-gene, hydrops)', 'HbE/β-thalassaemia']}
            value={thalType} onChange={setThalType} />
        </FL>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Pre-transfusion Hb" sub="g/dL"><input className={inp} value={thalHb} onChange={e => setThalHb(e.target.value)} placeholder="e.g. 7.2" /></FL>
          <FL label="Ferritin" sub="ng/mL"><input className={inp} value={ferritin} onChange={e => setFerritin(e.target.value)} placeholder="e.g. 2500" /></FL>
          <FL label="Liver iron conc." sub="mg/g dw"><input className={inp} value={liverIron} onChange={e => setLiverIron(e.target.value)} placeholder="MRI T2*" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Transfusion frequency">
            <Pills options={['Every 3-4 weeks', 'Every 2-3 weeks', 'Every 6 weeks (NTDT)', 'Pre-splenectomy change', 'Irregular']}
              value={thalTransfusionFreq} onChange={setThalTransfusionFreq} />
          </FL>
          <FL label="Splenomegaly">
            <Pills options={['None', 'Mild (<5 cm)', 'Moderate (5–10 cm)', 'Massive (>10 cm)', 'Post-splenectomy']}
              value={splenomegaly} onChange={setSplenomegaly} />
          </FL>
        </div>
        <FL label="Hb electrophoresis / HPLC result">
          <input className={inp} value={hbElectro} onChange={e => setHbElectro(e.target.value)} placeholder="e.g. HbF 90%, HbA2 5%, HbA 0%" />
        </FL>
        <FL label="Iron chelation">
          <Pills options={['Yes', 'No — ferritin acceptable', 'No — age <2y', 'Pausing']} value={chelation} onChange={setChelation} />
        </FL>
        {chelation === 'Yes' && (
          <FL label="Chelation agent">
            <Pills options={['Deferasirox (oral)', 'Deferoxamine (SC infusion)', 'Deferiprone (oral)', 'Combination']}
              value={chelationDrug} onChange={setChelationDrug} />
          </FL>
        )}
        <FL label="Complications">
          <Pills options={['Endocrinopathy (DM, hypothyroid, hypogonadism)', 'Cardiomyopathy (MRI T2*)', 'Liver fibrosis/cirrhosis', 'Osteoporosis', 'Splenectomy-related infection risk', 'Alloimmunisation', 'Extramedullary haematopoiesis', 'Pulmonary HTN']}
            value={thalComplications} onChange={setThalComplications} multi />
        </FL>
      </Section>

      {/* ── ITP ── */}
      <Section title="Immune Thrombocytopenia (ITP)" applicable={sec.itp} onApplicable={v => sa('itp', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Platelet count" sub="×10⁹/L">
            <input className={inp} value={platelets} onChange={e => setPlatelets(e.target.value)} placeholder="e.g. 8" />
          </FL>
          <FL label="Type">
            <Pills options={['Newly diagnosed (<3 mo)', 'Persistent (3–12 mo)', 'Chronic (>12 mo)', 'Refractory', 'Secondary (SLE/HIV/HCV)']}
              value={itpType} onChange={setItpType} />
          </FL>
        </div>
        {plateletRisk && (
          <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${plateletRisk.includes('Critical') ? 'bg-red-100 text-red-700' : plateletRisk.includes('High') ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {plateletRisk}
          </div>
        )}
        <FL label="Bleeding features">
          <Pills options={['Petechiae', 'Purpura', 'Epistaxis', 'Gum bleeding', 'Menorrhagia', 'GI bleed', 'CNS bleed (ICH)', 'Wet purpura (mucosal bleeding)']}
            value={itpFeatures} onChange={setItpFeatures} multi />
        </FL>
        <FL label="Bleeding score (ITP-BAT)" sub="0–3 per site">
          <input className={inp} value={bleedingScore} onChange={e => setBleedingScore(e.target.value)} placeholder="e.g. 2 (grade 1 purpura only)" />
        </FL>
        <FL label="Treatment">
          <Pills options={['Observation (plt >20k, minimal bleed)', 'IVIG 0.8–1 g/kg', 'Anti-D immunoglobulin', 'Prednisolone 4 mg/kg×4d', 'Dexamethasone pulse', 'Rituximab', 'Eltrombopag (TPO-RA)', 'Romiplostim', 'Splenectomy', 'Sirolimus (refractory)']}
            value={itpTx} onChange={setItpTx} multi />
        </FL>
        {itpTx.includes('IVIG 0.8–1 g/kg') && (
          <FL label="IVIG dose given" sub="g/kg">
            <input className={inp} value={itpIvigDose} onChange={e => setItpIvigDose(e.target.value)} placeholder="e.g. 0.8 g/kg" />
          </FL>
        )}
      </Section>

      {/* ── HAEMOPHILIA / BLEEDING DISORDERS ── */}
      <Section title="Haemophilia & Bleeding Disorders" applicable={sec.haemophilia} onApplicable={v => sa('haemophilia', v)}>
        <FL label="Diagnosis">
          <Pills options={['Haemophilia A (FVIII deficiency)', 'Haemophilia B (FIX deficiency)', 'Von Willebrand Disease', 'Platelet function disorder', 'Vitamin K deficiency', 'DIC', 'Rare factor deficiency']}
            value={haemType} onChange={setHaemType} />
        </FL>
        {haemType?.includes('Von Willebrand') && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="VWD Type">
              <Pills options={['Type 1 (quantitative partial)', 'Type 2A', 'Type 2B', 'Type 2M', 'Type 2N', 'Type 3 (severe)']}
                value={vwdType} onChange={setVwdType} />
            </FL>
            <FL label="VWF antigen" sub="%"><input className={inp} value={vwfAg} onChange={e => setVwfAg(e.target.value)} placeholder="e.g. 28%" /></FL>
          </div>
        )}
        {(haemType?.includes('Haemophilia')) && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Factor level" sub="%">
              <input className={inp} value={factorLevel} onChange={e => setFactorLevel(e.target.value)} placeholder="e.g. 2%" />
            </FL>
            <FL label="Severity">
              <Pills options={['Severe (<1%)', 'Moderate (1–5%)', 'Mild (>5–40%)']}
                value={haemSeverity} onChange={setHaemSeverity} />
            </FL>
          </div>
        )}
        <FL label="Bleeding type/site">
          <Pills options={['Haemarthrosis (joint)', 'Muscle haematoma', 'CNS bleed', 'GI bleed', 'Mucosal bleed', 'Post-circumcision', 'Post-surgical bleed', 'Target joint']}
            value={bleedType} onChange={setBleedType} multi />
        </FL>
        <FL label="Factor product / treatment">
          <Pills options={['FVIII concentrate', 'FIX concentrate', 'Emicizumab (prophylaxis A)', 'DDAVP (mild haem A/VWD)', 'FFP', 'Cryoprecipitate', 'Tranexamic acid', 'NovoSeven (rFVIIa)']}
            value={factorProduct} onChange={setFactorProduct} />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Inhibitor status">
            <Pills options={['No inhibitor', 'Low titre (<5 BU)', 'High titre (≥5 BU)', 'Not tested']}
              value={inhibitor} onChange={setInhibitor} />
          </FL>
          <FL label="Prophylaxis">
            <Pills options={['Primary prophylaxis', 'Secondary prophylaxis', 'On-demand only', 'Emicizumab weekly/biweekly/4-weekly']}
              value={prophylaxis} onChange={setProphylaxis} />
          </FL>
        </div>
      </Section>

      {/* ── G6PD ── */}
      <Section title="G6PD Deficiency" applicable={sec.g6pd} onApplicable={v => sa('g6pd', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="G6PD status">
            <Pills options={['Deficient (severe <10%)', 'Intermediate (10–60%)', 'Normal', 'Not tested']}
              value={g6pdStatus} onChange={setG6pdStatus} />
          </FL>
          <FL label="Class / Variant">
            <Pills options={['Class I (chronic haemolysis)', 'Class II (Khorasan/Mediterranean)', 'Class III (African A-)', 'Indian variant', 'Not specified']}
              value={g6pdVariant} onChange={setG6pdVariant} />
          </FL>
        </div>
        <FL label="Precipitating trigger">
          <Pills options={['Primaquine', 'Dapsone', 'Nitrofurantoin', 'Cotrimoxazole', 'Fava beans', 'Infection/fever', 'Naphthalene (mothballs)', 'Methylene blue', 'Mefloquine']}
            value={g6pdTrigger} onChange={setG6pdTrigger} multi />
        </FL>
        <FL label="Signs of haemolysis">
          <Pills options={['Jaundice', 'Dark urine (haemoglobinuria)', 'Anaemia (sudden drop in Hb)', 'Back pain', 'Splenomegaly', 'Bite cells on smear', 'Heinz bodies']}
            value={haemolysisSigns} onChange={setHaemolysisSigns} multi />
        </FL>
        <FL label="Management">
          <Pills options={['Stop trigger drug', 'Hydration', 'Transfusion if severe', 'Phototherapy (neonatal)', 'Exchange transfusion (neonatal severe)', 'Avoid future triggers (counselling)', 'G6PD card/bracelet']}
            value={g6pdManagement} onChange={setG6pdManagement} multi />
        </FL>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <b>Note:</b> G6PD deficiency ~10% prevalence in India; higher in Kerala, Odisha. All malaria treatments must be screened. Use primaquine with caution. NHM recommends G6PD testing before primaquine for Plasmodium vivax.
        </div>
      </Section>

      {/* ── MALIGNANCY ── */}
      <Section title="Haematological Malignancy" applicable={sec.malignancy} onApplicable={v => sa('malignancy', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Diagnosis">
            <Pills options={['ALL (B-cell)', 'ALL (T-cell)', 'AML', 'CML', 'JMML', 'MDS', 'Other leukaemia']}
              value={malignancyType} onChange={setMalignancyType} />
          </FL>
          <FL label="Diagnosis date"><input className={inp} type="date" value={diagnosisDate} onChange={e => setDiagnosisDate(e.target.value)} /></FL>
        </div>
        {(malignancyType?.includes('ALL')) && (
          <>
            <FL label="BFM Risk Group">
              <Pills options={['Standard risk', 'Intermediate risk', 'High risk']}
                value={allRisk} onChange={setAllRisk} />
            </FL>
            <FL label="Cytogenetics / Molecular">
              <Pills options={['ETV6-RUNX1 (t12;21) — favourable', 'BCR-ABL1 (Ph+) — poor', 'KMT2A rearrangement — poor', 'Hyperdiploid (>50) — favourable', 'Hypodiploidy (<44) — poor', 'iAMP21 — high risk', 'TCF3-PBX1', 'IKZF1 deletion', 'ABL-class fusion (Ph-like)']}
                value={cytogenetics} onChange={setCytogenetics} multi />
            </FL>
            {allRiskClass && <div className="rounded-lg bg-blue-50 border border-blue-200 p-2 text-sm text-blue-800 font-medium">{allRiskClass}</div>}
            <FL label="MRD status">
              <Pills options={['MRD negative (Day 33)', 'MRD low positive (<0.01%)', 'MRD high positive (≥0.01%)', 'Not assessed']}
                value={mrdStatus} onChange={setMrdStatus} />
            </FL>
            <FL label="CNS status">
              <Pills options={['CNS 1 (no blasts)', 'CNS 2 (<5 WBC/µL with blasts)', 'CNS 3 (≥5 WBC/µL with blasts)', 'Traumatic tap']}
                value={cnsStatus} onChange={setCnsStatus} />
            </FL>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="Chemotherapy phase">
            <Pills options={['Induction', 'Consolidation', 'Maintenance', 'Re-induction', 'End of therapy', 'Relapse treatment', 'Palliative']}
              value={chemoPhase} onChange={setChemoPhase} />
          </FL>
          <FL label="Protocol">
            <input className={inp} value={chemoProtocol} onChange={e => setChemoProtocol(e.target.value)} placeholder="e.g. ICMR BFM 2009, UKALL 2011" />
          </FL>
        </div>
        <FL label="Bone marrow result">
          <Pills options={['Day 15 M1 (<5% blasts)', 'Day 15 M2 (5–25%)', 'Day 15 M3 (>25%)', 'Day 33 complete remission', 'Day 33 partial remission', 'Relapse on BM', 'Not done']}
            value={bonemarrowResult} onChange={setBonemarrowResult} />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="ANC" sub="×10⁹/L"><input className={inp} value={neutrophilCount} onChange={e => setNeutrophilCount(e.target.value)} placeholder="e.g. 0.3" /></FL>
          <FL label="Febrile neutropenia?">
            <Pills options={['Yes', 'No']} value={febrileNeutropenia} onChange={setFebrileNeutropenia} />
          </FL>
        </div>
        {febrileNeutropenia === 'Yes' && (
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-3 text-sm text-red-800 space-y-1">
            <div className="font-bold">Febrile Neutropenia Protocol (IDSA/ASCO)</div>
            <div>• Start empirical antibiotics within 60 min (Piperacillin-tazobactam or Cefepime ± Amikacin)</div>
            <div>• MASCC score for low-risk classification; if high-risk → hospitalise</div>
            <div>• Add antifungal (Caspofungin) if persistent fever &gt;4–7 days</div>
            <div>• Blood culture × 2, urine C&S, CXR, LP if CNS signs</div>
          </div>
        )}
        <FL label="Complications">
          <Pills options={['Tumour lysis syndrome (TLS)', 'Sepsis', 'Mucositis', 'Neuropathy (vincristine)', 'Avascular necrosis (steroids)', 'Pancreatitis (asparaginase)', 'Cardiomyopathy (anthracycline)', 'Coagulopathy (L-asparaginase)', 'CNS toxicity (MTX)', 'Secondary malignancy']}
            value={malignancyComplications} onChange={setMalignancyComplications} multi />
        </FL>
        <FL label="Clinical notes">
          <textarea className={ta} value={oncologyNotes} onChange={e => setOncologyNotes(e.target.value)} placeholder="Protocol details, previous lines, response, toxicities..." />
        </FL>
        {malignancyComplications.includes('Tumour lysis syndrome (TLS)') && (
          <div className="rounded-lg bg-orange-50 border border-orange-300 p-3 text-xs text-orange-900">
            <b>TLS management:</b> Aggressive IV hydration (3L/m²/day), allopurinol or rasburicase, avoid potassium, monitor uric acid/K/phosphate/calcium/creatinine q4–6h, dialysis if refractory.
          </div>
        )}
      </Section>

      {/* ── LYMPHOMA ── */}
      <Section title="Lymphoma" applicable={sec.lymphoma} onApplicable={v => sa('lymphoma', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Lymphoma type">
            <Pills options={['Hodgkin (nodular sclerosis)', 'Hodgkin (mixed cellularity)', 'Hodgkin (lymphocyte-rich)', 'Hodgkin (lymphocyte-depleted)', 'B-NHL (Burkitt)', 'B-NHL (DLBCL)', 'T-NHL (ALCL)', 'T-NHL (lymphoblastic)', 'Primary mediastinal B-cell']}
              value={lymphomaType} onChange={setLymphomaType} />
          </FL>
          <FL label="Ann Arbor Stage">
            <Pills options={['Stage I', 'Stage II', 'Stage III', 'Stage IV']}
              value={annArborStage} onChange={setAnnArborStage} />
          </FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="B symptoms">
            <Pills options={['Yes', 'No']} value={bSymptoms} onChange={setBSymptoms} />
          </FL>
          <FL label="Bulky disease (>10cm)">
            <Pills options={['Yes', 'No']} value={bulkyDisease} onChange={setBulkyDisease} />
          </FL>
          <FL label="LDH" sub="U/L">
            <input className={inp} value={ldhLevel} onChange={e => setLdhLevel(e.target.value)} placeholder="e.g. 480" />
          </FL>
        </div>
        <FL label="Protocol">
          <input className={inp} value={lymphomaProtocol} onChange={e => setLymphomaProtocol(e.target.value)} placeholder="e.g. ABVD, COPP/ABV, CHOP, LMB 96, BFM 95" />
        </FL>
        <FL label="Response assessment">
          <Pills options={['Complete remission (Deauville 1-2)', 'Partial remission (Deauville 3-4)', 'Inadequate response (Deauville 4)', 'Progressive disease (Deauville 5)', 'Not yet assessed']}
            value={responseAssessment} onChange={setResponseAssessment} />
        </FL>
        {lymphomaType?.includes('Burkitt') && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
            <b>Burkitt lymphoma:</b> Highly aggressive — LMB 96/BFM protocol. High TLS risk. Rasburicase preferred over allopurinol. Staging MUST include BM and LP.
          </div>
        )}
      </Section>

      {/* ── APLASTIC ANAEMIA ── */}
      <Section title="Aplastic Anaemia" applicable={sec.aplastic} onApplicable={v => sa('aplastic', v)}>
        <FL label="Type">
          <Pills options={['Acquired (immune-mediated)', 'Fanconi anaemia', 'Dyskeratosis congenita', 'Diamond-Blackfan anaemia (DBA)', 'Schwachman-Diamond', 'Congenital amegakaryocytic']}
            value={aaType} onChange={setAaType} />
        </FL>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <FL label="Hb" sub="g/dL"><input className={inp} value={aaHb} onChange={e => setAaHb(e.target.value)} placeholder="e.g. 5.5" /></FL>
          <FL label="Platelets" sub="×10⁹/L"><input className={inp} value={aaPlatelets} onChange={e => setAaPlatelets(e.target.value)} placeholder="e.g. 8" /></FL>
          <FL label="Neutrophils (ANC)" sub="×10⁹/L"><input className={inp} value={aaNeutrophils} onChange={e => setAaNeutrophils(e.target.value)} placeholder="e.g. 0.15" /></FL>
          <FL label="Reticulocytes" sub="×10⁹/L"><input className={inp} value={aaReticulocytes} onChange={e => setAaReticulocytes(e.target.value)} placeholder="e.g. 10" /></FL>
        </div>
        <FL label="BM cellularity" sub="% (trephine biopsy)">
          <input className={inp} value={aaCellularity} onChange={e => setAaCellularity(e.target.value)} placeholder="e.g. 5% (hypocellular)" />
        </FL>
        {aaClass && (
          <div className={`rounded-lg px-3 py-2 text-sm font-bold ${aaClass.includes('VSAA') ? 'bg-red-100 text-red-700' : aaClass.includes('SAA') ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
            Classification: {aaClass}
          </div>
        )}
        <FL label="Cause / contributing factor">
          <Pills options={['Idiopathic (immune-mediated)', 'Drug (chloramphenicol, NSAIDs, carbamazepine)', 'Infection (EBV, hepatitis, CMV, parvovirus B19)', 'Toxin (benzene)', 'Fanconi (chromosomal breakage positive)', 'Inherited marrow failure', 'Thymoma']}
            value={aaCause} onChange={setAaCause} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['RBC/platelet transfusion support', 'G-CSF', 'Horse ATG + Cyclosporin (IST)', 'Rabbit ATG', 'Eltrombopag (TPO-RA)', 'Allogeneic BMT (MSD preferred)', 'Haploidentical BMT', 'Androgens (danazol/oxymetholone) — DBA/Fanconi']}
            value={aaTx} onChange={setAaTx} multi />
        </FL>
      </Section>

      {/* ── NEUTROPENIA ── */}
      <Section title="Neutropenia" applicable={sec.neutropenia} onApplicable={v => sa('neutropenia', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="ANC" sub="×10⁹/L"><input className={inp} value={neutropeniaANC} onChange={e => setNeutropeniaANC(e.target.value)} placeholder="e.g. 0.2" /></FL>
          <FL label="Severity">
            <Pills options={['Mild (1.0–1.5)', 'Moderate (0.5–1.0)', 'Severe (<0.5)', 'Very severe (<0.1)']}
              value={neutropeniaSeverity} onChange={setNeutropeniaSeverity} />
          </FL>
        </div>
        <FL label="Cause">
          <Pills options={['Chemotherapy-induced', 'Autoimmune', 'Cyclic neutropenia', 'Kostmann syndrome (SCN)', 'Benign ethnic neutropenia', 'Viral (EBV/CMV)', 'Drug-induced', 'Nutritional (B12/folate)', 'Hypersplenism']}
            value={neutropeniaCause} onChange={setNeutropeniaCause} />
        </FL>
        <FL label="G-CSF (filgrastim)">
          <Pills options={['Yes — therapeutic', 'Yes — prophylactic', 'No']} value={gcsf} onChange={setGcsf} />
        </FL>
      </Section>

      {/* ── TRANSFUSION ── */}
      <Section title="Transfusion Medicine" applicable={sec.transfusion} onApplicable={v => sa('transfusion', v)}>
        <FL label="Blood products transfused">
          <Pills options={['Packed RBC', 'Platelet concentrate (SDP)', 'FFP', 'Cryoprecipitate', 'Granulocytes', 'Albumin', 'Factor concentrate']}
            value={transfusionType} onChange={setTransfusionType} multi />
        </FL>
        <FL label="Indication for transfusion">
          <input className={inp} value={transfusionReason} onChange={e => setTransfusionReason(e.target.value)} placeholder="e.g. Hb 5.2 symptomatic anaemia, thal transfusion programme" />
        </FL>
        <FL label="Group & crossmatch">
          <Pills options={['Type & screen done', 'Crossmatch compatible', 'Irradiated blood requested', 'CMV-negative requested', 'Washed RBC', 'Phenotype-matched (haemoglobinopathy)', 'Emergency uncrossmatched O-neg']}
            value={crossmatch} onChange={setCrossmatch} />
        </FL>
        <FL label="Transfusion reaction?">
          <Pills options={['None', 'Yes — during', 'Yes — delayed']} value={transfusionReaction} onChange={setTransfusionReaction} />
        </FL>
        {transfusionReaction !== 'None' && transfusionReaction && (
          <FL label="Reaction type">
            <Pills options={['Febrile non-haemolytic (FNHTR)', 'Allergic/urticarial', 'Anaphylaxis', 'Acute haemolytic (ABO incompatible)', 'Delayed haemolytic', 'TRALI', 'TACO (circulatory overload)', 'Septic reaction (bacterial contam.)', 'Alloimmunisation']}
              value={reactionType} onChange={setReactionType} />
          </FL>
        )}
      </Section>

      {/* ── BMT ── */}
      <Section title="Bone Marrow / Stem Cell Transplant" applicable={sec.bmt} onApplicable={v => sa('bmt', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Transplant type">
            <Pills options={['Allogeneic MSD', 'Allogeneic MUD', 'Haploidentical', 'Autologous', 'Cord blood']}
              value={bmtType} onChange={setBmtType} />
          </FL>
          <FL label="Indication">
            <Pills options={['ALL (high-risk/relapse)', 'AML', 'Aplastic anaemia (SAA/VSAA)', 'Thalassaemia major', 'Sickle cell (selected)', 'Immune deficiency (SCID)', 'Inborn error of metabolism', 'MDS/JMML']}
              value={bmtIndication} onChange={setBmtIndication} />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Day post-transplant"><input className={inp} value={bmtDay} onChange={e => setBmtDay(e.target.value)} placeholder="e.g. D+42" /></FL>
          <FL label="Engraftment">
            <Pills options={['Not yet engrafted', 'Neutrophil engraftment (ANC>0.5)', 'Platelet engraftment', 'Full engraftment', 'Primary graft failure', 'Secondary graft failure']}
              value={engraftment} onChange={setEngraftment} />
          </FL>
        </div>
        <FL label="GVHD?">
          <Pills options={['None', 'Acute GVHD', 'Chronic GVHD', 'Overlap syndrome']} value={gvhd} onChange={setGvhd} />
        </FL>
        {gvhd && gvhd !== 'None' && (
          <FL label="GVHD grade / severity">
            <Pills options={['Acute Grade I (skin only)', 'Acute Grade II (skin+gut/liver)', 'Acute Grade III–IV (severe)', 'Chronic limited', 'Chronic extensive']}
              value={gvhdGrade} onChange={setGvhdGrade} />
          </FL>
        )}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900">
          <b>Major BMT centres India:</b> AIIMS Delhi, CMC Vellore, Narayana Hrudayalaya, Amrita Hospital Kochi, PGIMER Chandigarh, Tata Memorial Mumbai. PM-JAY covers allogeneic BMT for select indications under HBP 1.25. Paediatric BMT network expanding under NHM.
        </div>
      </Section>

      <button onClick={handleSave}
        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow transition-all">
        Save Haematology & Oncology Assessment
      </button>
    </div>
  );
}
