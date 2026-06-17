/**
 * @shared-pool
 * PediatricGastroNutritionForm — Pediatric Gastroenterology & Nutrition Assessment
 * WHO dehydration grading, ORS protocol, IMAM SAM/MAM, malnutrition management,
 * NRC protocol, intussusception, Hirschsprung, neonatal jaundice extension,
 * food allergy, celiac disease, inflammatory bowel disease (pediatric)
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import api from '../../../api/client';

const A = {
  emerald:{ bg:'bg-emerald-50', border:'border-emerald-300', text:'text-emerald-700',
            pill:'bg-emerald-100 border-emerald-400 text-emerald-800',
            active:'bg-emerald-600 text-white border-emerald-600' },
  amber:  { bg:'bg-amber-50',   border:'border-amber-300',   text:'text-amber-700',
            pill:'bg-amber-100 border-amber-400 text-amber-800',
            active:'bg-amber-600 text-white border-amber-600' },
  red:    { bg:'bg-red-50',     border:'border-red-300',     text:'text-red-700',
            pill:'bg-red-100 border-red-400 text-red-800',
            active:'bg-red-600 text-white border-red-600' },
  blue:   { bg:'bg-blue-50',    border:'border-blue-300',    text:'text-blue-700',
            pill:'bg-blue-100 border-blue-400 text-blue-800',
            active:'bg-blue-600 text-white border-blue-600' },
  teal:   { bg:'bg-teal-50',    border:'border-teal-300',    text:'text-teal-700',
            pill:'bg-teal-100 border-teal-400 text-teal-800',
            active:'bg-teal-600 text-white border-teal-600' },
  violet: { bg:'bg-violet-50',  border:'border-violet-300',  text:'text-violet-700',
            pill:'bg-violet-100 border-violet-400 text-violet-800',
            active:'bg-violet-600 text-white border-violet-600' },
  orange: { bg:'bg-orange-50',  border:'border-orange-300',  text:'text-orange-700',
            pill:'bg-orange-100 border-orange-400 text-orange-800',
            active:'bg-orange-600 text-white border-orange-600' },
};

function Pills({ options, value, onChange, accent = 'emerald', multi = false }) {
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

function Gate({ label, value, onChange, accent = 'emerald', children }) {
  const ac = A[accent];
  return (
    <div className={`border rounded-xl p-4 ${value === 'Yes' ? ac.bg + ' ' + ac.border : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-gray-800 text-sm">{label}</span>
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button key={opt} type="button" onClick={() => onChange(opt)}
              className={`px-4 py-1 rounded-full border text-sm font-medium transition-all
                ${value === opt ? ac.active : 'bg-white border-gray-300 text-gray-600'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
      {value === 'Yes' && <div className="mt-3 space-y-4">{children}</div>}
    </div>
  );
}

function Section({ title, applicable, onApplicable, accent = 'emerald', children }) {
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

export default function PediatricGastroNutritionForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    overview: 'Applicable', dehydration: 'Applicable', nutrition: 'Applicable',
    diarrhea: 'Applicable', malnutrition: 'Applicable', intussus: 'Applicable',
    hirsch: 'Applicable', allergy: 'Applicable', celiac: 'Applicable',
    pedibd: 'Applicable', hepatitis: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Overview
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('months');
  const [weight, setWeight] = useState('');
  const [chief, setChief] = useState([]);

  // Dehydration
  const [dehGate, setDehGate] = useState('');
  const [dehydLook, setDehydLook] = useState('');
  const [dehydEyes, setDehydEyes] = useState('');
  const [dehydDrink, setDehydDrink] = useState('');
  const [dehydSkin, setDehydSkin] = useState('');
  const [dehydClass, setDehydClass] = useState('');
  const [orsVolume, setOrsVolume] = useState('');
  const [ivFluid, setIvFluid] = useState('');

  // Diarrhoea
  const [diaStools, setDiaStools] = useState('');
  const [diaDuration, setDiaDuration] = useState('');
  const [diaBlood, setDiaBlood] = useState('');
  const [diaPersist, setDiaPersist] = useState('');
  const [diaEtiology, setDiaEtiology] = useState('');
  const [zincGiven, setZincGiven] = useState('');

  // Malnutrition / NRC
  const [samGate, setSamGate] = useState('');
  const [muac, setMuac] = useState('');
  const [oedema, setOedema] = useState('');
  const [whz, setWhz] = useState('');
  const [appetite, setAppetite] = useState('');
  const [medComp, setMedComp] = useState([]);
  const [nrcPhase, setNrcPhase] = useState('');
  const [rutf, setRutf] = useState('');
  const [vitamins, setVitamins] = useState([]);
  const [fmass, setFmass] = useState('');

  // Intussusception
  const [intusGate, setIntusGate] = useState('');
  const [intusFeatures, setIntusFeatures] = useState([]);
  const [intusMass, setIntusMass] = useState('');
  const [intusUSS, setIntusUSS] = useState('');
  const [intusRed, setIntusRed] = useState('');
  const [intusMgmt, setIntusMgmt] = useState('');

  // Hirschsprung
  const [hirschGate, setHirschGate] = useState('');
  const [hirschFeatures, setHirschFeatures] = useState([]);
  const [hirschEnema, setHirschEnema] = useState('');
  const [hirschBiopsy, setHirschBiopsy] = useState('');

  // Food allergy / CMPA
  const [allergyGate, setAllergyGate] = useState('');
  const [allergenType, setAllergenType] = useState([]);
  const [allergyReaction, setAllergyReaction] = useState([]);
  const [ige, setIge] = useState('');
  const [skinPrick, setSkinPrick] = useState('');
  const [elimDiet, setElimDiet] = useState('');

  // Celiac
  const [celiacGate, setCeliacGate] = useState('');
  const [ttg, setTtg] = useState('');
  const [endoscopy, setEndoscopy] = useState('');
  const [marshGrade, setMarshGrade] = useState('');
  const [gfd, setGfd] = useState('');

  // Pediatric IBD
  const [ibdGate, setIbdGate] = useState('');
  const [ibdType, setIbdType] = useState('');
  const [ibdFeatures, setIbdFeatures] = useState([]);
  const [pcdai, setPcdai] = useState('');
  const [wPucai, setWPucai] = useState('');
  const [ibdTx, setIbdTx] = useState([]);

  // Hepatitis
  const [hepatGate, setHepatGate] = useState('');
  const [hepatType, setHepatType] = useState('');
  const [jaundice, setJaundice] = useState('');
  const [bilirubin, setBilirubin] = useState('');
  const [alt, setAlt] = useState('');
  const [hepatFeatures, setHepatFeatures] = useState([]);

  // WHO dehydration auto-classification
  const dehydrationClass = useMemo(() => {
    const signs = [dehydLook, dehydEyes, dehydDrink, dehydSkin];
    const severeCount = signs.filter(s => ['Sunken','Not able to drink or drinking poorly','Goes back very slowly (>2s)','Lethargic or unconscious'].includes(s)).length;
    const modCount = signs.filter(s => ['Restless/irritable','Sunken','Drinks eagerly/thirsty','Goes back slowly (1-2s)'].includes(s)).length;
    if (severeCount >= 2) return 'Severe Dehydration (Plan C — IV fluids)';
    if (modCount >= 2) return 'Some Dehydration (Plan B — ORS)';
    return 'No Dehydration (Plan A — ORS at home)';
  }, [dehydLook, dehydEyes, dehydDrink, dehydSkin]);

  const samAlert = muac !== '' && parseFloat(muac) < 11.5;
  const intusAlert = intusGate === 'Yes' && intusFeatures.includes('Current jelly stools');

  const handleSave = async () => {
    await api.post('/assessments', {
      type: 'pediatric-gastro-nutrition',
      patientId, encounterId,
      data: {
        overview: { age, ageUnit, weight, chief },
        dehydration: { gate: dehGate, look: dehydLook, eyes: dehydEyes, drink: dehydDrink, skin: dehydSkin, classification: dehydrationClass, orsVolume, ivFluid },
        diarrhea: { stools: diaStools, duration: diaDuration, blood: diaBlood, persistent: diaPersist, etiology: diaEtiology, zinc: zincGiven },
        malnutrition: { gate: samGate, muac, oedema, whz, appetite, medComplications: medComp, nrcPhase, rutf, vitamins, f75f100: fmass },
        intussusception: { gate: intusGate, features: intusFeatures, mass: intusMass, uss: intusUSS, redFlag: intusRed, management: intusMgmt },
        hirschsprung: { gate: hirschGate, features: hirschFeatures, contrastEnema: hirschEnema, biopsy: hirschBiopsy },
        foodAllergy: { gate: allergyGate, allergens: allergenType, reactions: allergyReaction, ige, skinPrick, eliminationDiet: elimDiet },
        celiac: { gate: celiacGate, ttg, endoscopy, marshGrade, gfd },
        ibd: { gate: ibdGate, type: ibdType, features: ibdFeatures, pcdai, pucai: wPucai, treatment: ibdTx },
        hepatitis: { gate: hepatGate, type: hepatType, jaundice, bilirubin, alt, features: hepatFeatures },
      }
    });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-lg">
        <h2 className="text-xl font-bold">Pediatric Gastroenterology & Nutrition</h2>
        <p className="text-emerald-100 text-sm">WHO Dehydration · IMAM SAM/MAM · Diarrhoea · Intussusception · Celiac · Pediatric IBD · Hepatitis</p>
      </div>

      {(samAlert || intusAlert) && (
        <div className="bg-red-50 border-2 border-red-600 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-700">Critical Alert</p>
            {samAlert && <p className="text-sm text-red-600">SAM confirmed (MUAC &lt;11.5cm) — NRC admission, RUTF, treat complications</p>}
            {intusAlert && <p className="text-sm text-red-600">Intussusception with current jelly stools — surgical emergency</p>}
          </div>
        </div>
      )}

      {/* Overview */}
      <Section title="Patient Overview" applicable={sec.overview} onApplicable={v => sa('overview', v)} accent="emerald">
        <div className={`p-3 rounded-lg text-sm ${A.amber.bg} ${A.amber.border} border`}>
          <p className={`font-semibold ${A.amber.text}`}>India context — GI burden in children</p>
          <p className="text-gray-600 mt-1">Diarrhoea: 13% of under-5 deaths in India. SAM: ~7.5 million children (NFHS-5).
            Rotavirus vaccination in NIP since 2016. Zinc supplementation (20mg/day × 14d) for all acute diarrhoea per IAP/WHO.
            IMAM — Integrated Management of Acute Malnutrition: NRC for SAM with complications.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age">
            <div className="flex gap-2">
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="0" className="w-14 border rounded-lg px-2 py-1.5 text-sm" />
              <select value={ageUnit} onChange={e => setAgeUnit(e.target.value)} className="flex-1 border rounded-lg px-2 py-1.5 text-sm">
                <option>months</option><option>years</option>
              </select>
            </div>
          </FL>
          <FL label="Weight" sub="kg">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
          </FL>
          <FL label="Chief complaint(s)">
            <Pills options={['Diarrhoea','Vomiting','Abdominal pain','Jaundice','Constipation','Blood in stool','Failure to thrive','Feeding difficulty']}
              value={chief} onChange={setChief} accent="emerald" multi />
          </FL>
        </div>
      </Section>

      {/* WHO Dehydration */}
      <Section title="WHO Dehydration Assessment" applicable={sec.dehydration} onApplicable={v => sa('dehydration', v)} accent="blue">
        <FL label="Dehydration assessment needed?">
          <Pills options={['Yes','No']} value={dehGate} onChange={setDehGate} accent="blue" />
        </FL>
        {dehGate === 'Yes' && (
          <>
            <div className="bg-white rounded-xl border divide-y overflow-hidden">
              {[
                { label:'General condition / Look', key:'dehydLook', setter:setDehydLook, opts:['Well, alert','Restless/irritable','Lethargic or unconscious'] },
                { label:'Eyes', key:'dehydEyes', setter:setDehydEyes, opts:['Normal','Sunken','Very sunken/dry'] },
                { label:'Mouth/tongue', key:'dehydDrink', setter:setDehydDrink, opts:['Moist','Dry','Very dry'] },
                { label:'Thirst / Drinking', key:'dehydDrink', setter:setDehydDrink, opts:['Drinks normally','Drinks eagerly/thirsty','Not able to drink or drinking poorly'] },
                { label:'Skin turgor (pinch)', key:'dehydSkin', setter:setDehydSkin, opts:['Goes back immediately (<1s)','Goes back slowly (1-2s)','Goes back very slowly (>2s)'] },
              ].map(row => (
                <div key={row.label} className="px-3 py-2 flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-40 flex-shrink-0">{row.label}</span>
                  <div className="flex flex-wrap gap-1">
                    {row.opts.map(o => (
                      <button key={o} type="button" onClick={() => row.setter(o)}
                        className={`px-2 py-0.5 rounded text-xs border font-medium transition-all
                          ${[dehydLook,dehydEyes,dehydDrink,dehydSkin].includes(o) ? A.blue.active : A.blue.pill}`}>
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={`p-3 rounded-lg border font-semibold ${dehydrationClass.includes('Severe') ? 'bg-red-50 border-red-400 text-red-700' : dehydrationClass.includes('Some') ? 'bg-amber-50 border-amber-400 text-amber-700' : 'bg-green-50 border-green-400 text-green-700'}`}>
              {dehydrationClass}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="ORS volume planned" sub="mL/kg">
                <input type="text" value={orsVolume} onChange={e => setOrsVolume(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="75 mL/kg × 4h (Plan B)" />
              </FL>
              <FL label="IV fluid (severe)">
                <Pills options={['RL 100mL/kg over 3h (<12m)','RL 100mL/kg over 3h (≥12m)','NS + D5','None needed']}
                  value={ivFluid} onChange={setIvFluid} accent="blue" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Diarrhoea */}
      <Section title="Diarrhoea Assessment (IMNCI/WHO)" applicable={sec.diarrhea} onApplicable={v => sa('diarrhea', v)} accent="teal">
        <div className="grid grid-cols-2 gap-3">
          <FL label="Stools per day"><input type="number" value={diaStools} onChange={e => setDiaStools(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="stools/day" /></FL>
          <FL label="Duration" sub="days"><input type="number" value={diaDuration} onChange={e => setDiaDuration(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="days" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Blood in stool?"><Pills options={['No','Yes — red blood','Yes — black (melaena)']} value={diaBlood} onChange={setDiaBlood} accent="red" /></FL>
          <FL label="Persistent diarrhoea (>14 days)?"><Pills options={['Yes','No']} value={diaPersist} onChange={setDiaPersist} accent="amber" /></FL>
        </div>
        <FL label="Likely etiology">
          <Pills options={['Rotavirus','E. coli (ETEC)','Shigella','Salmonella','Cholera','Amoebiasis','Giardiasis','Antibiotic-associated','Post-infectious','Unknown']}
            value={diaEtiology} onChange={setDiaEtiology} accent="teal" />
        </FL>
        <FL label="Zinc supplementation given?">
          <Pills options={['Yes (20mg/d × 14d ≥6m)','Yes (10mg/d × 14d <6m)','No — start now','Refused']}
            value={zincGiven} onChange={setZincGiven} accent="emerald" />
        </FL>
      </Section>

      {/* SAM / NRC */}
      <Section title="SAM / MAM — NRC Management" applicable={sec.nutrition} onApplicable={v => sa('nutrition', v)} accent="red">
        <FL label="Severe acute malnutrition (SAM) evaluation needed?">
          <Pills options={['Yes','No']} value={samGate} onChange={setSamGate} accent="red" />
        </FL>
        {samGate === 'Yes' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <FL label="MUAC" sub="cm">
                <input type="number" step="0.1" value={muac} onChange={e => setMuac(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
                {muac && <p className={`text-xs mt-1 font-semibold ${parseFloat(muac) < 11.5 ? 'text-red-700' : parseFloat(muac) < 12.5 ? 'text-orange-600' : 'text-green-700'}`}>
                  {parseFloat(muac) < 11.5 ? 'SAM (<11.5cm)' : parseFloat(muac) < 12.5 ? 'MAM (11.5–12.5cm)' : 'Normal (>12.5cm)'}
                </p>}
              </FL>
              <FL label="WHZ Z-score">
                <input type="number" step="0.1" value={whz} onChange={e => setWhz(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="Bilateral pitting oedema">
                <Pills options={['None','+','++','+++']} value={oedema} onChange={setOedema} accent="red" />
              </FL>
            </div>
            <FL label="Appetite test (RUTF)">
              <Pills options={['Pass — eats ≥1/2 sachet','Fail — eats <1/2 sachet','Not tested']}
                value={appetite} onChange={setAppetite} accent="amber" />
            </FL>
            <FL label="Medical complications (NRC admission criteria)">
              <Pills options={['Bilateral oedema','Appetite failure','Hypoglycaemia (BG <3mmol/L)','Hypothermia (<35°C)',
                'Dehydration','Severe infection/sepsis','Anaemia severe','Breastfeeding problem (infant)','None']}
                value={medComp} onChange={setMedComp} accent="red" multi />
            </FL>
            <FL label="NRC Phase">
              <Pills options={['Phase 1 — stabilisation (F-75)','Phase 2 — rehabilitation (F-100/RUTF)','Follow-up (community IMAM)','Not admitted']}
                value={nrcPhase} onChange={setNrcPhase} accent="orange" />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="RUTF (ready-to-use therapeutic food)">
                <Pills options={['Started','Refused','Unavailable','Not indicated']} value={rutf} onChange={setRutf} accent="teal" />
              </FL>
              <FL label="Vitamins/minerals given">
                <Pills options={['Vitamin A (therapeutic)','Zinc 2mg/kg/d','Iron (Phase 2 only)','Folic acid','Multivitamin']}
                  value={vitamins} onChange={setVitamins} accent="emerald" multi />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Intussusception */}
      <Section title="Intussusception" applicable={sec.intussus} onApplicable={v => sa('intussus', v)} accent="orange">
        <FL label="Intussusception suspected?">
          <Pills options={['Yes','No','Possible']} value={intusGate} onChange={setIntusGate} accent="orange" />
        </FL>
        {intusGate === 'Yes' && (
          <>
            <FL label="Clinical features (select all)">
              <Pills options={['Intermittent colicky pain','Vomiting','Pallor during episodes','Current jelly stools','Sausage-shaped mass (RUQ)','Dance sign (empty RIF)','Bilious vomiting']}
                value={intusFeatures} onChange={setIntusFeatures} accent="orange" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Abdominal mass">
                <Pills options={['Palpable (right upper)','Not palpable','Equivocal']} value={intusMass} onChange={setIntusMass} accent="orange" />
              </FL>
              <FL label="Ultrasound abdomen">
                <Pills options={['Target/doughnut sign','Pseudokidney sign','Normal','Not done']} value={intusUSS} onChange={setIntusUSS} accent="blue" />
              </FL>
            </div>
            <FL label="Management">
              <Pills options={['Air enema reduction','Hydrostatic (USS-guided) reduction','Surgical reduction','Bowel resection needed','Watch and wait (early, stable)']}
                value={intusMgmt} onChange={setIntusMgmt} accent="violet" />
            </FL>
          </>
        )}
      </Section>

      {/* Hirschsprung */}
      <Section title="Hirschsprung Disease" applicable={sec.hirsch} onApplicable={v => sa('hirsch', v)} accent="violet">
        <FL label="Hirschsprung disease suspected?">
          <Pills options={['Yes','No','Known — follow-up']} value={hirschGate} onChange={setHirschGate} accent="violet" />
        </FL>
        {(hirschGate === 'Yes' || hirschGate === 'Known — follow-up') && (
          <>
            <FL label="Clinical features">
              <Pills options={['Delayed passage of meconium (>48h)','Chronic constipation since birth','Abdominal distension','Enterocolitis (explosive diarrhoea)','Failure to thrive','Ribbon stools']}
                value={hirschFeatures} onChange={setHirschFeatures} accent="violet" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Contrast enema">
                <Pills options={['Transition zone seen','Dilated colon (no transition zone)','Normal','Not done']} value={hirschEnema} onChange={setHirschEnema} accent="violet" />
              </FL>
              <FL label="Rectal biopsy (gold standard)">
                <Pills options={['Aganglionosis confirmed','Normal ganglia','Pending','Not done']} value={hirschBiopsy} onChange={setHirschBiopsy} accent="violet" />
              </FL>
            </div>
          </>
        )}
      </Section>

      {/* Food Allergy / CMPA */}
      <Section title="Food Allergy / Cow's Milk Protein Allergy" applicable={sec.allergy} onApplicable={v => sa('allergy', v)} accent="amber">
        <FL label="Food allergy suspected?">
          <Pills options={['Yes','No','Known — follow-up']} value={allergyGate} onChange={setAllergyGate} accent="amber" />
        </FL>
        {(allergyGate === 'Yes' || allergyGate === 'Known — follow-up') && (
          <>
            <FL label="Allergens suspected">
              <Pills options={["Cow's milk protein","Egg","Peanut","Tree nuts","Wheat/gluten","Soy","Shellfish","Fish","Multiple"]}
                value={allergenType} onChange={setAllergenType} accent="amber" multi />
            </FL>
            <FL label="Reaction type">
              <Pills options={['IgE-mediated (urticaria/angioedema/anaphylaxis)','Non-IgE (FPIES/eosinophilic esophagitis)',
                'Mixed (atopic eczema)','Blood in stool (CMPA <6m)','Vomiting/colic']}
                value={allergyReaction} onChange={setAllergyReaction} accent="red" multi />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Specific IgE / RAST"><Pills options={['Positive','Negative','Not done']} value={ige} onChange={setIge} accent="amber" /></FL>
              <FL label="Skin prick test"><Pills options={['Positive','Negative','Not done']} value={skinPrick} onChange={setSkinPrick} accent="amber" /></FL>
            </div>
            <FL label="Elimination diet trial">
              <Pills options={['Yes — maternal elimination (breastfed)','Yes — extensively hydrolysed formula','Yes — amino acid formula','Yes — child elimination diet','Not started']}
                value={elimDiet} onChange={setElimDiet} accent="teal" />
            </FL>
          </>
        )}
      </Section>

      {/* Celiac */}
      <Section title="Celiac Disease" applicable={sec.celiac} onApplicable={v => sa('celiac', v)} accent="teal">
        <FL label="Celiac disease suspected?">
          <Pills options={['Yes','No','Known — follow-up']} value={celiacGate} onChange={setCeliacGate} accent="teal" />
        </FL>
        {(celiacGate === 'Yes' || celiacGate === 'Known — follow-up') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Anti-tTG IgA / EMA">
                <Pills options={['>10× ULN (skip biopsy)','Positive (<10× ULN)','Negative','Not done']} value={ttg} onChange={setTtg} accent="teal" />
              </FL>
              <FL label="Endoscopy + duodenal biopsy">
                <Pills options={['Performed','Pending','Not indicated','Not done']} value={endoscopy} onChange={setEndoscopy} accent="teal" />
              </FL>
            </div>
            <FL label="Marsh grade (biopsy)">
              <Pills options={['Marsh 0','Marsh I','Marsh II','Marsh IIIa (partial)','Marsh IIIb (subtotal)','Marsh IIIc (total villous atrophy)']}
                value={marshGrade} onChange={setMarshGrade} accent="teal" />
            </FL>
            <FL label="Gluten-free diet compliance">
              <Pills options={['Strict GFD','Partial compliance','Non-compliant','Pre-diagnosis']} value={gfd} onChange={setGfd} accent="emerald" />
            </FL>
          </>
        )}
      </Section>

      {/* Pediatric IBD */}
      <Section title="Pediatric IBD (Crohn's / UC)" applicable={sec.pedibd} onApplicable={v => sa('pedibd', v)} accent="violet">
        <FL label="Pediatric IBD suspected?">
          <Pills options={['Yes','No','Known — follow-up']} value={ibdGate} onChange={setIbdGate} accent="violet" />
        </FL>
        {(ibdGate === 'Yes' || ibdGate === 'Known — follow-up') && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="IBD type">
                <Pills options={["Crohn's disease","Ulcerative colitis","IBD-unclassified (IBD-U)","VEO-IBD (<6y)"]}
                  value={ibdType} onChange={setIbdType} accent="violet" />
              </FL>
              <FL label="Disease activity score">
                <input type="number" value={pcdai} onChange={e => setPcdai(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" placeholder="PCDAI / PUCAI score" />
              </FL>
            </div>
            <FL label="Features">
              <Pills options={['Rectal bleeding','Bloody diarrhoea','Abdominal pain','Weight loss/FTT','Perianal disease','Stricture','Fistula','Extraintestinal manifestations']}
                value={ibdFeatures} onChange={setIbdFeatures} accent="violet" multi />
            </FL>
            <FL label="Treatment">
              <Pills options={['5-ASA (mesalazine)','Corticosteroids (induction)','Azathioprine/6-MP','Methotrexate','Anti-TNF (infliximab)','Exclusive enteral nutrition','Surgery']}
                value={ibdTx} onChange={setIbdTx} accent="blue" multi />
            </FL>
          </>
        )}
      </Section>

      {/* Hepatitis / Jaundice */}
      <Section title="Pediatric Hepatitis / Jaundice" applicable={sec.hepatitis} onApplicable={v => sa('hepatitis', v)} accent="amber">
        <FL label="Hepatitis/jaundice evaluation needed?">
          <Pills options={['Yes','No']} value={hepatGate} onChange={setHepatGate} accent="amber" />
        </FL>
        {hepatGate === 'Yes' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Type">
                <Pills options={['Acute viral hepatitis A','Hepatitis B (acute/chronic)','Hepatitis C','Autoimmune hepatitis','Wilson disease','Biliary atresia','Fatty liver (NAFLD)']}
                  value={hepatType} onChange={setHepatType} accent="amber" />
              </FL>
              <FL label="Jaundice (Kramer)">
                <Pills options={['Zone I (face)','Zone II (trunk)','Zone III (below umbilicus)','Zone IV (arms/legs)','Zone V (palms/soles)']}
                  value={jaundice} onChange={setJaundice} accent="amber" />
              </FL>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Total Bilirubin" sub="mg/dL">
                <input type="number" step="0.1" value={bilirubin} onChange={e => setBilirubin(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
              <FL label="ALT/SGPT" sub="IU/L">
                <input type="number" value={alt} onChange={e => setAlt(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" />
              </FL>
            </div>
            <FL label="Features (select all)">
              <Pills options={['Jaundice','Hepatomegaly','Splenomegaly','Ascites','Coagulopathy','Encephalopathy','Cholestasis','Dark urine/pale stools']}
                value={hepatFeatures} onChange={setHepatFeatures} accent="amber" multi />
            </FL>
          </>
        )}
      </Section>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-lg transition-all">
        Save Gastro & Nutrition Assessment
      </button>
    </div>
  );
}
