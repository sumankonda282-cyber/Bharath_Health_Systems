/** @shared-pool */
import React, { useState, useMemo } from 'react';
import api from '../../../api/client';

// ─── Foot & Ankle Anatomy SVG (medial lateral view) ─────────────────────────
function FootAnkleSVG({ highlights = [] }) {
  const hi = (s) => highlights.includes(s);
  return (
    <svg viewBox="0 0 300 190" className="w-full max-w-xs mx-auto" role="img" aria-label="Foot and ankle anatomy">
      <text x="150" y="12" textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="bold">Foot & Ankle — Medial View</text>
      {/* Tibia */}
      <rect x="120" y="16" width="34" height="70" rx="6" fill="#f5edd8" stroke="#a0845c" strokeWidth="1.5"/>
      {/* Fibula (behind) */}
      <rect x="158" y="20" width="16" height="62" rx="5" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
      {/* Ankle mortise / talus */}
      <ellipse cx="137" cy="92" rx="26" ry="18"
        fill={hi('talus') ? '#fef08a' : '#fef3c7'}
        stroke={hi('talus') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('talus') ? 2.5 : 1.5}/>
      {/* Calcaneus */}
      <path d="M94,108 Q84,115 82,125 Q80,140 92,148 Q108,155 130,152 Q148,150 160,145 L156,105 Q140,108 120,108 Z"
        fill={hi('calcaneus') ? '#fef08a' : '#fef3c7'}
        stroke={hi('calcaneus') ? '#f59e0b' : '#a0845c'} strokeWidth={hi('calcaneus') ? 2.5 : 1.5}/>
      {/* Achilles tendon */}
      <path d="M128,85 Q122,92 115,105 Q110,118 108,132"
        stroke={hi('achilles') ? '#ef4444' : '#c0a060'} strokeWidth={hi('achilles') ? 4 : 3} fill="none" strokeLinecap="round"/>
      {/* Navicular */}
      <ellipse cx="175" cy="118" rx="16" ry="11" fill="#ede0c8" stroke="#a0845c" strokeWidth="1.2"/>
      {/* Cuboid */}
      <rect x="192" y="120" width="20" height="20" rx="4" fill="#e8d4b8" stroke="#a0845c" strokeWidth="1"/>
      {/* Cuneiforms (medial) */}
      <rect x="187" y="112" width="16" height="14" rx="3" fill="#ede0c8" stroke="#a0845c" strokeWidth="1"/>
      {/* Metatarsals simplified */}
      <path d="M200,115 Q230,118 260,120" stroke="#a0845c" strokeWidth="3" fill="none"/>
      <path d="M202,124 Q230,128 258,130" stroke="#a0845c" strokeWidth="2.5" fill="none"/>
      <path d="M200,132 Q226,136 252,140" stroke="#a0845c" strokeWidth="2.5" fill="none"/>
      {/* 1st MTP joint */}
      <circle cx="262" cy="120" r="8"
        fill={hi('hallux') ? '#fca5a5' : '#fef3c7'}
        stroke={hi('hallux') ? '#ef4444' : '#a0845c'} strokeWidth={hi('hallux') ? 2.5 : 1.2}/>
      {/* Plantar fascia */}
      <path d="M108,148 Q140,158 200,150 Q228,146 250,134"
        stroke={hi('plantar_fascia') ? '#ef4444' : '#b08aca'} strokeWidth={hi('plantar_fascia') ? 3 : 1.5}
        fill="none" strokeDasharray={hi('plantar_fascia') ? '0' : '4 2'}/>
      {/* ATFL (anterior talofibular) */}
      <line x1="163" y1="87" x2="152" y2="97"
        stroke={hi('atfl') ? '#3b82f6' : '#94a3b8'} strokeWidth={hi('atfl') ? 3 : 1.5}
        strokeDasharray={hi('atfl') ? '0' : '3 2'}/>
      {/* CFL (calcaneofibular) */}
      <line x1="168" y1="98" x2="150" y2="118"
        stroke={hi('cfl') ? '#3b82f6' : '#94a3b8'} strokeWidth={hi('cfl') ? 3 : 1.5}
        strokeDasharray={hi('cfl') ? '0' : '3 2'}/>

      {/* Labels */}
      <text x="137" y="147" textAnchor="middle" fontSize="7" fill="#6b4c2a">Calcaneus</text>
      <text x="137" y="89" textAnchor="middle" fontSize="7" fill="#6b4c2a">Talus</text>
      <text x="104" y="104" textAnchor="middle" fontSize="7" fill={hi('achilles') ? '#ef4444' : '#6b7280'}>Achilles</text>
      <text x="265" y="136" textAnchor="middle" fontSize="7" fill="#6b4c2a">1st MTP</text>

      {/* Legend */}
      <line x1="8" y1="175" x2="22" y2="175" stroke="#c0a060" strokeWidth="2.5"/>
      <text x="26" y="178" fontSize="7" fill="#6b7280">Achilles</text>
      <line x1="78" y1="175" x2="92" y2="175" stroke="#b08aca" strokeWidth="1.5" strokeDasharray="4 2"/>
      <text x="96" y="178" fontSize="7" fill="#6b7280">Plantar fascia</text>
      <line x1="172" y1="175" x2="186" y2="175" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 2"/>
      <text x="190" y="178" fontSize="7" fill="#6b7280">ATFL/CFL</text>
    </svg>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────
const COLOR_MAP = {
  teal: 'bg-teal-100 text-teal-800 border-teal-300 data-[sel=true]:bg-teal-500 data-[sel=true]:text-white data-[sel=true]:border-teal-500',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-300 data-[sel=true]:bg-cyan-500 data-[sel=true]:text-white data-[sel=true]:border-cyan-500',
  red: 'bg-red-100 text-red-800 border-red-300 data-[sel=true]:bg-red-500 data-[sel=true]:text-white data-[sel=true]:border-red-500',
  orange: 'bg-orange-100 text-orange-800 border-orange-300 data-[sel=true]:bg-orange-500 data-[sel=true]:text-white data-[sel=true]:border-orange-500',
  blue: 'bg-blue-100 text-blue-800 border-blue-300 data-[sel=true]:bg-blue-500 data-[sel=true]:text-white data-[sel=true]:border-blue-500',
  green: 'bg-green-100 text-green-800 border-green-300 data-[sel=true]:bg-green-500 data-[sel=true]:text-white data-[sel=true]:border-green-500',
  gray: 'bg-gray-100 text-gray-700 border-gray-300 data-[sel=true]:bg-gray-500 data-[sel=true]:text-white data-[sel=true]:border-gray-500',
};
function Pills({ label, options, value, onChange, multi = false, color = 'teal' }) {
  const cls = COLOR_MAP[color] || COLOR_MAP.teal;
  const isSelected = (v) => multi ? (Array.isArray(value) ? value.includes(v) : false) : value === v;
  const handleClick = (v) => { if (multi) { const a = Array.isArray(value) ? value : []; onChange(a.includes(v) ? a.filter(x => x !== v) : [...a, v]); } else { onChange(value === v ? '' : v); } };
  return (
    <div className="mb-3">
      {label && <div className="text-xs font-medium text-gray-600 mb-1">{label}</div>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => { const [v, lbl] = Array.isArray(opt) ? opt : [opt, opt]; return (
          <button key={v} type="button" data-sel={isSelected(v)} onClick={() => handleClick(v)}
            className={`px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${cls}`}>{lbl}</button>
        ); })}
      </div>
    </div>
  );
}
function FL({ label, sub, children }) {
  return <div className="mb-3"><label className="block text-xs font-medium text-gray-600 mb-1">{label}{sub && <span className="text-gray-400 font-normal ml-1">{sub}</span>}</label>{children}</div>;
}
function Gate({ question, value, onChange, children }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium text-gray-700">{question}</span>
        {['yes','no'].map(v => (
          <button key={v} type="button" onClick={() => onChange(value === v ? null : v)}
            className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${value === v ? v === 'yes' ? 'bg-teal-500 text-white border-teal-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'}`}>
            {v === 'yes' ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
      {value === 'yes' && <div className="border-l-2 border-teal-300 pl-3">{children}</div>}
      {value === 'no' && <div className="flex items-center gap-2 text-xs text-gray-400 italic py-1"><span>🔒</span><span>Not applicable — section locked</span></div>}
    </div>
  );
}
function Inp({ value, onChange, type = 'text', placeholder = '' }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"/>;
}
function ScoreRow({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-start gap-2 mb-2 py-1 border-b border-gray-100">
      <div className="w-40 text-xs text-gray-600 shrink-0 pt-1">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, lbl, pts]) => (
          <button key={v} type="button" onClick={() => onChange(value === v ? '' : v)}
            className={`px-2 py-0.5 rounded border text-xs transition-colors ${value === v ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'}`}>
            {lbl}<span className="ml-1 opacity-60">({pts})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrthopedicFootAnkleAssessmentForm({ patientId, encounterId }) {
  const [basicInfo, setBasicInfo] = useState({ side: '', chiefComplaint: '', onset: '', duration: '', mechanism: '' });
  const [physExam, setPhysExam] = useState({ applicable: null, gait: '', antalgia: '', ankleDorsiflexion: '', anklePlantarflexion: '', inversion: '', eversion: '', subtalar: '', toeExtension: '', toeFlexion: '', swelling: '', tenderness: [], deformity: [] });
  const [specialTests, setSpecialTests] = useState({ applicable: null, anteriorDrawer: '', talarTilt: '', thompsonTest: '', simmonds: '', silverskoild: '', singleHeelRaise: '', jackTest: '', mulder: '', tinelatFoot: '' });
  const [aofasData, setAofasData] = useState({ applicable: null, pain: '', activityLimitation: '', walkingDistance: '', walkingSurfaces: '', gaitAbnormality: '', sagittalMotion: '', subtalarMotion: '', hindFootMotion: '', stability: '', alignment: '' });
  const [achillesData, setAchillesData] = useState({ applicable: null, location: '', type: '', tendonThickness: '', thompson: '', rupture: '', kager: '', insertional: '', management: '' });
  const [ankleSprainData, setAnkleSprainData] = useState({ applicable: null, ottawaAnkle: '', grade: '', ligamentsTorn: [], swelling: '', ecchymosis: '', weightBearing: '', mri: '' });
  const [halluxData, setHalluxData] = useState({ applicable: null, hvAngle: '', imaAngle: '', sesamoid: '', arthritis: '', mobMtp: '', grade: '' });
  const [flatFootData, setFlatFootData] = useState({ applicable: null, type: '', arch: '', rearfoot: '', tooManyToes: '', singeLegRaise: '', stage: '' });
  const [imagingData, setImagingData] = useState({ applicable: null, xrayDone: '', xrayFindings: '', mriDone: '', mriAchilles: '', mriLigament: '', ussDone: '', ussFindings: '' });
  const [diagnosisData, setDiagnosisData] = useState({ applicable: null, primaryDx: '', icd10: '', notes: '' });
  const [managementData, setManagementData] = useState({ applicable: null, conservative: [], medications: '', physiotherapy: '', orthosis: '', injection: '', surgical: '', followUp: '', notes: '' });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── AOFAS Score ──────────────────────────────────────────────────────────────
  const aofasScore = useMemo(() => {
    if (aofasData.applicable !== 'yes') return null;
    const painPts = { none: 40, mild: 30, moderate: 20, severe: 0 }[aofasData.pain] ?? null;
    if (painPts === null) return null;
    const actPts = { no_limit: 10, daily_no_rec: 7, daily_limit: 4, severe_limit: 0 }[aofasData.activityLimitation] ?? 0;
    const distPts = { gt6: 5, four_six: 4, one_three: 2, lt1: 0 }[aofasData.walkingDistance] ?? 0;
    const surfPts = { no_diff: 5, some: 3, severe: 0 }[aofasData.walkingSurfaces] ?? 0;
    const gaitPts = { normal: 8, obvious: 4, marked: 0 }[aofasData.gaitAbnormality] ?? 0;
    const sagPts = { normal_30: 8, mild_15: 4, severe_lt15: 0 }[aofasData.sagittalMotion] ?? 0;
    const subPts = { normal: 6, mild: 3, marked: 0 }[aofasData.subtalarMotion] ?? 0;
    const hindPts = { normal: 6, mild: 3, marked: 0 }[aofasData.hindFootMotion] ?? 0;
    const stabPts = { stable: 8, unstable: 0 }[aofasData.stability] ?? 0;
    const alignPts = { good: 10, fair: 5, poor: 0 }[aofasData.alignment] ?? 0;
    const total = painPts + actPts + distPts + surfPts + gaitPts + sagPts + subPts + hindPts + stabPts + alignPts;
    const interp = total >= 90 ? 'Excellent' : total >= 75 ? 'Good' : total >= 50 ? 'Fair' : 'Poor';
    const interpColor = total >= 90 ? 'text-green-600' : total >= 75 ? 'text-blue-600' : total >= 50 ? 'text-amber-600' : 'text-red-600';
    return { total, interp, interpColor };
  }, [aofasData]);

  // ── SVG highlights ─────────────────────────────────────────────────────────
  const svgHighlights = useMemo(() => {
    const h = [];
    if (achillesData.applicable === 'yes' && achillesData.type) h.push('achilles');
    if (flatFootData.applicable === 'yes') h.push('calcaneus');
    if (ankleSprainData.applicable === 'yes' && ankleSprainData.ligamentsTorn?.length) { h.push('atfl'); if (ankleSprainData.ligamentsTorn.includes('cfl')) h.push('cfl'); }
    if (halluxData.applicable === 'yes') h.push('hallux');
    if (specialTests.applicable === 'yes' && specialTests.tinelatFoot === 'positive') h.push('plantar_fascia');
    return h;
  }, [achillesData, flatFootData, ankleSprainData, halluxData, specialTests]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/assessments', { type: 'orthopedic_foot_ankle', patientId, encounterId, data: { basicInfo, physExam, specialTests, aofasData, aofasScore, achillesData, ankleSprainData, halluxData, flatFootData, imagingData, diagnosisData, managementData } });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const secCls = 'bg-white rounded-xl border border-teal-100 shadow-sm p-4 mb-4';
  const h2Cls = 'text-sm font-semibold text-teal-800 mb-3 flex items-center gap-2';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-xl p-4 mb-4 text-white shadow">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h1 className="text-lg font-bold">Orthopedic Foot & Ankle Assessment</h1>
            <p className="text-teal-100 text-xs mt-0.5">AOFAS Score · Achilles · Ankle Instability · Hallux Valgus · Plantar Fasciitis</p>
          </div>
          <div className="w-44 bg-white/10 rounded-lg p-1">
            <FootAnkleSVG highlights={svgHighlights}/>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className={secCls}>
        <h2 className={h2Cls}>📋 Basic Information</h2>
        <div className="grid grid-cols-2 gap-3">
          <Pills label="Side" options={[['left','Left'],['right','Right'],['bilateral','Bilateral']]} value={basicInfo.side} onChange={v => setBasicInfo(p => ({...p, side: v}))}/>
          <Pills label="Onset" options={[['acute','Acute'],['subacute','Sub-acute'],['chronic','Chronic']]} value={basicInfo.onset} onChange={v => setBasicInfo(p => ({...p, onset: v}))}/>
        </div>
        <FL label="Chief Complaint"><Inp value={basicInfo.chiefComplaint} onChange={v => setBasicInfo(p => ({...p, chiefComplaint: v}))} placeholder="e.g. ankle pain, heel pain, flat foot, limp"/></FL>
        <FL label="Duration"><Inp value={basicInfo.duration} onChange={v => setBasicInfo(p => ({...p, duration: v}))} placeholder="e.g. 3 weeks"/></FL>
        <Pills label="Mechanism" options={[['sprain','Inversion sprain'],['overuse','Overuse/running'],['direct_trauma','Direct trauma'],['degenerative','Degenerative'],['post_op','Post-operative']]} value={basicInfo.mechanism} onChange={v => setBasicInfo(p => ({...p, mechanism: v}))} color="cyan"/>
      </div>

      {/* Physical Examination */}
      <div className={secCls}>
        <h2 className={h2Cls}>🔬 Physical Examination</h2>
        <Gate question="Is physical examination applicable?" value={physExam.applicable} onChange={v => setPhysExam(p => ({...p, applicable: v}))}>
          <Pills label="Gait" options={[['normal','Normal'],['antalgic','Antalgic'],['steppage','Steppage'],['calcaneal','Calcaneal gait']]} value={physExam.gait} onChange={v => setPhysExam(p => ({...p, gait: v}))}/>
          <div className="bg-teal-50 rounded-lg p-3 mb-3">
            <div className="text-xs font-semibold text-teal-700 mb-2">Range of Motion (degrees)</div>
            <div className="grid grid-cols-3 gap-2">
              {[['ankleDorsiflexion','Dorsiflexion (0–20°)'],['anklePlantarflexion','Plantarflexion (0–50°)'],['inversion','Inversion (0–35°)'],['eversion','Eversion (0–15°)'],['toeExtension','Great toe ext. (0–70°)'],['toeFlexion','Great toe flex. (0–45°)']].map(([k, lbl]) => (
                <FL key={k} label={lbl}><Inp type="number" value={physExam[k]} onChange={v => setPhysExam(p => ({...p, [k]: v}))} placeholder="°"/></FL>
              ))}
            </div>
          </div>
          <Pills label="Swelling Location" multi options={[['lateral_ankle','Lateral ankle'],['medial_ankle','Medial ankle'],['hindfoot','Hindfoot'],['dorsum','Dorsum'],['plantar','Plantar'],['forefoot','Forefoot']]} value={physExam.swelling} onChange={v => setPhysExam(p => ({...p, swelling: v}))}/>
          <Pills label="Tenderness Points" multi options={[['atfl_tender','ATFL'],['cfl_tender','CFL'],['achilles_tender','Achilles'],['medial_malleolus','Med. malleolus'],['lateral_malleolus','Lat. malleolus'],['plantar_heel','Plantar heel'],['navicular','Navicular'],['5th_base','5th MT base'],['1st_mtp','1st MTP']]} value={physExam.tenderness} onChange={v => setPhysExam(p => ({...p, tenderness: v}))} color="red"/>
          <Pills label="Deformity" multi options={[['hallux_valgus','Hallux valgus'],['pes_planus','Pes planus/flat foot'],['pes_cavus','Pes cavus'],['claw_toes','Claw toes'],['hammer_toe','Hammer toe'],['heel_valgus','Heel valgus'],['equinus','Equinus contracture']]} value={physExam.deformity} onChange={v => setPhysExam(p => ({...p, deformity: v}))} color="orange"/>
        </Gate>
      </div>

      {/* Special Tests */}
      <div className={secCls}>
        <h2 className={h2Cls}>🧪 Special Tests</h2>
        <Gate question="Are special tests applicable?" value={specialTests.applicable} onChange={v => setSpecialTests(p => ({...p, applicable: v}))}>
          {[
            ['anteriorDrawer', 'Anterior drawer test (ATFL integrity)'],
            ['talarTilt', 'Talar tilt test (CFL integrity)'],
            ['thompsonTest', 'Thompson squeeze test (Achilles rupture)'],
            ['simmonds', "Simmonds' test (Achilles continuity)"],
            ['silverskoild', "Silfverskiöld test (gastrocnemius vs soleus equinus)"],
            ['singleHeelRaise', 'Single heel raise (tibialis posterior)'],
            ['jackTest', "Jack's test (windlass mechanism/plantar fascia)"],
            ['mulder', "Mulder's click (Morton's neuroma)"],
            ['tinelatFoot', 'Tinel at tarsal tunnel (tarsal tunnel syndrome)'],
          ].map(([k, lbl]) => (
            <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="text-xs text-gray-600 flex-1">{lbl}</span>
              <div className="flex gap-1">
                {['negative','positive','not_done'].map(v => (
                  <button key={v} type="button"
                    onClick={() => setSpecialTests(p => ({...p, [k]: v}))}
                    className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                      specialTests[k] === v ? v === 'positive' ? 'bg-red-500 text-white border-red-500' : v === 'negative' ? 'bg-green-500 text-white border-green-500' : 'bg-gray-400 text-white border-gray-400' : 'bg-white text-gray-500 border-gray-300'
                    }`}>
                    {v === 'not_done' ? 'N/D' : v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {specialTests.thompsonTest === 'positive' && (
            <div className="mt-2 bg-red-50 border border-red-300 rounded p-2 text-xs text-red-700 font-semibold">⚠ Thompson test positive — Achilles tendon rupture likely. Confirm with MRI/USS. Urgent orthopaedic referral.</div>
          )}
        </Gate>
      </div>

      {/* AOFAS Score */}
      <div className={secCls}>
        <h2 className={h2Cls}>📊 AOFAS Ankle-Hindfoot Score</h2>
        <Gate question="Is AOFAS score applicable?" value={aofasData.applicable} onChange={v => setAofasData(p => ({...p, applicable: v}))}>
          {aofasScore && (
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-3 mb-3 border border-teal-200">
              <div className="flex items-baseline gap-3">
                <span className={`text-3xl font-bold ${aofasScore.interpColor}`}>{aofasScore.total}<span className="text-base font-normal text-gray-400">/100</span></span>
                <span className={`text-lg font-semibold ${aofasScore.interpColor}`}>{aofasScore.interp}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div className={`h-1.5 rounded-full ${aofasScore.total >= 90 ? 'bg-green-500' : aofasScore.total >= 75 ? 'bg-blue-500' : aofasScore.total >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${aofasScore.total}%` }}/>
              </div>
            </div>
          )}
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pain (max 40 pts)</div>
          <ScoreRow label="Pain severity" value={aofasData.pain} onChange={v => setAofasData(p => ({...p, pain: v}))}
            options={[['none','None',40],['mild','Mild/occasional',30],['moderate','Moderate/daily',20],['severe','Severe',0]]}/>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Function (max 50 pts)</div>
          <ScoreRow label="Activity limitations" value={aofasData.activityLimitation} onChange={v => setAofasData(p => ({...p, activityLimitation: v}))}
            options={[['no_limit','No limitations',10],['daily_no_rec','Daily ok, limited rec',7],['daily_limit','Daily limited',4],['severe_limit','Severe limitation',0]]}/>
          <ScoreRow label="Walking distance" value={aofasData.walkingDistance} onChange={v => setAofasData(p => ({...p, walkingDistance: v}))}
            options={[['gt6','>6 blocks',5],['four_six','4–6 blocks',4],['one_three','1–3 blocks',2],['lt1','<1 block',0]]}/>
          <ScoreRow label="Walking surfaces" value={aofasData.walkingSurfaces} onChange={v => setAofasData(p => ({...p, walkingSurfaces: v}))}
            options={[['no_diff','No difficulty',5],['some','Some difficulty',3],['severe','Severe difficulty',0]]}/>
          <ScoreRow label="Gait abnormality" value={aofasData.gaitAbnormality} onChange={v => setAofasData(p => ({...p, gaitAbnormality: v}))}
            options={[['normal','None/slight',8],['obvious','Obvious',4],['marked','Marked',0]]}/>
          <ScoreRow label="Sagittal motion (ankle)" value={aofasData.sagittalMotion} onChange={v => setAofasData(p => ({...p, sagittalMotion: v}))}
            options={[['normal_30','Normal ≥30°',8],['mild_15','Mild restrict 15–29°',4],['severe_lt15','Severe <15°',0]]}/>
          <ScoreRow label="Subtalar ROM" value={aofasData.subtalarMotion} onChange={v => setAofasData(p => ({...p, subtalarMotion: v}))}
            options={[['normal','Normal (75–100%)',6],['mild','Mild restrict (25–74%)',3],['marked','Marked (<25%)',0]]}/>
          <ScoreRow label="Hindfoot motion (inv/ever)" value={aofasData.hindFootMotion} onChange={v => setAofasData(p => ({...p, hindFootMotion: v}))}
            options={[['normal','Normal (75–100%)',6],['mild','Mild restrict (25–74%)',3],['marked','Marked (<25%)',0]]}/>
          <ScoreRow label="Ankle-hindfoot stability" value={aofasData.stability} onChange={v => setAofasData(p => ({...p, stability: v}))}
            options={[['stable','Stable',8],['unstable','Unstable',0]]}/>

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Alignment (max 10 pts)</div>
          <ScoreRow label="Foot alignment" value={aofasData.alignment} onChange={v => setAofasData(p => ({...p, alignment: v}))}
            options={[['good','Good — plantigrade',10],['fair','Fair',5],['poor','Poor',0]]}/>
        </Gate>
      </div>

      {/* Achilles Tendon */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦵 Achilles Tendon Assessment</h2>
        <Gate question="Is Achilles tendon assessment applicable?" value={achillesData.applicable} onChange={v => setAchillesData(p => ({...p, applicable: v}))}>
          <Pills label="Condition" options={[['tendinopathy','Tendinopathy'],['partial_tear','Partial tear'],['complete_rupture','Complete rupture'],['insertional','Insertional tendinopathy'],['retrocalcaneal','Retrocalcaneal bursitis'],['paratenonitis','Paratenonitis']]} value={achillesData.type} onChange={v => setAchillesData(p => ({...p, type: v}))} color="red"/>
          <Pills label="Location" options={[['mid_body','Mid-body (2–6 cm from insertion)'],['insertional','Insertional'],['musculotendinous','Musculotendinous junction']]} value={achillesData.location} onChange={v => setAchillesData(p => ({...p, location: v}))}/>
          <Pills label="Thompson/Simmonds Test" options={[['intact','Intact — tendon continuous'],['positive','Positive — rupture']]} value={achillesData.thompson} onChange={v => setAchillesData(p => ({...p, thompson: v}))} color={achillesData.thompson === 'positive' ? 'red' : 'green'}/>
          <Pills label="Haglund Deformity (Kager)" options={[['absent','Absent'],['present','Present']]} value={achillesData.kager} onChange={v => setAchillesData(p => ({...p, kager: v}))} color="orange"/>
          {achillesData.type === 'complete_rupture' && (
            <div className="bg-red-50 border border-red-300 rounded p-2 text-xs text-red-700 font-semibold mb-2">⚠ Achilles rupture confirmed — discuss operative vs non-operative management. Age, activity level, time from injury.</div>
          )}
          <Pills label="Management Plan" options={[['conservative','Conservative — cast/boot'],['surgical_repair','Surgical repair'],['physio','Physiotherapy (tendinopathy)'],['eccentric','Eccentric loading programme'],['shockwave','Shockwave therapy']]} value={achillesData.management} onChange={v => setAchillesData(p => ({...p, management: v}))} color="teal"/>
        </Gate>
      </div>

      {/* Ankle Instability */}
      <div className={secCls}>
        <h2 className={h2Cls}>🦶 Ankle Sprain / Instability</h2>
        <Gate question="Is ankle sprain/instability assessment applicable?" value={ankleSprainData.applicable} onChange={v => setAnkleSprainData(p => ({...p, applicable: v}))}>
          <Pills label="Ottawa Ankle Rules" options={[['not_required','X-ray not required'],['ankle_xray','Ankle X-ray required'],['foot_xray','Foot X-ray required'],['both_xray','Both required']]} value={ankleSprainData.ottawaAnkle} onChange={v => setAnkleSprainData(p => ({...p, ottawaAnkle: v}))} color="blue"/>
          <Pills label="Sprain Grade" options={[['I','Grade I — minor tear, no instability'],['II','Grade II — partial tear, mild instability'],['III','Grade III — complete tear, instability']]} value={ankleSprainData.grade} onChange={v => setAnkleSprainData(p => ({...p, grade: v}))} color={ankleSprainData.grade === 'III' ? 'red' : ankleSprainData.grade === 'II' ? 'orange' : 'teal'}/>
          <Pills label="Ligaments Torn" multi options={[['atfl','ATFL (most common)'],['cfl','CFL'],['ptfl','PTFL'],['syndesmosis','High ankle — syndesmosis'],['deltoid','Deltoid (medial)']]} value={ankleSprainData.ligamentsTorn} onChange={v => setAnkleSprainData(p => ({...p, ligamentsTorn: v}))} color="red"/>
          {ankleSprainData.ligamentsTorn?.includes('syndesmosis') && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Syndesmotic (high ankle) sprain — higher risk of chronic instability. MRI recommended. Prolonged recovery.</div>}
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Weight-bearing" options={[['full','Full WB'],['partial','Partial WB'],['none','Non-WB']]} value={ankleSprainData.weightBearing} onChange={v => setAnkleSprainData(p => ({...p, weightBearing: v}))}/>
            <Pills label="MRI Recommended?" options={[['no','No'],['yes','Yes'],['done','Done']]} value={ankleSprainData.mri} onChange={v => setAnkleSprainData(p => ({...p, mri: v}))} color="blue"/>
          </div>
        </Gate>
      </div>

      {/* Hallux Valgus */}
      <div className={secCls}>
        <h2 className={h2Cls}>👣 Hallux Valgus Assessment</h2>
        <Gate question="Is hallux valgus assessment applicable?" value={halluxData.applicable} onChange={v => setHalluxData(p => ({...p, applicable: v}))}>
          <div className="grid grid-cols-2 gap-2">
            <FL label="Hallux Valgus Angle (°)" sub="normal <15°"><Inp type="number" value={halluxData.hvAngle} onChange={v => setHalluxData(p => ({...p, hvAngle: v}))} placeholder="degrees"/></FL>
            <FL label="1–2 Intermetatarsal Angle" sub="normal <9°"><Inp type="number" value={halluxData.imaAngle} onChange={v => setHalluxData(p => ({...p, imaAngle: v}))} placeholder="degrees"/></FL>
          </div>
          {parseFloat(halluxData.hvAngle) >= 40 && <div className="text-xs text-red-600 font-semibold mb-2">⚠ Severe hallux valgus (≥40°) — surgical correction likely required.</div>}
          <Pills label="Severity Classification" options={[['mild','Mild — HVA 15–20°'],['moderate','Moderate — HVA 21–39°'],['severe','Severe — HVA ≥40°']]} value={halluxData.grade} onChange={v => setHalluxData(p => ({...p, grade: v}))} color={halluxData.grade === 'severe' ? 'red' : halluxData.grade === 'moderate' ? 'orange' : 'teal'}/>
          <Pills label="1st MTP Joint Arthritis" options={[['none','None'],['mild','Mild'],['moderate','Moderate'],['severe','Severe']]} value={halluxData.arthritis} onChange={v => setHalluxData(p => ({...p, arthritis: v}))} color="orange"/>
        </Gate>
      </div>

      {/* Flat Foot */}
      <div className={secCls}>
        <h2 className={h2Cls}>👟 Flat Foot (Pes Planus) Assessment</h2>
        <Gate question="Is flat foot assessment applicable?" value={flatFootData.applicable} onChange={v => setFlatFootData(p => ({...p, applicable: v}))}>
          <Pills label="Type" options={[['flexible','Flexible (most common)'],['rigid','Rigid'],['acquired','Acquired (PTTD)']]} value={flatFootData.type} onChange={v => setFlatFootData(p => ({...p, type: v}))} color="teal"/>
          <Pills label="Medial Arch" options={[['present','Present'],['reduced','Reduced'],['absent','Absent']]} value={flatFootData.arch} onChange={v => setFlatFootData(p => ({...p, arch: v}))} color={flatFootData.arch === 'absent' ? 'red' : 'teal'}/>
          <div className="grid grid-cols-2 gap-2">
            <Pills label="Hindfoot Alignment" options={[['neutral','Neutral'],['valgus','Valgus'],['varus','Varus']]} value={flatFootData.rearfoot} onChange={v => setFlatFootData(p => ({...p, rearfoot: v}))} color={flatFootData.rearfoot === 'valgus' ? 'orange' : 'teal'}/>
            <Pills label="Too Many Toes Sign" options={[['negative','Negative'],['positive','Positive (PTTD)']]} value={flatFootData.tooManyToes} onChange={v => setFlatFootData(p => ({...p, tooManyToes: v}))} color={flatFootData.tooManyToes === 'positive' ? 'red' : 'gray'}/>
          </div>
          <Pills label="Single Leg Heel Raise" options={[['normal','Normal bilateral'],['weak','Weak/limited'],['unable','Unable']]} value={flatFootData.singeLegRaise} onChange={v => setFlatFootData(p => ({...p, singeLegRaise: v}))} color={flatFootData.singeLegRaise === 'unable' ? 'red' : 'teal'}/>
          <Pills label="PTTD Stage (Johnson-Strom)" options={[['I','Stage I — tenosynovitis, stable'],['II','Stage II — tendon elongated, flexible flat foot'],['III','Stage III — rigid flat foot'],['IV','Stage IV — ankle valgus']]} value={flatFootData.stage} onChange={v => setFlatFootData(p => ({...p, stage: v}))} color={['III','IV'].includes(flatFootData.stage) ? 'red' : 'amber'}/>
        </Gate>
      </div>

      {/* Imaging */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩻 Imaging</h2>
        <Gate question="Is imaging assessment applicable?" value={imagingData.applicable} onChange={v => setImagingData(p => ({...p, applicable: v}))}>
          <Pills label="X-ray Done?" options={[['yes','Yes'],['no','No'],['pending','Pending']]} value={imagingData.xrayDone} onChange={v => setImagingData(p => ({...p, xrayDone: v}))} color="blue"/>
          {imagingData.xrayDone === 'yes' && <FL label="X-ray Findings"><Inp value={imagingData.xrayFindings} onChange={v => setImagingData(p => ({...p, xrayFindings: v}))} placeholder="alignment, HVA, IMA, fracture, OA changes"/></FL>}
          <Pills label="MRI Done?" options={[['yes','Yes'],['no','No'],['pending','Pending']]} value={imagingData.mriDone} onChange={v => setImagingData(p => ({...p, mriDone: v}))} color="blue"/>
          {imagingData.mriDone === 'yes' && <>
            <Pills label="Achilles Findings" options={[['normal','Normal'],['tendinopathy','Tendinopathy'],['partial_tear','Partial tear'],['complete_rupture','Complete rupture']]} value={imagingData.mriAchilles} onChange={v => setImagingData(p => ({...p, mriAchilles: v}))} color={imagingData.mriAchilles === 'complete_rupture' ? 'red' : 'teal'}/>
            <Pills label="Ligament Findings" options={[['normal','Normal'],['atfl_tear','ATFL tear'],['cfl_tear','CFL tear'],['syndesmosis','Syndesmotic injury'],['deltoid_tear','Deltoid tear']]} value={imagingData.mriLigament} onChange={v => setImagingData(p => ({...p, mriLigament: v}))} color="orange"/>
          </>}
          <Pills label="USS Done?" options={[['yes','Yes'],['no','No']]} value={imagingData.ussDone} onChange={v => setImagingData(p => ({...p, ussDone: v}))} color="gray"/>
          {imagingData.ussDone === 'yes' && <FL label="USS Findings"><Inp value={imagingData.ussFindings} onChange={v => setImagingData(p => ({...p, ussFindings: v}))} placeholder="tendon thickness, partial/full thickness tear, vascularity"/></FL>}
        </Gate>
      </div>

      {/* Diagnosis */}
      <div className={secCls}>
        <h2 className={h2Cls}>🩺 Diagnosis</h2>
        <Gate question="Is diagnosis documentation applicable?" value={diagnosisData.applicable} onChange={v => setDiagnosisData(p => ({...p, applicable: v}))}>
          <Pills label="Primary Diagnosis" options={[['ankle_sprain','Ankle sprain'],['achilles_rupture','Achilles rupture'],['achilles_tendinopathy','Achilles tendinopathy'],['plantar_fasciitis','Plantar fasciitis'],['hallux_valgus','Hallux valgus'],['pes_planus','Pes planus/PTTD'],['ankle_oa','Ankle OA'],['mortons_neuroma',"Morton's neuroma"],['ankle_fracture','Ankle fracture'],['lisfranc','Lisfranc injury'],['calcaneus_fracture','Calcaneus fracture'],['tarsal_tunnel','Tarsal tunnel syndrome']]} value={diagnosisData.primaryDx} onChange={v => setDiagnosisData(p => ({...p, primaryDx: v}))} color="teal"/>
          <div className="grid grid-cols-2 gap-2">
            <FL label="ICD-10"><Inp value={diagnosisData.icd10} onChange={v => setDiagnosisData(p => ({...p, icd10: v}))} placeholder="e.g. M79.6, S93.4"/></FL>
          </div>
          <FL label="Notes"><textarea value={diagnosisData.notes} onChange={e => setDiagnosisData(p => ({...p, notes: e.target.value}))} placeholder="clinical context, prior treatments..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-teal-400"/></FL>
        </Gate>
      </div>

      {/* Management */}
      <div className={secCls}>
        <h2 className={h2Cls}>💊 Management Plan</h2>
        <Gate question="Is management plan applicable?" value={managementData.applicable} onChange={v => setManagementData(p => ({...p, applicable: v}))}>
          <Pills label="Conservative" multi options={[['rice','RICE (rest/ice/compression/elevation)'],['cam_boot','CAM boot'],['taping','Ankle taping'],['orthotics','Orthotics/insoles'],['physio','Physiotherapy'],['stretching','Stretching programme'],['weight_loss','Weight loss'],['footwear','Footwear modification']]} value={managementData.conservative} onChange={v => setManagementData(p => ({...p, conservative: v}))} color="green"/>
          <FL label="Medications"><Inp value={managementData.medications} onChange={v => setManagementData(p => ({...p, medications: v}))} placeholder="NSAIDs, topical diclofenac, gabapentin (neuropathy)"/></FL>
          <Pills label="Injection Therapy" options={[['none','None'],['steroid','Corticosteroid'],['prp','PRP'],['pnf','Prolotherapy'],['botox','Botulinum toxin (plantar fasciitis)']]} value={managementData.injection} onChange={v => setManagementData(p => ({...p, injection: v}))} color="blue"/>
          <Pills label="Surgical Intervention" options={[['none','None'],['brorstrom','Broström repair (ATFL)'],['osteotomy','Osteotomy (hallux/flat foot)'],['arthroscopy','Ankle arthroscopy'],['arthroplasty','Ankle arthroplasty'],['arthrodesis','Arthrodesis'],['achilles_repair','Achilles repair'],['flap_reconstruction','Flap/reconstruction']]} value={managementData.surgical} onChange={v => setManagementData(p => ({...p, surgical: v}))} color="orange"/>
          <FL label="Follow-up"><Inp value={managementData.followUp} onChange={v => setManagementData(p => ({...p, followUp: v}))} placeholder="e.g. 6 weeks, repeat imaging, physio discharge"/></FL>
          <FL label="Notes"><textarea value={managementData.notes} onChange={e => setManagementData(p => ({...p, notes: e.target.value}))} placeholder="India context — diabetic foot care, footwear affordability, chappals..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-teal-400"/></FL>
        </Gate>
      </div>

      {/* Save */}
      <div className="flex justify-end mt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-semibold text-sm shadow hover:from-teal-600 hover:to-cyan-600 disabled:opacity-60 transition-all">
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
}
