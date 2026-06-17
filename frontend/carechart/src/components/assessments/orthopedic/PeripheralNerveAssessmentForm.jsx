/** @shared-pool */
import React, { useState } from 'react';
import api from '../../../api/client';

const CM = { lime: 'bg-lime-100 text-lime-800 border-lime-300 data-[sel=true]:bg-lime-600 data-[sel=true]:text-white data-[sel=true]:border-lime-600', red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500', purple: 'bg-purple-100 text-purple-800 border-purple-300 data-[sel=true]:bg-purple-500 data-[sel=true]:text-white data-[sel=true]:border-purple-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'lime' }) {
  const cls = CM[color] || CM.lime;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-lime-600 text-white border-lime-600' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-lime-400 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"/>; }

export default function PeripheralNerveAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ nerveAffected: '', side: '', chiefComplaint: '', onset: '', occupation: '' });
  const [motorAssessment, setMotorAssessment] = useState({ applicable: null, mrcGrading: {}, musclesWeak: [], wasting: '', fasiculations: '' });
  const [sensoryAssessment, setSensoryAssessment] = useState({ applicable: null, distribution: '', lightTouch: '', pinprick: '', vibration: '', proprioception: '', twoPointDisc: '', temperature: '' });
  const [provocationTests, setProvocationTests] = useState({ applicable: null, tinelatWrist: '', phalen: '', durkan: '', tinelatElbow: '', elbowFlexion: '', tinelatFibular: '', lasegue: '', slump: '', femoral: '' });
  const [ncsData, setNcsData] = useState({ applicable: null, done: '', snapsMedian: '', snapUlnar: '', cmapMedian: '', cmapUlnar: '', cmapPeroneal: '', distalLatency: '', fWave: '', emgFindings: '', interpretation: '' });
  const [entrapmentSyndrome, setEntrapmentSyndrome] = useState({ applicable: null, syndrome: '', severity: '', conservative: [], surgical: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: [], icd10: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleMRC = (muscle, grade) => setMotorAssessment(p => ({ ...p, mrcGrading: { ...p.mrcGrading, [muscle]: grade } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'peripheral_nerve', patientId, encounterId, data: { basicInfo, motorAssessment, sensoryAssessment, provocationTests, ncsData, entrapmentSyndrome, diagnosisData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const mrcOptions = [0,1,2,3,4,5];
  const upperLimbMuscles = [['deltoid','Deltoid (C5 — axillary)'],['biceps','Biceps (C5/6 — musculocutaneous)'],['wrist_ext','Wrist extensors (C6/7 — radial)'],['triceps','Triceps (C7 — radial)'],['first_dors_int','1st DI (T1 — ulnar)'],['abp','APB (T1 — median — CTS)'],['fdi','FDI (T1 — ulnar)']];
  const lowerLimbMuscles = [['ilio','Iliopsoas (L1/2)'],['quad','Quadriceps (L3/4 — femoral)'],['ta','Tibialis anterior (L4 — peroneal)'],['ehl','EHL (L4/5 — peroneal)'],['gastroc','Gastrocnemius (S1 — tibial)'],['edb','EDB (L5/S1 — peroneal)']];

  const secCls = 'bg-white rounded-xl border border-lime-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-lime-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-lime-50 to-green-50 p-4">
      <div className="bg-gradient-to-r from-lime-600 to-green-600 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Peripheral Nerve Assessment</h1>
        <p className="text-lime-100 text-xs mt-0.5">MRC Motor Grading · Sensory Dermatomes · NCS/EMG · Entrapment Syndromes · Tinel's/Phalen's</p>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <Pills label="Nerve(s) Affected" multi options={[['median','Median nerve'],['ulnar','Ulnar nerve'],['radial','Radial nerve'],['axillary','Axillary nerve'],['brachial_plexus','Brachial plexus'],['femoral','Femoral nerve'],['sciatic','Sciatic nerve'],['peroneal','Common peroneal'],['tibial','Tibial nerve'],['sural','Sural nerve'],['multiple','Multiple/polyneuropathy']]} value={basicInfo.nerveAffected} onChange={v => setBasicInfo(p => ({...p, nerveAffected: v}))} color="lime"/>
        <div className="grid grid-cols-2 gap-2">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <FL label="Occupation"><Inp value={basicInfo.occupation} onChange={v => setBasicInfo(p => ({...p, occupation: v}))} placeholder="e.g. typist, construction, farmer"/></FL>
        </div>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. numbness/tingling, weakness, wasting, burning pain"/></FL>
      </div>

      {/* Motor Assessment (MRC) */}
      <div className={secCls}>
        <h2 className={h2Cls}>💪 Motor Assessment (MRC Scale)</h2>
        <Gate question="Is motor assessment applicable?" value={motorAssessment.applicable} onChange={v => setMotorAssessment(p => ({...p, applicable: v}))}>
          <div className="text-xs text-gray-500 mb-2">MRC: 0=No contraction, 1=Flicker, 2=Active gravity-eliminated, 3=Active against gravity, 4=Active against resistance (reduced), 5=Normal</div>
          <div className="text-xs font-semibold text-gray-600 mb-2">Upper Limb</div>
          {upperLimbMuscles.map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {mrcOptions.map(v => (
                  <button key={v} type="button" onClick={() => handleMRC(k, v)}
                    className={`w-7 h-6 rounded border text-xs font-medium transition-colors ${motorAssessment.mrcGrading[k] === v ? v <= 2 ? 'bg-red-500 text-white border-red-500' : v <= 4 ? 'bg-amber-500 text-white border-amber-500' : 'bg-green-500 text-white border-green-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="text-xs font-semibold text-gray-600 mt-3 mb-2">Lower Limb</div>
          {lowerLimbMuscles.map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between mb-1.5 pb-1 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {mrcOptions.map(v => (
                  <button key={v} type="button" onClick={() => handleMRC(k, v)}
                    className={`w-7 h-6 rounded border text-xs font-medium transition-colors ${motorAssessment.mrcGrading[k] === v ? v <= 2 ? 'bg-red-500 text-white border-red-500' : v <= 4 ? 'bg-amber-500 text-white border-amber-500' : 'bg-green-500 text-white border-green-500' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Pills label="Muscle Wasting" options={[['none','None'],['mild','Mild'],['moderate','Moderate'],['severe','Severe']]} value={motorAssessment.wasting} onChange={v => setMotorAssessment(p => ({...p, wasting: v}))} color={motorAssessment.wasting === 'severe' ? 'red' : 'lime'}/>
          <Pills label="Fasciculations" options={[['absent','Absent'],['present','Present — LMN/anterior horn']]} value={motorAssessment.fasiculations} onChange={v => setMotorAssessment(p => ({...p, fasiculations: v}))} color={motorAssessment.fasiculations === 'present' ? 'orange' : 'gray'}/>
        </Gate>
      </div>

      {/* Sensory Assessment */}
      <div className={secCls}>
        <h2 className={h2Cls}>✋ Sensory Assessment</h2>
        <Gate question="Is sensory assessment applicable?" value={sensoryAssessment.applicable} onChange={v => setSensoryAssessment(p => ({...p, applicable: v}))}>
          <FL label="Sensory Distribution"><Inp value={sensoryAssessment.distribution} onChange={v => setSensoryAssessment(p => ({...p, distribution: v}))} placeholder="e.g. median distribution (thumb/index/middle), glove, stocking"/></FL>
          <div className="grid grid-cols-2 gap-2">
            {[['lightTouch','Light touch'],['pinprick','Pin prick'],['vibration','Vibration (128Hz)'],['proprioception','Joint position sense'],['temperature','Temperature']].map(([k, lbl]) => (
              <Pills key={k} label={lbl} options={[['normal','Normal'],['reduced','Reduced'],['absent','Absent']]} value={sensoryAssessment[k]} onChange={v => setSensoryAssessment(p => ({...p, [k]: v}))} color={sensoryAssessment[k] === 'absent' ? 'red' : sensoryAssessment[k] === 'reduced' ? 'orange' : 'green'}/>
            ))}
            <FL label="2-Point Discrimination (mm)"><Inp type="number" value={sensoryAssessment.twoPointDisc} onChange={v => setSensoryAssessment(p => ({...p, twoPointDisc: v}))} placeholder="mm (normal <6mm fingertip)"/></FL>
          </div>
          {parseFloat(sensoryAssessment.twoPointDisc) > 10 && sensoryAssessment.twoPointDisc !== '' && <div className="text-xs text-orange-600 font-semibold">⚠ 2-point discrimination &gt;10mm — significant sensory dysfunction.</div>}
        </Gate>
      </div>

      {/* Provocation Tests */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Provocation Tests</h2>
        <Gate question="Are provocation tests applicable?" value={provocationTests.applicable} onChange={v => setProvocationTests(p => ({...p, applicable: v}))}>
          {[
            ['tinelatWrist', "Tinel's at wrist (CTS — median nerve)"],
            ['phalen', "Phalen's wrist flexion test (CTS)"],
            ['durkan', "Durkan compression test (CTS)"],
            ['tinelatElbow', "Tinel's at cubital tunnel (ulnar nerve)"],
            ['elbowFlexion', "Elbow flexion test 60s (cubital tunnel)"],
            ['tinelatFibular', "Tinel's at fibular head (peroneal nerve)"],
            ['lasegue', "Straight leg raise / Lasègue (sciatic nerve L4/5/S1)"],
            ['slump', "Slump test (lumbar radiculopathy)"],
            ['femoral', "Femoral nerve stretch (L2/3/4)"],
          ].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {['negative','positive','not_done'].map(v => (
                  <button key={v} type="button" onClick={() => setProvocationTests(p => ({...p, [k]: v}))}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${provocationTests[k] === v ? v === 'positive' ? 'bg-red-500 text-white border-red-500' : v === 'negative' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-300'}`}>
                    {v === 'not_done' ? 'N/D' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Gate>
      </div>

      {/* NCS/EMG */}
      <div className={secCls}>
        <h2 className={h2Cls}>⚡ Nerve Conduction Studies (NCS) / EMG</h2>
        <Gate question="Is NCS/EMG assessment applicable?" value={ncsData.applicable} onChange={v => setNcsData(p => ({...p, applicable: v}))}>
          <Pills label="NCS Done?" options={[['yes','Yes'],['no','Not done'],['pending','Pending']]} value={ncsData.done} onChange={v => setNcsData(p => ({...p, done: v}))} color="blue"/>
          {ncsData.done === 'yes' && <>
            <div className="grid grid-cols-2 gap-2">
              <FL label="SNAP — Median (µV)"><Inp type="number" value={ncsData.snapsMedian} onChange={v => setNcsData(p => ({...p, snapsMedian: v}))} placeholder="µV (normal >20)"/></FL>
              <FL label="SNAP — Ulnar (µV)"><Inp type="number" value={ncsData.snapUlnar} onChange={v => setNcsData(p => ({...p, snapUlnar: v}))} placeholder="µV"/></FL>
              <FL label="CMAP — Median (mV)"><Inp type="number" value={ncsData.cmapMedian} onChange={v => setNcsData(p => ({...p, cmapMedian: v}))} placeholder="mV"/></FL>
              <FL label="CMAP — Ulnar (mV)"><Inp type="number" value={ncsData.cmapUlnar} onChange={v => setNcsData(p => ({...p, cmapUlnar: v}))} placeholder="mV"/></FL>
              <FL label="Distal Motor Latency — Median (ms)"><Inp type="number" value={ncsData.distalLatency} onChange={v => setNcsData(p => ({...p, distalLatency: v}))} placeholder="ms (normal <4.2ms CTS cut-off)"/></FL>
              <FL label="CMAP — Peroneal (mV)"><Inp type="number" value={ncsData.cmapPeroneal} onChange={v => setNcsData(p => ({...p, cmapPeroneal: v}))} placeholder="mV"/></FL>
            </div>
            <FL label="EMG Findings"><Inp value={ncsData.emgFindings} onChange={v => setNcsData(p => ({...p, emgFindings: v}))} placeholder="fibrillations, positive sharp waves, denervation pattern, re-innervation"/></FL>
            <Pills label="NCS/EMG Interpretation" options={[['normal','Normal'],['mild_cts','Mild CTS — prolonged DML'],['moderate_cts','Moderate CTS — ↓SNAP amplitude'],['severe_cts','Severe CTS — absent SNAP'],['ulnar_cubital','Ulnar neuropathy at elbow'],['radiculopathy','Radiculopathy pattern'],['polyneuropathy','Polyneuropathy'],['axonopathy','Axonal degeneration']]} value={ncsData.interpretation} onChange={v => setNcsData(p => ({...p, interpretation: v}))} color="purple"/>
          </>}
          <div className="text-xs text-lime-700 bg-lime-50 rounded p-2 mt-1">India: NCS widely available in tier 1/2 cities. Referral network to neurology for complex polyneuropathy. Leprosy should be excluded (thickened nerve, hypopigmented patches).</div>
        </Gate>
      </div>

      {/* Entrapment Syndrome Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Entrapment Syndrome Management</h2>
        <Gate question="Is entrapment syndrome management applicable?" value={entrapmentSyndrome.applicable} onChange={v => setEntrapmentSyndrome(p => ({...p, applicable: v}))}>
          <Pills label="Primary Syndrome" options={[['cts','Carpal tunnel syndrome'],['cubital_tunnel','Cubital tunnel (ulnar)'],['pronator_teres','Pronator teres (AIN)'],['tarsal_tunnel','Tarsal tunnel (posterior tibial)'],['peroneal','Peroneal nerve entrapment'],['meralgia','Meralgia paraesthetica (lat cutaneous)'],['thoracic_outlet','Thoracic outlet syndrome'],['brachial_plexus','Brachial plexopathy']]} value={entrapmentSyndrome.syndrome} onChange={v => setEntrapmentSyndrome(p => ({...p, syndrome: v}))} color="lime"/>
          <Pills label="Severity" options={[['mild','Mild — sensory only'],['moderate','Moderate — sensory + weak'],['severe','Severe — wasting/axonal loss']]} value={entrapmentSyndrome.severity} onChange={v => setEntrapmentSyndrome(p => ({...p, severity: v}))} color={entrapmentSyndrome.severity === 'severe' ? 'red' : 'lime'}/>
          <Pills label="Conservative Management" multi options={[['splint','Wrist/elbow splint'],['activity_modification','Activity modification/ergonomics'],['steroid_injection','Corticosteroid injection'],['physio','Physiotherapy/neural mobilisation'],['vitamin_b6','Vit B6 (CTS — pregnancy)']]} value={entrapmentSyndrome.conservative} onChange={v => setEntrapmentSyndrome(p => ({...p, conservative: v}))} color="green"/>
          <Pills label="Surgical" options={[['not_indicated','Not indicated yet'],['carpal_tunnel_release','Carpal tunnel release'],['cubital_decompression','Cubital tunnel decompression'],['transposition','Ulnar nerve transposition'],['tarsal_release','Tarsal tunnel release'],['peroneal_decompression','Peroneal nerve decompression']]} value={entrapmentSyndrome.surgical} onChange={v => setEntrapmentSyndrome(p => ({...p, surgical: v}))} color="orange"/>
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" multi options={[['cts','Carpal tunnel syndrome'],['cubital_tunnel_syndrome','Cubital tunnel syndrome'],['radial_neuropathy','Radial nerve palsy (Saturday night palsy)'],['peroneal_palsy','Peroneal nerve palsy (foot drop)'],['brachial_plexopathy','Brachial plexopathy'],['polyneuropathy','Peripheral polyneuropathy'],['leprosy_nerve','Leprous neuropathy'],['meralgia','Meralgia paraesthetica'],['tarsal_tunnel','Tarsal tunnel syndrome']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="lime"/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. G54.2 (brachial plexopathy), G57.3 (peroneal neuropathy)"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-14 focus:outline-none focus:ring-2 focus:ring-lime-500"/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-lime-600 to-green-500 text-white rounded-xl font-semibold text-sm shadow hover:from-lime-700 hover:to-green-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
