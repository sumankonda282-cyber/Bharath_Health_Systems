/**
 * @shared-pool
 * FacialNerveForm — Facial nerve disorders assessment
 * Scoring: House-Brackmann grading (I–VI), Sunnybrook Facial Grading System,
 *   eFACE score, Yanagihara grading, electroneurography (ENoG) % degeneration
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700',
  pill: 'bg-amber-100 border-amber-300 text-amber-800',
  active: 'bg-amber-600 border-amber-700 text-white',
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

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400";
const ta = inp + " min-h-[72px] resize-y";

// House-Brackmann descriptions
const HB_DESCRIPTIONS = {
  'I': 'Normal — symmetric function in all areas',
  'II': 'Mild — slight weakness on close inspection; complete eye closure with effort; slight asymmetry at rest',
  'III': 'Moderate — obvious but not disfiguring difference; may not fully close eye; obvious synkinesis',
  'IV': 'Moderately severe — obvious weakness + disfiguring asymmetry; incomplete eye closure; synkinesis',
  'V': 'Severe — barely perceptible motion; incomplete eye closure; slight movement at corner of mouth',
  'VI': 'Total paralysis — no movement',
};

// Sunnybrook regions
const SUNNYBROOK_RESTING = ['Eye (narow/wide/eyelid droop)', 'Cheek/nose (flattened NLF)', 'Mouth (drooping/pulling)'];
const SUNNYBROOK_VOLUNTARY = ['Brow raise', 'Gentle eye closure', 'Open mouth smile', 'Snarl', 'Lip pucker'];
const SUNNYBROOK_SYNKINESIS = ['Eye-to-cheek', 'Eye-to-mouth', 'Eye-to-neck', 'Cheek-to-eye', 'Mouth-to-eye'];

export default function FacialNerveForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', examination: 'Applicable', hb: 'Applicable',
    sunnybrook: 'N/A', topography: 'N/A', electro: 'N/A',
    bellsPalsy: 'N/A', ramsayHunt: 'N/A', traumatic: 'N/A',
    iatrogenic: 'N/A', tumour: 'N/A', synkinesis: 'N/A',
    eyeCare: 'Applicable', treatment: 'Applicable',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [side, setSide] = useState('');
  const [onset, setOnset] = useState('');
  const [duration, setDuration] = useState('');
  const [progression, setProgression] = useState('');
  const [precedingEvents, setPrecedingEvents] = useState([]);
  const [painPresent, setPainPresent] = useState('');
  const [painSite, setPainSite] = useState('');
  const [previousEpisode, setPreviousEpisode] = useState('');
  const [riskFactors, setRiskFactors] = useState([]);
  const [associatedSymptoms, setAssociatedSymptoms] = useState([]);

  // Examination — regional
  const [foreheadWrinkle, setForeheadWrinkle] = useState('');
  const [eyeClosure, setEyeClosure] = useState('');
  const [belSign, setBelSign] = useState('');
  const [lagophthalmos, setLagophthalmos] = useState('');
  const [lagophthalmosMm, setLagophthalmosMm] = useState('');
  const [nasolabial, setNasolabial] = useState('');
  const [mouthCorner, setMouthCorner] = useState('');
  const [platysma, setPlatysma] = useState('');
  const [taste, setTaste] = useState('');
  const [hyperacusis, setHyperAcusis] = useState('');
  const [lacrimation, setLacrimation] = useState('');
  const [schirmer, setSchirmer] = useState('');
  const [parotidSwelling, setParotidSwelling] = useState('');
  const [otoscopyFindings, setOtoscopyFindings] = useState('');
  const [vesicles, setVesicles] = useState('');
  const [vesiclesSite, setVesiclesSite] = useState('');

  // House-Brackmann
  const [hbGrade, setHbGrade] = useState('');

  // Sunnybrook
  const [sbResting, setSbResting] = useState({});
  const [sbVoluntary, setSbVoluntary] = useState({});
  const [sbSynkinesis, setSbSynkinesis] = useState({});
  const sbScore = useMemo(() => {
    const voluntarySum = SUNNYBROOK_VOLUNTARY.reduce((a, _, i) => a + (parseInt(sbVoluntary[i]) || 0), 0);
    const restingSum = SUNNYBROOK_RESTING.reduce((a, _, i) => a + (parseInt(sbResting[i]) || 0), 0);
    const synkinesisSum = SUNNYBROOK_SYNKINESIS.reduce((a, _, i) => a + (parseInt(sbSynkinesis[i]) || 0), 0);
    const composite = voluntarySum - restingSum - synkinesisSum;
    return Math.max(0, Math.min(100, composite));
  }, [sbResting, sbVoluntary, sbSynkinesis]);

  // Topographic tests
  const [schirmerResult, setSchirmerResult] = useState('');
  const [stapedialReflex, setStapedialReflex] = useState('');
  const [salivaTest, setSalivaTest] = useState('');
  const [lesionLevel, setLesionLevel] = useState('');

  // Electrodiagnostics
  const [enogPercent, setEnogPercent] = useState('');
  const [enogTiming, setEnogTiming] = useState('');
  const [emgFindings, setEmgFindings] = useState('');
  const [emgReinnervation, setEmgReinnervation] = useState('');
  const [nervExcitability, setNervExcitability] = useState('');

  const enogRisk = useMemo(() => {
    const p = parseFloat(enogPercent);
    if (isNaN(p)) return '';
    if (p >= 90) return 'CRITICAL: ≥90% degeneration — surgical decompression within 14 days may be indicated';
    if (p >= 50) return 'Significant degeneration — close monitoring, surgical threshold approaching';
    return 'Degeneration <50% — conservative management appropriate';
  }, [enogPercent]);

  // Bell's palsy
  const [bellDiagnosis, setBellDiagnosis] = useState('');
  const [bellExcluded, setBellExcluded] = useState([]);
  const [bellSteroid, setBellSteroid] = useState('');
  const [bellAntiviral, setBellAntiviral] = useState('');
  const [bellDay, setBellDay] = useState('');
  const [bellPrognosis, setBellPrognosis] = useState('');

  // Ramsay Hunt
  const [rhVesicles, setRhVesicles] = useState([]);
  const [rhHearingLoss, setRhHearingLoss] = useState('');
  const [rhVertigo, setRhVertigo] = useState('');
  const [rhTreatment, setRhTreatment] = useState([]);

  // Traumatic
  const [traumaMechanism, setTraumaMechanism] = useState('');
  const [traumaOnset, setTraumaOnset] = useState('');
  const [temporalBoneFracture, setTemporalBoneFracture] = useState('');
  const [fractureLine, setFractureLine] = useState('');
  const [traumaTx, setTraumaTx] = useState([]);

  // Iatrogenic
  const [iatrogenicCause, setIatrogenicCause] = useState('');
  const [iatrogenicOnset, setIatrogenicOnset] = useState('');
  const [iatrogenicTx, setIatrogenicTx] = useState([]);

  // Tumour
  const [tumourType, setTumourType] = useState('');
  const [tumourSite, setTumourSite] = useState('');
  const [tumourTx, setTumourTx] = useState([]);

  // Synkinesis
  const [synkinesisType, setSynkinesisType] = useState([]);
  const [synkinesisGrade, setSynkinesisGrade] = useState('');
  const [synkinesisTx, setSynkinesisTx] = useState([]);

  // Eye care
  const [cornealSensation, setCornealSensation] = useState('');
  const [cornealStaining, setCornealStaining] = useState('');
  const [eyeDrops, setEyeDrops] = useState('');
  const [eyeChamber, setEyeChamber] = useState('');
  const [tarsorrhaphy, setTarsorrhaphy] = useState('');
  const [ophthalReferral, setOphthalReferral] = useState('');

  // Treatment
  const [treatment, setTreatment] = useState([]);
  const [physiotherapy, setPhysiotherapy] = useState('');
  const [botoxTarget, setBotoxTarget] = useState([]);
  const [surgicalProcedure, setSurgicalProcedure] = useState([]);
  const [followUpWeeks, setFollowUpWeeks] = useState('');

  const criticalAlert = useMemo(() => {
    if (lagophthalmos === 'Present' && cornealStaining === 'Positive') return 'Corneal exposure keratopathy — urgent ophthalmology, aggressive lubrication, consider tarsorrhaphy';
    if (enogRisk.includes('CRITICAL')) return enogRisk;
    if (hbGrade === 'VI' && onset === 'Sudden' && !bellDiagnosis) return 'Complete sudden facial palsy — exclude malignancy and temporal bone fracture urgently (CT/MRI)';
    return '';
  }, [lagophthalmos, cornealStaining, enogRisk, hbGrade, onset, bellDiagnosis]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-facial-nerve', patientId, encounterId, data: { side, onset, duration, progression, precedingEvents, painPresent, painSite, previousEpisode, riskFactors, associatedSymptoms, foreheadWrinkle, eyeClosure, belSign, lagophthalmos, lagophthalmosMm, nasolabial, mouthCorner, platysma, taste, hyperacusis, lacrimation, schirmer, parotidSwelling, otoscopyFindings, vesicles, vesiclesSite, hbGrade, hbDescription: HB_DESCRIPTIONS[hbGrade] || '', sbScore, sbResting, sbVoluntary, sbSynkinesis, schirmerResult, stapedialReflex, salivaTest, lesionLevel, enogPercent, enogTiming, emgFindings, emgReinnervation, nervExcitability, enogRisk, bellDiagnosis, bellExcluded, bellSteroid, bellAntiviral, bellDay, bellPrognosis, rhVesicles, rhHearingLoss, rhVertigo, rhTreatment, traumaMechanism, traumaOnset, temporalBoneFracture, fractureLine, traumaTx, iatrogenicCause, iatrogenicOnset, iatrogenicTx, tumourType, tumourSite, tumourTx, synkinesisType, synkinesisGrade, synkinesisTx, cornealSensation, cornealStaining, eyeDrops, eyeChamber, tarsorrhaphy, ophthalReferral, treatment, physiotherapy, botoxTarget, surgicalProcedure, followUpWeeks } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="5"/><path d="M3 21a9 9 0 0 1 18 0"/><path d="M9 10.5c-.5 1.5.5 3 3 3s3.5-1.5 3-3"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Facial Nerve Assessment</h1>
            <p className="text-amber-100 text-sm">House-Brackmann (I–VI) · Sunnybrook · ENoG · Bell's Palsy · Ramsay Hunt · Synkinesis</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Bell's palsy most common cause of acute facial palsy worldwide (70–75%). Ramsay Hunt syndrome (herpes zoster oticus) — HZV reactivation, poor prognosis vs Bell's. Trauma (temporal bone fracture — RTA) significant in India. Iatrogenic — parotid surgery, mastoidectomy. Leprosy (Hansen's disease) — peripheral facial nerve involvement still seen in India; borderline lepromatous leprosy affects facial/great auricular nerves. Parotid malignancy with facial nerve invasion — late presentation in India. Guillain-Barré bilateral facial palsy. Major facial nerve rehab centres: AIIMS Delhi, CMC Vellore, NIMHANS Bangalore.</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700">URGENT</div><div className="text-red-800 text-sm">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side"><Pills options={['Right', 'Left', 'Bilateral']} value={side} onChange={setSide} /></FL>
          <FL label="Onset"><Pills options={['Sudden (hours)', 'Rapid (1–3 days)', 'Progressive (days–weeks)', 'Gradual (weeks–months)']} value={onset} onChange={setOnset} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Duration since onset"><input className={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 5 days" /></FL>
          <FL label="Progression"><Pills options={['Improving', 'Static/plateau', 'Worsening', 'Fluctuating']} value={progression} onChange={setProgression} /></FL>
        </div>
        <FL label="Preceding events">
          <Pills options={['Viral URTI (2–3 weeks prior)', 'Ear pain/otitis media', 'Dental procedure', 'Head/ear trauma', 'Parotid surgery', 'Mastoidectomy', 'Ear toilet/syringing', 'Recent travel', 'Stress/fatigue', 'Pregnancy (3rd trimester)', 'None']} value={precedingEvents} onChange={setPrecedingEvents} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Pain?"><Pills options={['None', 'Yes — retroauricular', 'Yes — ear canal', 'Yes — face', 'Yes — pre-auricular']} value={painPresent} onChange={setPainPresent} /></FL>
          <FL label="Previous episodes?"><Pills options={['First episode', 'Recurrent same side', 'Recurrent alternating (Melkersson-Rosenthal?)']} value={previousEpisode} onChange={setPreviousEpisode} /></FL>
        </div>
        <FL label="Associated symptoms">
          <Pills options={['Altered taste (dysgeusia)', 'Hyperacusis (sound sensitivity)', 'Reduced lacrimation', 'Increased lacrimation', 'Dry eye', 'Hearing loss (ipsilateral)', 'Vertigo/dizziness', 'Ear vesicles', 'Rash (ear/face/palate)', 'Parotid swelling', 'Parotid pain', 'Numbness face/tongue']} value={associatedSymptoms} onChange={setAssociatedSymptoms} multi />
        </FL>
        <FL label="Risk factors">
          <Pills options={['Diabetes mellitus', 'Hypertension', 'Immunosuppression (HIV/steroids)', 'Lyme disease exposure (tick bite/trekking)', 'TB exposure', 'Leprosy endemic area', 'Pregnancy', 'Family history of Bell\'s palsy']} value={riskFactors} onChange={setRiskFactors} multi />
        </FL>
      </Section>

      <Section title="Facial Nerve Examination" applicable={sec.examination} onApplicable={v => sa('examination', v)}>
        <div className="rounded-lg bg-white border border-amber-200 p-4 space-y-3">
          <div className="text-sm font-bold text-amber-700">Upper Face (Temporal / Zygomatic branches)</div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Forehead wrinkling"><Pills options={['Normal', 'Reduced', 'Absent', 'Asymmetric synkinesis']} value={foreheadWrinkle} onChange={setForeheadWrinkle} /></FL>
            <FL label="Eye closure (orbicularis oculi)"><Pills options={['Complete', 'Incomplete — forceful effort needed', 'Incomplete — cannot close (lagophthalmos)', 'Absent']} value={eyeClosure} onChange={setEyeClosure} /></FL>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Bell's phenomenon"><Pills options={['Present (protective upward roll)', 'Absent (no protective reflex — higher corneal risk)']} value={belSign} onChange={setBelSign} /></FL>
            <FL label="Lagophthalmos"><Pills options={['Absent', 'Present']} value={lagophthalmos} onChange={setLagophthalmos} /></FL>
          </div>
          {lagophthalmos === 'Present' && (
            <FL label="Lagophthalmos gap" sub="mm"><input className={inp} value={lagophthalmosMm} onChange={e => setLagophthalmosMm(e.target.value)} placeholder="e.g. 5 mm" /></FL>
          )}
        </div>
        <div className="rounded-lg bg-white border border-amber-200 p-4 space-y-3">
          <div className="text-sm font-bold text-amber-700">Lower Face (Buccal / Marginal Mandibular / Cervical branches)</div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Nasolabial fold"><Pills options={['Symmetric', 'Flattened — ipsilateral', 'Deep — contralateral (relative)']} value={nasolabial} onChange={setNasolabial} /></FL>
            <FL label="Mouth corner"><Pills options={['Symmetric', 'Drooping ipsilateral', 'Pulled to contralateral', 'Unable to smile/snarl']} value={mouthCorner} onChange={setMouthCorner} /></FL>
          </div>
          <FL label="Platysma (cervical branch)"><Pills options={['Normal', 'Paretic']} value={platysma} onChange={setPlatysma} /></FL>
        </div>
        <div className="rounded-lg bg-white border border-amber-200 p-4 space-y-3">
          <div className="text-sm font-bold text-amber-700">Topographic / Ancillary Findings</div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Taste (anterior 2/3 tongue)"><Pills options={['Normal', 'Altered (dysgeusia)', 'Absent (ageusia)', 'Not tested']} value={taste} onChange={setTaste} /></FL>
            <FL label="Hyperacusis (stapedius branch)"><Pills options={['Present', 'Absent']} value={hyperacusis} onChange={setHyperAcusis} /></FL>
            <FL label="Lacrimation (greater superficial petrosal)"><Pills options={['Normal', 'Reduced (dry eye)', 'Increased (crocodile tears — aberrant)', 'Not tested']} value={lacrimation} onChange={setLacrimation} /></FL>
            <FL label="Schirmer test (lacrimation)"><Pills options={['Normal (>10mm)', 'Reduced (<10mm)', 'Not done']} value={schirmer} onChange={setSchirmer} /></FL>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Parotid swelling"><Pills options={['Absent', 'Present — firm (tumour?)', 'Present — tender (parotitis)']} value={parotidSwelling} onChange={setParotidSwelling} /></FL>
            <FL label="Ear canal / pinna vesicles"><Pills options={['Absent', 'Present (Ramsay Hunt)', 'Healed/crusted']} value={vesicles} onChange={setVesicles} /></FL>
          </div>
          {vesicles !== 'Absent' && vesicles && (
            <FL label="Vesicle site"><Pills options={['Concha of pinna', 'External ear canal', 'Soft palate', 'Anterior tongue', 'Face/forehead']} value={vesiclesSite} onChange={setVesiclesSite} multi /></FL>
          )}
          <FL label="Otoscopy findings"><input className={inp} value={otoscopyFindings} onChange={e => setOtoscopyFindings(e.target.value)} placeholder="e.g. Normal TM / vesicles in EAC / hemotympanum" /></FL>
        </div>
      </Section>

      <Section title="House-Brackmann Grading" applicable={sec.hb} onApplicable={v => sa('hb', v)}>
        <FL label="House-Brackmann Grade">
          <Pills options={['I', 'II', 'III', 'IV', 'V', 'VI']} value={hbGrade} onChange={setHbGrade} />
        </FL>
        {hbGrade && (
          <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${hbGrade === 'I' ? 'bg-green-100 text-green-700' : hbGrade === 'II' ? 'bg-lime-100 text-lime-700' : hbGrade === 'III' ? 'bg-yellow-100 text-yellow-700' : hbGrade === 'IV' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
            HB {hbGrade}: {HB_DESCRIPTIONS[hbGrade]}
          </div>
        )}
        <div className="text-xs text-gray-500 mt-1">Document HB grade at each visit to track recovery trajectory. Expected: 71% HB I–II by 3 months (Bell's palsy).</div>
      </Section>

      <Section title="Sunnybrook Facial Grading System" applicable={sec.sunnybrook} onApplicable={v => sa('sunnybrook', v)}>
        <div className="rounded-xl border border-amber-200 bg-white p-4 space-y-4">
          <div>
            <div className="text-sm font-bold text-amber-700 mb-2">Resting Symmetry (0–4 each region, 0=normal)</div>
            {SUNNYBROOK_RESTING.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-700 flex-1">{item}</span>
                <Pills options={['0', '1', '2', '3', '4']} value={sbResting[i]?.toString()} onChange={v => setSbResting(a => ({ ...a, [i]: v }))} accent={A} />
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-bold text-amber-700 mb-2">Voluntary Movement (0–5 each, 0=no movement)</div>
            {SUNNYBROOK_VOLUNTARY.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-700 flex-1">{item}</span>
                <Pills options={['0', '1', '2', '3', '4', '5']} value={sbVoluntary[i]?.toString()} onChange={v => setSbVoluntary(a => ({ ...a, [i]: v }))} accent={A} />
              </div>
            ))}
          </div>
          <div>
            <div className="text-sm font-bold text-amber-700 mb-2">Synkinesis (0–3 each, 0=none)</div>
            {SUNNYBROOK_SYNKINESIS.map((item, i) => (
              <div key={i} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-700 flex-1">{item}</span>
                <Pills options={['0', '1', '2', '3']} value={sbSynkinesis[i]?.toString()} onChange={v => setSbSynkinesis(a => ({ ...a, [i]: v }))} accent={A} />
              </div>
            ))}
          </div>
          {(Object.keys(sbVoluntary).length > 0) && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${sbScore >= 76 ? 'bg-green-100 text-green-700' : sbScore >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              Sunnybrook Score: {sbScore}/100 {sbScore >= 76 ? '(Good)' : sbScore >= 50 ? '(Moderate)' : '(Poor)'}
            </div>
          )}
        </div>
      </Section>

      <Section title="Topographic (Level of Lesion) Tests" applicable={sec.topography} onApplicable={v => sa('topography', v)}>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          Facial nerve branches (proximal → distal): Geniculate ganglion → Greater superficial petrosal (lacrimation) → Nerve to stapedius (hyperacusis) → Chorda tympani (taste + salivation) → Extratemporal branches
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Schirmer test result" sub="(>10mm/5min = normal)">
            <input className={inp} value={schirmerResult} onChange={e => setSchirmerResult(e.target.value)} placeholder="e.g. R: 12mm, L: 4mm — reduced left" />
          </FL>
          <FL label="Stapedial reflex (acoustic reflex)">
            <Pills options={['Present (lesion distal to nerve to stapedius)', 'Absent (lesion at/proximal to stapedius branch)', 'Not tested']} value={stapedialReflex} onChange={setStapedialReflex} />
          </FL>
        </div>
        <FL label="Salivary flow (chorda tympani)">
          <Pills options={['Normal', 'Reduced ipsilateral (<25% of contralateral)', 'Not tested']} value={salivaTest} onChange={setSalivaTest} />
        </FL>
        <FL label="Localisation of lesion">
          <Pills options={['Supranuclear (UMN — forehead spared)', 'Nuclear (pons)', 'Intracranial (CPA) — proximal to geniculate', 'Geniculate ganglion', 'Intratemporal — between geniculate & stapedius nerve', 'Intratemporal — between stapedius & chorda tympani', 'Extratemporal (parotid/post-stylomastoid)', 'Peripheral (branch level)']} value={lesionLevel} onChange={setLesionLevel} />
        </FL>
      </Section>

      <Section title="Electrodiagnostics (ENoG / EMG)" applicable={sec.electro} onApplicable={v => sa('electro', v)}>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
          ENoG: Best performed day 3–14. Compares compound muscle action potential (CMAP) amplitude affected vs normal side. ≥90% degeneration within 14 days of onset = consider surgical decompression.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="ENoG degeneration" sub="%">
            <input className={inp} value={enogPercent} onChange={e => setEnogPercent(e.target.value)} placeholder="e.g. 75%" />
          </FL>
          <FL label="ENoG timing (day of illness)">
            <input className={inp} value={enogTiming} onChange={e => setEnogTiming(e.target.value)} placeholder="e.g. Day 10" />
          </FL>
        </div>
        {enogRisk && (
          <div className={`rounded-lg px-3 py-2 text-sm font-semibold ${enogRisk.includes('CRITICAL') ? 'bg-red-100 text-red-700' : enogRisk.includes('Significant') ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
            {enogRisk}
          </div>
        )}
        <FL label="EMG findings">
          <Pills options={['Normal MUPs', 'Reduced MUPs (neuropraxia)', 'Fibrillations / positive sharp waves (axonotmesis)', 'No voluntary activity (neurotmesis/severe)', 'Polyphasic MUPs (reinnervation — good sign)', 'Not done yet (<3 weeks — too early)']} value={emgFindings} onChange={setEmgFindings} />
        </FL>
        <FL label="Reinnervation signs on EMG">
          <Pills options={['Yes — polyphasic potentials present (recovery expected)', 'No reinnervation seen yet', 'Not applicable (too early)']} value={emgReinnervation} onChange={setEmgReinnervation} />
        </FL>
      </Section>

      <Section title="Bell's Palsy" applicable={sec.bellsPalsy} onApplicable={v => sa('bellsPalsy', v)}>
        <FL label="Diagnosis of Bell's palsy (diagnosis of exclusion)">
          <Pills options={['Confirmed Bell\'s palsy', 'Probable Bell\'s palsy', 'Under investigation — cannot exclude secondary']} value={bellDiagnosis} onChange={setBellDiagnosis} />
        </FL>
        <FL label="Secondary causes excluded">
          <Pills options={['Ramsay Hunt (no vesicles, VZV PCR neg)', 'Lyme disease (no tick exposure, serology neg)', 'Parotid tumour (imaging normal)', 'Cholesteatoma (otoscopy normal)', 'Acoustic neuroma (MRI normal)', 'Stroke/TIA (MRI brain normal)', 'Sarcoidosis (ACE, CXR normal)', 'Guillain-Barré (no limb weakness, bilateral)', 'Leukaemia/lymphoma (CBC normal)']} value={bellExcluded} onChange={setBellExcluded} multi />
        </FL>
        <FL label="Day of illness at presentation"><input className={inp} value={bellDay} onChange={e => setBellDay(e.target.value)} placeholder="e.g. Day 3" /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Prednisolone given?">
            <Pills options={['Yes — 1 mg/kg/day × 10 days', 'Yes — modified dose', 'No — >72h delay', 'No — contraindicated', 'Not started yet']} value={bellSteroid} onChange={setBellSteroid} />
          </FL>
          <FL label="Antiviral given?">
            <Pills options={['Yes — valacyclovir 1g TDS × 7 days', 'Yes — acyclovir', 'No — not routinely needed (Bell\'s)', 'Yes — added for severe HB V–VI']} value={bellAntiviral} onChange={setBellAntiviral} />
          </FL>
        </div>
        <FL label="Prognosis (Peitersen criteria)">
          <Pills options={['Excellent (HB I–II at 3 months — 71%)', 'Good (HB III at 3 months)', 'Moderate — complete recovery unlikely', 'Poor — late recovery expected (>6 months)', 'Cannot predict — too early']} value={bellPrognosis} onChange={setBellPrognosis} />
        </FL>
      </Section>

      <Section title="Ramsay Hunt Syndrome (HZV Oticus)" applicable={sec.ramsayHunt} onApplicable={v => sa('ramsayHunt', v)}>
        <FL label="Vesicle distribution">
          <Pills options={['Concha of auricle', 'External ear canal', 'Soft palate', 'Anterior 2/3 tongue', 'Face', 'All distributions present']} value={rhVesicles} onChange={setRhVesicles} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Sensorineural hearing loss"><Pills options={['None', 'Mild', 'Moderate', 'Severe', 'Profound']} value={rhHearingLoss} onChange={setRhHearingLoss} /></FL>
          <FL label="Vertigo"><Pills options={['None', 'Mild', 'Severe (labyrinthitis)']} value={rhVertigo} onChange={setRhVertigo} /></FL>
        </div>
        <FL label="Treatment">
          <Pills options={['Valacyclovir 1g TDS × 7 days (antiviral — mandatory)', 'Acyclovir IV (hospitalised/severe)', 'Prednisolone 1 mg/kg/day × 10 days', 'Analgesia (gabapentin/pregabalin for zoster pain)', 'Vestibular rehab (if vertigo)', 'Eye care (corneal exposure)', 'Hearing aids (if SNHL persists)']} value={rhTreatment} onChange={setRhTreatment} multi />
        </FL>
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
          Ramsay Hunt has worse prognosis than Bell's palsy — only 50–70% achieve HB I–II. Full dose antiviral within 72h of rash onset is critical.
        </div>
      </Section>

      <Section title="Traumatic Facial Palsy" applicable={sec.traumatic} onApplicable={v => sa('traumatic', v)}>
        <FL label="Mechanism"><input className={inp} value={traumaMechanism} onChange={e => setTraumaMechanism(e.target.value)} placeholder="e.g. RTA, birth trauma (forceps), penetrating facial wound, mastoidectomy" /></FL>
        <FL label="Onset after trauma">
          <Pills options={['Immediate (nerve transection/disruption)', 'Delayed 24–72h (neuropraxia from oedema)', 'Delayed >72h (unexpected — explore secondary cause)']} value={traumaOnset} onChange={setTraumaOnset} />
        </FL>
        <FL label="Temporal bone fracture">
          <Pills options={['Longitudinal (most common — EAC/TM injury, conductive HL)', 'Transverse (rare — cochlea/facial nerve injury, SNHL)', 'Mixed', 'No fracture seen on CT', 'CT not done yet']} value={temporalBoneFracture} onChange={setTemporalBoneFracture} />
        </FL>
        <FL label="Fracture line through">
          <Pills options={['Geniculate ganglion', 'Labyrinthine segment', 'Tympanic segment', 'Mastoid segment', 'Stylomastoid foramen', 'Not defined']} value={fractureLine} onChange={setFractureLine} />
        </FL>
        <FL label="Management">
          <Pills options={['Conservative (delayed palsy — neuropraxia, steroids)', 'Surgical exploration + decompression (immediate complete palsy)', 'Surgical repair + graft (nerve transection)', 'Eye care + observation', 'MRI/CT for localisation']} value={traumaTx} onChange={setTraumaTx} multi />
        </FL>
      </Section>

      <Section title="Iatrogenic Facial Palsy" applicable={sec.iatrogenic} onApplicable={v => sa('iatrogenic', v)}>
        <FL label="Cause">
          <Pills options={['Parotidectomy — temporary neuropraxia', 'Parotidectomy — nerve sacrifice (malignancy)', 'Mastoidectomy / tympanoplasty', 'Acoustic neuroma surgery', 'Middle ear surgery', 'Facial fracture ORIF', 'Dental block injection (temporary)', 'Botulinum toxin (inadvertent diffusion)']} value={iatrogenicCause} onChange={setIatrogenicCause} />
        </FL>
        <FL label="Onset post-procedure"><Pills options={['Immediate', '24–48h (expected post-op oedema)', 'Delayed (haematoma/infection)']} value={iatrogenicOnset} onChange={setIatrogenicOnset} /></FL>
        <FL label="Management">
          <Pills options={['Watchful waiting (temporary neuropraxia)', 'Return to theatre (haematoma/wire — early)', 'Nerve graft (great auricular/sural)', 'Facial reanimation surgery (late)', 'Physiotherapy + biofeedback', 'Eye care']} value={iatrogenicTx} onChange={setIatrogenicTx} multi />
        </FL>
      </Section>

      <Section title="Tumour-Related Facial Palsy" applicable={sec.tumour} onApplicable={v => sa('tumour', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Tumour type">
            <Pills options={['Facial nerve schwannoma', 'Parotid malignancy (mucoepidermoid/ACC)', 'Cholesteatoma (pressure/erosion)', 'Glomus jugulare/tympanicum', 'Middle ear carcinoma', 'Rhabdomyosarcoma (child)', 'Meningioma (CPA)', 'Acoustic neuroma (NF2)', 'Metastasis to facial nerve']} value={tumourType} onChange={setTumourType} />
          </FL>
          <FL label="Tumour location"><input className={inp} value={tumourSite} onChange={e => setTumourSite(e.target.value)} placeholder="e.g. Right parotid deep lobe, CT confirmed 3.5cm mass" /></FL>
        </div>
        <FL label="Treatment">
          <Pills options={['Facial nerve schwannoma — observe if HB I–II', 'Surgical resection + nerve graft', 'Total parotidectomy + facial nerve sacrifice', 'Radical mastoidectomy', 'Radiotherapy (adjuvant/primary)', 'Facial reanimation (cross-face graft, gracilis free flap)']} value={tumourTx} onChange={setTumourTx} multi />
        </FL>
      </Section>

      <Section title="Synkinesis Management" applicable={sec.synkinesis} onApplicable={v => sa('synkinesis', v)}>
        <FL label="Synkinesis type">
          <Pills options={['Oro-ocular (mouth movement → involuntary eye closure)', 'Oculo-oral (eye closure → mouth movement)', 'Oculo-mental (eye closure → chin dimpling)', 'Cervico-facial', 'Generalised/widespread']} value={synkinesisType} onChange={setSynkinesisType} multi />
        </FL>
        <FL label="Severity"><Pills options={['Mild (not bothersome)', 'Moderate (noticeable, some interference)', 'Severe (significant functional/cosmetic impact)']} value={synkinesisGrade} onChange={setSynkinesisGrade} /></FL>
        <FL label="Treatment">
          <Pills options={['Neuromuscular re-education (physiotherapy)', 'Mime therapy / Facial neuromuscular retraining', 'Biofeedback', 'Botulinum toxin A injection (synkinetic muscle)', 'Selective neurectomy', 'Phenol block (intramuscular)']} value={synkinesisTx} onChange={setSynkinesisTx} multi />
        </FL>
        {synkinesisTx.includes('Botulinum toxin A injection (synkinetic muscle)') && (
          <FL label="Botox target muscles">
            <Pills options={['Orbicularis oculi (lower lid — oro-ocular)', 'Orbicularis oris', 'Mentalis (chin dimpling)', 'Platysma', 'Zygomaticus', 'Corrugator']} value={botoxTarget} onChange={setBotoxTarget} multi />
          </FL>
        )}
      </Section>

      <Section title="Eye Care (Corneal Protection)" applicable={sec.eyeCare} onApplicable={v => sa('eyeCare', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Corneal sensation"><Pills options={['Normal', 'Reduced', 'Absent']} value={cornealSensation} onChange={setCornealSensation} /></FL>
          <FL label="Fluorescein corneal staining"><Pills options={['Negative (cornea intact)', 'Positive (exposure keratopathy)', 'Ulceration', 'Not done']} value={cornealStaining} onChange={setCornealStaining} /></FL>
        </div>
        <FL label="Eye lubrication">
          <Pills options={['Artificial tears — hourly waking', 'Viscous gel (Lacri-lube) at night', 'Moisture chamber spectacles', 'Taping eyelid shut at night', 'Eye patch (daytime if severe)', 'Botox upper eyelid ptosis (temporary protection)']} value={eyeDrops} onChange={setEyeDrops} multi />
        </FL>
        <FL label="Protective tarsorrhaphy">
          <Pills options={['Not needed', 'Temporary lateral tarsorrhaphy (reversible)', 'Permanent lateral tarsorrhaphy', 'Gold weight implant upper eyelid (paralytic ectropion)', 'Lower lid tightening (ectropion repair)']} value={tarsorrhaphy} onChange={setTarsorrhaphy} />
        </FL>
        <FL label="Ophthalmology referral">
          <Pills options={['Urgent (corneal exposure / staining)', 'Routine (monitoring)', 'Not required']} value={ophthalReferral} onChange={setOphthalReferral} />
        </FL>
      </Section>

      <Section title="Treatment & Follow-up" applicable={sec.treatment} onApplicable={v => sa('treatment', v)}>
        <FL label="Current treatment">
          <Pills options={['Prednisolone (oral steroid)', 'Antiviral (valacyclovir/acyclovir)', 'Facial physiotherapy / mime therapy', 'Biofeedback', 'Surgical decompression (intratemporal)', 'Nerve repair / cable graft', 'Cross-face nerve graft', 'Gracilis free muscle transfer (late reanimation)', 'Hypoglossal-facial anastomosis', 'Static sling (fascia lata — immediate symmetry)', 'Botulinum toxin (synkinesis / contralateral for symmetry)', 'Eye care (lubricants / tarsorrhaphy)']} value={treatment} onChange={setTreatment} multi />
        </FL>
        <FL label="Physiotherapy regimen">
          <input className={inp} value={physiotherapy} onChange={e => setPhysiotherapy(e.target.value)} placeholder="e.g. Neuromuscular re-education 3× week + home exercises, biofeedback sessions" />
        </FL>
        <FL label="Surgical procedures planned">
          <Pills options={['Facial nerve decompression (transmastoid)', 'Facial nerve decompression (middle fossa)', 'Nerve end-to-end anastomosis', 'Sural nerve cable graft', 'Masseteric-facial anastomosis', 'Gracilis free flap', 'Upper lid gold weight', 'Lower lid tightening / ectropion repair']} value={surgicalProcedure} onChange={setSurgicalProcedure} multi />
        </FL>
        <FL label="Next follow-up (weeks)"><input className={inp} value={followUpWeeks} onChange={e => setFollowUpWeeks(e.target.value)} placeholder="e.g. 4 weeks — recheck HB grade + EMG if no improvement" /></FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-base shadow transition-all">
        Save Facial Nerve Assessment
      </button>
    </div>
  );
}
