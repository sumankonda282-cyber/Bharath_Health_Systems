/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

const CM = { teal: 'bg-teal-100 text-teal-800 border-teal-300 data-[sel=true]:bg-teal-600 data-[sel=true]:text-white data-[sel=true]:border-teal-600', red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500', orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500', blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500', green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500', gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500', purple: 'bg-purple-100 text-purple-800 border-purple-300 data-[sel=true]:bg-purple-500 data-[sel=true]:text-white data-[sel=true]:border-purple-500' };
function Pills({ label, options, value, onChange, multi = false, color = 'teal' }) {
  const cls = CM[color] || CM.teal;
  const isSel = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const click = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else onChange(value === v ? '' : v); };
  return (<div className="mb-3">{label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}<div className="flex flex-wrap gap-1.5">{options.map(opt => { const [v, l] = Array.isArray(opt) ? opt : [opt, opt]; return <button key={v} type="button" data-sel={isSel(v)} onClick={() => click(v)} className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{l}</button>; })}</div></div>);
}
function FL({ label, sub, children }) { return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>; }
function Gate({ question, value, onChange, children }) {
  return (<div><div className="flex items-center gap-3 mb-3"><span className="text-sm font-medium text-gray-700">{question}</span>{['yes','no'].map(v => <button key={v} type="button" onClick={() => onChange(value === v ? null : v)} className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-teal-600 text-white border-teal-600' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300'}`}>{v === 'yes' ? 'Yes' : 'No'}</button>)}</div>{value === 'yes' && <div className="border-l-2 border-teal-400 pl-3">{children}</div>}{value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}</div>);
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) { return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"/>; }

export default function OrthoticProstheticAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ serviceType: '', side: '', level: '', cause: '', duration: '', occupation: '', activityGoal: '' });
  const [stumpAssessment, setStumpAssessment] = useState({ applicable: null, length: '', shape: '', skin: '', oedema: '', scar: '', contracture: [], neuroma: '', phantomPain: '', phantomSensation: '', residualLimbStrength: '', contralateralLimb: '' });
  const [kLevel, setKLevel] = useState({ applicable: null, level: '', recommendation: '' });
  const [prostheticAssessment, setProstheticAssessment] = useState({ applicable: null, currentProsthesis: '', socketFit: '', socketMaterial: '', suspensionSystem: '', footKneeComponent: '', gaitAbnormalities: [], alignmentIssues: [], dailyUsage: '', satisfaction: '' });
  const [orthoticAssessment, setOrthoticAssessment] = useState({ applicable: null, deviceType: '', indication: '', fitting: '', materialUsed: '', wearCompliance: '', issues: [] });
  const [rehabilitationData, setRehabilitationData] = useState({ applicable: null, phase: '', mobilityAid: '', gaitTraining: '', adlStatus: '', communityMobility: '', vocationalRehab: '', barriers: [] });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', icd10: '', recommendation: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── K-level description ───────────────────────────────────────────────────────
  const kLevelDesc = useMemo(() => {
    const desc = { K0: 'Not a candidate for prosthesis — no ambulation potential', K1: 'Household ambulator — limited to level surfaces', K2: 'Limited community ambulator — some uneven surfaces', K3: 'Community ambulator — variable cadence, most surfaces', K4: 'Active adult/athlete — high impact activities' };
    return kLevel.level ? { desc: desc[kLevel.level], color: kLevel.level === 'K4' ? 'text-green-600' : kLevel.level === 'K0' ? 'text-red-600' : 'text-teal-600' } : null;
  }, [kLevel.level]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'orthotic_prosthetic', patientId, encounterId, data: { basicInfo, stumpAssessment, kLevel, kLevelDesc, prostheticAssessment, orthoticAssessment, rehabilitationData, diagnosisData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-teal-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-teal-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      <div className="bg-gradient-to-r from-teal-700 to-cyan-600 rounded-xl p-4 mb-4 text-white shadow">
        <h1 className="text-lg font-bold">Orthotic & Prosthetic Assessment</h1>
        <p className="text-teal-100 text-xs mt-0.5">Amputee Stump Assessment · K-Level Classification · AFO/KAFO · Prosthetic Fit & Gait</p>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <Pills label="Service Type" options={[['prosthetic','Prosthetic (amputation)'],['orthotic','Orthotic (splint/brace)'],['both','Both prosthetic + orthotic']]} value={basicInfo.serviceType} onChange={v => setBasicInfo(p => ({...p, serviceType: v}))} color="teal"/>
        {(basicInfo.serviceType === 'prosthetic' || basicInfo.serviceType === 'both') && <>
          <Pills label="Amputation Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <Pills label="Amputation Level" options={[['transphalangeal','Transphalangeal'],['transmetatarsal','Transmetatarsal'],['symes','Syme\'s (ankle disarticulation)'],['bka','Below knee (transtibial)'],['knee_disarticulation','Knee disarticulation'],['aka','Above knee (transfemoral)'],['hip_disarticulation','Hip disarticulation'],['hemipelvectomy','Hemipelvectomy'],['transradial','Transradial (below elbow)'],['elbow_disarticulation','Elbow disarticulation'],['transhumeral','Transhumeral (above elbow)'],['shoulder_disarticulation','Shoulder disarticulation']]} value={basicInfo.level} onChange={v => setBasicInfo(p => ({...p, level: v}))} color="teal"/>
          <Pills label="Cause of Amputation" options={[['diabetes','Diabetes mellitus (most common in India)'],['pvd','Peripheral vascular disease'],['trauma','Trauma/RTA'],['tumor','Tumor'],['infection','Infection (gas gangrene)'],['congenital','Congenital'],['leprosy','Leprosy (neuropathic)']]} value={basicInfo.cause} onChange={v => setBasicInfo(p => ({...p, cause: v}))} color="orange"/>
          {basicInfo.cause === 'diabetes' && <div className="text-xs text-orange-600 bg-orange-50 rounded p-2 mb-2">India: DM amputation predominantly affects lower limb. PM-JAY covers prosthetic limb in some state schemes. ALIMCO (Artificial Limbs Manufacturing Corp) — government prosthetics at subsidised cost.</div>}
        </>}
        <FL label="Activity Goal"><Inp value={basicInfo.activityGoal} onChange={v => setBasicInfo(p => ({...p, activityGoal: v}))} placeholder="e.g. household ambulation, return to work, sports"/></FL>
      </div>

      {/* Stump Assessment */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦵 Residual Limb (Stump) Assessment</h2>
        <Gate question="Is residual limb assessment applicable?" value={stumpAssessment.applicable} onChange={v => setStumpAssessment(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-3 gap-2">
            <FL label="Residual Limb Length (cm)"><Inp type="number" value={stumpAssessment.length} onChange={v => setStumpAssessment(p => ({...p, length: v}))} placeholder="cm"/></FL>
          </div>
          <Pills label="Shape" options={[['cylindrical','Cylindrical (ideal)'],['conical','Conical'],['bulbous','Bulbous (socket problem)'],['irregular','Irregular']]} value={stumpAssessment.shape} onChange={v => setStumpAssessment(p => ({...p, shape: v}))} color={stumpAssessment.shape === 'cylindrical' ? 'green' : 'orange'}/>
          <Pills label="Skin Condition" options={[['intact','Intact — healthy'],['dry_scaly','Dry/scaly'],['ulcerated','Ulcerated'],['blistered','Blistered'],['callus','Callus formation'],['dermatitis','Contact dermatitis'],['hyperhidrosis','Hyperhidrosis']]} value={stumpAssessment.skin} onChange={v => setStumpAssessment(p => ({...p, skin: v}))} color={stumpAssessment.skin === 'ulcerated' ? 'red' : 'teal'}/>
          <Pills label="Oedema" options={[['none','None'],['mild','Mild'],['moderate','Moderate (↓socket tolerance)'],['severe','Severe']]} value={stumpAssessment.oedema} onChange={v => setStumpAssessment(p => ({...p, oedema: v}))} color={stumpAssessment.oedema === 'severe' ? 'red' : 'teal'}/>
          <Pills label="Scar" options={[['none_ok','None/well-healed'],['immature','Immature — healing'],['adherent','Adherent (socket fitting problem)'],['keloid','Keloid/hypertrophic (India common)'],['painful','Painful scar']]} value={stumpAssessment.scar} onChange={v => setStumpAssessment(p => ({...p, scar: v}))} color={stumpAssessment.scar === 'adherent' || stumpAssessment.scar === 'painful' ? 'orange' : 'teal'}/>
          <Pills label="Contracture(s)" multi options={[['none','None'],['hip_flexion','Hip flexion'],['hip_abduction','Hip abduction'],['knee_flexion','Knee flexion'],['equinus','Equinus']]} value={stumpAssessment.contracture} onChange={v => setStumpAssessment(p => ({...p, contracture: v}))} color={stumpAssessment.contracture?.filter(x => x !== 'none').length > 0 ? 'orange' : 'gray'}/>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Neuroma" options={[['absent','Absent'],['symptomatic','Symptomatic neuroma']]} value={stumpAssessment.neuroma} onChange={v => setStumpAssessment(p => ({...p, neuroma: v}))} color={stumpAssessment.neuroma === 'symptomatic' ? 'orange' : 'gray'}/>
            <Pills label="Phantom Limb Pain" options={[['none','None'],['mild','Mild'],['moderate','Moderate'],['severe','Severe — affecting quality of life']]} value={stumpAssessment.phantomPain} onChange={v => setStumpAssessment(p => ({...p, phantomPain: v}))} color={stumpAssessment.phantomPain === 'severe' ? 'red' : 'teal'}/>
          </div>
          <FL label="Contralateral Limb Status"><Inp value={stumpAssessment.contralateralLimb} onChange={v => setStumpAssessment(p => ({...p, contralateralLimb: v}))} placeholder="e.g. normal, PVD, neuropathy, previous amputation"/></FL>
        </Gate>
      </div>

      {/* K-Level */}
      <div className={secCls}>
        <h2 className={h2Cls}>🏃 K-Level Classification (Prosthetic Candidacy)</h2>
        <Gate question="Is K-level assessment applicable?" value={kLevel.applicable} onChange={v => setKLevel(p => ({...p, applicable: v}))}>
          {kLevelDesc && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mb-3">
              <div className={`text-sm font-semibold ${kLevelDesc.color}`}>{kLevel.level} — {kLevelDesc.desc}</div>
            </div>
          )}
          <Pills label="K-Level" options={[['K0','K0 — No functional potential'],['K1','K1 — Household (level surfaces)'],['K2','K2 — Limited community'],['K3','K3 — Community ambulator (variable cadence)'],['K4','K4 — High activity / sports']]} value={kLevel.level} onChange={v => setKLevel(p => ({...p, level: v}))} color="teal"/>
          {kLevel.level === 'K0' && <div className="text-xs text-red-600 font-semibold mt-1">K0: Prosthesis not indicated. Focus on wheelchair mobility and ADL independence.</div>}
        </Gate>
      </div>

      {/* Prosthetic Assessment */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦾 Prosthetic Assessment</h2>
        <Gate question="Is prosthetic assessment applicable?" value={prostheticAssessment.applicable} onChange={v => setProstheticAssessment(p => ({...p, applicable: v}))}>
          <Pills label="Current Prosthesis" options={[['none','No prosthesis — new patient'],['provisional','Provisional/preparatory'],['definitive','Definitive prosthesis'],['replacement','Replacement of existing']]} value={prostheticAssessment.currentProsthesis} onChange={v => setProstheticAssessment(p => ({...p, currentProsthesis: v}))}/>
          {prostheticAssessment.currentProsthesis !== 'none' && prostheticAssessment.currentProsthesis && <>
            <Pills label="Socket Fit" options={[['good','Good — no pistoning, no pain'],['loose','Loose — pistoning present'],['tight','Too tight — skin pressure areas'],['poor','Poor — needs refitting']]} value={prostheticAssessment.socketFit} onChange={v => setProstheticAssessment(p => ({...p, socketFit: v}))} color={prostheticAssessment.socketFit === 'poor' ? 'red' : prostheticAssessment.socketFit === 'good' ? 'green' : 'orange'}/>
            <Pills label="Socket Material" options={[['plaster_pylon','Plaster/pylon (ALIMCO)'],['polypropylene','Polypropylene (conventional)'],['cad_cam','CAD-CAM thermoplastic'],['carbon_fibre','Carbon fibre (high-end)'],['silicone_liner','Silicone liner + rigid socket']]} value={prostheticAssessment.socketMaterial} onChange={v => setProstheticAssessment(p => ({...p, socketMaterial: v}))} color="teal"/>
            <Pills label="Suspension System" options={[['suction','Suction/lanyard'],['pin_lock','Pin lock'],['sleeve','Sleeve suspension'],['harness','Harness (UL)'],['total_surface_bearing','Total surface bearing']]} value={prostheticAssessment.suspensionSystem} onChange={v => setProstheticAssessment(p => ({...p, suspensionSystem: v}))}/>
            <Pills label="Foot/Knee Component" options={[['sach_foot','SACH foot (K1/K2, low cost)'],['dynamic_response','Dynamic response foot (K2/K3)'],['hydraulic_ankle','Hydraulic ankle (K3/K4)'],['mechanical_knee','Mechanical knee (AKA)'],['hydraulic_knee','Hydraulic/microprocessor knee (K3/K4)'],['myoelectric_hand','Myoelectric hand (UL)'],['body_powered','Body-powered hook/hand (UL)']]} value={prostheticAssessment.footKneeComponent} onChange={v => setProstheticAssessment(p => ({...p, footKneeComponent: v}))} color="teal"/>
            <Pills label="Gait Abnormalities" multi options={[['none','None — good gait pattern'],['lateral_trunk_bending','Lateral trunk bending'],['vaulting','Vaulting'],['circumduction','Circumduction'],['toe_drag','Toe drag'],['pistoning','Pistoning'],['excessive_knee_flexion','Excessive knee flexion'],['foot_slap','Foot slap']]} value={prostheticAssessment.gaitAbnormalities} onChange={v => setProstheticAssessment(p => ({...p, gaitAbnormalities: v}))} color="orange"/>
          </>}
          <FL label="Daily Hours of Prosthesis Use"><Inp type="number" value={prostheticAssessment.dailyUsage} onChange={v => setProstheticAssessment(p => ({...p, dailyUsage: v}))} placeholder="hours/day"/></FL>
          <Pills label="Patient Satisfaction" options={[['very_satisfied','Very satisfied'],['satisfied','Satisfied'],['dissatisfied','Dissatisfied'],['very_dissatisfied','Very dissatisfied']]} value={prostheticAssessment.satisfaction} onChange={v => setProstheticAssessment(p => ({...p, satisfaction: v}))} color={prostheticAssessment.satisfaction?.includes('dissatisfied') ? 'red' : 'green'}/>
        </Gate>
      </div>

      {/* Orthotic Assessment */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦺 Orthotic Assessment</h2>
        <Gate question="Is orthotic assessment applicable?" value={orthoticAssessment.applicable} onChange={v => setOrthoticAssessment(p => ({...p, applicable: v}))}>
          <Pills label="Device Type" options={[['afo','AFO (Ankle-Foot Orthosis)'],['kafo','KAFO (Knee-Ankle-Foot)'],['hkafo','HKAFO (Hip-Knee-Ankle-Foot)'],['knee_orthosis','Knee orthosis (KO)'],['wrist_hand','Wrist-Hand Orthosis (WHO)'],['elbow_orthosis','Elbow orthosis'],['spinal_tlso','Spinal TLSO (scoliosis/fracture)'],['cervical_collar','Cervical collar'],['insole','Foot insole/orthotics'],['hand_splint','Hand resting/functional splint']]} value={orthoticAssessment.deviceType} onChange={v => setOrthoticAssessment(p => ({...p, deviceType: v}))} color="teal"/>
          <Pills label="Indication" options={[['foot_drop','Foot drop — AFO'],['scoliosis','Scoliosis — TLSO'],['spasticity','Spasticity control'],['fracture_stabilisation','Fracture stabilisation'],['oa_unloading','OA unloading (KO)'],['neuropathic_foot','Neuropathic foot (DM)'],['instability','Joint instability'],['post_op','Post-operative protection']]} value={orthoticAssessment.indication} onChange={v => setOrthoticAssessment(p => ({...p, indication: v}))} color="blue"/>
          <Pills label="Fitting" options={[['good','Good fit'],['pressure_areas','Pressure areas noted'],['poor_alignment','Poor alignment'],['needs_modification','Needs modification']]} value={orthoticAssessment.fitting} onChange={v => setOrthoticAssessment(p => ({...p, fitting: v}))} color={orthoticAssessment.fitting === 'good' ? 'green' : 'orange'}/>
          <Pills label="Material" options={[['polypropylene','Polypropylene (standard)'],['carbon_fibre','Carbon fibre (lightweight)'],['metal_leather','Metal + leather (traditional)'],['thermoplastic','Custom thermoplastic'],['prefabricated','Prefabricated (off-shelf)']]} value={orthoticAssessment.materialUsed} onChange={v => setOrthoticAssessment(p => ({...p, materialUsed: v}))}/>
          <Pills label="Wear Compliance" options={[['full_compliance','Full compliance'],['partial','Partial — wearing sometimes'],['non_compliant','Non-compliant — not wearing']]} value={orthoticAssessment.wearCompliance} onChange={v => setOrthoticAssessment(p => ({...p, wearCompliance: v}))} color={orthoticAssessment.wearCompliance === 'non_compliant' ? 'red' : 'green'}/>
          <Pills label="Problems Reported" multi options={[['none','None'],['skin_irritation','Skin irritation'],['pain','Pain at pressure points'],['too_heavy','Too heavy'],['cosmetically_unacceptable','Cosmetically unacceptable'],['functional_restriction','Functional restriction'],['difficulty_donning','Difficult to put on/off']]} value={orthoticAssessment.issues} onChange={v => setOrthoticAssessment(p => ({...p, issues: v}))} color="orange"/>
          <div className="text-xs text-teal-700 bg-teal-50 rounded p-2 mt-1">India: ALIMCO provides subsidised orthoses under ADIP scheme. Jaipur foot — widely available custom prosthetic foot suited for squatting activities. NGOs: BMVSS, Enable India.</div>
        </Gate>
      </div>

      {/* Rehabilitation */}
      <div className={secCls}>
        <h2 className={h2Cls}>🏋️ Rehabilitation Status</h2>
        <Gate question="Is rehabilitation assessment applicable?" value={rehabilitationData.applicable} onChange={v => setRehabilitationData(p => ({...p, applicable: v}))}>
          <Pills label="Rehabilitation Phase" options={[['pre_prosthetic','Pre-prosthetic — stump maturation'],['initial_fitting','Initial prosthetic fitting'],['gait_training','Gait training'],['community_integration','Community re-integration'],['maintenance','Maintenance programme'],['vocational','Vocational rehabilitation']]} value={rehabilitationData.phase} onChange={v => setRehabilitationData(p => ({...p, phase: v}))} color="teal"/>
          <Pills label="Current Mobility Aid" options={[['prosthesis_only','Prosthesis only'],['crutches_walker','Crutches/walker'],['wheelchair','Wheelchair'],['combination','Combination']]} value={rehabilitationData.mobilityAid} onChange={v => setRehabilitationData(p => ({...p, mobilityAid: v}))}/>
          <Pills label="Community Mobility" options={[['household_only','Household only'],['limited_community','Limited community'],['unlimited_community','Unlimited community'],['no_mobility','No independent mobility']]} value={rehabilitationData.communityMobility} onChange={v => setRehabilitationData(p => ({...p, communityMobility: v}))} color={rehabilitationData.communityMobility === 'unlimited_community' ? 'green' : 'teal'}/>
          <Pills label="Barriers to Rehabilitation" multi options={[['financial','Financial constraints'],['transport','Transport to rehab centre'],['family_support','Poor family support'],['pain_phantom','Phantom pain limiting use'],['comorbidities','Comorbidities (DM, CVD)'],['motivation','Poor motivation'],['prosthesis_access','Prosthesis unavailable/broken']]} value={rehabilitationData.barriers} onChange={v => setRehabilitationData(p => ({...p, barriers: v}))} color="red"/>
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Summary & Recommendations</h2>
        <Gate question="Is summary documentation applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Clinical Code" options={[['unilateral_bka_prosthesis','Unilateral BKA — prosthetic user'],['unilateral_aka_prosthesis','Unilateral AKA — prosthetic user'],['bilateral_amputation','Bilateral amputee'],['upper_limb_amputation','Upper limb amputee'],['foot_drop_afo','Foot drop — AFO user'],['scoliosis_tlso','Scoliosis — TLSO'],['neuropathic_foot_orthosis','Neuropathic foot — orthosis'],['post_op_orthosis','Post-operative orthosis']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="teal"/>
          <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. Z89.5 (AKA), Z89.4 (BKA), Q66 (clubfoot)"/></FL>
          <FL label="Recommendation"><Inp value={diagnosisData.recommendation} onChange={v => setDiagnosisData(p => ({...p, recommendation: v}))} placeholder="e.g. Refit socket, refer to prosthetist, upgrade to dynamic foot, pain clinic for phantom pain"/></FL>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="Financial situation, ALIMCO/ADIP scheme application, Jaipur foot suitability, NGO referral..."/></FL>
        </Gate>
      </div>

      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold text-sm shadow hover:from-teal-700 hover:to-cyan-700 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
