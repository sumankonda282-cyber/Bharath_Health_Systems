/**
 * @shared-pool
 * ThroatAndLarynxForm — Throat, larynx & voice disorders assessment
 * Scoring: Centor/McIsaac score (strep pharyngitis), OSA (STOP-BANG),
 *   Voice Handicap Index (VHI-10), Dysphagia severity (FOIS), RSI (laryngopharyngeal reflux)
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700',
  pill: 'bg-rose-100 border-rose-300 text-rose-800',
  active: 'bg-rose-600 border-rose-700 text-white',
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

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400";
const ta = inp + " min-h-[72px] resize-y";

// STOP-BANG OSA screening
const STOPBANG = ['Snore loudly?', 'Tired/sleepy during day?', 'Observed to stop breathing?', 'High blood pressure (treated or untreated)?', 'BMI >35?', 'Age >50 years?', 'Neck circumference >40cm?', 'Male gender?'];

// VHI-10
const VHI10 = [
  'My voice makes it difficult for people to hear me',
  'I run out of air when I talk',
  'People have difficulty understanding me in a noisy room',
  'The sound of my voice varies throughout the day',
  'My family has difficulty hearing me when I call them throughout the house',
  'I use the phone less often than I would like',
  'I\'m tense when talking with others because of my voice',
  'I tend to avoid groups of people because of my voice',
  'People seem irritated with my voice',
  'My voice problems upset me',
];

// Reflux Symptom Index (RSI)
const RSI_ITEMS = [
  'Hoarseness or a problem with your voice',
  'Clearing your throat',
  'Excess throat mucus or postnasal drip',
  'Difficulty swallowing food, liquids, or pills',
  'Coughing after you ate or after lying down',
  'Breathing difficulties or choking episodes',
  'Troublesome or annoying cough',
  'Sensations of something sticking in your throat or a lump in your throat',
  'Heartburn, chest pain, indigestion, or stomach acid coming up',
];

export default function ThroatAndLarynxForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', examination: 'Applicable', pharyngitis: 'N/A',
    tonsils: 'N/A', periconsillitis: 'N/A', voice: 'N/A', laryngoscopy: 'N/A',
    dysphagia: 'N/A', osa: 'N/A', lpr: 'N/A', tumour: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [complaints, setComplaints] = useState([]);
  const [duration, setDuration] = useState('');
  const [smoking, setSmoking] = useState('');
  const [alcohol, setAlcohol] = useState('');
  const [voiceUse, setVoiceUse] = useState('');
  const [gerd, setGerd] = useState('');

  // Examination
  const [oralHygiene, setOralHygiene] = useState('');
  const [tonsilGrade, setTonsilGrade] = useState('');
  const [tonsils, setTonsils] = useState('');
  const [pharynx, setPharynx] = useState('');
  const [uvula, setUvula] = useState('');
  const [neckNodes, setNeckNodes] = useState('');
  const [trismus, setTrismus] = useState('');

  // Pharyngitis — Centor/McIsaac
  const [centor, setCentor] = useState({ tonsilExudate: '', anteriorNodes: '', noYexus: '', age: '' });
  const centoScore = useMemo(() => {
    let s = 0;
    if (centor.tonsilExudate === 'Yes') s++;
    if (centor.anteriorNodes === 'Yes') s++;
    if (centor.noYexus === 'Yes') s++;
    const age = centor.age;
    if (age === '3–14y') s++;
    else if (age === '15–44y') s += 0;
    else if (age === '45+y') s--;
    return s;
  }, [centor]);
  const centorRisk = useMemo(() => {
    if (centoScore <= 0) return 'GAS risk <10% — no throat swab/antibiotics';
    if (centoScore === 1) return 'GAS risk ~10% — no throat swab/antibiotics';
    if (centoScore === 2) return 'GAS risk ~17% — throat swab or empiric treatment';
    if (centoScore === 3) return 'GAS risk ~35% — throat swab + empiric treatment';
    return 'GAS risk ~51% — empiric treatment (penicillin V/amoxicillin)';
  }, [centoScore]);

  const [pharyngitisTx, setPharyngitisTx] = useState([]);

  // Tonsils
  const [tonsillitisType, setTonsillitisType] = useState('');
  const [recurTonsillitis, setRecurTonsillitis] = useState('');
  const [paradise, setParadise] = useState('');
  const [tonsilsTx, setTonsilsTx] = useState([]);

  // Peritonsillar / Deep neck
  const [peritonsillar, setPeritonsillar] = useState('');
  const [bulging, setBulging] = useState('');
  const [deepNeckInfection, setDeepNeckInfection] = useState('');
  const [dnSpaces, setDnSpaces] = useState([]);
  const [dnManagement, setDnManagement] = useState([]);

  // Voice / Larynx
  const [dysphonia, setDysphonia] = useState('');
  const [dysphoniaType, setDysphoniaType] = useState('');
  const [dysphoniaDuration, setDysphoniaDuration] = useState('');
  const [vhi10, setVhi10] = useState({});
  const vhiTotal = useMemo(() => Object.values(vhi10).reduce((a, v) => a + (parseInt(v) || 0), 0), [vhi10]);
  const vhiSeverity = useMemo(() => {
    if (vhiTotal <= 10) return 'Normal';
    if (vhiTotal <= 20) return 'Mild impairment';
    if (vhiTotal <= 30) return 'Moderate impairment';
    return 'Severe impairment (>30)';
  }, [vhiTotal]);
  const [voiceTx, setVoiceTx] = useState([]);

  // Laryngoscopy
  const [laryngoscopyType, setLaryngoscopyType] = useState('');
  const [vocalCordMobility, setVocalCordMobility] = useState('');
  const [laryngoscopyFindings, setLaryngoscopyFindings] = useState([]);
  const [laryngoscopyNotes, setLaryngoscopyNotes] = useState('');

  // Dysphagia
  const [dysphagiaType, setDysphagiaType] = useState('');
  const [dysphagiaLevel, setDysphagiaLevel] = useState('');
  const [dysphagiaConsistency, setDysphagiaConsistency] = useState([]);
  const [aspirationRisk, setAspirationRisk] = useState('');
  const [fois, setFois] = useState('');
  const [dysphagiaInvestigations, setDysphagiaInvestigations] = useState([]);
  const [dysphagiaTx, setDysphagiaTx] = useState([]);

  // OSA
  const [stopbang, setStopbang] = useState({});
  const stopbangScore = useMemo(() => Object.values(stopbang).filter(v => v === 'Yes').length, [stopbang]);
  const osaRisk = useMemo(() => {
    if (stopbangScore <= 2) return 'Low risk OSA';
    if (stopbangScore <= 4) return 'Intermediate risk OSA';
    return 'High risk OSA (≥5) — refer sleep study';
  }, [stopbangScore]);
  const [osaEpworth, setOsaEpworth] = useState('');
  const [polysomnography, setPolysomnography] = useState('');
  const [ahi, setAhi] = useState('');
  const [osaTx, setOsaTx] = useState([]);

  // LPR
  const [rsi, setRsi] = useState({});
  const rsiTotal = useMemo(() => Object.values(rsi).reduce((a, v) => a + (parseInt(v) || 0), 0), [rsi]);
  const [lprFindings, setLprFindings] = useState([]);
  const [lprTx, setLprTx] = useState([]);

  // Tumour
  const [tumourSite, setTumourSite] = useState('');
  const [tumourBiopsy, setTumourBiopsy] = useState('');
  const [tumourStage, setTumourStage] = useState('');
  const [tumourTx, setTumourTx] = useState([]);

  const criticalAlert = useMemo(() => {
    if (deepNeckInfection === 'Yes') return 'Deep neck space infection — airway at risk, urgent surgical drainage + IV antibiotics';
    if (laryngoscopyFindings.includes('Supraglottitis/epiglottitis')) return 'Supraglottitis — do NOT examine throat in chair, urgent anaesthesia/ENT, prepare for surgical airway';
    return '';
  }, [deepNeckInfection, laryngoscopyFindings]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-throat-larynx', patientId, encounterId, data: { complaints, duration, smoking, alcohol, voiceUse, gerd, oralHygiene, tonsilGrade, tonsils, pharynx, uvula, neckNodes, trismus, centor, centoScore, centorRisk, pharyngitisTx, tonsillitisType, recurTonsillitis, paradise, tonsilsTx, peritonsillar, bulging, deepNeckInfection, dnSpaces, dnManagement, dysphonia, dysphoniaType, dysphoniaDuration, vhi10, vhiTotal, vhiSeverity, voiceTx, laryngoscopyType, vocalCordMobility, laryngoscopyFindings, laryngoscopyNotes, dysphagiaType, dysphagiaLevel, dysphagiaConsistency, aspirationRisk, fois, dysphagiaInvestigations, dysphagiaTx, stopbang, stopbangScore, osaRisk, osaEpworth, polysomnography, ahi, osaTx, rsi, rsiTotal, lprFindings, lprTx, tumourSite, tumourBiopsy, tumourStage, tumourTx } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Throat & Larynx</h1>
            <p className="text-rose-100 text-sm">Pharyngitis (Centor) · Tonsils · Voice (VHI-10) · Dysphagia (FOIS) · OSA (STOP-BANG) · LPR (RSI)</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Streptococcal pharyngitis → ARF/RHD still a major burden in India; Penicillin treatment mandatory for high Centor scores. Betel nut/tobacco chewing → OSMF, leukoplakia, oral/oropharyngeal carcinoma (India top 3 cancer site in men). Laryngeal carcinoma common in male smokers/alcohol users. HPV-associated oropharyngeal carcinoma rising in urban India. TB of larynx (mimics carcinoma) — biopsy mandatory. OSA underdiagnosed — no widespread polysomnography. PM-JAY covers tonsillectomy, laryngoscopy, UPPP for OSA.</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700">AIRWAY EMERGENCY</div><div className="text-red-800 text-sm">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="Throat History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <FL label="Complaints">
          <Pills options={['Sore throat', 'Odynophagia (painful swallowing)', 'Dysphagia (difficulty swallowing)', 'Hoarseness/dysphonia', 'Cough', 'Stridor', 'Globus sensation (lump in throat)', 'Snoring', 'Excessive daytime sleepiness', 'Mouth breathing', 'Bad breath (halitosis)', 'Throat mass/neck swelling', 'Bleeding']} value={complaints} onChange={setComplaints} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Duration"><input className={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 1 week" /></FL>
          <FL label="Voice use (occupation)"><Pills options={['Normal voice user', 'Professional voice user (singer/teacher)', 'Heavy voice user (auctioneer/politician)', 'Rarely uses voice']} value={voiceUse} onChange={setVoiceUse} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Smoking"><Pills options={['Non-smoker', 'Current (specify pack-years)', 'Ex-smoker', 'Bidi smoker', 'Passive']} value={smoking} onChange={setSmoking} /></FL>
          <FL label="Alcohol"><Pills options={['None', 'Occasional', 'Moderate', 'Heavy/daily', 'Country liquor']} value={alcohol} onChange={setAlcohol} /></FL>
        </div>
        <FL label="GERD / acid reflux"><Pills options={['Yes — diagnosed', 'Yes — symptoms only', 'No', 'Uncertain']} value={gerd} onChange={setGerd} /></FL>
      </Section>

      <Section title="Throat Examination" applicable={sec.examination} onApplicable={v => sa('examination', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Oral hygiene"><Pills options={['Good', 'Fair', 'Poor (dental caries/calculus)', 'OSMF features']} value={oralHygiene} onChange={setOralHygiene} /></FL>
          <FL label="Uvula"><Pills options={['Midline', 'Deviated right', 'Deviated left', 'Elongated', 'Absent (post-surgery)']} value={uvula} onChange={setUvula} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Tonsil size (Brodsky grade)"><Pills options={['Grade 0 (absent)', 'Grade 1 (<25% oropharynx)', 'Grade 2 (25–50%)', 'Grade 3 (50–75%)', 'Grade 4 (kissing tonsils >75%)']} value={tonsilGrade} onChange={setTonsilGrade} /></FL>
          <FL label="Tonsil appearance"><Pills options={['Normal pink', 'Hyperaemic', 'Exudate/membrane', 'Cryptic', 'Smooth (atrophic/fibrosed)', 'Asymmetric — assess for malignancy']} value={tonsils} onChange={setTonsils} /></FL>
        </div>
        <FL label="Posterior pharyngeal wall"><Pills options={['Normal', 'Erythematous', 'Granular (chronic pharyngitis)', 'Lymphoid follicles (cobblestone)', 'Post-nasal drip visible', 'Mass/ulcer']} value={pharynx} onChange={setPharynx} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Neck nodes"><Pills options={['Not palpable', 'Jugulodigastric (level II)', 'Level I (submental/submandibular)', 'Level III/IV', 'Posterior triangle', 'Matted/fixed (malignancy?)']} value={neckNodes} onChange={setNeckNodes} /></FL>
          <FL label="Trismus"><Pills options={['None', 'Mild (>20mm)', 'Moderate (10–20mm)', 'Severe (<10mm — PTA?)']} value={trismus} onChange={setTrismus} /></FL>
        </div>
      </Section>

      <Section title="Pharyngitis / Strep Throat (Centor/McIsaac)" applicable={sec.pharyngitis} onApplicable={v => sa('pharyngitis', v)}>
        <div className="rounded-xl border border-rose-200 bg-white p-4 space-y-3">
          <div className="font-bold text-rose-700 text-sm">McIsaac Criteria (modified Centor)</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">Tonsillar exudate or swelling</span>
              <Pills options={['Yes', 'No']} value={centor.tonsilExudate} onChange={v => setCentor(c => ({ ...c, tonsilExudate: v }))} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">Tender anterior cervical lymph nodes</span>
              <Pills options={['Yes', 'No']} value={centor.anteriorNodes} onChange={v => setCentor(c => ({ ...c, anteriorNodes: v }))} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">No cough</span>
              <Pills options={['Yes (absent cough)', 'No (cough present)']} value={centor.noYexus} onChange={v => setCentor(c => ({ ...c, noYexus: v }))} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">Age group</span>
              <Pills options={['3–14y', '15–44y', '45+y']} value={centor.age} onChange={v => setCentor(c => ({ ...c, age: v }))} />
            </div>
          </div>
          {(centor.tonsilExudate || centor.anteriorNodes || centor.noYexus || centor.age) && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${centoScore >= 3 ? 'bg-red-100 text-red-700' : centoScore >= 2 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              Score: {centoScore} — {centorRisk}
            </div>
          )}
        </div>
        <FL label="Treatment">
          <Pills options={['Symptomatic (analgesia/gargle)', 'Penicillin V 10-day course', 'Amoxicillin 10-day course', 'Azithromycin (pen-allergic)', 'Rapid antigen test (RADT)', 'Throat swab for culture', 'Steroids (dexamethasone — single dose for pain)']} value={pharyngitisTx} onChange={setPharyngitisTx} multi />
        </FL>
      </Section>

      <Section title="Tonsils" applicable={sec.tonsils} onApplicable={v => sa('tonsils', v)}>
        <FL label="Tonsillitis type"><Pills options={['Acute follicular', 'Acute membranous', 'Acute herpetic', 'Infectious mononucleosis (glandular fever)', 'Chronic tonsillitis', 'Recurrent acute tonsillitis', 'Tonsillar hypertrophy without infection']} value={tonsillitisType} onChange={setTonsillitisType} /></FL>
        <FL label="Recurrent tonsillitis frequency">
          <input className={inp} value={recurTonsillitis} onChange={e => setRecurTonsillitis(e.target.value)} placeholder="e.g. 6 episodes in 1 year (Paradise criteria met)" />
        </FL>
        <FL label="Paradise criteria for tonsillectomy">
          <Pills options={['≥7 episodes in 1 year', '≥5 per year × 2 years', '≥3 per year × 3 years', 'Not meeting criteria yet', 'Bilateral hypertrophy (airway/OSA)']} value={paradise} onChange={setParadise} />
        </FL>
        <FL label="Treatment"><Pills options={['Conservative (antibiotics per episode)', 'Tonsillectomy', 'Adenotonsillectomy (if adenoid hypertrophy)', 'Intracapsular tonsillectomy (partial)', 'Coblation tonsillectomy']} value={tonsilsTx} onChange={setTonsilsTx} multi /></FL>
      </Section>

      <Section title="Peritonsillar / Deep Neck Infection" applicable={sec.periconsillitis} onApplicable={v => sa('periconsillitis', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Peritonsillar abscess"><Pills options={['Yes', 'No — peritonsillar cellulitis only']} value={peritonsillar} onChange={setPeritonsillar} /></FL>
          <FL label="Soft palate bulging"><Pills options={['Present', 'Absent']} value={bulging} onChange={setBulging} /></FL>
        </div>
        <FL label="Deep neck space infection?"><Pills options={['Yes', 'No']} value={deepNeckInfection} onChange={setDeepNeckInfection} /></FL>
        {deepNeckInfection === 'Yes' && (
          <>
            <FL label="Spaces involved">
              <Pills options={['Parapharyngeal', 'Retropharyngeal', 'Submandibular (Ludwig\'s angina)', 'Danger space (descending mediastinitis)', 'Masticator', 'Prevertebral']} value={dnSpaces} onChange={setDnSpaces} multi />
            </FL>
            <FL label="Management">
              <Pills options={['IV antibiotics (clindamycin + metronidazole / piperacillin-tazobactam)', 'Needle aspiration (PTA)', 'Incision & drainage (I&D)', 'Trans-oral drainage', 'CT neck (with contrast) — mandatory', 'Airway management (intubation/tracheostomy)', 'Mediastinal drainage (descending mediastinitis)']} value={dnManagement} onChange={setDnManagement} multi />
            </FL>
          </>
        )}
      </Section>

      <Section title="Voice Disorders" applicable={sec.voice} onApplicable={v => sa('voice', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Dysphonia present"><Pills options={['Yes', 'No']} value={dysphonia} onChange={setDysphonia} /></FL>
          <FL label="Duration"><Pills options={['<2 weeks (acute)', '2–6 weeks', '>6 weeks (needs laryngoscopy)']} value={dysphoniaDuration} onChange={setDysphoniaDuration} /></FL>
        </div>
        <FL label="Type of dysphonia">
          <Pills options={['Hoarseness (rough/harsh quality)', 'Breathiness (air leak)', 'Strain/effort (MTD)', 'Tremor (neurological)', 'Aphonia (complete loss)', 'Pitch breaks', 'Diplophonia (double pitch)', 'Wet/gurgly (supraglottic lesion)']} value={dysphoniaType} onChange={setDysphoniaType} />
        </FL>

        {/* VHI-10 */}
        <div className="rounded-xl border border-rose-200 bg-white p-4 space-y-2">
          <div className="font-bold text-rose-700 text-sm">VHI-10 (Voice Handicap Index-10) — 0=Never, 4=Always</div>
          {VHI10.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-gray-700 flex-1">{item}</span>
              <Pills options={['0', '1', '2', '3', '4']} value={vhi10[i]?.toString()} onChange={v => setVhi10(a => ({ ...a, [i]: v }))} accent={A} />
            </div>
          ))}
          {Object.keys(vhi10).length >= 3 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${vhiTotal > 30 ? 'bg-red-100 text-red-700' : vhiTotal > 20 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              VHI-10: {vhiTotal}/40 — {vhiSeverity}
            </div>
          )}
        </div>
        <FL label="Treatment">
          <Pills options={['Voice rest', 'Voice therapy (SLT — motor learning principles)', 'LSVT LOUD (Parkinson)', 'Botulinum toxin (spasmodic dysphonia)', 'Microlaryngoscopy + phonomicrosurgery', 'Laryngeal framework surgery (medialization)', 'Arytenoid adduction', 'Thyroplasty type I (vocal cord palsy)', 'PPI (LPR-related dysphonia)', 'Hydration + humidification']} value={voiceTx} onChange={setVoiceTx} multi />
        </FL>
      </Section>

      <Section title="Laryngoscopy Findings" applicable={sec.laryngoscopy} onApplicable={v => sa('laryngoscopy', v)}>
        <FL label="Laryngoscopy type"><Pills options={['Indirect (mirror)', 'Flexible fibreoptic (OPD)', 'Rigid 70° telescope', 'Stroboscopy', 'Microlaryngoscopy (surgical)', 'Transnasal laryngoscopy']} value={laryngoscopyType} onChange={setLaryngoscopyType} /></FL>
        <FL label="Vocal cord mobility">
          <Pills options={['Normal bilateral mobility', 'Right cord palsy', 'Left cord palsy (more common — RLN)', 'Bilateral cord palsy', 'Reduced mobility — paresis', 'Arytenoid fixation']} value={vocalCordMobility} onChange={setVocalCordMobility} />
        </FL>
        <FL label="Findings">
          <Pills options={['Normal larynx', 'Reinke\'s oedema (polypoid degeneration)', 'Vocal cord nodules (bilateral)', 'Vocal cord polyp (unilateral)', 'Vocal cord cyst', 'Vocal cord granuloma (post-intubation/GERD)', 'Leucoplakia/keratosis', 'Vocal cord carcinoma', 'Laryngopharyngeal reflux changes (pachydermia, posterior erythema)', 'Supraglottitis/epiglottitis', 'Subglottic oedema', 'Laryngomalacia (stridor — infant)', 'Recurrent respiratory papillomatosis (HPV)', 'Laryngeal web', 'Subglottic stenosis', 'TB of larynx']} value={laryngoscopyFindings} onChange={setLaryngoscopyFindings} multi />
        </FL>
        <FL label="Laryngoscopy notes">
          <textarea className={ta} value={laryngoscopyNotes} onChange={e => setLaryngoscopyNotes(e.target.value)} placeholder="Detailed description, measurements, arytenoid movement, mucosa..." />
        </FL>
      </Section>

      <Section title="Dysphagia" applicable={sec.dysphagia} onApplicable={v => sa('dysphagia', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Type"><Pills options={['Oropharyngeal (transfer dysphagia)', 'Oesophageal', 'Mixed']} value={dysphagiaType} onChange={setDysphagiaType} /></FL>
          <FL label="Level"><Pills options={['Oral phase', 'Pharyngeal phase', 'Oesophageal', 'UOS/cricopharyngeal']} value={dysphagiaLevel} onChange={setDysphagiaLevel} /></FL>
        </div>
        <FL label="Consistency difficulty">
          <Pills options={['Thin liquids', 'Nectar-thick', 'Honey-thick', 'Pudding', 'Soft food', 'Solid food', 'All consistencies']} value={dysphagiaConsistency} onChange={setDysphagiaConsistency} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Aspiration risk"><Pills options={['Low', 'Moderate', 'High — silent aspiration likely', 'Frank aspiration observed']} value={aspirationRisk} onChange={setAspirationRisk} /></FL>
          <FL label="FOIS (Functional Oral Intake Scale)" sub="1–7"><Pills options={['1 (NPO)', '2 (tube-dependent, minimal oral)', '3 (tube + consistent oral)', '4 (total oral — special preparation)', '5 (total oral — multiple consistencies)', '6 (total oral — single food modification)', '7 (total oral — no restriction)']} value={fois} onChange={setFois} /></FL>
        </div>
        <FL label="Investigations">
          <Pills options={['Clinical bedside swallowing assessment', 'VFSS (videofluoroscopy — modified barium swallow)', 'FEES (flexible endoscopic evaluation of swallowing)', 'Oesophagoscopy + biopsy', 'Barium swallow (oesophageal)', 'Manometry (oesophageal)', 'CT neck/chest (compressive cause)', 'MRI brain (neurological dysphagia)']} value={dysphagiaInvestigations} onChange={setDysphagiaInvestigations} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['Texture-modified diet (IDDSI framework)', 'Thickened fluids', 'Compensatory manoeuvres (chin tuck, head turn)', 'Swallowing therapy (SLT — Mendelsohn, effortful swallow)', 'NG tube feeding', 'PEG (long-term enteral access)', 'Cricopharyngeal myotomy', 'Botox cricopharyngeal injection', 'Dilatation (oesophageal stricture)', 'PPI (reflux-related dysphagia)']} value={dysphagiaTx} onChange={setDysphagiaTx} multi />
        </FL>
      </Section>

      <Section title="Obstructive Sleep Apnoea (OSA) — STOP-BANG" applicable={sec.osa} onApplicable={v => sa('osa', v)}>
        <div className="rounded-xl border border-rose-200 bg-white p-4 space-y-3">
          <div className="font-bold text-rose-700 text-sm">STOP-BANG Screening</div>
          {STOPBANG.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-gray-700 flex-1">{item}</span>
              <Pills options={['Yes', 'No']} value={stopbang[i]} onChange={v => setStopbang(a => ({ ...a, [i]: v }))} accent={A} />
            </div>
          ))}
          {Object.keys(stopbang).length >= 4 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${stopbangScore >= 5 ? 'bg-red-100 text-red-700' : stopbangScore >= 3 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              STOP-BANG: {stopbangScore}/8 — {osaRisk}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Epworth Sleepiness Scale" sub="0–24"><input className={inp} value={osaEpworth} onChange={e => setOsaEpworth(e.target.value)} placeholder="≥10 = excessive daytime sleepiness" /></FL>
          <FL label="Polysomnography / HST"><input className={inp} value={polysomnography} onChange={e => setPolysomnography(e.target.value)} placeholder="e.g. AHI 28 events/hr — moderate OSA" /></FL>
        </div>
        <FL label="AHI classification"><Pills options={['Normal (<5/hr)', 'Mild OSA (5–15/hr)', 'Moderate OSA (15–30/hr)', 'Severe OSA (>30/hr)']} value={ahi} onChange={setAhi} /></FL>
        <FL label="Treatment">
          <Pills options={['Weight loss + lifestyle modification', 'CPAP (first line moderate-severe)', 'Auto-CPAP', 'BiPAP (if CPAP intolerant)', 'Mandibular advancement device (MAD — mild-moderate)', 'Positional therapy (lateral positioning)', 'Adenotonsillectomy (children — first line)', 'UPPP (uvulopalatopharyngoplasty)', 'Tongue base procedures (RF reduction)', 'Hypoglossal nerve stimulation (Inspire)']} value={osaTx} onChange={setOsaTx} multi />
        </FL>
      </Section>

      <Section title="Laryngopharyngeal Reflux (LPR) — RSI" applicable={sec.lpr} onApplicable={v => sa('lpr', v)}>
        <div className="rounded-xl border border-rose-200 bg-white p-4 space-y-2">
          <div className="font-bold text-rose-700 text-sm">Reflux Symptom Index (RSI) — 0=No problem, 5=Severe</div>
          {RSI_ITEMS.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-xs text-gray-700 flex-1">{item}</span>
              <Pills options={['0', '1', '2', '3', '4', '5']} value={rsi[i]?.toString()} onChange={v => setRsi(a => ({ ...a, [i]: v }))} accent={A} />
            </div>
          ))}
          {Object.keys(rsi).length >= 3 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${rsiTotal > 13 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              RSI: {rsiTotal}/45 {rsiTotal > 13 ? '— Abnormal (>13, suggests LPR)' : '— Normal (≤13)'}
            </div>
          )}
        </div>
        <FL label="Laryngoscopy LPR findings">
          <Pills options={['Posterior commissure erythema/hypertrophy', 'Pachydermia (posterior pharynx)', 'Arytenoid erythema', 'Subglottic oedema', 'Laryngeal oedema (diffuse)', 'Pseudosulcus', 'Ventricular obliteration']} value={lprFindings} onChange={setLprFindings} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['PPI twice daily (30 min before meals)', 'H2-receptor antagonist', 'Alginate (Gaviscon)', 'Diet modification (avoid acidic/fatty/caffeine/alcohol)', 'Elevate head of bed', 'Weight loss', 'Antireflux surgery (Nissen fundoplication — refractory)']} value={lprTx} onChange={setLprTx} multi />
        </FL>
      </Section>

      <Section title="Throat / Laryngeal Tumour" applicable={sec.tumour} onApplicable={v => sa('tumour', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Site"><Pills options={['Tonsil', 'Base of tongue', 'Soft palate', 'Posterior pharyngeal wall', 'Supraglottic larynx', 'Glottic (vocal cord)', 'Subglottic', 'Hypopharynx (piriform sinus/post-cricoid)', 'Nasopharynx']} value={tumourSite} onChange={setTumourSite} /></FL>
          <FL label="TNM Stage"><input className={inp} value={tumourStage} onChange={e => setTumourStage(e.target.value)} placeholder="e.g. T2N1M0 Stage III" /></FL>
        </div>
        <FL label="Biopsy / histology"><input className={inp} value={tumourBiopsy} onChange={e => setTumourBiopsy(e.target.value)} placeholder="e.g. Moderately differentiated SCC / HPV+OPC / NPC / TB" /></FL>
        <FL label="Treatment">
          <Pills options={['Total laryngectomy', 'Partial laryngectomy (TORS/laser)', 'Neck dissection (selective/radical)', 'Radiotherapy', 'Concurrent chemoradiation (cisplatin-based)', 'Induction chemotherapy', 'Immunotherapy (pembrolizumab — PD-L1+)', 'Tracheostomy pre-treatment', 'PEG (nutritional support during CRT)']} value={tumourTx} onChange={setTumourTx} multi />
        </FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-base shadow transition-all">
        Save Throat & Larynx Assessment
      </button>
    </div>
  );
}
