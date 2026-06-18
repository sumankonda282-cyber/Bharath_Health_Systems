/**
 * @shared-pool
 * AudiologyAndHearingForm — Comprehensive audiology & hearing rehabilitation
 * Scoring: PTA/SRT/speech scores, BERA wave latencies, DPOAE pass/refer,
 *   WHO hearing impairment grading, APHAB (hearing aid benefit), cochlear implant candidacy
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700',
  pill: 'bg-indigo-100 border-indigo-300 text-indigo-800',
  active: 'bg-indigo-600 border-indigo-700 text-white',
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

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400";
const ta = inp + " min-h-[72px] resize-y";

// PTA frequency labels
const PTA_FREQS = ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000'];

function PtaGrid({ side, acValues, bcValues, onAcChange, onBcChange }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse w-full min-w-[480px]">
        <thead>
          <tr className="bg-indigo-50">
            <th className="border border-indigo-200 px-2 py-1 text-indigo-700">{side}</th>
            {PTA_FREQS.map(f => <th key={f} className="border border-indigo-200 px-2 py-1 text-indigo-700">{f} Hz</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-indigo-200 px-2 py-1 font-semibold">AC (dB HL)</td>
            {PTA_FREQS.map(f => (
              <td key={f} className="border border-indigo-200 p-0.5">
                <input className="w-full text-center text-xs border-0 focus:outline-none bg-transparent" value={acValues[f] || ''} onChange={e => onAcChange(f, e.target.value)} placeholder="—" />
              </td>
            ))}
          </tr>
          <tr>
            <td className="border border-indigo-200 px-2 py-1 font-semibold">BC (dB HL)</td>
            {PTA_FREQS.map(f => (
              <td key={f} className="border border-indigo-200 p-0.5">
                <input className="w-full text-center text-xs border-0 focus:outline-none bg-transparent" value={bcValues[f] || ''} onChange={e => onBcChange(f, e.target.value)} placeholder="—" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AudiologyAndHearingForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', pta: 'Applicable', impedance: 'Applicable',
    oae: 'N/A', bera: 'N/A', ecochg: 'N/A', vestibular: 'N/A',
    hearingAid: 'N/A', cochlearImplant: 'N/A', paediatricAud: 'N/A',
    noiseinduced: 'N/A', sudden: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [age, setAge] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [hlSide, setHlSide] = useState('');
  const [hlOnset, setHlOnset] = useState('');
  const [hlDuration, setHlDuration] = useState('');
  const [hlProgression, setHlProgression] = useState('');
  const [riskFactors, setRiskFactors] = useState([]);
  const [familyHl, setFamilyHl] = useState('');
  const [occupation, setOccupation] = useState('');
  const [communicationDifficulty, setCommunicationDifficulty] = useState([]);

  // PTA
  const [acR, setAcR] = useState({});
  const [bcR, setBcR] = useState({});
  const [acL, setAcL] = useState({});
  const [bcL, setBcL] = useState({});

  const ptaAvg = (ac) => {
    const vals = ['500','1000','2000','4000'].map(f => parseFloat(ac[f])).filter(v => !isNaN(v));
    if (vals.length === 0) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };

  const whoGrade = (avg) => {
    if (avg === null) return '';
    if (avg <= 25) return 'Grade 0 — Normal';
    if (avg <= 40) return 'Grade 1 — Mild';
    if (avg <= 60) return 'Grade 2 — Moderate';
    if (avg <= 80) return 'Grade 3 — Severe';
    return 'Grade 4 — Profound';
  };

  const abgR = useMemo(() => {
    const vals = PTA_FREQS.map(f => {
      const ac = parseFloat(acR[f]);
      const bc = parseFloat(bcR[f]);
      return (!isNaN(ac) && !isNaN(bc)) ? ac - bc : null;
    }).filter(v => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [acR, bcR]);

  const abgL = useMemo(() => {
    const vals = PTA_FREQS.map(f => {
      const ac = parseFloat(acL[f]);
      const bc = parseFloat(bcL[f]);
      return (!isNaN(ac) && !isNaN(bc)) ? ac - bc : null;
    }).filter(v => v !== null);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [acL, bcL]);

  const [srtR, setSrtR] = useState('');
  const [srtL, setSrtL] = useState('');
  const [sdsR, setSdsR] = useState('');
  const [sdsL, setSdsL] = useState('');
  const [rollover, setRollover] = useState('');
  const [masking, setMasking] = useState('');
  const [audiogramPattern, setAudiogramPattern] = useState('');

  // Impedance
  const [tymp, setTypm] = useState('');
  const [tympR, setTympR] = useState('');
  const [tympL, setTympL] = useState('');
  const [stapediusR, setStapediusR] = useState('');
  const [stapediusL, setStapediusL] = useState('');
  const [stapAcousticReflex, setStapAcousticReflex] = useState('');
  const [reflex500, setReflex500] = useState('');
  const [reflex1k, setReflex1k] = useState('');
  const [reflex2k, setReflex2k] = useState('');
  const [reflex4k, setReflex4k] = useState('');

  // OAE
  const [dpoaeR, setDpoaeR] = useState('');
  const [dpoaeL, setDpoaeL] = useState('');
  const [teoaeR, setTeoaeR] = useState('');
  const [teoaeL, setTeoaeL] = useState('');
  const [oaeInterpretation, setOaeInterpretation] = useState('');

  // BERA / ABR
  const [beraMode, setBeraMode] = useState('');
  const [waveVR, setWaveVR] = useState('');
  const [waveVL, setWaveVL] = useState('');
  const [i3R, setI3R] = useState('');
  const [i3L, setI3L] = useState('');
  const [i5R, setI5R] = useState('');
  const [i5L, setI5L] = useState('');
  const [beraThresholdR, setBeraThresholdR] = useState('');
  const [beraThresholdL, setBeraThresholdL] = useState('');
  const [beraNorm, setBeraNorm] = useState('');
  const [beraInterpretation, setBeraInterpretation] = useState('');

  // ECochG
  const [spApRatioR, setSpApRatioR] = useState('');
  const [spApRatioL, setSpApRatioL] = useState('');
  const [ecochgInterpretation, setEcochgInterpretation] = useState('');

  // Vestibular
  const [vngFindings, setVngFindings] = useState('');
  const [vhitR, setVhitR] = useState('');
  const [vhitL, setVhitL] = useState('');
  const [vempCervical, setVempCervical] = useState('');
  const [vempOcular, setVempOcular] = useState('');
  const [caloricTest, setCaloricTest] = useState('');
  const [caloricCanal, setCaloricCanal] = useState('');

  // Hearing Aid
  const [haTrial, setHaTrial] = useState('');
  const [haType, setHaType] = useState('');
  const [haFitting, setHaFitting] = useState('');
  const [rea, setRea] = useState('');
  const [satisfactionScore, setSatisfactionScore] = useState('');
  const [haBenefit, setHaBenefit] = useState('');

  // Cochlear Implant
  const [ciCandidacy, setCiCandidacy] = useState('');
  const [ciSide, setCiSide] = useState('');
  const [ciDuration, setCiDuration] = useState('');
  const [ciPrelingualDeafness, setCiPrelingualDeafness] = useState('');
  const [ciDeviceModel, setCiDeviceModel] = useState('');
  const [ciActivationDate, setCiActivationDate] = useState('');
  const [ciThresholds, setCiThresholds] = useState('');
  const [ciCategoriesOfAuditoryPerformance, setCiCategoriesOfAuditoryPerformance] = useState('');
  const [mappingNotes, setMappingNotes] = useState('');

  // Paediatric Audiology
  const [pedAgeMonths, setPedAgeMonths] = useState('');
  const [boeaResult, setBoeaResult] = useState('');
  const [abrThreshold, setAbrThreshold] = useState('');
  const [alertingBehaviours, setAlertingBehaviours] = useState([]);
  const [hearingScreening, setHearingScreening] = useState('');
  const [earlyIntervention, setEarlyIntervention] = useState([]);

  // Noise-induced HL
  const [noiseExposureType, setNoiseExposureType] = useState('');
  const [noiseLevelDb, setNoiseLevelDb] = useState('');
  const [noiseYears, setNoiseYears] = useState('');
  const [tts, setTts] = useState('');
  const [nishiFindings, setNishiFindings] = useState('');

  // Sudden SNHL
  const [suddenOnset, setSuddenOnset] = useState('');
  const [suddenSide, setSuddenSide] = useState('');
  const [suddenDegree, setSuddenDegree] = useState('');
  const [suddenTinnitus, setSuddenTinnitus] = useState('');
  const [suddenVertigo, setSuddenVertigo] = useState('');
  const [suddenTreatment, setSuddenTreatment] = useState([]);
  const [suddenOutcome, setSuddenOutcome] = useState('');

  const ptaAvgR = useMemo(() => ptaAvg(acR), [acR]);
  const ptaAvgL = useMemo(() => ptaAvg(acL), [acL]);

  const criticalAlert = useMemo(() => {
    if (sec.sudden === 'Applicable' && suddenOnset && (ptaAvgR !== null && ptaAvgR > 30) || (ptaAvgL !== null && ptaAvgL > 30))
      return 'Sudden SNHL — start oral prednisolone 1 mg/kg/day within 72h for best recovery; rule out acoustic neuroma with MRI IAC';
    return '';
  }, [sec.sudden, suddenOnset, ptaAvgR, ptaAvgL]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-audiology', patientId, encounterId, data: { age, complaints, hlSide, hlOnset, hlDuration, hlProgression, riskFactors, familyHl, occupation, communicationDifficulty, acR, bcR, acL, bcL, ptaAvgR, ptaAvgL, whoGradeR: whoGrade(ptaAvgR), whoGradeL: whoGrade(ptaAvgL), abgR, abgL, srtR, srtL, sdsR, sdsL, rollover, masking, audiogramPattern, tympR, tympL, stapediusR, stapediusL, stapAcousticReflex, reflex500, reflex1k, reflex2k, reflex4k, dpoaeR, dpoaeL, teoaeR, teoaeL, oaeInterpretation, beraMode, waveVR, waveVL, i3R, i3L, i5R, i5L, beraThresholdR, beraThresholdL, beraNorm, beraInterpretation, spApRatioR, spApRatioL, ecochgInterpretation, vngFindings, vhitR, vhitL, vempCervical, vempOcular, caloricTest, caloricCanal, haTrial, haType, haFitting, rea, satisfactionScore, haBenefit, ciCandidacy, ciSide, ciDuration, ciPrelingualDeafness, ciDeviceModel, ciActivationDate, ciThresholds, ciCategoriesOfAuditoryPerformance, mappingNotes, pedAgeMonths, boeaResult, abrThreshold, alertingBehaviours, hearingScreening, earlyIntervention, noiseExposureType, noiseLevelDb, noiseYears, tts, nishiFindings, suddenOnset, suddenSide, suddenDegree, suddenTinnitus, suddenVertigo, suddenTreatment, suddenOutcome } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Audiology & Hearing</h1>
            <p className="text-indigo-100 text-sm">PTA · BERA · OAE · Impedance · Vestibular · Hearing Aid · Cochlear Implant</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>India has ~63 million people with significant hearing loss (WHO). CSOM leading cause of preventable HL. RBSK neonatal screening with OAE (2013-). NHM free hearing aids for BPL through Ali Yavar Jung NIHH and ADIP scheme. Ototoxicity from aminoglycosides (TB regimen, neonatal sepsis) significant. Noise-induced HL from occupational (factories, construction) and recreational (firecrackers — Diwali). Cochlear implant covered under PM-JAY and ADIP for children with profound bilateral SNHL. Major centres: AIIMS Delhi, Sri Balaji NIHH, AYJ-NIHH Mumbai/Chennai.</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700">URGENT</div><div className="text-red-800 text-sm">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="Audiological History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Patient age"><input className={inp} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 35 years" /></FL>
          <FL label="Side affected"><Pills options={['Right', 'Left', 'Bilateral', 'Bilateral asymmetric']} value={hlSide} onChange={setHlSide} /></FL>
        </div>
        <FL label="Complaints">
          <Pills options={['Hearing loss', 'Tinnitus', 'Blocked ear', 'Dizziness/vertigo', 'Sound distortion', 'Hyperacusis (sound sensitivity)', 'Autophony (own voice loud)', 'Diplacusis (pitch distortion)', 'Balance problem']} value={complaints} onChange={setComplaints} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Onset"><Pills options={['Congenital', 'Sudden (<72h)', 'Rapid (days)', 'Gradual (months-years)', 'Fluctuating', 'Stepwise']} value={hlOnset} onChange={setHlOnset} /></FL>
          <FL label="Duration"><input className={inp} value={hlDuration} onChange={e => setHlDuration(e.target.value)} placeholder="e.g. 6 months" /></FL>
        </div>
        <FL label="Progression"><Pills options={['Stable', 'Slowly progressive', 'Rapidly progressive', 'Fluctuating (Meniere)', 'Improving', 'Static after initial loss']} value={hlProgression} onChange={setHlProgression} /></FL>
        <FL label="Risk factors">
          <Pills options={['Noise exposure (occupational)', 'Noise exposure (recreational — firecrackers/concerts)', 'Aminoglycosides (gentamicin/streptomycin)', 'Cisplatin / carboplatin', 'Loop diuretics', 'Quinine/hydroxychloroquine', 'Head trauma', 'Meningitis/encephalitis', 'Prematurity + NICU stay', 'Congenital infection (TORCH)', 'Consanguinity', 'Diabetes', 'Otitis media (recurrent)']} value={riskFactors} onChange={setRiskFactors} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Family HL / genetic"><Pills options={['None known', 'First-degree relative with HL', 'Known genetic syndrome (GJB2/GJB6/SLC26A4)', 'Consanguineous parents', 'GJB2 connexin 26 mutation']} value={familyHl} onChange={setFamilyHl} /></FL>
          <FL label="Occupation"><input className={inp} value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g. Factory worker, teacher, musician" /></FL>
        </div>
        <FL label="Communication difficulties">
          <Pills options={['Needs TV louder than others', 'Asks for repetition', 'Difficulty in noisy environments', 'Misses telephone conversations', 'Difficulty understanding women/children (high pitch)', 'Social withdrawal / isolation']} value={communicationDifficulty} onChange={setCommunicationDifficulty} multi />
        </FL>
      </Section>

      <Section title="Pure Tone Audiometry (PTA)" applicable={sec.pta} onApplicable={v => sa('pta', v)}>
        <div className="space-y-4">
          <div>
            <div className="text-sm font-bold text-indigo-700 mb-2">RIGHT EAR</div>
            <PtaGrid side="Right" acValues={acR} bcValues={bcR} onAcChange={(f, v) => setAcR(a => ({ ...a, [f]: v }))} onBcChange={(f, v) => setBcR(a => ({ ...a, [f]: v }))} />
          </div>
          <div>
            <div className="text-sm font-bold text-indigo-700 mb-2">LEFT EAR</div>
            <PtaGrid side="Left" acValues={acL} bcValues={bcL} onAcChange={(f, v) => setAcL(a => ({ ...a, [f]: v }))} onBcChange={(f, v) => setBcL(a => ({ ...a, [f]: v }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {ptaAvgR !== null && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
              <div className="text-xs text-indigo-600 font-bold">RIGHT PTA avg (500-4kHz)</div>
              <div className="text-lg font-bold text-indigo-800">{ptaAvgR} dB HL</div>
              <div className="text-sm text-indigo-700">{whoGrade(ptaAvgR)}</div>
              {abgR !== null && <div className="text-xs text-indigo-600">ABG: {abgR} dB {abgR > 15 ? '— Conductive component' : '— No significant ABG'}</div>}
            </div>
          )}
          {ptaAvgL !== null && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
              <div className="text-xs text-indigo-600 font-bold">LEFT PTA avg (500-4kHz)</div>
              <div className="text-lg font-bold text-indigo-800">{ptaAvgL} dB HL</div>
              <div className="text-sm text-indigo-700">{whoGrade(ptaAvgL)}</div>
              {abgL !== null && <div className="text-xs text-indigo-600">ABG: {abgL} dB {abgL > 15 ? '— Conductive component' : '— No significant ABG'}</div>}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="SRT — Right" sub="dB HL"><input className={inp} value={srtR} onChange={e => setSrtR(e.target.value)} placeholder="e.g. 45" /></FL>
          <FL label="SRT — Left" sub="dB HL"><input className={inp} value={srtL} onChange={e => setSrtL(e.target.value)} placeholder="e.g. 30" /></FL>
          <FL label="SDS — Right" sub="%"><input className={inp} value={sdsR} onChange={e => setSdsR(e.target.value)} placeholder="e.g. 80%" /></FL>
          <FL label="SDS — Left" sub="%"><input className={inp} value={sdsL} onChange={e => setSdsL(e.target.value)} placeholder="e.g. 92%" /></FL>
        </div>
        <FL label="Audiogram pattern">
          <Pills options={['Flat', 'High-frequency slope (ski-slope)', 'Low-frequency loss', 'Cookie-bite (mid-frequency)', 'Notch at 4 kHz (NIHL)', 'Rising (conductive)', 'Corner audiogram (profound)', 'Normal']} value={audiogramPattern} onChange={setAudiogramPattern} />
        </FL>
        <FL label="Rollover / Rollover index"><Pills options={['None', 'Rollover present (retrocochlear lesion suspected)']} value={rollover} onChange={setRollover} /></FL>
        <FL label="Masking used?"><Pills options={['Yes — contralateral masking applied', 'No', 'Not required']} value={masking} onChange={setMasking} /></FL>
      </Section>

      <Section title="Immittance Audiometry / Impedance" applicable={sec.impedance} onApplicable={v => sa('impedance', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Tympanogram — Right">
            <Pills options={['Type A (normal)', 'Type As (reduced compliance — OSL/fixation)', 'Type Ad (increased compliance — flaccid TM/ossicular discontinuity)', 'Type B (flat — effusion/perforation/wax)', 'Type C (negative pressure — ETD)']} value={tympR} onChange={setTympR} />
          </FL>
          <FL label="Tympanogram — Left">
            <Pills options={['Type A (normal)', 'Type As (reduced compliance — OSL/fixation)', 'Type Ad (increased compliance — flaccid TM/ossicular discontinuity)', 'Type B (flat — effusion/perforation/wax)', 'Type C (negative pressure — ETD)']} value={tympL} onChange={setTympL} />
          </FL>
        </div>
        <div className="rounded-lg bg-white border border-indigo-200 p-3 space-y-2">
          <div className="text-sm font-bold text-indigo-700">Acoustic Reflex Thresholds</div>
          <div className="text-xs text-gray-500">Normal: 70–100 dB HL. Absent if SNHL {'>'}70dB, conductive loss, or retrocochlear pathology</div>
          <div className="grid grid-cols-4 gap-2">
            <FL label="500 Hz"><input className={inp} value={reflex500} onChange={e => setReflex500(e.target.value)} placeholder="dB" /></FL>
            <FL label="1000 Hz"><input className={inp} value={reflex1k} onChange={e => setReflex1k(e.target.value)} placeholder="dB" /></FL>
            <FL label="2000 Hz"><input className={inp} value={reflex2k} onChange={e => setReflex2k(e.target.value)} placeholder="dB" /></FL>
            <FL label="4000 Hz"><input className={inp} value={reflex4k} onChange={e => setReflex4k(e.target.value)} placeholder="dB" /></FL>
          </div>
        </div>
        <FL label="Stapedial reflex interpretation">
          <Pills options={['Normal bilateral', 'Absent right', 'Absent left', 'Absent bilateral', 'Reflex decay positive (retrocochlear)', 'Reflex at reduced SL (loudness recruitment — cochlear)']} value={stapAcousticReflex} onChange={setStapAcousticReflex} />
        </FL>
      </Section>

      <Section title="Otoacoustic Emissions (OAE)" applicable={sec.oae} onApplicable={v => sa('oae', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="DPOAE — Right"><Pills options={['Pass (OHC intact)', 'Refer (OHC dysfunction)', 'Not done']} value={dpoaeR} onChange={setDpoaeR} /></FL>
          <FL label="DPOAE — Left"><Pills options={['Pass (OHC intact)', 'Refer (OHC dysfunction)', 'Not done']} value={dpoaeL} onChange={setDpoaeL} /></FL>
          <FL label="TEOAE — Right"><Pills options={['Pass', 'Refer', 'Not done']} value={teoaeR} onChange={setTeoaeR} /></FL>
          <FL label="TEOAE — Left"><Pills options={['Pass', 'Refer', 'Not done']} value={teoaeL} onChange={setTeoaeL} /></FL>
        </div>
        <FL label="OAE interpretation">
          <textarea className={ta} value={oaeInterpretation} onChange={e => setOaeInterpretation(e.target.value)} placeholder="e.g. DPOAE: Robust pass bilaterally — outer hair cell function intact; suggests retrocochlear pathology for speech-PTA discrepancy" />
        </FL>
      </Section>

      <Section title="BERA / ABR (Brainstem Evoked Response Audiometry)" applicable={sec.bera} onApplicable={v => sa('bera', v)}>
        <FL label="Mode"><Pills options={['Click BERA (threshold estimation)', 'Frequency-specific BERA (tone pip)', 'Bone-conduction BERA', 'Neuro-diagnostic BERA (1kHz low-pass masking)']} value={beraMode} onChange={setBeraMode} /></FL>
        <div className="rounded-lg bg-white border border-indigo-200 p-3 space-y-2">
          <div className="text-sm font-bold text-indigo-700">Wave Latencies (ms) — Normal values in parentheses</div>
          <div className="grid grid-cols-3 gap-2">
            <FL label="Wave V — Right" sub="(N: 5.5–6.0ms)"><input className={inp} value={waveVR} onChange={e => setWaveVR(e.target.value)} placeholder="e.g. 5.8" /></FL>
            <FL label="Wave V — Left" sub="(N: 5.5–6.0ms)"><input className={inp} value={waveVL} onChange={e => setWaveVL(e.target.value)} placeholder="e.g. 5.9" /></FL>
            <FL label="ILD (interaural V delay)" sub="(N: <0.4ms)"><input className={inp} value={beraNorm} onChange={e => setBeraNorm(e.target.value)} placeholder="e.g. 0.1" /></FL>
            <FL label="I–III IPL — Right" sub="(N: ~2.0ms)"><input className={inp} value={i3R} onChange={e => setI3R(e.target.value)} placeholder="e.g. 2.1" /></FL>
            <FL label="I–III IPL — Left"><input className={inp} value={i3L} onChange={e => setI3L(e.target.value)} placeholder="e.g. 2.0" /></FL>
            <div />
            <FL label="I–V IPL — Right" sub="(N: ~4.0ms)"><input className={inp} value={i5R} onChange={e => setI5R(e.target.value)} placeholder="e.g. 4.0" /></FL>
            <FL label="I–V IPL — Left"><input className={inp} value={i5L} onChange={e => setI5L(e.target.value)} placeholder="e.g. 4.1" /></FL>
            <div />
            <FL label="Threshold — Right" sub="dB nHL"><input className={inp} value={beraThresholdR} onChange={e => setBeraThresholdR(e.target.value)} placeholder="e.g. 30 dB nHL" /></FL>
            <FL label="Threshold — Left" sub="dB nHL"><input className={inp} value={beraThresholdL} onChange={e => setBeraThresholdL(e.target.value)} placeholder="e.g. 35 dB nHL" /></FL>
          </div>
        </div>
        <FL label="BERA interpretation">
          <textarea className={ta} value={beraInterpretation} onChange={e => setBeraInterpretation(e.target.value)} placeholder="e.g. Prolonged I–V IPL right (4.8ms vs 4.0ms normal) with normal waveforms — retrocochlear pathology, MRI IAC suggested" />
        </FL>
      </Section>

      <Section title="Electrocochleography (ECochG)" applicable={sec.ecochg} onApplicable={v => sa('ecochg', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="SP/AP ratio — Right" sub="(Normal <0.4)"><input className={inp} value={spApRatioR} onChange={e => setSpApRatioR(e.target.value)} placeholder="e.g. 0.5 (elevated — endolymphatic hydrops)" /></FL>
          <FL label="SP/AP ratio — Left"><input className={inp} value={spApRatioL} onChange={e => setSpApRatioL(e.target.value)} placeholder="e.g. 0.3" /></FL>
        </div>
        <FL label="ECochG interpretation">
          <input className={inp} value={ecochgInterpretation} onChange={e => setEcochgInterpretation(e.target.value)} placeholder="e.g. Elevated SP/AP ratio right — consistent with endolymphatic hydrops (Meniere disease)" />
        </FL>
      </Section>

      <Section title="Vestibular Function Tests" applicable={sec.vestibular} onApplicable={v => sa('vestibular', v)}>
        <FL label="VNG / ENG findings">
          <textarea className={ta} value={vngFindings} onChange={e => setVngFindings(e.target.value)} placeholder="e.g. Spontaneous nystagmus right-beating; Dix-Hallpike positive right with geotropic nystagmus — BPPV posterior canal right" />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="vHIT — Right" sub="VOR gain + saccades"><input className={inp} value={vhitR} onChange={e => setVhitR(e.target.value)} placeholder="e.g. Gain 0.6 (normal >0.8) + covert saccades" /></FL>
          <FL label="vHIT — Left"><input className={inp} value={vhitL} onChange={e => setVhitL(e.target.value)} placeholder="e.g. Gain 0.92 — normal" /></FL>
          <FL label="Cervical VEMP (c-VEMP)"><input className={inp} value={vempCervical} onChange={e => setVempCervical(e.target.value)} placeholder="e.g. Absent right (saccule/inferior vestibular nerve)" /></FL>
          <FL label="Ocular VEMP (o-VEMP)"><input className={inp} value={vempOcular} onChange={e => setVempOcular(e.target.value)} placeholder="e.g. Present bilateral, normal amplitude" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Caloric test"><input className={inp} value={caloricTest} onChange={e => setCaloricTest(e.target.value)} placeholder="e.g. 35% canal paresis right" /></FL>
          <FL label="Canal paresis">
            <Pills options={['None', 'Right canal paresis', 'Left canal paresis', 'Bilateral weakness', 'Directional preponderance']} value={caloricCanal} onChange={setCaloricCanal} />
          </FL>
        </div>
      </Section>

      <Section title="Hearing Aid Assessment" applicable={sec.hearingAid} onApplicable={v => sa('hearingAid', v)}>
        <FL label="Hearing aid trial?"><Pills options={['Yes — ongoing trial', 'Yes — completed with benefit', 'No benefit reported', 'Not yet tried', 'Declined']} value={haTrial} onChange={setHaTrial} /></FL>
        <FL label="HA type / style">
          <Pills options={['BTE (behind-the-ear)', 'RIC/RITE (receiver-in-canal)', 'ITE (in-the-ear)', 'ITC (in-the-canal)', 'CIC (completely-in-canal)', 'BAHA (bone-anchored HA)', 'CROS/BiCROS', 'Pocket/body-worn']} value={haType} onChange={setHaType} />
        </FL>
        <FL label="Fitting target">
          <Pills options={['NAL-NL2 (National Acoustic Labs)', 'DSL v5 (paediatric)', 'Proprietary target', 'Not verified']} value={haFitting} onChange={setHaFitting} />
        </FL>
        <FL label="Real-ear measurement (REM/REA)">
          <Pills options={['Done — targets met', 'Done — requires adjustment', 'Not done']} value={rea} onChange={setRea} />
        </FL>
        <FL label="Satisfaction / benefit">
          <Pills options={['Excellent (APHAB global benefit >20%)', 'Good', 'Moderate', 'Poor — reprogramming needed', 'Rejected']} value={haBenefit} onChange={setHaBenefit} />
        </FL>
      </Section>

      <Section title="Cochlear Implant" applicable={sec.cochlearImplant} onApplicable={v => sa('cochlearImplant', v)}>
        <FL label="Candidacy status">
          <Pills options={['Candidate (meets criteria)', 'Not a candidate (residual HL too mild)', 'Post-implant (activated)', 'Under evaluation', 'Declined — family preference']} value={ciCandidacy} onChange={setCiCandidacy} />
        </FL>
        <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-xs text-indigo-800 space-y-1">
          <div className="font-bold">India CI candidacy criteria (ADIP/PM-JAY):</div>
          <div>• Profound bilateral SNHL (PTA ≥90 dB HL) or severe with &lt;50% open-set sentence score</div>
          <div>• Minimum age 12 months; best before 3.5 years (language development critical period)</div>
          <div>• Patent cochlea on CT/MRI; adequate cochlear nerve on MRI IAC</div>
          <div>• No significant cognitive/physical contraindication</div>
          <div>• Committed family + access to habilitation services</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side"><Pills options={['Right ear', 'Left ear', 'Bilateral simultaneous', 'Bilateral sequential']} value={ciSide} onChange={setCiSide} /></FL>
          <FL label="Duration of deafness"><input className={inp} value={ciDuration} onChange={e => setCiDuration(e.target.value)} placeholder="e.g. 2 years (post-meningitis)" /></FL>
        </div>
        <FL label="Pre-lingual deafness?"><Pills options={['Yes (before 2 years)', 'No (post-lingual)', 'Peri-lingual (2–7 years)']} value={ciPrelingualDeafness} onChange={setCiPrelingualDeafness} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Device model"><input className={inp} value={ciDeviceModel} onChange={e => setCiDeviceModel(e.target.value)} placeholder="e.g. Cochlear Nucleus 7 / MED-EL Synchrony / AB Naida" /></FL>
          <FL label="Activation date"><input className={inp} type="date" value={ciActivationDate} onChange={e => setCiActivationDate(e.target.value)} /></FL>
        </div>
        <FL label="Post-activation thresholds">
          <input className={inp} value={ciThresholds} onChange={e => setCiThresholds(e.target.value)} placeholder="e.g. Soundfield thresholds 20–30 dB HL across 250–4000 Hz" />
        </FL>
        <FL label="CAP (Categories of Auditory Performance)" sub="0–7">
          <Pills options={['CAP 0 (no awareness of environmental sounds)', 'CAP 1 (awareness of environmental sounds)', 'CAP 2 (responds to speech sounds)', 'CAP 3 (identifies environmental sounds)', 'CAP 4 (discriminates speech without lipreading)', 'CAP 5 (understands common phrases in quiet)', 'CAP 6 (understands conversation — telephone possible)', 'CAP 7 (uses telephone with known speaker)']} value={ciCategoriesOfAuditoryPerformance} onChange={setCiCategoriesOfAuditoryPerformance} />
        </FL>
        <FL label="Mapping notes">
          <textarea className={ta} value={mappingNotes} onChange={e => setMappingNotes(e.target.value)} placeholder="e.g. M/C levels, impedances, pitch testing, programming strategy (ACE/HiRes 120)..." />
        </FL>
      </Section>

      <Section title="Paediatric Audiology" applicable={sec.paediatricAud} onApplicable={v => sa('paediatricAud', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Age" sub="months"><input className={inp} value={pedAgeMonths} onChange={e => setPedAgeMonths(e.target.value)} placeholder="e.g. 18 months" /></FL>
          <FL label="Neonatal hearing screening"><Pills options={['Pass bilateral (OAE)', 'Refer — OAE bilateral', 'Refer — BERA required', 'Not screened (born at home)', 'RBSK screening positive']} value={hearingScreening} onChange={setHearingScreening} /></FL>
        </div>
        <FL label="BOA / VRA / Play audiometry result">
          <input className={inp} value={boeaResult} onChange={e => setBoeaResult(e.target.value)} placeholder="e.g. VRA: Minimal response level 60 dB HL bilateral — suggestive of moderate SNHL" />
        </FL>
        <FL label="ABR threshold estimation">
          <input className={inp} value={abrThreshold} onChange={e => setAbrThreshold(e.target.value)} placeholder="e.g. BERA thresholds Right: 30 dB nHL, Left: 35 dB nHL — mild SNHL bilateral" />
        </FL>
        <FL label="Alerting behaviours to sound">
          <Pills options={['Startles to loud sound', 'Turns to sound source', 'Localises sound bilaterally', 'Responds to name', 'Responds to whisper', 'No alerting behaviours']} value={alertingBehaviours} onChange={setAlertingBehaviours} multi />
        </FL>
        <FL label="Early intervention">
          <Pills options={['HA fitting (within 3 months of diagnosis)', 'CI evaluation (profound HL)', 'Speech-language therapy', 'Auditory verbal therapy (AVT)', 'Sign language training (if family choice)', 'Special school for hearing impaired', 'Mainstream with support', 'AYJ-NIHH referral', 'ADIP scheme application']} value={earlyIntervention} onChange={setEarlyIntervention} multi />
        </FL>
      </Section>

      <Section title="Noise-Induced Hearing Loss (NIHL)" applicable={sec.noiseinduced} onApplicable={v => sa('noiseinduced', v)}>
        <FL label="Type of noise exposure">
          <Pills options={['Occupational (factory/construction/military)', 'Recreational (concerts/DJ/headphone use)', 'Impulse/blast (firecrackers/gunshot)', 'Combination']} value={noiseExposureType} onChange={setNoiseExposureType} />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Typical noise level" sub="dBA"><input className={inp} value={noiseLevelDb} onChange={e => setNoiseLevelDb(e.target.value)} placeholder="e.g. 95 dBA" /></FL>
          <FL label="Exposure duration (years)"><input className={inp} value={noiseYears} onChange={e => setNoiseYears(e.target.value)} placeholder="e.g. 15 years" /></FL>
        </div>
        <FL label="Temporary threshold shift (TTS)?">
          <Pills options={['Yes (HL improves after rest)', 'No — permanent', 'Not assessed']} value={tts} onChange={setTts} />
        </FL>
        <FL label="Audiogram (NIHL) typical findings">
          <input className={inp} value={nishiFindings} onChange={e => setNishiFindings(e.target.value)} placeholder="e.g. 4 kHz notch bilaterally (classic NIHL), AC threshold 55 dB HL at 4 kHz, recovery at 8 kHz" />
        </FL>
      </Section>

      <Section title="Sudden Sensorineural Hearing Loss (SSNHL)" applicable={sec.sudden} onApplicable={v => sa('sudden', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Onset"><input className={inp} value={suddenOnset} onChange={e => setSuddenOnset(e.target.value)} placeholder="e.g. Woke up deaf in right ear — 3 days ago" /></FL>
          <FL label="Side affected"><Pills options={['Right', 'Left', 'Bilateral (rare — consider autoimmune/bilateral acoustic neuroma)']} value={suddenSide} onChange={setSuddenSide} /></FL>
        </div>
        <FL label="Degree of loss"><Pills options={['Mild (26–40 dB)', 'Moderate (41–55 dB)', 'Moderate-severe (56–70 dB)', 'Severe (71–90 dB)', 'Profound (>90 dB)']} value={suddenDegree} onChange={setSuddenDegree} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Associated tinnitus"><Pills options={['None', 'Low-pitched', 'High-pitched', 'Roaring (Meniere?)']} value={suddenTinnitus} onChange={setSuddenTinnitus} /></FL>
          <FL label="Associated vertigo"><Pills options={['None', 'Mild', 'Severe (Meniere-like)', 'BPPV-like']} value={suddenVertigo} onChange={setSuddenVertigo} /></FL>
        </div>
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <b>SSNHL management:</b> Oral prednisolone 1 mg/kg/day (max 60 mg) × 10–14 days — start within 2 weeks. If failed/contraindicated: Intratympanic dexamethasone (4mg/mL × 3–5 injections). MRI IAC to exclude acoustic neuroma. Audiogram recheck at 6 weeks. Spontaneous recovery in ~65%.
        </div>
        <FL label="Treatment">
          <Pills options={['Oral corticosteroid (prednisolone)', 'Intratympanic steroids (IT-Dexa)', 'Combined oral + IT steroids', 'Hyperbaric oxygen (adjunctive)', 'Antivirals (acyclovir — if viral suspected)', 'Vasodilators (pentoxifylline/carbogen)', 'Hearing aid (if permanent residual HL)', 'Monitoring only (mild loss with spontaneous recovery)']} value={suddenTreatment} onChange={setSuddenTreatment} multi />
        </FL>
        <FL label="Outcome"><Pills options={['Complete recovery (≤10 dB from baseline)', 'Partial recovery', 'No recovery', 'Worsening', 'Follow-up pending']} value={suddenOutcome} onChange={setSuddenOutcome} /></FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow transition-all">
        Save Audiology & Hearing Assessment
      </button>
    </div>
  );
}
