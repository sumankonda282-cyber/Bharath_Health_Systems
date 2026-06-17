/**
 * @shared-pool
 * PaediatricENTForm — Paediatric ENT assessment
 * Scoring: Paradise tonsillectomy criteria, OSA severity (AHI paediatric),
 *   foreign body risk (Button battery — emergency), adenoid grading (Fujioka),
 *   grommet candidacy, choanal atresia, CHARGE syndrome screening
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700',
  pill: 'bg-orange-100 border-orange-300 text-orange-800',
  active: 'bg-orange-600 border-orange-700 text-white',
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

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
const ta = inp + " min-h-[72px] resize-y";

export default function PaediatricENTForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', examination: 'Applicable',
    adenoTonsil: 'N/A', glueEar: 'N/A', pOSA: 'N/A',
    foreignBody: 'N/A', choanalAtresia: 'N/A', laryngomalacia: 'N/A',
    subglotticStenosis: 'N/A', recPapillomatosis: 'N/A',
    vestibularDisorder: 'N/A', hearingPaed: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [age, setAge] = useState('');
  const [ageUnit, setAgeUnit] = useState('');
  const [sex, setSex] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [duration, setDuration] = useState('');
  const [birthHistory, setBirthHistory] = useState('');
  const [feedingHistory, setFeedingHistory] = useState('');
  const [growthConcern, setGrowthConcern] = useState('');
  const [milestones, setMilestones] = useState('');
  const [vaccines, setVaccines] = useState('');
  const [allergy, setAllergy] = useState('');
  const [familyHistory, setFamilyHistory] = useState('');
  const [daycare, setDaycare] = useState('');

  // Examination
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [facialFeatures, setFacialFeatures] = useState([]);
  const [nasalPatency, setNasalPatency] = useState('');
  const [oralExam, setOralExam] = useState('');
  const [tonsilGrade, setTonsilGrade] = useState('');
  const [adenoidFacies, setAdenoidFacies] = useState('');
  const [earExam, setEarExam] = useState('');
  const [neckNodes, setNeckNodes] = useState('');
  const [larynxStridor, setLarynxStridor] = useState('');

  // Adenoids & Tonsils
  const [adenoidSymptoms, setAdenoidSymptoms] = useState([]);
  const [fujioka, setFujioka] = useState('');
  const [tonsillitisFreq, setTonsillitisFreq] = useState('');
  const [paradise, setParadise] = useState('');
  const [peritonsillarAbscess, setPeritonsillarAbscess] = useState('');
  const [atSurgery, setAtSurgery] = useState('');
  const [atTiming, setAtTiming] = useState('');

  // Glue Ear / OME
  const [omeSide, setOmeSide] = useState('');
  const [omeDuration, setOmeDuration] = useState('');
  const [omeHearingLoss, setOmeHearingLoss] = useState('');
  const [tympanogram, setTympanogram] = useState('');
  const [omeImpact, setOmeImpact] = useState([]);
  const [grommetsIndication, setGrommetsIndication] = useState('');
  const [grommetsInserted, setGrommetsInserted] = useState('');
  const [grommetsType, setGrommetsType] = useState('');
  const [grommetsStatus, setGrommetsStatus] = useState('');

  // Paediatric OSA
  const [snoring, setSnoring] = useState('');
  const [apnoea, setApnoea] = useState('');
  const [enuresis, setEnuresis] = useState('');
  const [behaviouralIssues, setBehaviouralIssues] = useState([]);
  const [growthRetardation, setGrowthRetardation] = useState('');
  const [polysomnographyPaed, setPolysomnographyPaed] = useState('');
  const [ahiPaed, setAhiPaed] = useState('');
  const [pOsaTreatment, setPOsaTreatment] = useState([]);

  const osaSeverity = useMemo(() => {
    const a = parseFloat(ahiPaed);
    if (isNaN(a)) return '';
    if (a < 1) return 'Normal (<1 events/hr)';
    if (a < 5) return 'Mild OSA (1–4.9/hr)';
    if (a < 10) return 'Moderate OSA (5–9.9/hr)';
    return 'Severe OSA (≥10/hr) — urgent AT';
  }, [ahiPaed]);

  // Foreign Body
  const [fbSite, setFbSite] = useState('');
  const [fbType, setFbType] = useState('');
  const [fbDuration, setFbDuration] = useState('');
  const [fbSymptoms, setFbSymptoms] = useState([]);
  const [fbXray, setFbXray] = useState('');
  const [fbManagement, setFbManagement] = useState('');
  const [buttonBattery, setButtonBattery] = useState('');

  // Choanal Atresia
  const [choanalSide, setChoanalSide] = useState('');
  const [choanalType, setChoanalType] = useState('');
  const [choanalPresentation, setChoanalPresentation] = useState([]);
  const [choanalCT, setChoanalCT] = useState('');
  const [chargeFeatures, setChargeFeatures] = useState([]);
  const [choanalTx, setChoanalTx] = useState('');

  // Laryngomalacia
  const [lmSeverity, setLmSeverity] = useState('');
  const [lmStridor, setLmStridor] = useState('');
  const [lmFeeding, setLmFeeding] = useState('');
  const [lmOximetry, setLmOximetry] = useState('');
  const [lmEndoscopy, setLmEndoscopy] = useState('');
  const [lmTx, setLmTx] = useState('');

  // Subglottic Stenosis
  const [sgsSeverity, setSgsSeverity] = useState('');
  const [sgsMyer, setSgsMyer] = useState('');
  const [sgsCause, setSgsCause] = useState('');
  const [sgsTx, setSgsTx] = useState([]);

  // Recurrent Respiratory Papillomatosis
  const [rrpAge, setRrpAge] = useState('');
  const [rrpHpvType, setRrpHpvType] = useState('');
  const [rrpSites, setRrpSites] = useState([]);
  const [rrpSeverity, setRrpSeverity] = useState('');
  const [rrpDontaScale, setRrpDontaScale] = useState('');
  const [rrpTx, setRrpTx] = useState([]);
  const [rrpSurgeriesPerYear, setRrpSurgeriesPerYear] = useState('');

  // Paediatric Hearing
  const [neonatalScreen, setNeonatalScreen] = useState('');
  const [diagnosticABR, setDiagnosticABR] = useState('');
  const [hearingAidFitted, setHearingAidFitted] = useState('');
  const [ciEvaluation, setCiEvaluation] = useState('');
  const [deicReferral, setDeicReferral] = useState('');

  const criticalAlert = useMemo(() => {
    if (buttonBattery === 'Yes') return 'BUTTON BATTERY — aerodigestive emergency. Causes liquefactive necrosis within 2h. Do NOT delay: emergency endoscopic removal within 2 hours regardless of time since ingestion.';
    if (fbSite === 'Airway (larynx/trachea/bronchus)') return 'Airway foreign body — maintain child calm, do NOT do blind finger sweep, emergency rigid bronchoscopy';
    if (choanalPresentation.includes('Bilateral (neonatal respiratory distress — cannot breathe through nose)')) return 'Bilateral choanal atresia — neonatal emergency. Oral airway/McGovern nipple immediately, surgical repair';
    if (osaSeverity.includes('Severe')) return 'Severe paediatric OSA (AHI ≥10) — urgent adenotonsillectomy, consider pre-op oximetry, anaesthetic risk assessment';
    return '';
  }, [buttonBattery, fbSite, choanalPresentation, osaSeverity]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-paediatric', patientId, encounterId, data: { age, ageUnit, sex, complaints, duration, birthHistory, feedingHistory, growthConcern, milestones, vaccines, allergy, familyHistory, daycare, weight, height, facialFeatures, nasalPatency, oralExam, tonsilGrade, adenoidFacies, earExam, neckNodes, larynxStridor, adenoidSymptoms, fujioka, tonsillitisFreq, paradise, peritonsillarAbscess, atSurgery, atTiming, omeSide, omeDuration, omeHearingLoss, tympanogram, omeImpact, grommetsIndication, grommetsInserted, grommetsType, grommetsStatus, snoring, apnoea, enuresis, behaviouralIssues, growthRetardation, polysomnographyPaed, ahiPaed, osaSeverity, pOsaTreatment, fbSite, fbType, fbDuration, fbSymptoms, fbXray, fbManagement, buttonBattery, choanalSide, choanalType, choanalPresentation, choanalCT, chargeFeatures, choanalTx, lmSeverity, lmStridor, lmFeeding, lmOximetry, lmEndoscopy, lmTx, sgsSeverity, sgsMyer, sgsCause, sgsTx, rrpAge, rrpHpvType, rrpSites, rrpSeverity, rrpDontaScale, rrpTx, rrpSurgeriesPerYear, neonatalScreen, diagnosticABR, hearingAidFitted, ciEvaluation, deicReferral } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12h6"/><path d="M12 9v6"/><circle cx="12" cy="12" r="9"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Paediatric ENT</h1>
            <p className="text-orange-100 text-sm">Adenoids · Grommets · Paed OSA · Foreign Body · Laryngomalacia · Choanal Atresia · RRP</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Adenotonsillar hypertrophy is the commonest paediatric ENT problem in India. Otitis media with effusion (glue ear) often missed — key cause of speech delay. Foreign body ingestion/aspiration is a paediatric emergency — peanuts/groundnuts are the most common FB in airway in India (seasonal — post-harvest). Button battery ingestion is a true emergency. Laryngomalacia accounts for 60–75% of congenital stridor. Recurrent respiratory papillomatosis (HPV 6/11) — HPV vaccination (Cervarix/Gardasil) now in NIP for girls 9–14y. PM-JAY covers adenotonsillectomy, grommet insertion, bronchoscopy. RBSK screens for hearing loss, ENT conditions at school.</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-600 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700 text-base">EMERGENCY</div><div className="text-red-800 text-sm mt-1">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="Paediatric History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <div className="grid grid-cols-3 gap-3">
          <FL label="Age"><input className={inp} value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 4" /></FL>
          <FL label="Unit"><Pills options={['Months', 'Years']} value={ageUnit} onChange={setAgeUnit} /></FL>
          <FL label="Sex"><Pills options={['Male', 'Female']} value={sex} onChange={setSex} /></FL>
        </div>
        <FL label="Presenting complaints">
          <Pills options={['Snoring', 'Mouth breathing', 'Noisy breathing / stridor', 'Recurrent sore throat / tonsillitis', 'Ear discharge', 'Hearing difficulty', 'Nasal obstruction', 'Runny nose (rhinorrhoea)', 'Epistaxis', 'Foreign body ingestion', 'Foreign body in ear/nose', 'Neck swelling', 'Hoarse voice', 'Difficulty swallowing', 'Choking on feeds (infant)', 'Drooling', 'Sleep disturbance', 'Poor school performance (HL related)']} value={complaints} onChange={setComplaints} multi />
        </FL>
        <FL label="Duration"><input className={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 6 months" /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Birth history"><input className={inp} value={birthHistory} onChange={e => setBirthHistory(e.target.value)} placeholder="Term/preterm, birth weight, NICU, intubation duration" /></FL>
          <FL label="Feeding history (infants)"><input className={inp} value={feedingHistory} onChange={e => setFeedingHistory(e.target.value)} placeholder="Breast/bottle, choking, nasal regurgitation" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Growth concern"><Pills options={['No', 'FTT (weight <3rd centile)', 'Poor weight gain', 'Short stature']} value={growthConcern} onChange={setGrowthConcern} /></FL>
          <FL label="Speech/language milestones"><Pills options={['Age-appropriate', 'Speech delay', 'Language delay', 'Voice abnormality']} value={milestones} onChange={setMilestones} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Vaccination status"><Pills options={['Up to date (NIP)', 'Partial', 'Not vaccinated', 'HPV vaccine given']} value={vaccines} onChange={setVaccines} /></FL>
          <FL label="Atopy / allergy"><input className={inp} value={allergy} onChange={e => setAllergy(e.target.value)} placeholder="e.g. Dust mite allergy, eczema, asthma" /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Family H/O ENT problems"><input className={inp} value={familyHistory} onChange={e => setFamilyHistory(e.target.value)} placeholder="e.g. Father — recurrent tonsillitis, sibling — glue ear" /></FL>
          <FL label="Daycare / school attendance"><Pills options={['Home', 'Daycare/crèche', 'School (specify class)']} value={daycare} onChange={setDaycare} /></FL>
        </div>
      </Section>

      <Section title="Paediatric ENT Examination" applicable={sec.examination} onApplicable={v => sa('examination', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Weight" sub="kg"><input className={inp} value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 18 kg" /></FL>
          <FL label="Height" sub="cm"><input className={inp} value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 105 cm" /></FL>
        </div>
        <FL label="Facial features">
          <Pills options={['Normal', 'Adenoid facies (open mouth, elongated face)', 'Down-turned mouth', 'Hypertelorism', 'Low-set ears', 'Micrognathia', 'High arched palate', 'Cleft palate/lip', 'Craniofacial syndrome features']} value={facialFeatures} onChange={setFacialFeatures} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Nasal patency">
            <Pills options={['Both sides patent', 'Right blocked', 'Left blocked', 'Bilateral blockage', 'Cannot pass 6F catheter']} value={nasalPatency} onChange={setNasalPatency} />
          </FL>
          <FL label="Adenoid facies">
            <Pills options={['Present', 'Absent', 'Borderline']} value={adenoidFacies} onChange={setAdenoidFacies} />
          </FL>
        </div>
        <FL label="Oral examination">
          <input className={inp} value={oralExam} onChange={e => setOralExam(e.target.value)} placeholder="e.g. Tonsil grade III bilateral, exudate present, high arched palate" />
        </FL>
        <FL label="Tonsil size (Brodsky)">
          <Pills options={['Grade 0 (absent/tonsillectomy)', 'Grade I (<25% oropharynx)', 'Grade II (25–50%)', 'Grade III (50–75%)', 'Grade IV (kissing >75%)']} value={tonsilGrade} onChange={setTonsilGrade} />
        </FL>
        <FL label="Ear examination">
          <input className={inp} value={earExam} onChange={e => setEarExam(e.target.value)} placeholder="e.g. TM dull bilateral, no light reflex, type B tympanogram — glue ear" />
        </FL>
        <FL label="Stridor character">
          <Pills options={['None', 'Inspiratory (supraglottic — laryngomalacia)', 'Expiratory (lower airway)', 'Biphasic (subglottic/tracheal)', 'Worsens supine', 'Worsens with feeds', 'Improves prone']} value={larynxStridor} onChange={setLarynxStridor} />
        </FL>
      </Section>

      <Section title="Adenoids & Tonsils" applicable={sec.adenoTonsil} onApplicable={v => sa('adenoTonsil', v)}>
        <FL label="Adenoid-related symptoms">
          <Pills options={['Mouth breathing', 'Snoring', 'Nasal obstruction', 'Rhinorrhoea (chronic)', 'Sinusitis (recurrent)', 'OME/glue ear', 'Sleep-disordered breathing', 'Hyponasal speech', 'Feeding difficulty', 'Otitis media with effusion']} value={adenoidSymptoms} onChange={setAdenoidSymptoms} multi />
        </FL>
        <FL label="Adenoid size (Fujioka nasopharyngeal X-ray)">
          <Pills options={['Grade 0 (no adenoid shadow)', 'Grade I (A/N ratio <0.6)', 'Grade II (A/N 0.6–0.7)', 'Grade III (A/N 0.71–0.8)', 'Grade IV (A/N >0.8 — obstructive)']} value={fujioka} onChange={setFujioka} />
        </FL>
        <FL label="Tonsillitis frequency">
          <input className={inp} value={tonsillitisFreq} onChange={e => setTonsillitisFreq(e.target.value)} placeholder="e.g. 7 episodes in last 12 months, each requiring antibiotics" />
        </FL>
        <FL label="Paradise criteria met?">
          <Pills options={['Yes — ≥7 episodes/year', 'Yes — ≥5 episodes/year × 2 years', 'Yes — ≥3 episodes/year × 3 years', 'Yes — tonsil hypertrophy + OSA/airway', 'Not yet meeting criteria', 'Peritonsillar abscess history']} value={paradise} onChange={setParadise} />
        </FL>
        <FL label="Previous peritonsillar abscess">
          <Pills options={['No', 'Yes — 1 episode', 'Yes — recurrent (2+ episodes)']} value={peritonsillarAbscess} onChange={setPeritonsillarAbscess} />
        </FL>
        <FL label="Surgical plan">
          <Pills options={['Adenoidectomy alone', 'Tonsillectomy alone', 'Adenotonsillectomy (AT)', 'AT + grommet insertion', 'Adenoidectomy + grommet', 'Not indicated yet', 'Parent declined']} value={atSurgery} onChange={setAtSurgery} />
        </FL>
        {atSurgery && atSurgery !== 'Not indicated yet' && atSurgery !== 'Parent declined' && (
          <FL label="Timing">
            <Pills options={['Urgent (severe OSA / airway compromise)', 'Soon (within 6–8 weeks)', 'Elective (3–6 months waiting)', 'After resolution of current URTI']} value={atTiming} onChange={setAtTiming} />
          </FL>
        )}
      </Section>

      <Section title="Otitis Media with Effusion (Glue Ear / OME)" applicable={sec.glueEar} onApplicable={v => sa('glueEar', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side"><Pills options={['Right', 'Left', 'Bilateral']} value={omeSide} onChange={setOmeSide} /></FL>
          <FL label="Duration of OME"><Pills options={['<3 months', '3–6 months', '>6 months (persistent)', 'Recurrent (3+ episodes/year)']} value={omeDuration} onChange={setOmeDuration} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Hearing loss (PTA/play audiometry)"><input className={inp} value={omeHearingLoss} onChange={e => setOmeHearingLoss(e.target.value)} placeholder="e.g. Bilateral CHL ~30 dB HL" /></FL>
          <FL label="Tympanogram"><Pills options={['Type B (flat — effusion)', 'Type C (negative pressure)', 'Resolved — Type A']} value={tympanogram} onChange={setTympanogram} /></FL>
        </div>
        <FL label="Functional impact of OME">
          <Pills options={['Speech delay', 'Language delay', 'Educational difficulty', 'Behavioural issues', 'Inattention', 'Balance problems', 'Social withdrawal', 'No significant impact']} value={omeImpact} onChange={setOmeImpact} multi />
        </FL>
        <FL label="Grommet indication">
          <Pills options={['Persistent bilateral OME >3 months + hearing loss ≥25 dB', 'Recurrent OME with developmental impact', 'OME + cleft palate (mandatory)', 'OME + Down syndrome', 'OME + repeated AOM', 'Failed hearing aid trial', 'Not indicated — observe']} value={grommetsIndication} onChange={setGrommetsIndication} />
        </FL>
        <FL label="Grommets status">
          <Pills options={['Not yet inserted', 'Inserted — right', 'Inserted — left', 'Inserted — bilateral', 'Extruded — right', 'Extruded — left', 'Blocked', 'Retained (>2 years — may need removal)']} value={grommetsStatus} onChange={setGrommetsStatus} />
        </FL>
        {(grommetsStatus?.includes('Inserted') || grommetsIndication) && (
          <FL label="Grommet type">
            <Pills options={['Bobbin (short-term ~9–12 months)', 'T-tube (long-term ~3+ years)', 'Shah (medium-term)', 'Collar button']} value={grommetsType} onChange={setGrommetsType} />
          </FL>
        )}
      </Section>

      <Section title="Paediatric Obstructive Sleep Apnoea" applicable={sec.pOSA} onApplicable={v => sa('pOSA', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Snoring frequency"><Pills options={['None', 'Occasional', 'Most nights', 'Every night', 'Loud (audible from adjacent room)']} value={snoring} onChange={setSnoring} /></FL>
          <FL label="Witnessed apnoea">
            <Pills options={['Yes — reported by parent', 'No', 'Uncertain']} value={apnoea} onChange={setApnoea} />
          </FL>
        </div>
        <FL label="Behavioural / daytime consequences">
          <Pills options={['Hyperactivity', 'Inattention/ADHD-like', 'Aggression', 'Mood changes', 'Morning headache', 'Excessive daytime sleepiness (older child)', 'Poor school performance', 'Enuresis (bedwetting)']} value={behaviouralIssues} onChange={setBehaviouralIssues} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Nocturnal enuresis"><Pills options={['Yes', 'No']} value={enuresis} onChange={setEnuresis} /></FL>
          <FL label="Growth retardation"><Pills options={['Yes (GH release impaired)', 'No']} value={growthRetardation} onChange={setGrowthRetardation} /></FL>
        </div>
        <FL label="Polysomnography result">
          <input className={inp} value={polysomnographyPaed} onChange={e => setPolysomnographyPaed(e.target.value)} placeholder="e.g. AHI 8.5 events/hr, SpO2 nadir 88%, REM-predominant" />
        </FL>
        <FL label="AHI (paediatric)" sub="events/hr">
          <input className={inp} value={ahiPaed} onChange={e => setAhiPaed(e.target.value)} placeholder="e.g. 8.5" />
        </FL>
        {osaSeverity && (
          <div className={`rounded-lg px-3 py-2 text-sm font-bold ${osaSeverity.includes('Severe') ? 'bg-red-100 text-red-700' : osaSeverity.includes('Moderate') ? 'bg-orange-100 text-orange-700' : osaSeverity.includes('Mild') ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
            {osaSeverity}
          </div>
        )}
        <FL label="Treatment">
          <Pills options={['Adenotonsillectomy (AT) — first-line', 'CPAP (residual OSA post-AT / not AT candidate)', 'Weight management (obese child)', 'Positional therapy (lateral sleep)', 'Intranasal corticosteroid + montelukast (mild OSA, AT deferred)', 'Orthodontic rapid maxillary expansion (RME)', 'Referral for pre-op anaesthetic assessment (severe OSA)', 'Post-op overnight SpO2 monitoring (AHI ≥10 / age <3y / craniofacial abnormality)']} value={pOsaTreatment} onChange={setPOsaTreatment} multi />
        </FL>
      </Section>

      <Section title="Foreign Body (Ear / Nose / Airway / Oesophagus)" applicable={sec.foreignBody} onApplicable={v => sa('foreignBody', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Site">
            <Pills options={['Ear canal', 'Nasal cavity', 'Oropharynx/tonsil', 'Airway (larynx/trachea/bronchus)', 'Oesophagus (cricopharyngeus most common)', 'Stomach/GI (beyond oesophagus)']} value={fbSite} onChange={setFbSite} />
          </FL>
          <FL label="FB type">
            <Pills options={['Button battery (EMERGENCY)', 'Peanut/groundnut (airway — India commonest)', 'Bead/marble', 'Coin', 'Toy part', 'Vegetable matter', 'Cotton bud tip', 'Insect', 'Bone/fishbone', 'Magnet (bilateral — bowel risk)']} value={fbType} onChange={setFbType} />
          </FL>
        </div>
        <FL label="BUTTON BATTERY?">
          <Pills options={['Yes', 'No']} value={buttonBattery} onChange={setButtonBattery}
            accent={{ pill: 'bg-red-100 border-red-300 text-red-800', active: 'bg-red-600 border-red-700 text-white' }} />
        </FL>
        {buttonBattery === 'Yes' && (
          <div className="rounded-xl border-2 border-red-600 bg-red-50 p-3 space-y-2">
            <div className="font-bold text-red-700">BUTTON BATTERY PROTOCOL</div>
            <div className="text-xs text-red-800 space-y-1">
              <div>• OESOPHAGUS: Remove within 2 hours — call theatre NOW, rigid oesophagoscopy</div>
              <div>• Give honey 10mL q10min (coating agent) while awaiting theatre if available + &gt;1 year age</div>
              <div>• AIRWAY: Emergency rigid bronchoscopy immediately</div>
              <div>• STOMACH (beyond GJ): Daily X-ray — remove if no progression in 4 days</div>
              <div>• Na OH liquefactive necrosis begins within 15 minutes of contact</div>
              <div>• Complications: Tracheo-oesophageal fistula, aorto-oesophageal fistula (fatal)</div>
            </div>
          </div>
        )}
        <FL label="Duration since ingestion/insertion"><input className={inp} value={fbDuration} onChange={e => setFbDuration(e.target.value)} placeholder="e.g. 6 hours / 3 days" /></FL>
        <FL label="Symptoms">
          <Pills options={['Coughing (airway FB)', 'Choking / sudden choking episode', 'Wheeze (check-valve mechanism)', 'Reduced air entry one side', 'Drooling (oesophageal)', 'Odynophagia', 'Dysphagia', 'Unilateral foul nasal discharge (nasal FB — chronic)', 'Epistaxis', 'Ear pain + discharge (ear FB)']} value={fbSymptoms} onChange={setFbSymptoms} multi />
        </FL>
        <FL label="Imaging">
          <input className={inp} value={fbXray} onChange={e => setFbXray(e.target.value)} placeholder="e.g. CXR: right lower lobe hyperinflation (obstructive emphysema — peanut). X-ray: coin at C6 level" />
        </FL>
        <FL label="Management">
          <Pills options={['Urgent rigid bronchoscopy (airway FB)', 'Rigid oesophagoscopy (oesophageal FB)', 'Flexible bronchoscopy (cooperative older child)', 'Micro ear toilet + FB removal (OPD — cooperative / small non-organic FB)', 'GA + FB removal (uncooperative child / deep / organic matter)', 'Nasal FB removal (forceps / hook — calm child)', 'Observe (beyond stomach, non-battery)']} value={fbManagement} onChange={setFbManagement} />
        </FL>
      </Section>

      <Section title="Choanal Atresia" applicable={sec.choanalAtresia} onApplicable={v => sa('choanalAtresia', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side"><Pills options={['Unilateral right', 'Unilateral left', 'Bilateral (emergency in neonate)']} value={choanalSide} onChange={setChoanalSide} /></FL>
          <FL label="Type (CT)"><Pills options={['Bony (90%)', 'Mixed bony + membranous', 'Purely membranous (rare)']} value={choanalType} onChange={setChoanalType} /></FL>
        </div>
        <FL label="Presentation">
          <Pills options={['Bilateral (neonatal respiratory distress — cannot breathe through nose)', 'Cyclical cyanosis (relieved by crying)', 'Unilateral (persistent unilateral nasal discharge — older child)', 'Failure of 6F catheter to pass', 'Incidental CT finding']} value={choanalPresentation} onChange={setChoanalPresentation} multi />
        </FL>
        <FL label="CT findings"><input className={inp} value={choanalCT} onChange={e => setChoanalCT(e.target.value)} placeholder="e.g. Bilateral bony choanal atresia, narrowed nasal cavity, thickened vomer" /></FL>
        <FL label="CHARGE syndrome features (rule out)">
          <Pills options={['C — Coloboma', 'H — Heart defect', 'A — Atresia choanae', 'R — Retardation of growth', 'G — Genital hypoplasia', 'E — Ear anomalies (microtia/deafness)']} value={chargeFeatures} onChange={setChargeFeatures} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['Oral airway (McGovern nipple) — emergency bilateral', 'Transnasal endoscopic repair (definitive)', 'Transpalatal repair (revision cases)', 'Stenting post-repair (silicone stent)', 'Multidisciplinary management (CHARGE)']} value={choanalTx} onChange={setChoanalTx} />
        </FL>
      </Section>

      <Section title="Laryngomalacia" applicable={sec.laryngomalacia} onApplicable={v => sa('laryngomalacia', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Severity"><Pills options={['Mild (no feeding/growth impact)', 'Moderate (affects feeding, some desaturation)', 'Severe (significant airway obstruction, SpO2 drops, FTT)']} value={lmSeverity} onChange={setLmSeverity} /></FL>
          <FL label="Stridor onset"><input className={inp} value={lmStridor} onChange={e => setLmStridor(e.target.value)} placeholder="e.g. Week 2 of life, inspiratory, high-pitched" /></FL>
        </div>
        <FL label="Feeding impact"><Pills options={['Normal feeds', 'Prolonged feeds', 'Choking / coughing during feeds', 'Nasal regurgitation', 'Arching back during feeds (reflux)', 'Bottle only (breast difficult)', 'NG tube required']} value={lmFeeding} onChange={setLmFeeding} /></FL>
        <FL label="Overnight oximetry">
          <input className={inp} value={lmOximetry} onChange={e => setLmOximetry(e.target.value)} placeholder="e.g. SpO2 nadir 88% × 3 desaturations, mean SpO2 96%" />
        </FL>
        <FL label="Flexible laryngoscopy findings">
          <input className={inp} value={lmEndoscopy} onChange={e => setLmEndoscopy(e.target.value)} placeholder="e.g. Omega-shaped epiglottis, prolapse of arytenoids on inspiration, short aryepiglottic folds, short tubular epiglottis" />
        </FL>
        <FL label="Treatment">
          <Pills options={['Observation + reassurance (mild — resolves by 12–18 months)', 'GORD management (ranitidine/PPI — if reflux component)', 'Thickened feeds', 'Supraglottoplasty (severe — divide AE folds, trim arytenoids)', 'Tracheostomy (severe with failed supraglottoplasty)']} value={lmTx} onChange={setLmTx} />
        </FL>
      </Section>

      <Section title="Subglottic Stenosis" applicable={sec.subglotticStenosis} onApplicable={v => sa('subglotticStenosis', v)}>
        <FL label="Myer-Cotton Grade">
          <Pills options={['Grade I (<50% obstruction)', 'Grade II (51–70%)', 'Grade III (71–99%)', 'Grade IV (complete / no lumen)']} value={sgsMyer} onChange={setSgsMyer} />
        </FL>
        <FL label="Severity (clinical)"><Pills options={['Mild (asymptomatic)', 'Moderate (noisy breathing, exercise intolerance)', 'Severe (stridor at rest, recurrent croup, unable to extubate)']} value={sgsSeverity} onChange={setSgsSeverity} /></FL>
        <FL label="Cause">
          <Pills options={['Congenital (elliptical cricoid ring)', 'Acquired — prolonged intubation (NICU)', 'Acquired — external trauma', 'Post-infectious (bacterial tracheitis / diphtheria)', 'Post-surgical (laryngotracheal reconstruction)']} value={sgsCause} onChange={setSgsCause} />
        </FL>
        <FL label="Treatment">
          <Pills options={['Balloon dilatation (Grade I–II, mild)', 'Laryngotracheal reconstruction (LTR) — anterior rib cartilage graft', 'Cricotracheal resection (CTR — severe Grade III–IV)', 'Tracheostomy (temporising, severe)', 'Topical mitomycin C (anti-scar, adjunct)', 'Serial dilatation']} value={sgsTx} onChange={setSgsTx} multi />
        </FL>
      </Section>

      <Section title="Recurrent Respiratory Papillomatosis (RRP)" applicable={sec.recPapillomatosis} onApplicable={v => sa('recPapillomatosis', v)}>
        <FL label="Age at diagnosis">
          <Pills options={['Juvenile onset (<12 years)', 'Adult onset']} value={rrpAge} onChange={setRrpAge} />
        </FL>
        <FL label="HPV type"><Pills options={['HPV 6 (less aggressive)', 'HPV 11 (more aggressive, higher malignant risk)', 'Unknown']} value={rrpHpvType} onChange={setRrpHpvType} /></FL>
        <FL label="Sites involved">
          <Pills options={['Vocal cords', 'Supraglottis', 'Subglottis', 'Trachea (pulmonary extension — poor prognosis)', 'Oral cavity / tongue', 'Laryngeal surface epiglottis']} value={rrpSites} onChange={setRrpSites} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Derkay-Mounts severity score"><input className={inp} value={rrpDontaScale} onChange={e => setRrpDontaScale(e.target.value)} placeholder="e.g. Score 14/75 (moderate)" /></FL>
          <FL label="Surgeries per year"><input className={inp} value={rrpSurgeriesPerYear} onChange={e => setRrpSurgeriesPerYear(e.target.value)} placeholder="e.g. 4 surgeries/year" /></FL>
        </div>
        <FL label="Treatment">
          <Pills options={['Microlaryngoscopy + laser (CO₂) debulking', 'Microdebrider (cold steel)', 'Cidofovir intralesional injection (adjuvant)', 'Bevacizumab (intralesional — anti-VEGF, aggressive RRP)', 'Pembrolizumab (checkpoint inhibitor, severe/pulmonary)', 'HPV vaccination (Gardasil 9 — disease-modifying evidence emerging)', 'Tracheostomy (airway compromise — avoid if possible: seeding risk)']} value={rrpTx} onChange={setRrpTx} multi />
        </FL>
        <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-xs text-orange-800">
          HPV 6 and 11 from maternal genital infection at birth. HPV 11 associated with rapid growth and pulmonary spread. Avoid tracheostomy where possible — seeds distal airway. Gardasil 9 now part of NIP India for girls; off-label use in boys and RRP patients.
        </div>
      </Section>

      <Section title="Paediatric Hearing (Summary)" applicable={sec.hearingPaed} onApplicable={v => sa('hearingPaed', v)}>
        <FL label="Neonatal hearing screening (OAE/BERA)">
          <Pills options={['Pass bilateral', 'Refer — right', 'Refer — left', 'Refer — bilateral', 'Not screened (home birth / private / missed)', 'RBSK screening positive']} value={neonatalScreen} onChange={setNeonatalScreen} />
        </FL>
        <FL label="Diagnostic ABR threshold">
          <input className={inp} value={diagnosticABR} onChange={e => setDiagnosticABR(e.target.value)} placeholder="e.g. ABR threshold: R 40 dB nHL (moderate SNHL), L 25 dB nHL (mild)" />
        </FL>
        <FL label="Hearing aid fitted?">
          <Pills options={['Yes — bilateral BTE', 'Yes — unilateral', 'No — pending', 'Declined', 'Not indicated']} value={hearingAidFitted} onChange={setHearingAidFitted} />
        </FL>
        <FL label="Cochlear implant evaluation">
          <Pills options={['Not indicated (HL not severe enough)', 'Under evaluation', 'Listed for implant', 'Implanted — right', 'Implanted — bilateral']} value={ciEvaluation} onChange={setCiEvaluation} />
        </FL>
        <FL label="DEIC referral (District Early Intervention Centre — RBSK)">
          <Pills options={['Referred', 'Under DEIC care', 'Not yet referred', 'Not applicable']} value={deicReferral} onChange={setDeicReferral} />
        </FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base shadow transition-all">
        Save Paediatric ENT Assessment
      </button>
    </div>
  );
}
