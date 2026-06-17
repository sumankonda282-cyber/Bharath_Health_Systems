/**
 * @shared-pool
 * TracheostomyForm — Tracheostomy management & decannulation assessment
 * Scoring: Decannulation readiness checklist, Passy-Muir valve candidacy,
 *   tracheostomy complication grading, Cormack-Lehane airway grading (original indication)
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700',
  pill: 'bg-slate-100 border-slate-300 text-slate-800',
  active: 'bg-slate-600 border-slate-700 text-white',
};

function Pills({ options, value, onChange, accent = A, multi = false }) {
  const vals = multi ? (Array.isArray(value) ? value : []) : value;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => {
        const sel = multi ? vals.includes(o) : vals === o;
        return (
          <button key={o} type="button"
            onClick={() => multi ? onChange(sel ? vals.filter(x => x !== o) : [...vals, o]) : onChange(o)}
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
      <label className="block text-sm font-semibold text-gray-700">{label}{sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}</label>
      {children}
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
      {applicable === 'N/A' && <div className="px-4 pb-3 text-xs text-gray-400 italic flex items-center gap-1"><Lock size={12} /> Not applicable · section locked</div>}
      {applicable === 'Applicable' && <div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  );
}

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400";
const ta = inp + " min-h-[72px] resize-y";

// Decannulation readiness checklist items
const DECANNULATION_CHECKLIST = [
  { item: 'Underlying cause resolved / stable', key: 'causeResolved' },
  { item: 'Adequate upper airway on endoscopy (no obstruction ≥50%)', key: 'upperAirway' },
  { item: 'Successful cuff deflation tolerates without distress', key: 'cuffDeflation' },
  { item: 'Successful tube downsizing to smallest appropriate size', key: 'tubeDownsize' },
  { item: 'Tolerates capping ≥24 hours without distress or desaturation', key: 'cappingTrial' },
  { item: 'Adequate cough / secretion clearance without suction', key: 'coughAdequate' },
  { item: 'Secretion volume manageable (no suctioning >4–6h)', key: 'secretionVolume' },
  { item: 'SpO2 ≥92% on air during capping trial', key: 'oxygenation' },
  { item: 'Swallowing safe (no aspiration on capped trial / FEES)', key: 'swallowing' },
  { item: 'Mentally alert enough to manage own airway', key: 'cognition' },
  { item: 'No upper airway obstruction on flexible laryngoscopy', key: 'laryngoscopyOk' },
  { item: 'Family / patient educated on stoma care post-decannulation', key: 'education' },
];

export default function TracheostomyForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    current: 'Applicable', tube: 'Applicable', care: 'Applicable',
    complications: 'N/A', swallowing: 'N/A', voice: 'N/A',
    decannulation: 'N/A', paediatricTroch: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // Current tracheostomy info
  const [indication, setIndication] = useState('');
  const [insertionDate, setInsertionDate] = useState('');
  const [insertionSite, setInsertionSite] = useState('');
  const [insertedBy, setInsertedBy] = useState('');
  const [technique, setTechnique] = useState('');
  const [daysSince, setDaysSince] = useState('');
  const [previousTrachHistory, setPreviousTrachHistory] = useState('');
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState('');

  // Tube details
  const [tubeType, setTubeType] = useState('');
  const [tubeBrand, setTubeBrand] = useState('');
  const [tubeSize, setTubeSize] = useState('');
  const [cuffed, setCuffed] = useState('');
  const [cuffPressure, setCuffPressure] = useState('');
  const [cuffedReason, setCuffedReason] = useState('');
  const [innerCannula, setInnerCannula] = useState('');
  const [innerCannulaFreq, setInnerCannulaFreq] = useState('');
  const [lastTubeChange, setLastTubeChange] = useState('');
  const [nextTubeChange, setNextTubeChange] = useState('');
  const [fenestration, setFenestration] = useState('');

  // Tracheostomy care
  const [suction, setSuction] = useState('');
  const [suctionFreq, setSuctionFreq] = useState('');
  const [secretionCharacter, setSecretionCharacter] = useState('');
  const [suctionCathSize, setSuctionCathSize] = useState('');
  const [hme, setHme] = useState('');
  const [humidification, setHumidification] = useState('');
  const [dressingFreq, setDressingFreq] = useState('');
  const [tapeType, setTapeType] = useState('');
  const [stieringStoma, setSiteringStoma] = useState('');
  const [oxygenVia, setOxygenVia] = useState('');
  const [ventilated, setVentilated] = useState('');
  const [ventMode, setVentMode] = useState('');
  const [ventSettings, setVentSettings] = useState('');

  // Complications
  const [complications, setComplications] = useState([]);
  const [granuloma, setGranuloma] = useState('');
  const [granulomaSite, setGranulomaSite] = useState('');
  const [granulomaSize, setGranulomaSize] = useState('');
  const [granulomaManagement, setGranulomaManagement] = useState('');
  const [stomaInfection, setStomaInfection] = useState('');
  const [stomaSwab, setStomaSwab] = useState('');
  const [trachealMalacia, setTrachealMalacia] = useState('');
  const [trachealStenosis, setTrachealStenosis] = useState('');
  const [pTEF, setPTEF] = useState('');
  const [accidentalDecannulation, setAccidentalDecannulation] = useState('');
  const [accidentalDecannProtocol, setAccidentalDecannProtocol] = useState('');

  // Swallowing
  const [swallowingAssessment, setSwallowingAssessment] = useState('');
  const [aspiration, setAspiration] = useState('');
  const [fees, setFees] = useState('');
  const [vfss, setVfss] = useState('');
  const [oralIntake, setOralIntake] = useState('');
  const [trachealSuctionPostMeal, setTrachealSuctionPostMeal] = useState('');
  const [ngPeg, setNgPeg] = useState('');

  // Voice / Communication
  const [voiceValve, setVoiceValve] = useState('');
  const [pmvCandidacy, setPmvCandidacy] = useState('');
  const [pmvTrial, setPmvTrial] = useState('');
  const [pmvTolerance, setPmvTolerance] = useState('');
  const [speakingValveHours, setSpeakingValveHours] = useState('');
  const [communicationMethod, setCommunicationMethod] = useState([]);
  const [sltReferral, setSltReferral] = useState('');

  // Decannulation
  const [decannChecklist, setDecannChecklist] = useState({});
  const [cappingTrial, setCappingTrial] = useState('');
  const [cappingDuration, setCappingDuration] = useState('');
  const [cappingSpO2, setCappingSpO2] = useState('');
  const [downsizingStatus, setDownsizingStatus] = useState('');
  const [laryngoscopyPre, setLaryngoscopyPre] = useState('');
  const [decannReadiness, setDecannReadiness] = useState('');
  const [decannPlan, setDecannPlan] = useState('');
  const [postDecannCare, setPostDecannCare] = useState([]);

  const decannScore = useMemo(() => {
    return DECANNULATION_CHECKLIST.filter(c => decannChecklist[c.key] === 'Yes').length;
  }, [decannChecklist]);

  const decannReadinessAuto = useMemo(() => {
    if (decannScore >= 10) return 'Ready for decannulation trial';
    if (decannScore >= 7) return 'Nearly ready — address remaining criteria';
    return 'Not ready — significant barriers remain';
  }, [decannScore]);

  // Paediatric tracheostomy
  const [pedTrachIndication, setPedTrachIndication] = useState('');
  const [pedTrachAge, setPedTrachAge] = useState('');
  const [pedTrachSize, setPedTrachSize] = useState('');
  const [pedSchool, setPedSchool] = useState('');
  const [pedHomeSetup, setPedHomeSetup] = useState([]);
  const [pedGrowthImpact, setPedGrowthImpact] = useState('');
  const [pedDecannGoal, setPedDecannGoal] = useState('');

  const criticalAlert = useMemo(() => {
    if (accidentalDecannulation === 'Yes') return 'ACCIDENTAL DECANNULATION — replace tube immediately (or oral intubation). Have spare tube + same size at bedside always. Stoma closes within minutes in new tracheostomy.';
    if (complications.includes('Haemorrhage (sentinel bleed — innominate artery erosion)')) return 'Sentinel bleed — sign of innominate artery erosion. LIFE-THREATENING. Overinflate cuff, call vascular surgery + ITU emergency. Pack stoma if tube not protecting.';
    return '';
  }, [accidentalDecannulation, complications]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-tracheostomy', patientId, encounterId, data: { indication, insertionDate, insertionSite, insertedBy, technique, daysSince, previousTrachHistory, primaryDiagnosis, tubeType, tubeBrand, tubeSize, cuffed, cuffPressure, cuffedReason, innerCannula, innerCannulaFreq, lastTubeChange, nextTubeChange, fenestration, suction, suctionFreq, secretionCharacter, suctionCathSize, hme, humidification, dressingFreq, tapeType, oxygenVia, ventilated, ventMode, ventSettings, complications, granuloma, granulomaSite, granulomaSize, granulomaManagement, stomaInfection, stomaSwab, trachealMalacia, trachealStenosis, pTEF, accidentalDecannulation, accidentalDecannProtocol, swallowingAssessment, aspiration, fees, vfss, oralIntake, trachealSuctionPostMeal, ngPeg, voiceValve, pmvCandidacy, pmvTrial, pmvTolerance, speakingValveHours, communicationMethod, sltReferral, decannChecklist, decannScore, decannReadinessAuto, cappingTrial, cappingDuration, cappingSpO2, downsizingStatus, laryngoscopyPre, decannReadiness, decannPlan, postDecannCare, pedTrachIndication, pedTrachAge, pedTrachSize, pedSchool, pedHomeSetup, pedGrowthImpact, pedDecannGoal } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-slate-600 to-gray-600 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Tracheostomy Management</h1>
            <p className="text-slate-300 text-sm">Tube Care · Complications · Swallowing · PMV Voice Valve · Decannulation Readiness Checklist</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Tracheostomy performed commonly in ICU (prolonged ventilation), ENT (head & neck cancer, subglottic stenosis, bilateral VCP), and neurology (Guillain-Barré, ALS). Home tracheostomy care is challenging — limited trained community nurses in India. AIIMS, PGIMER, CMC Vellore have dedicated tracheostomy weaning programmes. Innominate artery erosion (sentinel bleed) — rare but fatal — risk in low-set tracheostomies. Tube brands common in India: Portex, Shiley, Tracoe. PM-JAY covers tracheostomy care supplies for BPL patients (limited).</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-600 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700 text-base">TRACHEOSTOMY EMERGENCY</div><div className="text-red-800 text-sm mt-1">{criticalAlert}</div></div>
        </div>
      )}

      {/* Emergency bedside notice */}
      <div className="rounded-xl border-2 border-blue-400 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="font-bold mb-1">Bedside emergency equipment (must be present at all times)</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div>✓ Same-size spare tube</div>
          <div>✓ One-size-smaller spare tube</div>
          <div>✓ 10mL syringe (for cuff)</div>
          <div>✓ Suction machine + catheters</div>
          <div>✓ Bag-valve mask</div>
          <div>✓ Tracheal dilators</div>
          <div>✓ Ties/tapes</div>
          <div>✓ Written emergency protocol</div>
        </div>
      </div>

      <Section title="Current Tracheostomy" applicable={sec.current} onApplicable={v => sa('current', v)}>
        <FL label="Indication for tracheostomy">
          <Pills options={['Prolonged mechanical ventilation (ICU)', 'Upper airway obstruction (bilateral VCP)', 'Subglottic/tracheal stenosis', 'Head & neck cancer (airway protection)', 'Secretion management (neurological)', 'Laryngeal trauma', 'Severe OSA (failed other options)', 'Congenital airway anomaly (paediatric)', 'Burns / inhalation injury', 'Laryngeal tumour (inoperable)', 'Weaning from ventilator (ICU→ward)']} value={indication} onChange={setIndication} multi />
        </FL>
        <FL label="Primary diagnosis"><input className={inp} value={primaryDiagnosis} onChange={e => setPrimaryDiagnosis(e.target.value)} placeholder="e.g. GBS, bilateral vocal cord palsy, laryngeal SCC post-total laryngectomy" /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Insertion date"><input className={inp} type="date" value={insertionDate} onChange={e => setInsertionDate(e.target.value)} /></FL>
          <FL label="Days since tracheostomy"><input className={inp} value={daysSince} onChange={e => setDaysSince(e.target.value)} placeholder="e.g. 14 days" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Technique"><Pills options={['Surgical (ENT/general surgery)', 'Percutaneous dilatational (PDT — ICU)', 'Minitracheostomy (airway suctioning only)']} value={technique} onChange={setTechnique} /></FL>
          <FL label="Insertion site"><Pills options={['Between ring 1–2 (standard paediatric)', 'Between ring 2–3 (standard adult)', 'Between ring 3–4', 'Emergency cricothyrotomy converted']} value={insertionSite} onChange={setInsertionSite} /></FL>
        </div>
        <FL label="Inserted by"><input className={inp} value={insertedBy} onChange={e => setInsertedBy(e.target.value)} placeholder="e.g. ENT consultant (elective) / ICU team (emergency PDT)" /></FL>
        <FL label="Previous tracheostomy history"><input className={inp} value={previousTrachHistory} onChange={e => setPreviousTrachHistory(e.target.value)} placeholder="e.g. Previous trach 2019 — decannulated successfully" /></FL>
      </Section>

      <Section title="Tube Details" applicable={sec.tube} onApplicable={v => sa('tube', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Tube type">
            <Pills options={['Standard cuffed', 'Standard uncuffed', 'Cuffed fenestrated', 'Uncuffed fenestrated', 'Adjustable flange (obese/difficult neck)', 'Double lumen (with inner cannula)', 'Paediatric uncuffed', 'Laryngectomy tube (Provox/Blom-Singer)']} value={tubeType} onChange={setTubeType} />
          </FL>
          <FL label="Brand / make">
            <Pills options={['Portex (Smiths Medical)', 'Shiley (Medtronic)', 'Tracoe', 'Rusch', 'Bivona', 'Other']} value={tubeBrand} onChange={setTubeBrand} />
          </FL>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Tube size (ID)" sub="mm"><input className={inp} value={tubeSize} onChange={e => setTubeSize(e.target.value)} placeholder="e.g. 8.0 mm" /></FL>
          <FL label="Cuffed?"><Pills options={['Yes', 'No (uncuffed)']} value={cuffed} onChange={setCuffed} /></FL>
          {cuffed === 'Yes' && <FL label="Cuff pressure" sub="cmH₂O (target 15–25)"><input className={inp} value={cuffPressure} onChange={e => setCuffPressure(e.target.value)} placeholder="e.g. 20" /></FL>}
        </div>
        {cuffed === 'Yes' && (
          <FL label="Reason for cuffed tube">
            <Pills options={['Active aspiration risk', 'On mechanical ventilation', 'High secretion volume', 'Post-surgical airway (haemostasis)', 'Not yet assessed for uncuffing']} value={cuffedReason} onChange={setCuffedReason} />
          </FL>
        )}
        <FL label="Inner cannula"><Pills options={['Yes — disposable', 'Yes — reusable (cleaned)', 'No inner cannula']} value={innerCannula} onChange={setInnerCannula} /></FL>
        {innerCannula?.includes('Yes') && (
          <FL label="Inner cannula cleaning frequency"><Pills options={['Every 4 hours', 'Every 8 hours', 'Every 12 hours', 'Once daily', 'As needed']} value={innerCannulaFreq} onChange={setInnerCannulaFreq} /></FL>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FL label="Last tube change"><input className={inp} type="date" value={lastTubeChange} onChange={e => setLastTubeChange(e.target.value)} /></FL>
          <FL label="Next tube change due"><input className={inp} type="date" value={nextTubeChange} onChange={e => setNextTubeChange(e.target.value)} /></FL>
        </div>
        <FL label="Fenestration status"><Pills options={['Non-fenestrated', 'Fenestrated — hole open', 'Fenestrated — hole plugged (inner cannula in)', 'Awaiting fenestrated tube']} value={fenestration} onChange={setFenestration} /></FL>
      </Section>

      <Section title="Tracheostomy Care" applicable={sec.care} onApplicable={v => sa('care', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Suction need"><Pills options={['None (no longer needs suction)', 'PRN (<4 hourly)', 'Regular 2–4 hourly', 'Regular hourly or more']} value={suction} onChange={setSuction} /></FL>
          <FL label="Secretion character"><Pills options={['Clear/white thin', 'Thick/tenacious', 'Yellow/green (infected)', 'Blood-stained', 'Mucous plugs']} value={secretionCharacter} onChange={setSecretionCharacter} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Suction catheter size" sub="Fr"><input className={inp} value={suctionCathSize} onChange={e => setSuctionCathSize(e.target.value)} placeholder="e.g. 12 Fr (= tube ID × 2)" /></FL>
          <FL label="HME (Heat-Moisture Exchanger)"><Pills options={['In use', 'Not using — on ventilator', 'Not using — secretions too thick', 'Not tolerated']} value={hme} onChange={setHme} /></FL>
        </div>
        <FL label="Additional humidification"><Pills options={['Nebuliser (saline)', 'Heated humidifier (on vent circuit)', 'None required']} value={humidification} onChange={setHumidification} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Dressing frequency"><Pills options={['Once daily', 'Twice daily', 'As soiled', 'Not required']} value={dressingFreq} onChange={setDressingFreq} /></FL>
          <FL label="Tie/tape type"><Pills options={['Cotton tape ties', 'Velcro collar', 'Specially knotted (paediatric)', 'Sutured tube (acute post-op)']} value={tapeType} onChange={setTapeType} /></FL>
        </div>
        <FL label="Stoma site condition"><input className={inp} value={siteringStoma} onChange={e => setSiteringStoma(e.target.value)} placeholder="e.g. Clean and healthy / erythema / granuloma suprastomally / skin breakdown" /></FL>
        <FL label="Oxygen delivery (if needed)"><Pills options={['Not required', 'Via Swedish nose (HME + O₂)', 'Via tracheostomy mask', 'Via T-piece', 'Ventilator circuit']} value={oxygenVia} onChange={setOxygenVia} /></FL>
        <FL label="Ventilated?"><Pills options={['No — self-ventilating', 'Yes — full ventilation', 'Yes — nocturnal ventilation only', 'CPAP via tracheostomy', 'BiPAP via tracheostomy', 'Weaning — T-piece trials']} value={ventilated} onChange={setVentilated} /></FL>
        {ventilated && ventilated !== 'No — self-ventilating' && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Ventilator mode"><Pills options={['AC (volume controlled)', 'SIMV', 'PSV', 'CPAP', 'BiPAP', 'PRVC']} value={ventMode} onChange={setVentMode} /></FL>
            <FL label="Key ventilator settings"><input className={inp} value={ventSettings} onChange={e => setVentSettings(e.target.value)} placeholder="e.g. TV 500mL, RR 14, PEEP 5, FiO₂ 0.35" /></FL>
          </div>
        )}
      </Section>

      <Section title="Complications" applicable={sec.complications} onApplicable={v => sa('complications', v)}>
        <FL label="Current / past complications">
          <Pills options={['Stomal granuloma (suprastomal/infrastomal)', 'Peristomal skin breakdown', 'Stomal infection / cellulitis', 'Tube displacement (accidental decannulation)', 'Tube obstruction (mucous plug)', 'Subcutaneous emphysema', 'Pneumothorax', 'Tracheal stenosis (suprastomal/subglottic)', 'Tracheomalacia', 'Tracheo-oesophageal fistula (TOF)', 'Tracheo-innominate artery fistula (TIF)', 'Haemorrhage (sentinel bleed — innominate artery erosion)', 'Dysphagia / aspiration', 'Swallowing dysfunction', 'Voice loss', 'Psychological distress']} value={complications} onChange={setComplications} multi />
        </FL>
        {complications.includes('Stomal granuloma (suprastomal/infrastomal)') && (
          <div className="space-y-3 pl-3 border-l-2 border-slate-300">
            <FL label="Granuloma site"><Pills options={['Suprastomal', 'Infrastomal', 'Posterior tracheal wall']} value={granulomaSite} onChange={setGranulomaSite} /></FL>
            <FL label="Granuloma size"><input className={inp} value={granulomaSize} onChange={e => setGranulomaSize(e.target.value)} placeholder="e.g. 5mm sessile suprastomal granuloma" /></FL>
            <FL label="Granuloma management"><Pills options={['Topical silver nitrate application', 'Topical steroid cream', 'Surgical excision (endoscopic/microlaryngoscopy)', 'CO₂ laser ablation', 'Observe (small, asymptomatic)']} value={granulomaManagement} onChange={setGranulomaManagement} /></FL>
          </div>
        )}
        {complications.includes('Stomal infection / cellulitis') && (
          <div className="space-y-3 pl-3 border-l-2 border-slate-300">
            <FL label="Stoma swab result"><input className={inp} value={stomaSwab} onChange={e => setStomaSwab(e.target.value)} placeholder="e.g. Pseudomonas aeruginosa, MRSA — sensitivities pending" /></FL>
            <FL label="Stoma infection treatment"><input className={inp} value={stomaInfection} onChange={e => setStomaInfection(e.target.value)} placeholder="e.g. Topical mupirocin + regular dressing, systemic flucloxacillin if spreading cellulitis" /></FL>
          </div>
        )}
        <FL label="Accidental decannulation (current episode)?">
          <Pills options={['Yes', 'No']} value={accidentalDecannulation} onChange={setAccidentalDecannulation}
            accent={{ pill: 'bg-red-100 border-red-300 text-red-800', active: 'bg-red-600 border-red-700 text-white' }} />
        </FL>
        {accidentalDecannulation === 'No' && (
          <FL label="Accidental decannulation protocol in place?">
            <Pills options={['Yes — bedside protocol sheet displayed', 'No — needs to be initiated', 'Family trained']} value={accidentalDecannProtocol} onChange={setAccidentalDecannProtocol} />
          </FL>
        )}
        {complications.includes('Tracheal stenosis (suprastomal/subglottic)') && (
          <div className="pl-3 border-l-2 border-slate-300">
            <FL label="Tracheal stenosis details"><input className={inp} value={trachealStenosis} onChange={e => setTrachealStenosis(e.target.value)} placeholder="e.g. Suprastomal stenosis 1cm below cords, grade III Myer-Cotton, CT confirmed" /></FL>
          </div>
        )}
        {complications.includes('Tracheo-oesophageal fistula (TOF)') && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
            TOF — stop cuff inflation (makes aspiration worse), NG/PEG feeding, surgical repair when medically stable. CT oesophagram to define extent.
          </div>
        )}
      </Section>

      <Section title="Swallowing Assessment" applicable={sec.swallowing} onApplicable={v => sa('swallowing', v)}>
        <FL label="Bedside swallowing assessment">
          <Pills options={['Safe — no aspiration features', 'Suspected aspiration (coughing, wet voice, SpO2 drop)', 'Silent aspiration (no cough response)', 'Not yet assessed', 'Unable to assess (unconscious/uncooperative)']} value={swallowingAssessment} onChange={setSwallowingAssessment} />
        </FL>
        <FL label="Aspiration confirmed?"><Pills options={['No aspiration', 'Above cuff (above tracheal level)', 'Below cuff (aspiration into lower airway)', 'Not confirmed — clinical suspicion only']} value={aspiration} onChange={setAspiration} /></FL>
        <FL label="FEES (Flexible Endoscopic Evaluation of Swallowing)">
          <input className={inp} value={fees} onChange={e => setFees(e.target.value)} placeholder="e.g. FEES: Penetration score 5, laryngeal pooling ++ on thin liquids, no aspiration on nectar-thick" />
        </FL>
        <FL label="VFSS (Videofluoroscopy)">
          <input className={inp} value={vfss} onChange={e => setVfss(e.target.value)} placeholder="e.g. VFSS: Reduced hyolaryngeal excursion, late aspiration of thin liquids after swallow" />
        </FL>
        <FL label="Current oral intake"><Pills options={['Nil by mouth (NBM)', 'Thin liquids only', 'Thickened liquids (IDDSI 3/4)', 'Soft mashed diet', 'Normal diet', 'Oral supplementation alongside enteral']} value={oralIntake} onChange={setOralIntake} /></FL>
        <FL label="Tracheal suctioning after meals?"><Pills options={['Yes — food/liquid retrieved', 'Yes — thick secretions post meal only', 'No — no evidence of aspiration']} value={trachealSuctionPostMeal} onChange={setTrachealSuctionPostMeal} /></FL>
        <FL label="Enteral nutrition"><Pills options={['NG tube (short-term)', 'PEG/RIG (long-term)', 'Total enteral (NBM)', 'Supplemental (partial oral)', 'None required']} value={ngPeg} onChange={setNgPeg} /></FL>
      </Section>

      <Section title="Voice & Communication" applicable={sec.voice} onApplicable={v => sa('voice', v)}>
        <FL label="Voice/communication status"><Pills options={['No voice (cuffed / laryngectomy)', 'Whisper voice (cuff deflated)', 'Finger occlusion voice (covers tube)', 'Speaking valve (PMV) in use', 'Laryngectomy voice prosthesis (Provox/BlomSinger TEP)', 'Electrolarynx', 'AAC (augmentative / tablet / alphabet board)']} value={voiceValve} onChange={setVoiceValve} /></FL>
        <FL label="Passy-Muir Valve (PMV) candidacy">
          <Pills options={['Candidate — uncuffed or cuffed deflatable tube + adequate upper airway', 'Not yet — cuff cannot be safely deflated', 'Not candidate — upper airway obstruction', 'Laryngectomy patient — PMV not applicable (different valve used)']} value={pmvCandidacy} onChange={setPmvCandidacy} />
        </FL>
        {(pmvCandidacy?.includes('Candidate')) && (
          <div className="space-y-3 pl-3 border-l-2 border-slate-300">
            <FL label="PMV trial outcome"><Pills options={['Successful — tolerating well', 'Partial — limited time tolerated', 'Failed — SpO2 drop / respiratory distress', 'Not yet trialled']} value={pmvTrial} onChange={setPmvTrial} /></FL>
            {pmvTrial?.includes('Successful') && (
              <FL label="PMV wear time per day"><input className={inp} value={speakingValveHours} onChange={e => setSpeakingValveHours(e.target.value)} placeholder="e.g. 4 hours during waking" /></FL>
            )}
          </div>
        )}
        <FL label="Current communication method">
          <Pills options={['Verbal speech', 'Whispering', 'PMV speech', 'Writing', 'Lip-reading', 'Gesture', 'Alphabet board', 'AAC device (app/tablet)', 'Electrolarynx', 'TEP voice prosthesis']} value={communicationMethod} onChange={setCommunicationMethod} multi />
        </FL>
        <FL label="SLT (speech & language therapy) referral"><Pills options={['Referred — active', 'Referred — awaiting appointment', 'Under SLT care', 'Discharged from SLT', 'Not required']} value={sltReferral} onChange={setSltReferral} /></FL>
      </Section>

      <Section title="Decannulation Readiness" applicable={sec.decannulation} onApplicable={v => sa('decannulation', v)}>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="font-bold text-slate-700 text-sm">Decannulation Readiness Checklist</div>
          {DECANNULATION_CHECKLIST.map(c => (
            <div key={c.key} className="flex items-center gap-2">
              <span className="text-xs text-gray-700 flex-1">{c.item}</span>
              <Pills
                options={['Yes', 'No', 'Partial']}
                value={decannChecklist[c.key]}
                onChange={v => setDecannChecklist(d => ({ ...d, [c.key]: v }))}
                accent={A}
              />
            </div>
          ))}
          {Object.keys(decannChecklist).length >= 4 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${decannScore >= 10 ? 'bg-green-100 text-green-700' : decannScore >= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {decannScore}/12 criteria met — {decannReadinessAuto}
            </div>
          )}
        </div>

        <FL label="Capping trial status">
          <Pills options={['Not yet started', 'Partially successful (few hours)', 'Successful — tolerating full capping', 'Failed — unable to tolerate', 'Not applicable (laryngectomy)']} value={cappingTrial} onChange={setCappingTrial} />
        </FL>
        {cappingTrial?.includes('Successful') && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Capping duration tolerated"><input className={inp} value={cappingDuration} onChange={e => setCappingDuration(e.target.value)} placeholder="e.g. 48 hours continuous" /></FL>
            <FL label="SpO₂ during capping"><input className={inp} value={cappingSpO2} onChange={e => setCappingSpO2(e.target.value)} placeholder="e.g. ≥95% throughout" /></FL>
          </div>
        )}
        <FL label="Tube downsizing status">
          <Pills options={['Still on original size', 'Downsized once', 'Downsized to minimum size (5mm or paediatric equivalent)', 'Complete — decannulation ready']} value={downsizingStatus} onChange={setDownsizingStatus} />
        </FL>
        <FL label="Pre-decannulation flexible laryngoscopy">
          <input className={inp} value={laryngoscopyPre} onChange={e => setLaryngoscopyPre(e.target.value)} placeholder="e.g. Adequate airway, bilateral VC mobility partial, no suprastomal collapse, no granuloma obstructing" />
        </FL>
        <FL label="Clinician decannulation readiness judgement">
          <Pills options={['Ready — plan decannulation', 'Not yet ready — continue weaning', 'Unable to decannulate (permanent trach)', 'Family/patient declined decannulation']} value={decannReadiness} onChange={setDecannReadiness} />
        </FL>
        <FL label="Decannulation plan"><textarea className={ta} value={decannPlan} onChange={e => setDecannPlan(e.target.value)} placeholder="e.g. Cap Monday 8am, monitor 48h, decannulate Wednesday if SpO2 maintained. Observe 4h post-decannulation, discharge next morning if stoma contracting and comfortable." /></FL>
        <FL label="Post-decannulation care">
          <Pills options={['Dressing over stoma (occlusive)', 'Dressing + pressure (stoma closure)', 'Secondary suture closure (if not closing spontaneously)', 'Surgical closure (long-standing stoma)', 'SpO₂ monitoring post-decannulation (4–24h)', 'Spare tube accessible for 24h post-removal', 'Patient/family education on stoma closure']} value={postDecannCare} onChange={setPostDecannCare} multi />
        </FL>
      </Section>

      <Section title="Paediatric Tracheostomy (additional)" applicable={sec.paediatricTroch} onApplicable={v => sa('paediatricTroch', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Child's age at insertion"><input className={inp} value={pedTrachAge} onChange={e => setPedTrachAge(e.target.value)} placeholder="e.g. 18 months" /></FL>
          <FL label="Indication"><Pills options={['Subglottic stenosis', 'Bilateral vocal cord palsy', 'Laryngomalacia (severe)', 'Craniofacial airway obstruction', 'Prolonged ventilation (prematurity/BPD)', 'Neuromuscular disease', 'Congenital heart disease (post-cardiac surgery)']} value={pedTrachIndication} onChange={setPedTrachIndication} /></FL>
        </div>
        <FL label="Tube size (uncuffed preferred in children)">
          <input className={inp} value={pedTrachSize} onChange={e => setPedTrachSize(e.target.value)} placeholder="e.g. 3.5 mm Portex uncuffed (formula: age/4 + 3.5 mm)" />
        </FL>
        <FL label="School attendance / education"><Pills options={['Mainstream school with trach support', 'Special school', 'Home-schooled (medical complexity)', 'Pre-school age', 'Not attending']} value={pedSchool} onChange={setPedSchool} /></FL>
        <FL label="Home tracheostomy setup">
          <Pills options={['Trained caregiver (both parents)', 'One trained caregiver only', 'Home nurse / community nurse visit', 'Suction machine at home', 'Spare tubes at home', 'Emergency protocol at home', 'School staff trained', '24h carer required']} value={pedHomeSetup} onChange={setPedHomeSetup} multi />
        </FL>
        <FL label="Impact on growth / development">
          <input className={inp} value={pedGrowthImpact} onChange={e => setPedGrowthImpact(e.target.value)} placeholder="e.g. Speech delayed — no voiced speech, FTT improving since trach, motor milestones age-appropriate" />
        </FL>
        <FL label="Decannulation goal / timeline">
          <input className={inp} value={pedDecannGoal} onChange={e => setPedDecannGoal(e.target.value)} placeholder="e.g. Laryngotracheal reconstruction planned age 3 years, targeting decannulation by age 4" />
        </FL>
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
          <b>Paediatric trach notes:</b> Tracheal rings are softer — granuloma and suprastomal collapse more common. No cuff in children unless ventilated. Tube change technique differs (may need ENT/anaesthesia). Stoma closes faster if tube removed — always have emergency plan. Uncuffed tubes = air leak around tube = normal; not a suction failure.
        </div>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-slate-600 hover:bg-slate-700 text-white font-bold text-base shadow transition-all">
        Save Tracheostomy Assessment
      </button>
    </div>
  );
}
