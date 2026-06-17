/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

const CM = { crimson: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-600 data-[sel=true]:text-white data-[sel=true]:border-red-600', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500', amber: 'bg-amber-100 text-amber-800 border-amber-300 data-[sel=true]:bg-amber-500 data-[sel=true]:text-white data-[sel=true]:border-amber-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'crimson' }) {
  const cls = CM[color] || CM.crimson;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-red-600 text-white border-red-600' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-red-400 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"/>; }

export default function AcuteCompartmentSyndromeForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ region: '', side: '', cause: '', timeOfInjury: '', timeDiscovered: '' });
  const [sixPs, setSixPs] = useState({ applicable: null, pain: '', pressure: '', painPassive: '', paresthesia: '', paralysis: '', pallor: '', pulselessness: '' });
  const [pressureData, setPressureData] = useState({ applicable: null, compartmentPressure: '', diastolicBP: '', deltaPressure: '', measurementSite: '', serialMeasurements: '' });
  const [fasciotomy, setFasciotomy] = useState({ applicable: null, decision: '', timeToFasciotomy: '', compartmentsReleased: [], woundClosure: '', complications: '' });
  const [monitoring, setMonitoring] = useState({ applicable: null, urine: '', creatinine: '', ck: '', lactate: '', ecg: '', potassium: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, region: '', cause: '', icd10: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Emergency alert logic ─────────────────────────────────────────────────────
  const emergencyAlert = useMemo(() => {
    const critSigns = ['painPassive', 'paresthesia', 'paralysis'];
    const positiveCrit = critSigns.filter(k => sixPs[k] === 'positive').length;
    const dp = parseFloat(pressureData.deltaPressure);
    const cp = parseFloat(pressureData.compartmentPressure);
    const dpAlert = !isNaN(dp) && dp <= 30;
    const cpAlert = !isNaN(cp) && cp >= 30;
    return (positiveCrit >= 2 || dpAlert || cpAlert) && sixPs.applicable === 'yes';
  }, [sixPs, pressureData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'acute_compartment_syndrome', patientId, encounterId, data: { basicInfo, sixPs, pressureData, fasciotomy, monitoring, diagnosisData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-red-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-red-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-rose-50 p-4">
      <div className="bg-gradient-to-r from-red-700 to-rose-600 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Acute Compartment Syndrome</h1>
        <p className="text-red-200 text-xs mt-0.5">6 P's Assessment · Compartment Pressure · ΔP Threshold · Fasciotomy Decision · Rhabdomyolysis Monitoring</p>
      </div>

      {emergencyAlert && (
        <div className="bg-red-600 text-white rounded-xl p-4 mb-4 animate-pulse border-2 border-red-300 shadow-lg">
          <div className="text-lg font-bold">🚨 ACUTE COMPARTMENT SYNDROME SUSPECTED</div>
          <div className="text-sm mt-1">Emergent fasciotomy may be indicated. Do NOT delay. Alert senior surgeon immediately.</div>
          <div className="text-xs mt-1 text-red-200">Threshold: ΔP ≤30 mmHg or compartment pressure ≥30 mmHg or ≥2 critical signs (pain on passive stretch, paraesthesia, paralysis).</div>
        </div>
      )}

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <Pills label="Affected Region" options={[['leg_anterior','Leg — anterior'],['leg_deep_posterior','Leg — deep posterior'],['leg_superficial_posterior','Leg — superficial posterior'],['leg_lateral','Leg — lateral'],['forearm_volar','Forearm — volar'],['forearm_dorsal','Forearm — dorsal'],['thigh','Thigh'],['foot','Foot'],['hand','Hand'],['gluteal','Gluteal']]} value={basicInfo.region} onChange={v => setBasicInfo(p => ({...p, region: v}))} color="crimson"/>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
        </div>
        <Pills label="Cause" options={[['fracture','Fracture (tibia/forearm most common)'],['crush_injury','Crush injury'],['post_op','Post-operative (tight cast/splint)'],['reperfusion','Reperfusion after ischaemia'],['rhabdomyolysis','Exercise-induced / rhabdomyolysis'],['burns','Burns'],['snake_bite','Envenomation/snake bite'],['spontaneous','Spontaneous (anticoagulated)']]} value={basicInfo.cause} onChange={v => setBasicInfo(p => ({...p, cause: v}))} color="orange"/>
        {basicInfo.cause === 'snake_bite' && <div className="text-xs text-orange-700 bg-orange-50 rounded p-2 mb-2">India: Viper envenomation (Russell's viper, saw-scaled viper) — compartment syndrome in affected limb. Anti-snake venom AND surgical assessment required.</div>}
        <div className="grid grid-cols-2 gap-2">
          <FL label="Time of Injury"><Inp type="time" value={basicInfo.timeOfInjury} onChange={v => setBasicInfo(p => ({...p, timeOfInjury: v}))}/></FL>
          <FL label="Time Symptoms Discovered"><Inp type="time" value={basicInfo.timeDiscovered} onChange={v => setBasicInfo(p => ({...p, timeDiscovered: v}))}/></FL>
        </div>
      </div>

      {/* 6 P's */}
      <div className={secCls}>
        <h2 className={h2Cls}>⚠️ 6 P's Assessment</h2>
        <Gate question="Is 6 P's clinical assessment applicable?" value={sixPs.applicable} onChange={v => setSixPs(p => ({...p, applicable: v}))}>
          <div className="text-xs text-red-600 font-medium mb-2">★ = most reliable early signs. Do not wait for pulselessness.</div>
          {[
            ['pain', '🔴 Pain — severe, out of proportion to injury'],
            ['pressure', '🔴 Pressure — tense, woody/board-like compartment'],
            ['painPassive', '⭐ Pain on passive stretch — (flex toes/fingers) MOST RELIABLE'],
            ['paresthesia', '⭐ Paresthesia — tingling/burning in affected nerve distribution'],
            ['paralysis', '⭐ Paralysis/weakness — muscle function in compartment'],
            ['pallor', '🟡 Pallor — skin discolouration'],
            ['pulselessness', '🟡 Pulselessness — LATE sign, do not wait'],
          ].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {['negative','positive'].map(v => (
                  <button key={v} type="button" onClick={() => setSixPs(p => ({...p, [k]: v}))}
                    className={`px-3 py-1 rounded text-xs font-semibold border transition-colors ${sixPs[k] === v ? v === 'positive' ? 'bg-red-600 text-white border-red-600' : 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* Compartment Pressures */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 Compartment Pressure Measurement</h2>
        <Gate question="Is compartment pressure measurement applicable?" value={pressureData.applicable} onChange={v => setPressureData(p => ({...p, applicable: v}))}>
          <div className="text-xs text-gray-500 mb-2">Use Stryker compartment pressure monitor or 18G needle manometry. Measure within 5cm of injury.</div>
          <FL label="Measurement Site"><Inp value={pressureData.measurementSite} onChange={v => setPressureData(p => ({...p, measurementSite: v}))} placeholder="e.g. anterior leg, 5cm below tibial tuberosity"/></FL>
          <div className="grid grid-cols-3 gap-2">
            <FL label="Compartment Pressure (mmHg)"><Inp type="number" value={pressureData.compartmentPressure} onChange={v => setPressureData(p => ({...p, compartmentPressure: v}))} placeholder="mmHg"/></FL>
            <FL label="Diastolic BP (mmHg)"><Inp type="number" value={pressureData.diastolicBP} onChange={v => setPressureData(p => ({...p, diastolicBP: v}))} placeholder="mmHg"/></FL>
            <FL label="ΔP = Diastolic − Compartment" sub="fasciotomy if ≤30">
              <div className={`text-lg font-bold px-3 py-1.5 rounded-lg border ${(pressureData.diastolicBP && pressureData.compartmentPressure) ? parseFloat(pressureData.diastolicBP) - parseFloat(pressureData.compartmentPressure) <= 30 ? 'bg-red-100 border-red-400 text-red-700 animate-pulse' : 'bg-green-100 border-green-300 text-green-700' : 'bg-gray-100 border-gray-300 text-gray-500'}`}>
                {(pressureData.diastolicBP && pressureData.compartmentPressure) ? (parseFloat(pressureData.diastolicBP) - parseFloat(pressureData.compartmentPressure)).toFixed(0) + ' mmHg' : '—'}
              </div>
            </FL>
          </div>
          {parseFloat(pressureData.compartmentPressure) >= 30 && <div className="text-xs text-red-700 font-bold mb-2 animate-pulse">⚠ Compartment pressure ≥30 mmHg — calculate ΔP and consider fasciotomy.</div>}
          {parseFloat(pressureData.diastolicBP) - parseFloat(pressureData.compartmentPressure) <= 30 && pressureData.diastolicBP && pressureData.compartmentPressure && <div className="text-xs text-red-700 font-bold animate-pulse">🚨 ΔP ≤30 mmHg — FASCIOTOMY INDICATED. Do not delay.</div>}
          <FL label="Serial Measurements / Trend"><Inp value={pressureData.serialMeasurements} onChange={v => setPressureData(p => ({...p, serialMeasurements: v}))} placeholder="e.g. 28 → 35 → 42 mmHg over 2h — rising trend"/></FL>
        </Gate>
      </div>

      {/* Fasciotomy */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔪 Fasciotomy</h2>
        <Gate question="Is fasciotomy documentation applicable?" value={fasciotomy.applicable} onChange={v => setFasciotomy(p => ({...p, applicable: v}))}>
          <Pills label="Fasciotomy Decision" options={[['not_indicated','Not indicated — monitoring'],['planned','Planned — consent obtained'],['performed','Fasciotomy performed'],['deferred','Deferred — reassess in 1h']]} value={fasciotomy.decision} onChange={v => setFasciotomy(p => ({...p, decision: v}))} color={fasciotomy.decision === 'not_indicated' || fasciotomy.decision === 'deferred' ? 'amber' : 'crimson'}/>
          {(fasciotomy.decision === 'performed' || fasciotomy.decision === 'planned') && <>
            <FL label="Time to Fasciotomy (hours from injury)"><Inp type="number" value={fasciotomy.timeToFasciotomy} onChange={v => setFasciotomy(p => ({...p, timeToFasciotomy: v}))} placeholder="hours"/></FL>
            {parseFloat(fasciotomy.timeToFasciotomy) > 6 && <div className="text-xs text-orange-600 font-semibold mb-2">⚠ Fasciotomy delayed &gt;6h from injury — increased risk of permanent sequelae (Volkmann's contracture, rhabdomyolysis).</div>}
            <Pills label="Compartments Released" multi options={[['anterior_leg','Anterior (leg)'],['deep_posterior_leg','Deep posterior (leg)'],['superficial_posterior_leg','Superficial posterior (leg)'],['lateral_leg','Lateral (leg)'],['volar_forearm','Volar (forearm)'],['dorsal_forearm','Dorsal (forearm)'],['thigh_ant','Anterior (thigh)'],['thigh_post','Posterior (thigh)'],['foot_medial','Foot — medial'],['foot_lateral','Foot — lateral'],['foot_central','Foot — central'],['interossei','Interossei (foot/hand)']]} value={fasciotomy.compartmentsReleased} onChange={v => setFasciotomy(p => ({...p, compartmentsReleased: v}))} color="crimson"/>
            <Pills label="Wound Management" options={[['open','Open — delayed primary closure'],['skin_graft','Split skin graft'],['vac_therapy','VAC therapy'],['primary_closure','Primary closure (if possible)']]} value={fasciotomy.woundClosure} onChange={v => setFasciotomy(p => ({...p, woundClosure: v}))} color="blue"/>
          </>}
          <FL label="Complications / Notes"><Inp value={fasciotomy.complications} onChange={v => setFasciotomy(p => ({...p, complications: v}))} placeholder="e.g. Volkmann's contracture, wound infection, residual weakness"/></FL>
        </Gate>
      </div>

      {/* Rhabdomyolysis Monitoring */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Rhabdomyolysis / Systemic Monitoring</h2>
        <Gate question="Is rhabdomyolysis monitoring applicable?" value={monitoring.applicable} onChange={v => setMonitoring(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-3 gap-2">
            <FL label="Urine output (mL/hr)"><Inp type="number" value={monitoring.urine} onChange={v => setMonitoring(p => ({...p, urine: v}))} placeholder="target >1 mL/kg/hr"/></FL>
            <FL label="CK (U/L)" sub=">1000 = rhabdo"><Inp type="number" value={monitoring.ck} onChange={v => setMonitoring(p => ({...p, ck: v}))} placeholder="U/L"/></FL>
            <FL label="Creatinine (µmol/L)"><Inp type="number" value={monitoring.creatinine} onChange={v => setMonitoring(p => ({...p, creatinine: v}))} placeholder="µmol/L"/></FL>
            <FL label="Potassium (mmol/L)" sub=">5.5 = emergency"><Inp type="number" value={monitoring.potassium} onChange={v => setMonitoring(p => ({...p, potassium: v}))} placeholder="mmol/L"/></FL>
            <FL label="Lactate (mmol/L)"><Inp type="number" value={monitoring.lactate} onChange={v => setMonitoring(p => ({...p, lactate: v}))} placeholder="mmol/L"/></FL>
          </div>
          {parseFloat(monitoring.ck) > 1000 && <div className="text-xs text-red-600 font-semibold">⚠ CK &gt;1000 — rhabdomyolysis. Aggressive IV fluid resuscitation (150–250mL/hr saline). Target urine output 1–3mL/kg/hr. Monitor potassium and renal function.</div>}
          {parseFloat(monitoring.potassium) > 5.5 && <div className="text-xs text-red-700 font-bold mt-1 animate-pulse">🚨 HYPERKALAEMIA ≥5.5 — cardiac emergency. ECG, IV calcium gluconate, treat urgently.</div>}
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Region" options={[['leg','Leg'],['forearm','Forearm (Volkmann\'s)'],['thigh','Thigh'],['foot','Foot'],['hand','Hand'],['gluteal','Gluteal']]} value={diagnosisData.region} onChange={v => setDiagnosisData(p => ({...p, region: v}))} color="crimson"/>
          <Pills label="Causative Event" options={[['post_fracture','Post-fracture'],['crush_injury','Crush injury'],['reperfusion','Reperfusion'],['snake_envenomation','Snake envenomation'],['tight_cast','Tight cast/external compression'],['rhabdomyolysis','Exertional rhabdomyolysis']]} value={diagnosisData.cause} onChange={v => setDiagnosisData(p => ({...p, cause: v}))} color="orange"/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. T79.6 (traumatic ischaemia of muscle/ACS), M62.2 (Volkmann's)"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-red-400"/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl font-semibold text-sm shadow hover:from-red-700 hover:to-rose-700 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
