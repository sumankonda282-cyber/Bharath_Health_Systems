/**
 * @shared-pool
 * PediatricRheumatologyForm — Pediatric Rheumatology Assessment
 * JIA (ILAR classification), childhood SLE (SLICC criteria),
 * juvenile dermatomyositis, vasculitis (IgA/Kawasaki/PAN/GPA),
 * periodic fever syndromes (PFAPA, FMF), autoinflammatory diseases,
 * scleroderma, Sjogren's, antiphospholipid syndrome in children
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import api from '../../../api/client';

const A = {
  rose:   { bg:'bg-rose-50',    border:'border-rose-300',    text:'text-rose-700',
            pill:'bg-rose-100 border-rose-400 text-rose-800',
            active:'bg-rose-600 text-white border-rose-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  orange: { bg:'bg-orange-50',  border:'border-orange-300',  text:'text-orange-700',
            pill:'bg-orange-100 border-orange-400 text-orange-800',
            active:'bg-orange-600 text-white border-orange-600' },
};

function Pills({ options, value, onChange, accent = 'rose', multi = false }) {
  const ac = A[accent];
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  const toggle = o => {
    if (!multi) { onChange(o === value ? '' : o); return; }
    const cur = Array.isArray(value) ? value : [];
    onChange(cur.includes(o) ? cur.filter(x => x !== o) : [...cur, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const active = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`px-3 py-1 rounded-full border text-sm font-medium transition-all ${active ? ac.active : ac.pill}`}>
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
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-400">{sub}</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = 'rose', children }) {
  const ac = A[accent];
  const isNA = applicable === 'N/A';
  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${isNA ? 'border-gray-200 opacity-60' : ac.border}`}>
      <div className={`flex items-center justify-between px-4 py-3 ${isNA ? 'bg-gray-100' : ac.bg}`}>
        <span className={`font-bold text-base ${isNA ? 'text-gray-400' : ac.text}`}>
          {isNA && <Lock className="inline w-4 h-4 mr-1" />}{title}
        </span>
        <div className="flex gap-2">
          {['Applicable', 'N/A'].map(v => (
            <button key={v} type="button" onClick={() => onApplicable(v)}
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all
                ${applicable === v
                  ? v === 'N/A' ? 'bg-gray-500 text-white border-gray-500' : ac.active
                  : 'bg-white border-gray-300 text-gray-500'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>
      {isNA
        ? <div className="px-4 py-2 text-xs text-gray-400 italic">Not applicable · section locked</div>
        : <div className="px-4 py-4 space-y-4">{children}</div>
      }
    </div>
  );
}

export default function PediatricRheumatologyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', jia: 'Applicable', sle: 'Applicable',
    jdm: 'Applicable', vasculitis: 'Applicable', periodic: 'Applicable',
    labs: 'Applicable', treatment: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('years');
  const [sex, setSex] = useState('');
  const [chief, setChief] = useState([]);
  const [duration, setDuration] = useState('');
  const [familyHistory, setFamilyHistory] = useState([]);

  // JIA
  const [jiaGate, setJiaGate] = useState('');
  const [jiaType, setJiaType] = useState('');
  const [jointCount, setJointCount] = useState('');
  const [jointsAffected, setJointsAffected] = useState([]);
  const [jiaFeatures, setJiaFeatures] = useState([]);
  const [jiaActivity, setJiaActivity] = useState('');
  const [uveitis, setUveitis] = useState('');
  const [macActivation, setMacActivation] = useState('');

  // Childhood SLE
  const [sleGate, setSleGate] = useState('');
  const [sliccCriteria, setSliccCriteria] = useState([]);
  const [sleActivity, setSleActivity] = useState('');
  const [sledai, setSledai] = useState('');
  const [lupusNephritis, setLupusNephritis] = useState('');
  const [lupusFeatures, setLupusFeatures] = useState([]);

  // JDM
  const [jdmGate, setJdmGate] = useState('');
  const [jdmFeatures, setJdmFeatures] = useState([]);
  const [muscleWeakness, setMuscleWeakness] = useState('');
  const [ck, setCk] = useState('');
  const [mri, setMri] = useState('');
  const [jdmTx, setJdmTx] = useState([]);

  // Vasculitis
  const [vasGate, setVasGate] = useState('');
  const [vasType, setVasType] = useState('');
  const [vasFeatures, setVasFeatures] = useState([]);
  const [igaVas, setIgaVas] = useState([]);

  // Periodic fever syndromes
  const [pfGate, setPfGate] = useState('');
  const [pfType, setPfType] = useState('');
  const [pfPattern, setPfPattern] = useState('');
  const [pfFeatures, setPfFeatures] = useState([]);

  // Labs
  const [ana, setAna] = useState('');
  const [anaPattern, setAnaPattern] = useState('');
  const [antiDsDna, setAntiDsDna] = useState('');
  const [anca, setAnca] = useState('');
  const [rf, setRf] = useState('');
  const [anticcp, setAnticcp] = useState('');
  const [complement, setComplement] = useState('');
  const [esr, setEsr] = useState('');
  const [crp, setCrp] = useState('');
  const [ferritin, setFerritin] = useState('');
  const [cbc, setCbc] = useState([]);
  const [urineProtein, setUrineProtein] = useState('');

  // Treatment
  const [nsaid, setNsaid] = useState('');
  const [steroids, setSteroids] = useState('');
  const [dmard, setDmard] = useState([]);
  const [biologic, setBiologic] = useState('');
  const [physiotherapy, setPhysiotherapy] = useState('');

  const macAlert = macActivation === 'Yes' || (parseFloat(ferritin) > 10000 && ferritin !== '');

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-rheumatology',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, sex, chief, duration, familyHistory },
        jia: { gate: jiaGate, type: jiaType, jointCount, joints: jointsAffected, features: jiaFeatures, activity: jiaActivity, uveitis, macActivation },
        sle: { gate: sleGate, slicc: sliccCriteria, activity: sleActivity, sledai, lupusNephritis, features: lupusFeatures },
        jdm: { gate: jdmGate, features: jdmFeatures, muscleWeakness, ck, mri, treatment: jdmTx },
        vasculitis: { gate: vasGate, type: vasType, features: vasFeatures, igaVasculitis: igaVas },
        periodicFever: { gate: pfGate, type: pfType, pattern: pfPattern, features: pfFeatures },
        labs: { ana, anaPattern, antiDsDna, anca, rf, anticcp, complement, esr, crp, ferritin, cbc, urineProtein },
        treatment: { nsaid, steroids, dmard, biologic, physiotherapy },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Pediatric Rheumatology Assessment</h2>
        <p className="text-rose-100 text-sm">JIA (ILAR) · Childhood SLE (SLICC) · Juvenile DM · Vasculitis · Periodic Fever Syndromes · Autoinflammatory</p>
      </div>

      {macAlert && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Macrophage Activation Syndrome (MAS) Alert</p>
            <p className="text-sm text-red-600">Hyperferritinaemia &gt;10,000 + cytopenias → life-threatening complication of sJIA/SLE. ICU level care, high-dose steroids, cyclosporine.</p>
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Patient Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="rose">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — Paediatric rheumatology</p>
          <p className="text-gray-600 mt-1">JIA prevalence: 1/1000 children. Childhood SLE: more severe in Indian children — higher renal involvement (60%).
            Rheumatic fever (post-streptococcal) mimics JIA — always exclude. Reactive arthritis post-enteric/GU infection common.
            Biologics (methotrexate, TNF-inhibitors) are available but costly — PM-JAY covers some rheumatoid diseases.
            AIIMS New Delhi, Amrita, SGPGI are key paediatric rheumatology centres.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} className="w-16 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Sex"><Pills options={['Male','Female']} value={sex} onChange={setSex} accent="rose" /></FL>
          <FL label="Duration of symptoms">
            <Pills options={['<6 weeks','6-12 weeks','3-6 months','6-12 months','>12 months']}
              value={duration} onChange={setDuration} accent="amber" />
          </FL>
        </div>
        <FL label="Chief symptoms">
          <Pills options={['Joint swelling','Joint pain','Morning stiffness','Rash','Fever','Muscle weakness','Eye symptoms','Raynaud phenomena','Fatigue','Growth failure']}
            value={chief} onChange={setChief} accent="rose" multi />
        </FL>
        <FL label="Family history">
          <Pills options={['Rheumatoid arthritis','SLE','Psoriasis','Inflammatory bowel disease','Ankylosing spondylitis','Periodic fever','None']}
            value={familyHistory} onChange={setFamilyHistory} accent="amber" multi />
        </FL>
      </Section>

      {/* JIA */}
      <Section title="Juvenile Idiopathic Arthritis (ILAR Classification)" applicable={sec.jia} onApplicable={v => sa('jia', v)} accent="rose">
        <FL label="JIA suspected/known?">
          <Pills options={['Yes — new diagnosis','Yes — known JIA follow-up','No']} value={jiaGate} onChange={setJiaGate} accent="rose" />
        </FL>
        {jiaGate !== '' && jiaGate !== 'No' && (
          <>
            <FL label="ILAR category (arthritis ≥6 weeks, onset <16y)">
              <Pills options={['Oligoarticular (persistent — ≤4 joints)','Oligoarticular (extended — >4 joints after 6m)',
                'Polyarticular RF-negative','Polyarticular RF-positive','Systemic JIA (sJIA) — fever + arthritis',
                'Psoriatic arthritis','Enthesitis-related arthritis (ERA)','Undifferentiated']}
                value={jiaType} onChange={setJiaType} accent="rose" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Active joint count">
                <Pills options={['1','2-4','5-10','>10']} value={jointCount} onChange={setJointCount} accent="rose" />
              </FL>
              <FL label="Disease activity">
                <Pills options={['Inactive','Mild','Moderate','Severe']} value={jiaActivity} onChange={setJiaActivity} accent="red" />
              </FL>
            </div>
            <FL label="Joints affected (select all)">
              <Pills options={['Knee','Ankle','Wrist','MCP/PIP','Hip','Elbow','Shoulder','Cervical spine','TMJ','Subtalar']}
                value={jointsAffected} onChange={setJointsAffected} accent="rose" multi />
            </FL>
            <FL label="JIA features (select all)">
              <Pills options={['Morning stiffness >30min','Joint effusion','Soft tissue swelling','Limited ROM','Leg length discrepancy (chronic)','Growth retardation','sJIA rash (salmon-coloured evanescent)','Lymphadenopathy (sJIA)','Serositis (sJIA)']}
                value={jiaFeatures} onChange={setJiaFeatures} accent="amber" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Uveitis (slit-lamp screening)">
                <Pills options={['None','Anterior uveitis (asymptomatic)','Symptomatic uveitis','Posterior uveitis']}
                  value={uveitis} onChange={setUveitis} accent="orange" />
              </FL>
              <FL label="MAS (Macrophage Activation Syndrome)?">
                <Pills options={['Yes','No','Monitor — borderline ferritin']} value={macActivation} onChange={setMacActivation} accent="red" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Childhood SLE */}
      <Section title="Childhood Systemic Lupus Erythematosus (cSLE)" applicable={sec.sle} onApplicable={v => sa('sle', v)} accent="violet">
        <FL label="SLE suspected/known?">
          <Pills options={['Yes','No','Undifferentiated CTD']} value={sleGate} onChange={setSleGate} accent="violet" />
        </FL>
        {sleGate === 'Yes' && (
          <>
            <FL label="SLICC 2012 criteria (≥4 of 11 clinical + ≥1 immunologic)">
              <Pills options={[
                'Acute cutaneous lupus (malar/photosensitive rash)',
                'Chronic cutaneous lupus (discoid)',
                'Oral ulcers (non-painful)',
                'Non-scarring alopecia',
                'Arthritis (≥2 synovial joints)',
                'Serositis (pleuritis/pericarditis)',
                'Renal (proteinuria >500mg/d or RBC casts)',
                'Neurological (seizures/psychosis/mononeuritis)',
                'Haemolytic anaemia',
                'Leucopenia (<4000) or lymphopenia (<1000)',
                'Thrombocytopenia (<100k)']}
                value={sliccCriteria} onChange={setSliccCriteria} accent="violet" multi />
            </FL>
            <FL label="Lupus features (select all clinical)">
              <Pills options={['Butterfly (malar) rash','Photosensitivity','Oral ulcers','Alopecia','Arthralgia/arthritis','Nephritis','Raynaud','Serositis','CNS lupus','Cytopenias']}
                value={lupusFeatures} onChange={setLupusFeatures} accent="violet" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Lupus nephritis class (ISN/RPS)">
                <Pills options={['Class I — Minimal mesangial','Class II — Mesangial proliferative','Class III — Focal','Class IV — Diffuse (most severe)','Class V — Membranous','Class VI — Advanced sclerosing','Not biopsied']}
                  value={lupusNephritis} onChange={setLupusNephritis} accent="red" />
              </FL>
              <FL label="SLEDAI-2K score">
                <input type="number" value={sledai} onChange={e => setSledai(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="0-105" />
                {parseInt(sledai) >= 12 && <p className="text-red-700 text-xs font-bold mt-1">High disease activity (≥12)</p>}
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* JDM */}
      <Section title="Juvenile Dermatomyositis (JDM)" applicable={sec.jdm} onApplicable={v => sa('jdm', v)} accent="orange">
        <FL label="JDM suspected?">
          <Pills options={['Yes','No','Possible']} value={jdmGate} onChange={setJdmGate} accent="orange" />
        </FL>
        {jdmGate !== '' && jdmGate !== 'No' && (
          <>
            <FL label="Clinical features (Bohan-Peter criteria)">
              <Pills options={['Heliotrope rash (periorbital violaceous)','Gottron papules (over knuckles)','Shawl sign','V-sign (neck/chest)','Proximal muscle weakness','Mechanic hands','Calcinosis cutis (chronic)','Dysphagia','Interstitial lung disease']}
                value={jdmFeatures} onChange={setJdmFeatures} accent="orange" multi />
            </FL>
            <div className="grid grid-cols-3 gap-3">
              <FL label="Muscle weakness grade">
                <Pills options={['None','Mild (grade 4/5)','Moderate (grade 3/5)','Severe (grade <3/5)']}
                  value={muscleWeakness} onChange={setMuscleWeakness} accent="orange" />
              </FL>
              <FL label="CK level" sub="IU/L">
                <input type="number" value={ck} onChange={e => setCk(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="MRI muscle">
                <Pills options={['Oedema/inflammation','Normal','Not done']} value={mri} onChange={setMri} accent="blue" />
              </FL>
            </div>
            <FL label="Treatment">
              <Pills options={['High-dose prednisolone','Methotrexate','IVIG','Hydroxychloroquine','Cyclosporine','Rituximab']}
                value={jdmTx} onChange={setJdmTx} accent="teal" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Vasculitis */}
      <Section title="Childhood Vasculitis" applicable={sec.vasculitis} onApplicable={v => sa('vasculitis', v)} accent="red">
        <FL label="Vasculitis suspected?">
          <Pills options={['Yes','No']} value={vasGate} onChange={setVasGate} accent="red" />
        </FL>
        {vasGate === 'Yes' && (
          <>
            <FL label="Type (EULAR/PReS classification)">
              <Pills options={['IgA vasculitis (Henoch-Schönlein)','Kawasaki disease','ANCA-associated GPA/MPA','PAN (polyarteritis nodosa)','Takayasu arteritis','Cutaneous vasculitis','Behçet disease']}
                value={vasType} onChange={setVasType} accent="red" />
            </FL>
            <FL label="IgA vasculitis features (HSP)">
              <Pills options={['Palpable purpura (lower limbs/buttocks)','Arthritis/arthralgia','Abdominal pain/GI bleeding','Renal (haematuria/proteinuria)','Scrotal oedema (males)','Severe renal involvement']}
                value={igaVas} onChange={setIgaVas} accent="red" multi />
            </FL>
            <FL label="Other vasculitis features">
              <Pills options={['Fever','Weight loss','Hypertension','Ischaemia/organ infarction','Mononeuritis multiplex','Haemoptysis','Sinusitis/nasal (GPA)']}
                value={vasFeatures} onChange={setVasFeatures} accent="red" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Periodic fever syndromes */}
      <Section title="Periodic Fever / Autoinflammatory Syndromes" applicable={sec.periodic} onApplicable={v => sa('periodic', v)} accent="amber">
        <FL label="Periodic fever syndrome suspected?">
          <Pills options={['Yes','No']} value={pfGate} onChange={setPfGate} accent="amber" />
        </FL>
        {pfGate === 'Yes' && (
          <>
            <FL label="Syndrome">
              <Pills options={['PFAPA (periodic fever, aphthous ulcers, pharyngitis, adenitis)','FMF (familial Mediterranean fever)','TRAPS','HIDS/MKD','CAPS','DIRA','Still disease (adult onset)','Other/unclassified']}
                value={pfType} onChange={setPfType} accent="amber" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Fever periodicity">
                <Pills options={['Every 3-6 weeks (PFAPA)','Every 4-8 weeks (TRAPS)','Every 4-6 weeks (HIDS)','Monthly','Irregular']}
                  value={pfPattern} onChange={setPfPattern} accent="amber" />
              </FL>
              <FL label="Associated features">
                <Pills options={['Aphthous ulcers','Pharyngitis','Lymphadenitis','Abdominal pain/serositis','Rash','Arthritis','Hepatosplenomegaly','Response to colchicine','Response to corticosteroids']}
                  value={pfFeatures} onChange={setPfFeatures} accent="amber" multi />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Labs */}
      <Section title="Laboratory Investigations" applicable={sec.labs} onApplicable={v => sa('labs', v)} accent="blue">
        <div className="grid grid-cols-2 gap-3">
          <FL label="ANA (antinuclear antibody)">
            <Pills options={['Negative','Positive 1:40','Positive 1:80','Positive 1:160','Positive ≥1:320']}
              value={ana} onChange={setAna} accent="blue" />
          </FL>
          <FL label="ANA pattern">
            <Pills options={['Homogeneous','Speckled','Nucleolar','Centromere','Rim/peripheral','None']}
              value={anaPattern} onChange={setAnaPattern} accent="blue" />
          </FL>
          <FL label="Anti-dsDNA">
            <Pills options={['Negative','Weakly positive','Strongly positive']} value={antiDsDna} onChange={setAntiDsDna} accent="violet" />
          </FL>
          <FL label="ANCA">
            <Pills options={['Negative','p-ANCA (MPO)','c-ANCA (PR3)']} value={anca} onChange={setAnca} accent="blue" />
          </FL>
          <FL label="Rheumatoid factor (RF)">
            <Pills options={['Negative','Low positive (<60 IU/mL)','High positive (>60 IU/mL)']} value={rf} onChange={setRf} accent="rose" />
          </FL>
          <FL label="Anti-CCP">
            <Pills options={['Negative','Positive','Strongly positive']} value={anticcp} onChange={setAnticcp} accent="rose" />
          </FL>
          <FL label="Complement C3/C4">
            <Pills options={['Normal','C3 low','C4 low','Both low (SLE flare)','Not done']} value={complement} onChange={setComplement} accent="violet" />
          </FL>
          <FL label="Ferritin" sub="ng/mL">
            <input type="number" value={ferritin} onChange={e => setFerritin(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
            {parseFloat(ferritin) > 10000 && <p className="text-red-700 text-xs font-bold mt-1">MAS territory — urgent review</p>}
          </FL>
          <FL label="ESR" sub="mm/h">
            <input type="number" value={esr} onChange={e => setEsr(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="CRP" sub="mg/L">
            <input type="number" value={crp} onChange={e => setCrp(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="CBC abnormalities">
            <Pills options={['Anaemia (chronic disease)','Thrombocytopenia','Leucopenia','Leucocytosis (sJIA)','Elevated platelets','Normal']}
              value={cbc} onChange={setCbc} accent="blue" multi />
          </FL>
          <FL label="Urine protein">
            <Pills options={['Nil','Trace','1+ (mild)','2+ (moderate)','3+ (severe/nephrotic)','Haematuria']}
              value={urineProtein} onChange={setUrineProtein} accent="blue" />
          </FL>
        </div>
      </Section>

      {/* Treatment */}
      <Section title="Treatment Plan" applicable={sec.treatment} onApplicable={v => sa('treatment', v)} accent="teal">
        <div className="grid grid-cols-2 gap-3">
          <FL label="NSAIDs">
            <Pills options={['Naproxen (JIA first-line)','Ibuprofen','Indomethacin','Diclofenac','None']}
              value={nsaid} onChange={setNsaid} accent="teal" />
          </FL>
          <FL label="Corticosteroids">
            <Pills options={['Oral prednisolone (daily)','Pulse methylprednisolone IV','Intra-articular triamcinolone','Topical (skin lesions)','Not using']}
              value={steroids} onChange={setSteroids} accent="amber" />
          </FL>
        </div>
        <FL label="csDMARDs">
          <Pills options={['Methotrexate (first-line)','Hydroxychloroquine','Sulfasalazine','Leflunomide','Azathioprine','Cyclosporine','MMF (mycophenolate)']}
            value={dmard} onChange={setDmard} accent="teal" multi />
        </FL>
        <FL label="Biologic / targeted therapy">
          <Pills options={['Etanercept (anti-TNF)','Adalimumab (anti-TNF)','Abatacept (CTLA4-Ig)','Tocilizumab (anti-IL-6)','Canakinumab (anti-IL-1β — sJIA)','Rituximab (anti-CD20)','Baricitinib (JAK)','None']}
            value={biologic} onChange={setBiologic} accent="violet" />
        </FL>
        <FL label="Physiotherapy / rehabilitation">
          <Pills options={['Physiotherapy ongoing','Occupational therapy','Hydrotherapy','Splinting','Eye drops (uveitis)','School accommodations','Not yet started']}
            value={physiotherapy} onChange={setPhysiotherapy} accent="emerald" />
        </FL>
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow-lg transition-all">
        Save Rheumatology Assessment
      </button>
    </div>
  );
}
