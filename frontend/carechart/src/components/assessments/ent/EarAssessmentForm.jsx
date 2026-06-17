/**
 * @shared-pool
 * EarAssessmentForm — Ear & vestibular assessment
 * Scoring: Rinne/Weber classification, BPPV Dix-Hallpike, Dizziness Handicap Inventory (DHI),
 *   CSOM classification, cholesteatoma grading, tinnitus severity (THI)
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700',
  pill: 'bg-cyan-100 border-cyan-300 text-cyan-800',
  active: 'bg-cyan-600 border-cyan-700 text-white',
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
      <label className="block text-sm font-semibold text-gray-700">
        {label}{sub && <span className="ml-1 text-xs font-normal text-gray-500">{sub}</span>}
      </label>
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

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400";
const ta = inp + " min-h-[72px] resize-y";

export default function EarAssessmentForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', examination: 'Applicable', tuning: 'Applicable',
    otoscopy: 'Applicable', csom: 'N/A', cholesteatoma: 'N/A',
    vertigo: 'N/A', tinnitus: 'N/A', hearing: 'N/A', investigations: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [side, setSide] = useState('');
  const [duration, setDuration] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [discharge, setDischarge] = useState('');
  const [dischargeType, setDischargeType] = useState('');
  const [hearingLoss, setHearingLoss] = useState('');
  const [hlType, setHlType] = useState('');
  const [hlOnset, setHlOnset] = useState('');
  const [otalgia, setOtalgia] = useState('');
  const [tinnitusPresent, setTinnitusPresent] = useState('');
  const [tinnitusChar, setTinnitusChar] = useState('');
  const [riskFactors, setRiskFactors] = useState([]);
  const [priorEarSurgery, setPriorEarSurgery] = useState('');

  // Examination
  const [pinnaeR, setPinnaeR] = useState('');
  const [pinnaeL, setPinnaeL] = useState('');
  const [canalR, setCanalR] = useState('');
  const [canalL, setCanalL] = useState('');
  const [tragusSign, setTragusSign] = useState('');
  const [mastoidTenderness, setMastoidTenderness] = useState('');
  const [facialNerve, setFacialNerve] = useState('');

  // Tuning Fork
  const [rinneR, setRinneR] = useState('');
  const [rinneL, setRinneL] = useState('');
  const [weber, setWeber] = useState('');
  const [weberLateralize, setWeberLateralize] = useState('');
  const [schwabach, setSchwabach] = useState('');

  const tuningInterpretation = useMemo(() => {
    const parts = [];
    if (rinneR && rinneL && weber) {
      if (rinneR === 'Negative (BC>AC)' && weberLateralize === 'Right') parts.push('R: Conductive HL');
      if (rinneL === 'Negative (BC>AC)' && weberLateralize === 'Left') parts.push('L: Conductive HL');
      if (rinneR === 'Positive (AC>BC)' && weberLateralize === 'Left') parts.push('R: Sensorineural HL');
      if (rinneL === 'Positive (AC>BC)' && weberLateralize === 'Right') parts.push('L: Sensorineural HL');
      if (rinneR === 'Positive (AC>BC)' && rinneL === 'Positive (AC>BC)' && weber === 'Central (midline)') parts.push('Bilateral SNHL or normal');
    }
    return parts.join(' | ') || '';
  }, [rinneR, rinneL, weber, weberLateralize]);

  // Otoscopy
  const [tmR, setTmR] = useState('');
  const [tmL, setTmL] = useState('');
  const [perforationSite, setPerforationSite] = useState('');
  const [perforationSize, setPerforationSize] = useState('');
  const [lightReflex, setLightReflex] = useState('');
  const [earWax, setEarWax] = useState('');
  const [otoscopyFindings, setOtoscopyFindings] = useState([]);

  // CSOM
  const [csomType, setCsomType] = useState('');
  const [csomDischarge, setCsomDischarge] = useState('');
  const [csomComplications, setCsomComplications] = useState([]);
  const [csomTx, setCsomTx] = useState([]);

  // Cholesteatoma
  const [cholestatoType, setCholesteatoType] = useState('');
  const [cholestatoStage, setCholesteatoStage] = useState('');
  const [erosion, setErosion] = useState([]);

  // Vertigo/Vestibular
  const [vertigoType, setVertigoType] = useState('');
  const [vertigoOnset, setVertigoOnset] = useState('');
  const [vergoDuration, setVergoDuration] = useState('');
  const [nystagmus, setNystagmus] = useState('');
  const [nystagmusDir, setNystagmusDir] = useState('');
  const [dixHallpike, setDixHallpike] = useState('');
  const [dhi, setDhi] = useState('');
  const [vertigoDiagnosis, setVertigoDiagnosis] = useState('');
  const [vertigoTx, setVertigoTx] = useState([]);

  // Tinnitus
  const [tinnitusSide, setTinnitusSide] = useState('');
  const [tinnitusType, setTinnitusType] = useState('');
  const [tinnitusFreq, setTinnitusFreq] = useState('');
  const [thiScore, setThiScore] = useState('');
  const [tinnitusTx, setTinnitusTx] = useState([]);

  const thiSeverity = useMemo(() => {
    const s = parseInt(thiScore);
    if (isNaN(s)) return '';
    if (s <= 16) return 'Slight (0–16)';
    if (s <= 36) return 'Mild (18–36)';
    if (s <= 56) return 'Moderate (38–56)';
    if (s <= 76) return 'Severe (58–76)';
    return 'Catastrophic (78–100)';
  }, [thiScore]);

  // Hearing Assessment
  const [ptaR, setPtaR] = useState('');
  const [ptaL, setPtaL] = useState('');
  const [ptaType, setPtaType] = useState('');
  const [speechDiscrimination, setSpeechDiscrimination] = useState('');
  const [oae, setOae] = useState('');
  const [bera, setBera] = useState('');
  const [hearingAid, setHearingAid] = useState('');
  const [cochlearImplant, setCochlearImplant] = useState('');

  const ptaClassification = (pta) => {
    const p = parseFloat(pta);
    if (isNaN(p)) return '';
    if (p <= 25) return 'Normal';
    if (p <= 40) return 'Mild HL (26–40 dB)';
    if (p <= 55) return 'Moderate HL (41–55 dB)';
    if (p <= 70) return 'Mod-severe HL (56–70 dB)';
    if (p <= 90) return 'Severe HL (71–90 dB)';
    return 'Profound HL (>90 dB)';
  };

  // Investigations
  const [ctTemporal, setCtTemporal] = useState('');
  const [mriIac, setMriIac] = useState('');
  const [cultureSwab, setCultureSwab] = useState('');
  const [investigations, setInvestigations] = useState([]);

  const criticalAlert = useMemo(() => {
    if (csomComplications.includes('Intracranial complication') || csomComplications.includes('Meningitis') || csomComplications.includes('Sigmoid sinus thrombosis'))
      return 'Intracranial complication of CSOM — emergency surgical referral + neurosurgery';
    if (facialNerve === 'Palsy') return 'Facial nerve palsy — urgent ENT + imaging';
    return '';
  }, [csomComplications, facialNerve]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-ear', patientId, encounterId, data: { sec, side, duration, complaints, discharge, dischargeType, hearingLoss, hlType, hlOnset, otalgia, tinnitusPresent, riskFactors, priorEarSurgery, pinnaeR, pinnaeL, canalR, canalL, tragusSign, mastoidTenderness, facialNerve, rinneR, rinneL, weber, weberLateralize, schwabach, tuningInterpretation, tmR, tmL, perforationSite, perforationSize, lightReflex, earWax, otoscopyFindings, csomType, csomDischarge, csomComplications, csomTx, cholestatoType, cholestatoStage, erosion, vertigoType, vertigoOnset, vergoDuration, nystagmus, nystagmusDir, dixHallpike, dhi, vertigoDiagnosis, vertigoTx, tinnitusSide, tinnitusType, tinnitusFreq, thiScore, thiSeverity, tinnitusTx, ptaR, ptaL, ptaType, speechDiscrimination, oae, bera, hearingAid, cochlearImplant, ctTemporal, mriIac, cultureSwab, investigations } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Ear Assessment</h1>
            <p className="text-cyan-100 text-sm">CSOM · Cholesteatoma · Vertigo · Tinnitus · Hearing Loss · Audiometry</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>CSOM prevalence ~6% in India — leading preventable cause of hearing loss. NHM free hearing aid scheme for BPL. RBSK neonatal hearing screening (OAE). Ali Yavar Jung NIHH (Mumbai, Chennai, Kolkata, New Delhi) — national referral for hearing/speech. Malignant otitis externa — diabetics, elderly. High wax impaction burden in rural India. PM-JAY covers tympanoplasty, mastoidectomy, cochlear implant (select conditions).</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700">EMERGENCY</div><div className="text-red-800 text-sm">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="Ear History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side affected"><Pills options={['Right', 'Left', 'Bilateral']} value={side} onChange={setSide} /></FL>
          <FL label="Duration"><input className={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3 months" /></FL>
        </div>
        <FL label="Complaints">
          <Pills options={['Ear discharge (otorrhoea)', 'Hearing loss', 'Otalgia (ear pain)', 'Tinnitus', 'Vertigo/dizziness', 'Blocked ear (fullness)', 'Itching', 'Facial weakness', 'Bleeding from ear']} value={complaints} onChange={setComplaints} multi />
        </FL>
        {complaints.includes('Ear discharge (otorrhoea)') && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Discharge character"><Pills options={['Mucopurulent', 'Purulent', 'Serous', 'Blood-stained', 'Foul-smelling (cholesteatoma)', 'Watery (CSF?)']} value={dischargeType} onChange={setDischargeType} /></FL>
            <FL label="Discharge duration"><input className={inp} value={discharge} onChange={e => setDischarge(e.target.value)} placeholder="e.g. 2 years, intermittent" /></FL>
          </div>
        )}
        {complaints.includes('Hearing loss') && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="HL type (self-reported)"><Pills options={['Gradual', 'Sudden (≤72h)', 'Fluctuating', 'Progressive']} value={hlOnset} onChange={setHlOnset} /></FL>
            <FL label="HL character"><Pills options={['Conductive', 'Sensorineural', 'Mixed', 'Unclear']} value={hlType} onChange={setHlType} /></FL>
          </div>
        )}
        <FL label="Risk factors">
          <Pills options={['Noise exposure (occupational/recreational)', 'Ototoxic drugs (aminoglycosides, cisplatin)', 'Diabetes mellitus', 'Recurrent URTI/AOM', 'Barotrauma (flying/diving)', 'Trauma (head/ear)', 'Family history of hearing loss', 'Consanguinity', 'Prior ear surgery', 'HIV/immunosuppressed']} value={riskFactors} onChange={setRiskFactors} multi />
        </FL>
        <FL label="Prior ear surgery"><Pills options={['None', 'Myringotomy + grommet', 'Tympanoplasty', 'Mastoidectomy', 'Ossiculoplasty', 'Cochlear implant']} value={priorEarSurgery} onChange={setPriorEarSurgery} /></FL>
      </Section>

      <Section title="Ear Examination" applicable={sec.examination} onApplicable={v => sa('examination', v)}>
        <div className="rounded-lg bg-white border border-cyan-200 p-3 space-y-3">
          <div className="font-semibold text-cyan-700 text-sm">External Ear</div>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Pinna — Right"><input className={inp} value={pinnaeR} onChange={e => setPinnaeR(e.target.value)} placeholder="Normal / swelling / discharge" /></FL>
            <FL label="Pinna — Left"><input className={inp} value={pinnaeL} onChange={e => setPinnaeL(e.target.value)} placeholder="Normal / swelling / discharge" /></FL>
            <FL label="Canal — Right"><input className={inp} value={canalR} onChange={e => setCanalR(e.target.value)} placeholder="Normal / oedematous / wax" /></FL>
            <FL label="Canal — Left"><input className={inp} value={canalL} onChange={e => setCanalL(e.target.value)} placeholder="Normal / oedematous / wax" /></FL>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Tragus sign"><Pills options={['Positive', 'Negative']} value={tragusSign} onChange={setTragusSign} /></FL>
          <FL label="Mastoid tenderness"><Pills options={['Present', 'Absent']} value={mastoidTenderness} onChange={setMastoidTenderness} /></FL>
          <FL label="Facial nerve (VII)"><Pills options={['Normal', 'Palsy', 'Weakness (partial)']} value={facialNerve} onChange={setFacialNerve} /></FL>
        </div>
        <FL label="Wax impaction"><Pills options={['None', 'Partial', 'Complete impaction', 'Bilateral impaction']} value={earWax} onChange={setEarWax} /></FL>
      </Section>

      <Section title="Tuning Fork Tests (512 Hz)" applicable={sec.tuning} onApplicable={v => sa('tuning', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Rinne — Right"><Pills options={['Positive (AC>BC)', 'Negative (BC>AC)', 'False negative Rinne']} value={rinneR} onChange={setRinneR} /></FL>
          <FL label="Rinne — Left"><Pills options={['Positive (AC>BC)', 'Negative (BC>AC)', 'False negative Rinne']} value={rinneL} onChange={setRinneL} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Weber"><Pills options={['Central (midline)', 'Lateralized']} value={weber} onChange={setWeber} /></FL>
          {weber === 'Lateralized' && <FL label="Lateralizes to"><Pills options={['Right', 'Left']} value={weberLateralize} onChange={setWeberLateralize} /></FL>}
        </div>
        <FL label="Schwabach"><Pills options={['Normal', 'Prolonged (conductive)', 'Diminished (sensorineural)']} value={schwabach} onChange={setSchwabach} /></FL>
        {tuningInterpretation && <div className="rounded-lg bg-cyan-100 border border-cyan-300 px-3 py-2 text-sm font-semibold text-cyan-800">Interpretation: {tuningInterpretation}</div>}
      </Section>

      <Section title="Otoscopy / Tympanic Membrane" applicable={sec.otoscopy} onApplicable={v => sa('otoscopy', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="TM — Right"><Pills options={['Normal', 'Dull/opaque', 'Retracted', 'Bulging (AOM)', 'Perforation', 'Attic retraction', 'Myringosclerosis', 'Grommet in situ']} value={tmR} onChange={setTmR} /></FL>
          <FL label="TM — Left"><Pills options={['Normal', 'Dull/opaque', 'Retracted', 'Bulging (AOM)', 'Perforation', 'Attic retraction', 'Myringosclerosis', 'Grommet in situ']} value={tmL} onChange={setTmL} /></FL>
        </div>
        {(tmR === 'Perforation' || tmL === 'Perforation') && (
          <div className="grid grid-cols-2 gap-3">
            <FL label="Perforation site"><Pills options={['Central', 'Posterior', 'Anterior', 'Attic (Shrapnell)', 'Subtotal', 'Total']} value={perforationSite} onChange={setPerforationSite} /></FL>
            <FL label="Perforation size"><Pills options={['Pin-hole', 'Small (<25%)', 'Medium (25–50%)', 'Large (>50%)', 'Subtotal', 'Total']} value={perforationSize} onChange={setPerforationSize} /></FL>
          </div>
        )}
        <FL label="Light reflex (cone of light)"><Pills options={['Present', 'Absent', 'Distorted']} value={lightReflex} onChange={setLightReflex} /></FL>
        <FL label="Additional otoscopy findings">
          <Pills options={['Fluid behind TM (glue ear)', 'Cholesteatoma keratin flakes', 'Polyp', 'Granulation tissue', 'Foreign body', 'Exostosis', 'Blood (haemotympanum)']} value={otoscopyFindings} onChange={setOtoscopyFindings} multi />
        </FL>
      </Section>

      <Section title="CSOM (Chronic Suppurative Otitis Media)" applicable={sec.csom} onApplicable={v => sa('csom', v)}>
        <FL label="CSOM type">
          <Pills options={['Tubotympanic (safe/mucosal — central perf)', 'Atticoantral (unsafe/squamous — attic perf)', 'Mixed']} value={csomType} onChange={setCsomType} />
        </FL>
        <FL label="Discharge character"><Pills options={['Mucopurulent, odourless', 'Purulent, foul-smelling', 'Blood-stained', 'Scanty, intermittent', 'Profuse, persistent']} value={csomDischarge} onChange={setCsomDischarge} /></FL>
        <FL label="Complications">
          <Pills options={['Conductive hearing loss', 'Mastoiditis', 'Facial nerve palsy', 'Labyrinthitis', 'Petrositis', 'Meningitis', 'Brain abscess (temporal/cerebellar)', 'Sigmoid sinus thrombosis', 'Extradural abscess', 'Intracranial complication']} value={csomComplications} onChange={setCsomComplications} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['Aural toilet (regular)', 'Topical antibiotic-steroid drops', 'Systemic antibiotics', 'Tympanoplasty', 'Cortical mastoidectomy (simple)', 'Radical mastoidectomy', 'Modified radical mastoidectomy (Bondy)', 'Myringoplasty']} value={csomTx} onChange={setCsomTx} multi />
        </FL>
      </Section>

      <Section title="Cholesteatoma" applicable={sec.cholesteatoma} onApplicable={v => sa('cholesteatoma', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Type"><Pills options={['Congenital', 'Acquired primary (retraction)', 'Acquired secondary (through perf)']} value={cholestatoType} onChange={setCholesteatoType} /></FL>
          <FL label="Stage (EAONO/JOS)"><Pills options={['Stage I — limited to one site', 'Stage II — involving two+ sites', 'Stage III — extratympanic extension', 'Stage IV — intracranial/life-threatening']} value={cholestatoStage} onChange={setCholesteatoStage} /></FL>
        </div>
        <FL label="Bone erosion">
          <Pills options={['Ossicles (incus most common)', 'Tegmen (intracranial)', 'Sigmoid sinus plate', 'Semicircular canal (labyrinthine fistula)', 'Facial canal', 'Mastoid cortex']} value={erosion} onChange={setErosion} multi />
        </FL>
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
          All cholesteatoma → surgical clearance (canal wall up or canal wall down mastoidectomy). CT temporal bone mandatory pre-op.
        </div>
      </Section>

      <Section title="Vertigo & Vestibular" applicable={sec.vertigo} onApplicable={v => sa('vertigo', v)}>
        <FL label="Vertigo type"><Pills options={['BPPV (paroxysmal positional)', 'Meniere disease', 'Vestibular neuritis', 'Labyrinthitis', 'Central (cerebellar/brainstem)', 'Perilymph fistula', 'Superior canal dehiscence', 'Psychogenic']} value={vertigoType} onChange={setVertigoType} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Episode duration"><Pills options={['Seconds (BPPV)', 'Minutes–hours (Meniere)', 'Hours–days (neuritis)', 'Constant']} value={vergoDuration} onChange={setVergoDuration} /></FL>
          <FL label="Onset"><Pills options={['Acute single episode', 'Recurrent episodic', 'Chronic persistent', 'Positional trigger']} value={vertigoOnset} onChange={setVertigoOnset} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Nystagmus"><Pills options={['Absent', 'Present — horizontal', 'Present — vertical', 'Present — rotatory', 'Fatigable (BPPV)', 'Non-fatigable (central)']} value={nystagmus} onChange={setNystagmus} /></FL>
          <FL label="Dix-Hallpike test"><Pills options={['Positive right', 'Positive left', 'Negative', 'Not done']} value={dixHallpike} onChange={setDixHallpike} /></FL>
        </div>
        <FL label="DHI (Dizziness Handicap Inventory)" sub="0–100">
          <input className={inp} value={dhi} onChange={e => setDhi(e.target.value)} placeholder="Score: 0=no handicap, >60=severe" />
        </FL>
        <FL label="Treatment">
          <Pills options={['Epley manoeuvre (BPPV posterior canal)', 'Semont manoeuvre', 'Brandt-Daroff exercises', 'Betahistine (Meniere/vestibular)', 'Low-salt diet (Meniere)', 'Diuretics (Meniere)', 'Vestibular rehabilitation physiotherapy', 'Intratympanic gentamicin (Meniere ablation)', 'Intratympanic steroids (sudden SNHL/Meniere)', 'Endolymphatic sac surgery']} value={vertigoTx} onChange={setVertigoTx} multi />
        </FL>
      </Section>

      <Section title="Tinnitus" applicable={sec.tinnitus} onApplicable={v => sa('tinnitus', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side"><Pills options={['Right', 'Left', 'Bilateral', 'In head']} value={tinnitusSide} onChange={setTinnitusSide} /></FL>
          <FL label="Type"><Pills options={['Subjective (non-pulsatile)', 'Objective pulsatile (vascular)', 'High-pitched ringing', 'Low-pitched roaring', 'Clicking (myoclonus)']} value={tinnitusType} onChange={setTinnitusType} /></FL>
        </div>
        <FL label="Frequency match"><Pills options={['High (>4 kHz)', 'Mid (1–4 kHz)', 'Low (<1 kHz)', 'Not matched']} value={tinnitusFreq} onChange={setTinnitusFreq} /></FL>
        <FL label="THI score" sub="Tinnitus Handicap Inventory 0–100">
          <input className={inp} value={thiScore} onChange={e => setThiScore(e.target.value)} placeholder="e.g. 52" />
        </FL>
        {thiSeverity && <div className="rounded-lg bg-cyan-50 border border-cyan-200 px-3 py-2 text-sm font-semibold text-cyan-700">THI Severity: {thiSeverity}</div>}
        <FL label="Treatment">
          <Pills options={['Sound therapy / masking', 'TRT (Tinnitus Retraining Therapy)', 'CBT for tinnitus', 'Hearing aid (if HL present)', 'Betahistine', 'Melatonin (sleep disruption)', 'Treat underlying cause', 'Avoidance of silence']} value={tinnitusTx} onChange={setTinnitusTx} multi />
        </FL>
      </Section>

      <Section title="Hearing Assessment" applicable={sec.hearing} onApplicable={v => sa('hearing', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="PTA average — Right" sub="dB HL">
            <input className={inp} value={ptaR} onChange={e => setPtaR(e.target.value)} placeholder="e.g. 45 dB (500/1k/2k/4k avg)" />
          </FL>
          <FL label="PTA average — Left" sub="dB HL">
            <input className={inp} value={ptaL} onChange={e => setPtaL(e.target.value)} placeholder="e.g. 30 dB" />
          </FL>
        </div>
        {ptaR && <div className="text-xs text-cyan-700 font-semibold">R: {ptaClassification(ptaR)}</div>}
        {ptaL && <div className="text-xs text-cyan-700 font-semibold">L: {ptaClassification(ptaL)}</div>}
        <FL label="Audiogram type"><Pills options={['Flat loss', 'High-frequency loss (noise/ageing)', 'Low-frequency loss (Meniere)', 'Conductive pattern (air-bone gap)', 'Cookie-bite (mid-frequency)', 'Corner audiogram (profound)']} value={ptaType} onChange={setPtaType} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Speech discrimination" sub="%"><input className={inp} value={speechDiscrimination} onChange={e => setSpeechDiscrimination(e.target.value)} placeholder="e.g. R: 85%, L: 60%" /></FL>
          <FL label="OAE (DPOAE/TEOAE)"><Pills options={['Pass bilateral', 'Refer right', 'Refer left', 'Refer bilateral', 'Not done']} value={oae} onChange={setOae} /></FL>
        </div>
        <FL label="BERA / ABR"><input className={inp} value={bera} onChange={e => setBera(e.target.value)} placeholder="e.g. Wave V threshold R: 30 dB, L: 35 dB; I-V latency normal" /></FL>
        <FL label="Hearing aid"><Pills options={['Not needed', 'Recommended — not yet fitted', 'BTE aid fitted', 'ITE aid fitted', 'BAHA (bone-anchored)', 'Rejected by patient']} value={hearingAid} onChange={setHearingAid} /></FL>
        <FL label="Cochlear implant"><Pills options={['Not a candidate', 'Candidate — under evaluation', 'Implanted — right', 'Implanted — left', 'Bilateral implant']} value={cochlearImplant} onChange={setCochlearImplant} /></FL>
      </Section>

      <Section title="Investigations" applicable={sec.investigations} onApplicable={v => sa('investigations', v)}>
        <FL label="CT temporal bone"><input className={inp} value={ctTemporal} onChange={e => setCtTemporal(e.target.value)} placeholder="e.g. Soft tissue density in right attic + ossicular erosion, no intracranial extension" /></FL>
        <FL label="MRI IAC/brain"><input className={inp} value={mriIac} onChange={e => setMriIac(e.target.value)} placeholder="e.g. Right acoustic neuroma 1.2cm in IAC" /></FL>
        <FL label="Ear swab culture"><input className={inp} value={cultureSwab} onChange={e => setCultureSwab(e.target.value)} placeholder="e.g. Pseudomonas aeruginosa — sensitive to ciprofloxacin" /></FL>
        <FL label="Additional investigations">
          <Pills options={['Tympanometry (Type A/B/C)', 'Stapedial reflexes', 'Electrocochleography (ECoG)', 'Vestibular evoked potentials (VEMPs)', 'Video head impulse test (vHIT)', 'Posturography', 'CBC/CRP/ESR', 'FBS/HbA1c (malignant OE)', 'FTA-ABS (syphilitic HL)']} value={investigations} onChange={setInvestigations} multi />
        </FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-base shadow transition-all">
        Save Ear Assessment
      </button>
    </div>
  );
}
