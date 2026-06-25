/**
 * @shared-pool
 * NoseAndSinusForm — Nose, paranasal sinuses & olfaction assessment
 * Scoring: SNOT-22 symptom severity, Lund-Mackay CT score, Lund-Kennedy endoscopy score,
 *   Allergic rhinitis (ARIA classification), Epistaxis severity score
 * Portal-agnostic. Do NOT delete during portal rebuilds.
 */
import React, { useState, useMemo } from 'react';
import { Lock, AlertTriangle, Info } from 'lucide-react';
import api from '../../../api/client';

const A = {
  bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700',
  pill: 'bg-sky-100 border-sky-300 text-sky-800',
  active: 'bg-sky-600 border-sky-700 text-white',
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

const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400";
const ta = inp + " min-h-[72px] resize-y";

// SNOT-22 items
const SNOT22 = [
  'Need to blow nose', 'Sneezing', 'Runny nose', 'Nasal blockage/obstruction',
  'Loss of smell/taste', 'Cough', 'Post-nasal drip/discharge', 'Thick nasal discharge',
  'Ear fullness', 'Dizziness', 'Ear pain', 'Facial pain/pressure',
  'Difficulty falling asleep', 'Waking at night', 'Lack of good night\'s sleep', 'Waking up tired',
  'Fatigue', 'Reduced productivity', 'Reduced concentration', 'Frustrated/restless',
  'Sad', 'Embarrassed',
];

export default function NoseAndSinusForm({ patientId, encounterId, onSaved }) {
  const [sec, setSec] = useState({
    history: 'Applicable', examination: 'Applicable', rhinitis: 'N/A',
    sinusitis: 'N/A', polyp: 'N/A', septum: 'N/A', epistaxis: 'N/A',
    anosmia: 'N/A', tumour: 'N/A', investigations: 'N/A',
  });
  const sa = (k, v) => setSec(s => ({ ...s, [k]: v }));

  // History
  const [complaints, setComplaints] = useState([]);
  const [duration, setDuration] = useState('');
  const [laterality, setLaterality] = useState('');
  const [allergies, setAllergies] = useState('');
  const [triggers, setTriggers] = useState([]);
  const [smoking, setSmoking] = useState('');
  const [priorNasalSurgery, setPriorNasalSurgery] = useState('');

  // SNOT-22
  const [snot22, setSnot22] = useState({});
  const snot22Total = useMemo(() => Object.values(snot22).reduce((a, v) => a + (parseInt(v) || 0), 0), [snot22]);
  const snot22Severity = useMemo(() => {
    if (snot22Total === 0) return '';
    if (snot22Total <= 20) return 'Mild';
    if (snot22Total <= 50) return 'Moderate';
    return 'Severe';
  }, [snot22Total]);

  // Examination
  const [externalNose, setExternalNose] = useState('');
  const [septumPos, setSeptumPos] = useState('');
  const [septumSide, setSeptumSide] = useState('');
  const [turbinates, setTurbinates] = useState('');
  const [nasalMucosa, setNasalMucosa] = useState('');
  const [polypsPresent, setPolypsPresent] = useState('');
  const [discharge, setDischarge] = useState('');
  const [dischargeType, setDischargeType] = useState('');
  const [endoscopyFindings, setEndoscopyFindings] = useState('');
  const [lkScore, setLkScore] = useState('');

  // Rhinitis
  const [rhinitisType, setRhinitisType] = useState('');
  const [ariaClassification, setAriaClassification] = useState('');
  const [ariaSeverity, setAriaSeverity] = useState('');
  const [skinPrickTest, setSkinPrickTest] = useState('');
  const [specificIge, setSpecificIge] = useState('');
  const [rhinitisAllergens, setRhinitisAllergens] = useState([]);
  const [rhinitisTx, setRhinitisTx] = useState([]);

  // Sinusitis
  const [sinusitisType, setSinusitisType] = useState('');
  const [sinusesAffected, setSinusesAffected] = useState([]);
  const [sinusitisEtiology, setSinusitisEtiology] = useState([]);
  const [fungalType, setFungalType] = useState('');
  const [lmScore, setLmScore] = useState('');
  const [sinusitisTx, setSinusitisTx] = useState([]);
  const [fessIndication, setFessIndication] = useState('');

  // Polyps
  const [polypGrade, setPolypGrade] = useState('');
  const [polypBilateral, setPolypBilateral] = useState('');
  const [polypAssociated, setPolypAssociated] = useState([]);
  const [polypTx, setPolypTx] = useState([]);

  // Septum
  const [septumDeviation, setSeptumDeviation] = useState('');
  const [septumType, setSeptumType] = useState([]);
  const [septumSymptoms, setSeptumSymptoms] = useState([]);
  const [septumTx, setSeptumTx] = useState('');

  // Epistaxis
  const [epistaxisSide, setEpistaxisSide] = useState('');
  const [epistaxisSource, setEpistaxisSource] = useState('');
  const [epistaxisSeverity, setEpistaxisSeverity] = useState('');
  const [epistaxisFreq, setEpistaxisFreq] = useState('');
  const [epistaxisCause, setEpistaxisCause] = useState([]);
  const [epistaxisTx, setEpistaxisTx] = useState([]);
  const [kiesselbach, setKiesselbach] = useState('');

  // Anosmia
  const [anosmiaType, setAnosmiaType] = useState('');
  const [anosmiaOnset, setAnosmiaOnset] = useState('');
  const [anosmiaSniffin, setAnosmiaSniffin] = useState('');
  const [anosmiaCtScan, setAnosmiaCtScan] = useState('');

  // Tumour
  const [tumourSite, setTumourSite] = useState('');
  const [tumourBiopsy, setTumourBiopsy] = useState('');
  const [tumourStage, setTumourStage] = useState('');
  const [tumourTx, setTumourTx] = useState([]);

  // Investigations
  const [ctParanasal, setCtParanasal] = useState('');
  const [mriSinus, setMriSinus] = useState('');
  const [nasalCytology, setNasalCytology] = useState('');
  const [investigations, setInvestigations] = useState([]);

  const criticalAlert = useMemo(() => {
    if (epistaxisSeverity === 'Massive/life-threatening') return 'Massive epistaxis — secure airway, IV access, urgent ENT, consider posterior pack + angioembolisation';
    if (tumourSite && tumourBiopsy?.toLowerCase().includes('malignant')) return 'Sinonasal malignancy — urgent multidisciplinary team review + staging';
    return '';
  }, [epistaxisSeverity, tumourSite, tumourBiopsy]);

  const handleSave = async () => {
    await api.post('/assessments', { type: 'ent-nose-sinus', patientId, encounterId, data: { complaints, duration, laterality, allergies, triggers, smoking, priorNasalSurgery, snot22, snot22Total, snot22Severity, externalNose, septumPos, septumSide, turbinates, nasalMucosa, polypsPresent, discharge, dischargeType, endoscopyFindings, lkScore, rhinitisType, ariaClassification, ariaSeverity, skinPrickTest, specificIge, rhinitisAllergens, rhinitisTx, sinusitisType, sinusesAffected, sinusitisEtiology, fungalType, lmScore, sinusitisTx, fessIndication, polypGrade, polypBilateral, polypAssociated, polypTx, septumDeviation, septumType, septumSymptoms, septumTx, epistaxisSide, epistaxisSource, epistaxisSeverity, epistaxisFreq, epistaxisCause, epistaxisTx, kiesselbach, anosmiaType, anosmiaOnset, anosmiaSniffin, anosmiaCtScan, tumourSite, tumourBiopsy, tumourStage, tumourTx, ctParanasal, mriSinus, nasalCytology, investigations } });
    onSaved?.();
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-10">
      <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-blue-500 p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          </div>
          <div>
            <h1 className="text-xl font-bold">Nose & Paranasal Sinuses</h1>
            <p className="text-sky-100 text-sm">Rhinitis (ARIA) · Sinusitis · Polyps · Septum · Epistaxis · Anosmia · SNOT-22</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 space-y-1">
        <div className="font-bold flex items-center gap-1"><Info size={14}/>India Context</div>
        <p>Allergic rhinitis very prevalent — air pollution (Delhi AQI crisis), dust mites, cockroach allergen, pollen. Fungal sinusitis (invasive + non-invasive) disproportionately common in India, especially post-COVID mucormycosis epidemic (2021). Sinonasal tumours: NPC high in Northeast India; OSMF from betel nut → malignant transformation. FESS widely available at tertiary centres. PM-JAY covers FESS and septoplasty.</p>
      </div>

      {criticalAlert && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20}/>
          <div><div className="font-bold text-red-700">EMERGENCY</div><div className="text-red-800 text-sm">{criticalAlert}</div></div>
        </div>
      )}

      <Section title="Nasal History" applicable={sec.history} onApplicable={v => sa('history', v)}>
        <FL label="Complaints">
          <Pills options={['Nasal blockage/obstruction', 'Rhinorrhoea (runny nose)', 'Post-nasal drip', 'Sneezing', 'Epistaxis (nosebleed)', 'Loss of smell (anosmia)', 'Facial pain/pressure', 'Headache', 'Mouth breathing', 'Snoring', 'Nasal mass/swelling', 'Crusting']} value={complaints} onChange={setComplaints} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Duration"><input className={inp} value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 3 months" /></FL>
          <FL label="Side"><Pills options={['Right', 'Left', 'Bilateral', 'Alternating']} value={laterality} onChange={setLaterality} /></FL>
        </div>
        <FL label="Known allergies / atopy">
          <input className={inp} value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="e.g. house dust mite, pollen, penicillin" />
        </FL>
        <FL label="Triggers">
          <Pills options={['Dust', 'Pollen (seasonal)', 'Pet dander', 'Cold air', 'Strong smells/perfumes', 'Exercise', 'Smoke', 'Air pollution', 'Foods', 'Aspirin/NSAIDs (Samter triad)']} value={triggers} onChange={setTriggers} multi />
        </FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Smoking"><Pills options={['Non-smoker', 'Current smoker', 'Ex-smoker', 'Passive exposure']} value={smoking} onChange={setSmoking} /></FL>
          <FL label="Prior nasal surgery"><Pills options={['None', 'Septoplasty', 'FESS', 'Polypectomy', 'Turbinate reduction', 'Rhinoplasty', 'Caldwell-Luc']} value={priorNasalSurgery} onChange={setPriorNasalSurgery} /></FL>
        </div>

        {/* SNOT-22 */}
        <div className="rounded-xl border border-sky-200 bg-white p-4 space-y-3">
          <div className="font-bold text-sky-700 text-sm">SNOT-22 (Sinonasal Outcome Test) — 0=No problem, 5=Problem as bad as can be</div>
          <div className="grid grid-cols-1 gap-2">
            {SNOT22.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 flex-1">{item}</span>
                <Pills
                  options={['0', '1', '2', '3', '4', '5']}
                  value={snot22[i]?.toString()}
                  onChange={v => setSnot22(a => ({ ...a, [i]: v }))}
                  accent={A}
                />
              </div>
            ))}
          </div>
          {Object.keys(snot22).length >= 5 && (
            <div className={`rounded-lg px-3 py-2 text-sm font-bold ${snot22Severity === 'Severe' ? 'bg-red-100 text-red-700' : snot22Severity === 'Moderate' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
              SNOT-22 Total: {snot22Total}/110 — {snot22Severity}
            </div>
          )}
        </div>
      </Section>

      <Section title="Nasal Examination" applicable={sec.examination} onApplicable={v => sa('examination', v)}>
        <FL label="External nose"><input className={inp} value={externalNose} onChange={e => setExternalNose(e.target.value)} placeholder="e.g. Normal / saddle nose / crooked nose / swelling" /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Nasal septum position"><Pills options={['Midline', 'Deviated', 'Grossly deviated', 'Spur/ridge']} value={septumPos} onChange={setSeptumPos} /></FL>
          {septumPos !== 'Midline' && <FL label="Deviation side"><Pills options={['Right', 'Left']} value={septumSide} onChange={setSeptumSide} /></FL>}
        </div>
        <FL label="Inferior turbinates"><Pills options={['Normal', 'Hypertrophied — bilateral', 'Hypertrophied — right', 'Hypertrophied — left', 'Atrophied (atrophic rhinitis)', 'Congested and pale (allergy)']} value={turbinates} onChange={setTurbinates} /></FL>
        <FL label="Nasal mucosa"><Pills options={['Pink/healthy', 'Pale bluish (allergic)', 'Boggy/oedematous', 'Red/inflamed', 'Dry/crusty', 'Atrophic']} value={nasalMucosa} onChange={setNasalMucosa} /></FL>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Polyps visible"><Pills options={['None', 'Bilateral', 'Unilateral right', 'Unilateral left', 'Antro-choanal polyp']} value={polypsPresent} onChange={setPolypsPresent} /></FL>
          <FL label="Discharge"><Pills options={['None', 'Clear/watery', 'Mucoid', 'Mucopurulent', 'Blood-stained', 'Foul-smelling', 'CSF leak (glucose positive)']} value={dischargeType} onChange={setDischargeType} /></FL>
        </div>
        <FL label="Nasal endoscopy findings">
          <textarea className={ta} value={endoscopyFindings} onChange={e => setEndoscopyFindings(e.target.value)} placeholder="e.g. Bilateral grade 2 polyps, mucopus from right middle meatus, no mass lesion" />
        </FL>
        <FL label="Lund-Kennedy endoscopy score" sub="0–12 (bilateral 0–24)">
          <input className={inp} value={lkScore} onChange={e => setLkScore(e.target.value)} placeholder="e.g. 8/24 (polyps 2+2, discharge 2+1, oedema 0+1)" />
        </FL>
      </Section>

      <Section title="Allergic / Non-Allergic Rhinitis" applicable={sec.rhinitis} onApplicable={v => sa('rhinitis', v)}>
        <FL label="Type">
          <Pills options={['Allergic rhinitis (IgE-mediated)', 'Non-allergic rhinitis (vasomotor)', 'Mixed rhinitis', 'Occupational rhinitis', 'Drug-induced (rhinitis medicamentosa)', 'Atrophic rhinitis', 'Gustatory rhinitis', 'Non-allergic rhinitis with eosinophilia (NARES)']} value={rhinitisType} onChange={setRhinitisType} />
        </FL>
        {rhinitisType?.includes('Allergic') && (
          <>
            <FL label="ARIA classification">
              <Pills options={['Intermittent (<4 days/week or <4 weeks)', 'Persistent (≥4 days/week AND ≥4 weeks)']} value={ariaClassification} onChange={setAriaClassification} />
            </FL>
            <FL label="ARIA severity">
              <Pills options={['Mild (no impairment)', 'Moderate-severe (impaired sleep/ADL/school/work)']} value={ariaSeverity} onChange={setAriaSeverity} />
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Skin prick test"><Pills options={['Positive', 'Negative', 'Not done']} value={skinPrickTest} onChange={setSkinPrickTest} /></FL>
              <FL label="Specific IgE (RAST)"><input className={inp} value={specificIge} onChange={e => setSpecificIge(e.target.value)} placeholder="e.g. D.pter 3.5 kU/L, cockroach 2.1" /></FL>
            </div>
            <FL label="Sensitizing allergens">
              <Pills options={['House dust mite', 'Cockroach', 'Pollen (grass/tree)', 'Pet dander (cat/dog)', 'Mould (Aspergillus/Alternaria)', 'Food (milk/egg/wheat)', 'Occupational (latex/flour/wood dust)']} value={rhinitisAllergens} onChange={setRhinitisAllergens} multi />
            </FL>
          </>
        )}
        <FL label="Treatment">
          <Pills options={['Avoidance (allergen reduction measures)', 'Intranasal corticosteroid spray (INCS)', 'Non-sedating antihistamine (cetirizine/loratadine/fexofenadine)', 'Ipratropium nasal spray (vasomotor)', 'Nasal saline irrigation', 'Leukotriene antagonist (montelukast)', 'Allergen immunotherapy (SCIT/SLIT)', 'Omalizumab (severe allergic)', 'Surgical turbinate reduction', 'Decongestant (short-term only)']} value={rhinitisTx} onChange={setRhinitisTx} multi />
        </FL>
      </Section>

      <Section title="Rhinosinusitis" applicable={sec.sinusitis} onApplicable={v => sa('sinusitis', v)}>
        <FL label="Type">
          <Pills options={['Acute rhinosinusitis (ARS <12 wk)', 'Recurrent ARS (≥4 episodes/yr)', 'Chronic rhinosinusitis without polyps (CRSwNP)', 'Chronic rhinosinusitis with polyps (CRSsNP)', 'Acute-on-chronic', 'Subacute (4–12 weeks)']} value={sinusitisType} onChange={setSinusitisType} />
        </FL>
        <FL label="Sinuses involved">
          <Pills options={['Maxillary (commonest)', 'Ethmoid', 'Frontal', 'Sphenoid', 'Pansinusitis (all sinuses)', 'Unilateral', 'Bilateral']} value={sinusesAffected} onChange={setSinusesAffected} multi />
        </FL>
        <FL label="Aetiology">
          <Pills options={['Viral (post-URTI)', 'Bacterial (Strep pneumo/H.inf/Moraxella)', 'Allergic', 'Dental origin (maxillary — odontogenic)', 'Fungal ball (non-invasive aspergilloma)', 'Allergic fungal rhinosinusitis (AFRS)', 'Acute invasive fungal (mucormycosis)', 'Granulomatous (Wegener/sarcoid)', 'Immunocompromised']} value={sinusitisEtiology} onChange={setSinusitisEtiology} multi />
        </FL>
        {sinusitisEtiology.includes('Acute invasive fungal (mucormycosis)') && (
          <div className="rounded-xl border-2 border-red-400 bg-red-50 p-3 text-sm text-red-800 space-y-1">
            <div className="font-bold">Mucormycosis Protocol (post-COVID/diabetic context)</div>
            <div>• Control diabetes urgently (target glucose &lt;200 mg/dL)</div>
            <div>• Stop/reduce immunosuppressants</div>
            <div>• Liposomal Amphotericin B (IV) — 5–10 mg/kg/day</div>
            <div>• Urgent surgical debridement (rhinologist + maxillofacial + neurosurgery if orbital/intracranial)</div>
            <div>• MRI orbits + brain to assess extent. Ophthalmology for orbital apex assessment</div>
          </div>
        )}
        {sinusitisEtiology.includes('Fungal ball (non-invasive aspergilloma)') || sinusitisEtiology.includes('Allergic fungal rhinosinusitis (AFRS)') ? (
          <FL label="Fungal type detail"><Pills options={['Mycetoma (fungal ball) — unilateral', 'AFRS — bilateral with eosinophilia + specific IgE', 'Chronic invasive (fibrosing)', 'Granulomatous invasive']} value={fungalType} onChange={setFungalType} /></FL>
        ) : null}
        <FL label="Lund-Mackay CT score" sub="0–24">
          <input className={inp} value={lmScore} onChange={e => setLmScore(e.target.value)} placeholder="e.g. 12/24 (bilateral maxillary+ethmoid opacification)" />
        </FL>
        <FL label="Treatment">
          <Pills options={['Nasal saline irrigation (high-volume)', 'Intranasal corticosteroid (INCS)', 'Oral corticosteroid (short course)', 'Antibiotics (amoxicillin/augmentin/levofloxacin)', 'FESS (functional endoscopic sinus surgery)', 'Antifungal (itraconazole — AFRS)', 'Biologics (dupilumab for CRSwNP)', 'Montelukast (Samter triad)', 'Aspirin desensitisation (Samter)']} value={sinusitisTx} onChange={setSinusitisTx} multi />
        </FL>
        {sinusitisTx.includes('FESS (functional endoscopic sinus surgery)') && (
          <FL label="FESS indication">
            <input className={inp} value={fessIndication} onChange={e => setFessIndication(e.target.value)} placeholder="e.g. Failed medical therapy 12 weeks, LM score >12, fungal ball, complications" />
          </FL>
        )}
      </Section>

      <Section title="Nasal Polyps" applicable={sec.polyp} onApplicable={v => sa('polyp', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Polyp grade (Meltzer/Lildholdt)"><Pills options={['Grade 0 (none)', 'Grade 1 (confined to meatus)', 'Grade 2 (beyond middle turbinate)', 'Grade 3 (touching inferior turbinate)', 'Grade 4 (complete obstruction)']} value={polypGrade} onChange={setPolypGrade} /></FL>
          <FL label="Bilateral?"><Pills options={['Bilateral', 'Unilateral (consider malignancy)']} value={polypBilateral} onChange={setPolypBilateral} /></FL>
        </div>
        <FL label="Associated conditions">
          <Pills options={['Asthma (50%)', 'Aspirin sensitivity (Samter triad — aspirin+asthma+polyps)', 'Allergic rhinitis', 'Cystic fibrosis (children)', 'Eosinophilic granulomatosis (EGPA/Churg-Strauss)', 'AERD (aspirin-exacerbated respiratory disease)']} value={polypAssociated} onChange={setPolypAssociated} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={['High-dose INCS spray', 'Short oral steroid course', 'FESS (polypectomy)', 'Dupilumab (IL-4/13 blocker — severe bilateral CRSwNP)', 'Mepolizumab / benralizumab (eosinophilic)', 'Omalizumab (if allergic comorbidity)']} value={polypTx} onChange={setPolypTx} multi />
        </FL>
        {polypBilateral === 'Unilateral (consider malignancy)' && (
          <div className="rounded-lg bg-orange-50 border border-orange-300 p-3 text-xs text-orange-800">
            Unilateral polyp — must exclude inverted papilloma, angiofibroma, malignancy. Biopsy mandatory.
          </div>
        )}
      </Section>

      <Section title="Nasal Septal Deviation" applicable={sec.septum} onApplicable={v => sa('septum', v)}>
        <FL label="Degree of deviation"><Pills options={['Mild (no symptoms)', 'Moderate (partial obstruction)', 'Severe (significant obstruction)', 'C-shaped', 'S-shaped']} value={septumDeviation} onChange={setSeptumDeviation} /></FL>
        <FL label="Type of deformity"><Pills options={['Bony ridge/spur', 'Cartilaginous C-deviation', 'Dislocation from vomerine groove', 'Subluxation of columella', 'Post-traumatic']} value={septumType} onChange={setSeptumType} multi /></FL>
        <FL label="Symptoms due to deviation"><Pills options={['Unilateral nasal obstruction', 'Snoring/OSA contribution', 'Epistaxis from spur', 'Headache/pressure', 'Aspiration difficulty']} value={septumSymptoms} onChange={setSeptumSymptoms} multi /></FL>
        <FL label="Treatment"><Pills options={['Conservative (decongestant/INCS)', 'Septoplasty', 'Septorhinoplasty (cosmetic + functional)']} value={septumTx} onChange={setSeptumTx} /></FL>
      </Section>

      <Section title="Epistaxis" applicable={sec.epistaxis} onApplicable={v => sa('epistaxis', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Side"><Pills options={['Right', 'Left', 'Bilateral', 'Bilateral alternate']} value={epistaxisSide} onChange={setEpistaxisSide} /></FL>
          <FL label="Source"><Pills options={["Anterior (Little's area, Kiesselbach's plexus — 90%)", 'Posterior (sphenopalatine — 10%, severe)', 'Unknown']} value={epistaxisSource} onChange={setEpistaxisSource} /></FL>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Severity"><Pills options={['Minor (stopped spontaneously)', 'Moderate (requires intervention)', 'Massive/life-threatening']} value={epistaxisSeverity} onChange={setEpistaxisSeverity} /></FL>
          <FL label="Frequency"><Pills options={['First episode', 'Recurrent (>1/month)', 'Daily', 'Chronic/longstanding']} value={epistaxisFreq} onChange={setEpistaxisFreq} /></FL>
        </div>
        <FL label="Kiesselbach's plexus status">
          <Pills options={["Prominent vessels seen", "Active bleeding point", "Crusting/scabbing", "Normal"]} value={kiesselbach} onChange={setKiesselbach} />
        </FL>
        <FL label="Cause">
          <Pills options={['Idiopathic (local vessel fragility)', 'Hypertension', 'Anticoagulants (warfarin/NOACs)', 'Antiplatelet drugs', 'Coagulopathy / thrombocytopenia', 'Nasal trauma (digital/external)', 'Nasal polyp surface bleeding', 'Septal spur', 'Hereditary haemorrhagic telangiectasia (HHT/Osler-Weber-Rendu)', 'Angiofibroma (adolescent male)', 'Nasal tumour', 'Cocaine abuse']} value={epistaxisCause} onChange={setEpistaxisCause} multi />
        </FL>
        <FL label="Treatment">
          <Pills options={["First aid — pinch soft nose 10 min + sit forward", 'Silver nitrate cauterisation (anterior)', 'Electrocautery under endoscopy', 'Anterior nasal pack (Merocel/BIPP)', 'Posterior pack (Foley catheter / commercial)', 'Sphenopalatine artery ligation (endoscopic)', 'External carotid artery ligation', 'Angiography + embolisation', 'Tranexamic acid (IV/topical)', 'Septodermoplasty (HHT)', 'Correct coagulopathy / reverse anticoagulant']} value={epistaxisTx} onChange={setEpistaxisTx} multi />
        </FL>
      </Section>

      <Section title="Anosmia / Smell Disorders" applicable={sec.anosmia} onApplicable={v => sa('anosmia', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Type"><Pills options={['Anosmia (complete loss)', 'Hyposmia (reduced)', 'Parosmia (distorted)', 'Phantosmia (hallucination)', 'Presbyosmia (age-related)']} value={anosmiaType} onChange={setAnosmiaType} /></FL>
          <FL label="Onset"><Pills options={['Post-COVID (long COVID)', 'Post-viral (other)', 'Post-traumatic (head)', 'Congenital (Kallmann)', 'Neurological (PD/AD)', 'Sinonasal (obstruction/polyps)', 'Drug-induced', 'Toxic (zinc/cocaine)']} value={anosmiaOnset} onChange={setAnosmiaOnset} /></FL>
        </div>
        <FL label="Sniffin' Sticks / UPSIT score"><input className={inp} value={anosmiaSniffin} onChange={e => setAnosmiaSniffin(e.target.value)} placeholder="e.g. Sniffin' Sticks TDI score 18/48 (hyposmia: 16–30)" /></FL>
        <FL label="MRI olfactory bulb / brain"><input className={inp} value={anosmiaCtScan} onChange={e => setAnosmiaCtScan(e.target.value)} placeholder="e.g. Reduced olfactory bulb volume bilaterally; no cribriform plate fracture" /></FL>
      </Section>

      <Section title="Sinonasal Tumour" applicable={sec.tumour} onApplicable={v => sa('tumour', v)}>
        <div className="grid grid-cols-2 gap-3">
          <FL label="Site"><Pills options={['Nasal cavity', 'Maxillary sinus', 'Ethmoid sinus', 'Frontal sinus', 'Sphenoid sinus', 'Nasopharynx', 'Nasal vestibule']} value={tumourSite} onChange={setTumourSite} /></FL>
          <FL label="Stage (TNM)"><input className={inp} value={tumourStage} onChange={e => setTumourStage(e.target.value)} placeholder="e.g. T2N0M0" /></FL>
        </div>
        <FL label="Biopsy / histology"><input className={inp} value={tumourBiopsy} onChange={e => setTumourBiopsy(e.target.value)} placeholder="e.g. Squamous cell carcinoma / inverted papilloma / olfactory neuroblastoma / NPC" /></FL>
        <FL label="Treatment">
          <Pills options={['Surgery (endoscopic resection)', 'Surgery (craniofacial resection)', 'Radiotherapy', 'Chemoradiation', 'Targeted therapy (EBV-directed NPC)', 'Palliative']} value={tumourTx} onChange={setTumourTx} multi />
        </FL>
      </Section>

      <Section title="Investigations" applicable={sec.investigations} onApplicable={v => sa('investigations', v)}>
        <FL label="CT paranasal sinuses"><input className={inp} value={ctParanasal} onChange={e => setCtParanasal(e.target.value)} placeholder="e.g. Bilateral maxillary+ethmoid opacification; no erosion; Lund-Mackay 14/24" /></FL>
        <FL label="MRI sinuses / orbits / brain"><input className={inp} value={mriSinus} onChange={e => setMriSinus(e.target.value)} placeholder="e.g. T2 heterogenous signal right maxillary mass with orbital invasion" /></FL>
        <FL label="Nasal cytology / brushings"><input className={inp} value={nasalCytology} onChange={e => setNasalCytology(e.target.value)} placeholder="e.g. Eosinophilia ++, no malignant cells" /></FL>
        <FL label="Additional tests">
          <Pills options={['Total IgE + specific IgE panel', 'CBC + eosinophil count', 'Serum ANCA (GPA)', 'ACE level (sarcoidosis)', 'Sweat chloride (CF)', 'Nasal NO (PCD)', 'Biopsy (electron microscopy for PCD)', 'Viral PCR (COVID, influenza)', 'KOH + fungal culture (invasive fungal)', 'PT/aPTT + platelets (recurrent epistaxis)']} value={investigations} onChange={setInvestigations} multi />
        </FL>
      </Section>

      <button onClick={handleSave} className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base shadow transition-all">
        Save Nose & Sinus Assessment
      </button>
    </div>
  );
}
