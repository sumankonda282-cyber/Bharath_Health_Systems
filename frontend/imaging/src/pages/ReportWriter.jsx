import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { toast } from '../utils/toast'
import {
  FileEdit, Loader2, AlertCircle, CheckCircle, Clock, User,
  ChevronDown, ChevronUp, Lock, PenLine, Printer, Paperclip,
  AlertOctagon, LayoutTemplate, X as XIcon, ChevronRight,
} from 'lucide-react'

const STATUS_BADGE = {
  pending:     'badge-yellow',
  scheduled:   'badge-blue',
  in_progress: 'badge-purple',
  completed:   'badge-green',
  acquired:    'badge-blue',
}

function timeSince(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function calcAge(dob) {
  if (!dob) return null
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000))
}

// ── Modality Report Templates ──────────────────────────────────────────────────
const MODALITY_TEMPLATES = {
  'X-Ray': {
    'X-Ray Chest PA': {
      technique: 'PA chest radiograph obtained in full inspiration.',
      findings: 'LUNG FIELDS:\n- Clear bilaterally. No focal consolidation, pneumothorax, or pleural effusion.\n\nHEART AND MEDIASTINUM:\n- Cardiac size within normal limits (CTR < 0.5). Mediastinal contours normal. No widening.\n\nBONES AND SOFT TISSUES:\n- No rib fractures or lytic/sclerotic lesions. Soft tissues unremarkable.',
      impression: 'Normal chest radiograph.',
    },
    'X-Ray Chest AP': {
      technique: 'AP chest radiograph obtained in supine/erect position.',
      findings: 'LUNG FIELDS:\n- Appear clear. No obvious consolidation or collapse.\n\nHEART AND MEDIASTINUM:\n- Cardiac shadow within acceptable limits for AP projection. No gross mediastinal widening.\n\nBONES:\n- No visible fractures.',
      impression: 'No acute cardiopulmonary findings on AP view. PA view recommended if clinically indicated.',
    },
    'X-Ray Abdomen': {
      technique: 'Plain X-ray abdomen, erect and supine views.',
      findings: 'BOWEL GAS PATTERN:\n- Normal distribution. No dilated bowel loops or air-fluid levels.\n\nSOLID ORGANS:\n- Liver, spleen, kidney shadows unremarkable.\n\nPSOAS OUTLINES:\n- Visible bilaterally.\n\nFREE AIR:\n- No free air under diaphragm.',
      impression: 'Normal plain X-ray abdomen. No evidence of obstruction, perforation, or calculus.',
    },
    'X-Ray LS Spine AP & Lateral': {
      technique: 'X-ray lumbosacral spine, AP and lateral views.',
      findings: 'VERTEBRAL BODIES:\n- Heights maintained L1–S1. No compression fracture. Alignment maintained.\n\nINTERVERTEBRAL DISCS:\n- Disc spaces adequate. No significant narrowing.\n\nFACET JOINTS:\n- Appear normal.\n\nSACROILIAC JOINTS:\n- Normal.',
      impression: 'No significant abnormality on plain X-ray of the lumbosacral spine.',
    },
    'X-Ray PNS (Water\'s + Caldwell)': {
      technique: "X-ray paranasal sinuses, Water's and Caldwell views.",
      findings: 'MAXILLARY SINUSES:\n- Bilateral maxillary sinuses clear.\n\nFRONTAL SINUSES:\n- Pneumatised, clear.\n\nETHMOID SINUSES:\n- No opacification.\n\nSPHENOID:\n- Partially visualised, appears clear.',
      impression: 'No significant paranasal sinus opacification.',
    },
  },
  'CT': {
    'CT Head Plain': {
      technique: 'MDCT of the brain without IV contrast. Axial sections with coronal and sagittal reformats. Slice thickness: 5 mm.',
      findings: 'BRAIN PARENCHYMA:\n- Normal cortical and subcortical grey-white matter differentiation.\n- No focal hyperdense or hypodense lesion. No midline shift.\n\nVENTRICLES:\n- Ventricular system and sulci age-appropriate. No hydrocephalus.\n\nPOSTERIOR FOSSA:\n- Cerebellum and brainstem normal.\n\nEXTRA-AXIAL:\n- No subdural, epidural, or subarachnoid collection.\n\nBONY CALVARIUM:\n- No fracture or lytic/blastic lesion.',
      impression: 'Normal CT brain. No intracranial haemorrhage, mass, or infarct identified.',
    },
    'CT Head With Contrast': {
      technique: 'MDCT of the brain with IV contrast (Iohexol 350, 50 mL). Pre and post contrast axial sections. Slice thickness: 5 mm.',
      findings: 'PRE-CONTRAST:\n- Normal grey-white matter differentiation. No hyperdense lesion.\n\nPOST-CONTRAST:\n- No abnormal enhancement. No ring-enhancing lesion. No meningeal enhancement.\n\nVENTRICLES:\n- Normal in size.\n\nEXTRA-AXIAL:\n- No subdural or epidural collection.',
      impression: 'No abnormal intracranial enhancement. No mass lesion identified.',
    },
    'CT Chest': {
      technique: 'MDCT thorax with IV contrast (portal venous phase). Axial sections with coronal and sagittal reformats; lung and mediastinal window reconstructions.',
      findings: 'LUNG PARENCHYMA:\n- Both lungs fully expanded. No consolidation, mass, or nodule.\n- No ground glass opacity or interstitial thickening.\n\nAIRWAYS:\n- Trachea and main bronchi patent and midline.\n\nPLEURA:\n- No pleural effusion or pneumothorax.\n\nMEDIASTINUM:\n- Cardiac size normal. No lymphadenopathy (nodes < 10 mm). No mediastinal mass.\n\nBONES:\n- No lytic/sclerotic lesion or fracture.',
      impression: 'Normal CT thorax. No parenchymal, mediastinal, or pleural abnormality.',
    },
    'CT Abdomen & Pelvis': {
      technique: 'MDCT abdomen and pelvis with oral and IV contrast, portal venous phase. Axial sections with coronal and sagittal reformats.',
      findings: 'LIVER:\n- Normal size, shape, attenuation. No focal lesion. Portal and hepatic veins patent.\n\nGALL BLADDER & BILE DUCTS:\n- GB normally distended, no calculus. No biliary dilatation.\n\nPANCREAS:\n- Normal size and attenuation. Pancreatic duct not dilated.\n\nSPLEEN:\n- Normal size and attenuation.\n\nKIDNEYS:\n- Both kidneys normal in size and enhancement. No calculus or hydronephrosis.\n\nBOWEL:\n- No obstruction or wall thickening.\n\nPELVIS:\n- Bladder normal. No pelvic lymphadenopathy.\n\nBONES:\n- No suspicious osseous lesion.',
      impression: 'Normal CT abdomen and pelvis. No significant abnormality.',
    },
    'CT KUB (Non-Contrast)': {
      technique: 'MDCT of kidneys, ureters, and urinary bladder without IV contrast. Axial sections with coronal and sagittal reformats.',
      findings: 'RIGHT KIDNEY:\n- Normal size. No calculus or hydronephrosis.\n\nLEFT KIDNEY:\n- Normal size. No calculus or hydronephrosis.\n\nURETERS:\n- Both ureters normal calibre. No ureteric calculus.\n\nURINARY BLADDER:\n- Wall normal. No calculus.\n\nINCIDENTAL:\n- No significant incidental finding.',
      impression: 'No renal or ureteric calculus. No hydronephrosis.',
    },
  },
  'MRI': {
    'MRI Brain (Plain)': {
      technique: 'MRI brain. Sequences: T1, T2, FLAIR, DWI/ADC, T2*/GRE — sagittal, axial, and coronal planes.',
      findings: 'BRAIN PARENCHYMA:\n- Normal signal intensity in grey and white matter.\n- No focal T1 hypointense or T2/FLAIR hyperintense lesion.\n- No diffusion restriction (DWI/ADC normal). No haemorrhage on GRE.\n\nVENTRICLES & CSF:\n- Ventricular system normal. No hydrocephalus. Sulcal prominence age-appropriate.\n\nPOSTERIOR FOSSA:\n- Cerebellum and brainstem normal signal and morphology.\n\nEXTRA-AXIAL:\n- No collection or abnormal meningeal signal.\n\nPITUITARY:\n- Normal size and signal.\n\nVASCULAR:\n- Flow voids maintained in major vessels.',
      impression: 'Normal MRI brain. No infarct, bleed, or mass.',
    },
    'MRI Brain With Contrast': {
      technique: 'MRI brain with IV gadolinium (0.1 mmol/kg). Pre and post contrast T1 added to standard protocol.',
      findings: 'PRE-CONTRAST:\n- Normal grey-white matter signal. No mass or midline shift.\n\nPOST-CONTRAST:\n- No abnormal parenchymal or extra-axial enhancement.\n- No leptomeningeal or dural enhancement. No ring-enhancing lesion.\n\nDWI:\n- No restricted diffusion.',
      impression: 'No abnormal intracranial enhancement. No mass or vascular malformation.',
    },
    'MRI Lumbar Spine': {
      technique: 'MRI lumbar spine. Sequences: T1 and T2 sagittal; T2 axial at disc levels.',
      findings: 'VERTEBRAL BODIES:\n- Heights maintained L1–S1. Normal marrow signal. No compression fracture. No Modic change.\n\nINTERVERTEBRAL DISCS:\n- L3–L4: Disc maintained.\n- L4–L5: Disc maintained.\n- L5–S1: Disc maintained.\n- No significant prolapse.\n\nSPINAL CANAL:\n- Adequate dimensions. Conus at L1, normal signal.\n\nNEURAL FORAMINA:\n- Patent at all levels.\n\nFACET JOINTS:\n- No significant arthropathy.',
      impression: 'No significant disc prolapse or neural compression.',
    },
    'MRI Knee': {
      technique: 'MRI [right/left] knee. Sequences: PD, PD fat-sat (coronal and sagittal), T1 coronal, T2 axial.',
      findings: 'MENISCI:\n- Medial meniscus: Normal signal and morphology.\n- Lateral meniscus: Normal signal and morphology.\n\nLIGAMENTS:\n- ACL: Normal. PCL: Normal. MCL and LCL: Normal.\n\nARTICULAR CARTILAGE:\n- No focal defect.\n\nBONE:\n- No marrow oedema or fracture.\n\nJOINT EFFUSION:\n- Minimal/no effusion.\n\nPATELLA:\n- Normal position and cartilage.',
      impression: 'No significant internal derangement of the knee.',
    },
  },
  'USG': {
    'USG Abdomen': {
      technique: 'B-mode ultrasonography abdomen with 3.5–5 MHz transducer.',
      findings: 'LIVER:\n- Normal size (span ~13 cm). Homogeneous echotexture. No focal lesion. No IHBRD. Hepatic veins and portal vein patent.\n\nGALL BLADDER:\n- Normally distended. Wall < 3 mm. No calculus, polyp, or sludge.\n\nCBD:\n- Diameter ~4 mm (normal).\n\nPANCREAS:\n- Visualised portions normal. No focal mass or ductal dilatation.\n\nSPLEEN:\n- Normal size (~10 cm). Homogeneous echotexture.\n\nKIDNEYS:\n- Right: ~10 cm, normal echotexture, no calculus or hydronephrosis.\n- Left: ~10 cm, normal echotexture, no calculus or hydronephrosis.\n\nFREE FLUID:\n- No ascites.',
      impression: 'Normal ultrasound abdomen. No significant abnormality.',
    },
    'USG Pelvis (Female)': {
      technique: 'Transabdominal (and transvaginal where applicable) pelvic ultrasound.',
      findings: 'UTERUS:\n- Normal size, shape, and echotexture. Endometrial thickness: __ mm (appropriate for phase). No fibroid or mass.\n\nOVARIES:\n- Right: Normal size and echotexture. No cyst.\n- Left: Normal size and echotexture. No cyst.\n\nCUL-DE-SAC:\n- No free fluid.\n\nADNEXA:\n- No adnexal mass.',
      impression: 'Normal pelvic ultrasound.',
    },
    'USG Thyroid': {
      technique: 'High-resolution ultrasonography thyroid with 7–12 MHz linear transducer.',
      findings: 'RIGHT LOBE:\n- Normal size (__ × __ × __ cm). Homogeneous echotexture. No nodule.\n\nLEFT LOBE:\n- Normal size (__ × __ × __ cm). Homogeneous echotexture. No nodule.\n\nISTHMUS:\n- Thickness ~3 mm.\n\nCERVICAL LYMPH NODES:\n- No significant lymphadenopathy.',
      impression: 'Normal thyroid on ultrasound. No nodule or lymphadenopathy.',
    },
    'USG Obstetric': {
      technique: 'Transabdominal obstetric ultrasound.',
      findings: 'FETAL BIOMETRY:\n- BPD: __ mm  HC: __ mm  AC: __ mm  FL: __ mm\n- EFW: ~__ g (__ percentile)\n- GA by biometry: __ weeks __ days\n\nFETAL ANATOMY:\n- Head: Normal. Spine: No obvious defect. Abdomen: Normal.\n- Cardiac activity: Present, rate ~__ bpm. Limbs: Normal.\n\nPLACENTA:\n- Site: __  Grade: __  No previa.\n\nAMNIOTIC FLUID:\n- AFI: __ cm (normal).\n\nCERVIX:\n- Length: __ cm.',
      impression: 'Single live intrauterine gestation of approximately __ weeks.',
    },
  },
  'Mammography': {
    'Mammography Screening': {
      technique: 'Bilateral mammography: CC and MLO views of both breasts.',
      findings: 'BREAST COMPOSITION:\n- Scattered areas of fibroglandular density (ACR Category B).\n\nRIGHT BREAST:\n- No suspicious mass, architectural distortion, or calcification.\n\nLEFT BREAST:\n- No suspicious mass, architectural distortion, or calcification.\n\nLYMPH NODES:\n- No abnormal axillary lymph nodes.\n\nSKIN AND NIPPLE:\n- No skin thickening or nipple retraction.',
      impression: 'No mammographically suspicious finding. BIRADS 1 — Negative. Annual mammogram recommended.',
    },
    'Mammography Diagnostic': {
      technique: 'Diagnostic mammography with additional spot compression/magnification views as indicated.',
      findings: "BREAST COMPOSITION:\n- __\n\nFINDING:\n- Location: __ o'clock, __ cm from nipple\n- Size: __ cm  Shape: __  Margin: __\n- Associated features: __\n\nCALCIFICATIONS:\n- __ (type and distribution)",
      impression: 'BIRADS Category __ — __. [Clinical correlation and further workup as appropriate.]',
    },
  },
}

function getTemplatesForOrder(order) {
  if (!order) return {}
  const mod = (order.modality || '').toUpperCase().replace(/\s+/g, '')
  if (mod.includes('CT') || mod.includes('COMPUTED'))  return MODALITY_TEMPLATES['CT']  || {}
  if (mod.includes('MRI') || mod.includes('MAGNETIC')) return MODALITY_TEMPLATES['MRI'] || {}
  if (mod.includes('USG') || mod.includes('ULTRA') || mod.includes('SONO')) return MODALITY_TEMPLATES['USG'] || {}
  if (mod.includes('MAMMO'))                           return MODALITY_TEMPLATES['Mammography'] || {}
  if (mod.includes('XR') || mod.includes('XRAY') || mod.includes('CR') || mod.includes('DR') || mod.includes('PLAIN') || mod.includes('X-RAY'))
    return MODALITY_TEMPLATES['X-Ray'] || {}
  return Object.values(MODALITY_TEMPLATES).reduce((acc, v) => ({ ...acc, ...v }), {})
}

// ── Print Report ───────────────────────────────────────────────────────────────
function printReport(order, form, isCritical, radiologistName) {
  const patient = order?.patient || {}
  const age     = calcAge(patient.dob || patient.date_of_birth)
  const now     = new Date()
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const esc = s => (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Radiology Report — IMG-${order?.id}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;padding:18mm 20mm 14mm;color:#111827;font-size:10.5pt;line-height:1.5}
    .lh{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:3px solid #0F2557;margin-bottom:16px}
    .logo{font-size:18pt;font-weight:800;color:#0F2557;letter-spacing:-0.5px}
    .logo span{color:#F5821E}
    .logo-sub{font-size:8pt;color:#6b7280;margin-top:2px}
    .meta{text-align:right;font-size:8.5pt;color:#6b7280;line-height:1.7}
    .meta strong{color:#1f2937}
    .crit{background:#fef2f2;border:2px solid #ef4444;border-radius:6px;padding:8px 14px;margin-bottom:14px;color:#b91c1c;font-weight:700;font-size:10pt}
    table.pt{width:100%;border-collapse:collapse;border:1px solid #e5e7eb;margin-bottom:16px}
    table.pt th{background:#f3f4f6;font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:600;padding:6px 10px;text-align:left;border-bottom:1px solid #e5e7eb}
    table.pt td{padding:7px 10px;font-size:9.5pt;border-bottom:1px solid #f3f4f6}
    table.pt tr:last-child td{border-bottom:none}
    .sec{margin-bottom:14px}
    .sec-t{font-size:8.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0F2557;padding-bottom:4px;border-bottom:1.5px solid #dbeafe;margin-bottom:8px}
    .sec-b{font-size:10pt;line-height:1.65;color:#1f2937}
    .imp{background:#eff6ff;border-left:3px solid #0F2557;padding:10px 14px;border-radius:0 6px 6px 0;font-size:10.5pt;line-height:1.65;color:#1f2937}
    .sig-row{display:flex;justify-content:flex-end;margin-top:36px}
    .sig{text-align:center;min-width:180px}
    .sig-line{border-top:1px solid #374151;padding-top:6px;margin-top:50px}
    .sig-name{font-weight:700;font-size:10pt;color:#1f2937}
    .sig-sub{font-size:8.5pt;color:#6b7280;margin-top:2px}
    .footer{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:8px;text-align:center;font-size:7.5pt;color:#9ca3af}
    @media print{body{padding:10mm 15mm 10mm}@page{margin:10mm}}
  </style>
</head>
<body>
  <div class="lh">
    <div>
      <div class="logo">BH <span>Imaging</span></div>
      <div class="logo-sub">BharatCliniq Healthcare · Radiology &amp; Imaging Department</div>
    </div>
    <div class="meta">
      <div><strong>Order ID:</strong> IMG-${order?.id}</div>
      <div><strong>Report Date:</strong> ${dateStr}</div>
      <div><strong>Time:</strong> ${timeStr}</div>
    </div>
  </div>

  ${isCritical ? '<div class="crit">&#9888; CRITICAL FINDING — Referring physician has been notified</div>' : ''}

  <table class="pt">
    <tr>
      <th>Patient Name</th><th>UHID</th><th>Age / Gender</th><th>Modality</th><th>Referred By</th>
    </tr>
    <tr>
      <td><strong>${esc(patient.full_name || order?.patient_name)}</strong></td>
      <td>${esc(patient.uhid)}</td>
      <td>${age !== null ? age + ' yrs' : '—'} / ${patient.gender ? patient.gender.charAt(0).toUpperCase() : '—'}</td>
      <td>${esc(order?.modality || order?.body_part)}</td>
      <td>Dr. ${esc(order?.ordered_by_name || order?.doctor?.full_name)}</td>
    </tr>
  </table>

  ${(order?.clinical_history || order?.reason_for_exam) ? `
  <div class="sec"><div class="sec-t">Clinical History</div><div class="sec-b">${esc(order.clinical_history || order.reason_for_exam)}</div></div>` : ''}

  ${form.technique ? `
  <div class="sec"><div class="sec-t">Technique</div><div class="sec-b">${esc(form.technique)}</div></div>` : ''}

  <div class="sec"><div class="sec-t">Findings</div><div class="sec-b">${esc(form.findings) || '—'}</div></div>

  <div class="sec"><div class="sec-t">Impression</div><div class="imp">${esc(form.impression) || '—'}</div></div>

  ${form.recommendation ? `
  <div class="sec"><div class="sec-t">Recommendation</div><div class="sec-b">${esc(form.recommendation)}</div></div>` : ''}

  <div class="sig-row">
    <div class="sig">
      <div class="sig-line">
        <div class="sig-name">${esc(radiologistName) || '—'}</div>
        <div class="sig-sub">Radiologist · BH Imaging</div>
      </div>
    </div>
  </div>

  <div class="footer">
    This report is generated electronically and is valid without a physical signature.<br/>
    BharatCliniq Healthcare · Radiology Report · Confidential
  </div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=780')
  if (!win) { toast.warning('Pop-up blocked. Allow pop-ups to print reports.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ── Template Panel ─────────────────────────────────────────────────────────────
function TemplatePanel({ order, onApply }) {
  const [open, setOpen] = useState(false)
  const templates = getTemplatesForOrder(order)
  const names     = Object.keys(templates)
  if (!names.length) return null

  return (
    <div className="mb-4 border border-dashed border-blue-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-50 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <LayoutTemplate size={15} />
          Report Templates ({names.length})
        </div>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="p-3 flex flex-wrap gap-2 bg-white">
          {names.map(name => (
            <button
              key={name}
              onClick={() => { onApply(templates[name]); setOpen(false) }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <ChevronRight size={11} />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Attachment Section ─────────────────────────────────────────────────────────
function AttachmentSection({ attachments, onChange, disabled }) {
  const fileRef = useRef(null)

  function handleFiles(fileList) {
    const allowed = Array.from(fileList).filter(f =>
      ['image/jpeg', 'image/png', 'application/pdf'].includes(f.type)
    )
    if (attachments.length + allowed.length > 5) {
      toast.warning('Maximum 5 attachments allowed.')
      return
    }
    allowed.forEach(file => {
      const reader = new FileReader()
      reader.onload = e => {
        onChange(prev => [...prev, { name: file.name, type: file.type, size: file.size, data: e.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div className="mb-4">
      <label className="label flex items-center gap-1.5">
        <Paperclip size={13} />
        Attachments
        <span className="text-gray-400 font-normal text-xs">(JPEG / PNG / PDF, max 5)</span>
      </label>
      {!disabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,application/pdf"
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-xs mb-2">
            <Paperclip size={13} />
            Add file
          </button>
        </>
      )}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-1">
          {attachments.map((att, i) => (
            <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
              {att.type.startsWith('image/') ? (
                <img src={att.data} alt={att.name} className="w-8 h-8 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-8 h-8 bg-red-100 rounded flex items-center justify-center text-red-500 text-[9px] font-bold flex-shrink-0">PDF</div>
              )}
              <span className="max-w-[100px] truncate">{att.name}</span>
              {!disabled && (
                <button type="button" onClick={() => onChange(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                  <XIcon size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Patient Context Panel ──────────────────────────────────────────────────────
function PatientContextPanel({ order, priorReports }) {
  const [expanded, setExpanded] = useState(null)
  if (!order) return null

  const patient = order.patient || {}
  const age = calcAge(patient.dob || patient.date_of_birth)

  return (
    <div className="flex-shrink-0 w-72 flex flex-col gap-3">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <User size={15} style={{ color: '#0F2557' }} />
          <span className="font-semibold text-sm" style={{ color: '#0F2557' }}>Patient</span>
        </div>
        <div className="font-bold text-gray-800 mb-1">{patient.full_name || order.patient_name || '—'}</div>
        <div className="text-xs text-gray-500 space-y-0.5">
          {patient.uhid && <div><span className="text-gray-400">UHID:</span> {patient.uhid}</div>}
          {age !== null && <div><span className="text-gray-400">Age:</span> {age} yrs</div>}
          {patient.gender && (
            <div>
              <span className="text-gray-400">Gender:</span>{' '}
              {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold text-sm mb-2" style={{ color: '#0F2557' }}>Order Details</div>
        <div className="text-xs text-gray-600 space-y-1.5">
          {(order.ordered_by_name || order.doctor?.full_name) && (
            <div>
              <span className="text-gray-400 block">Referring Doctor</span>
              <span className="font-medium">Dr. {order.ordered_by_name || order.doctor?.full_name}</span>
            </div>
          )}
          {(order.clinical_history || order.reason_for_exam || order.notes) && (
            <div>
              <span className="text-gray-400 block">Clinical Notes</span>
              <span className="leading-relaxed">{order.clinical_history || order.reason_for_exam || order.notes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="card p-4">
        <div className="font-semibold text-sm mb-2" style={{ color: '#0F2557' }}>
          Prior Reports
          {priorReports.length > 0 && (
            <span className="ml-2 text-xs text-gray-400 font-normal">({priorReports.length})</span>
          )}
        </div>
        {priorReports.length === 0 ? (
          <div className="text-xs text-gray-400">No prior reports found.</div>
        ) : (
          <div className="space-y-1">
            {priorReports.map((r, i) => (
              <div key={r.id || i} className="rounded-lg overflow-hidden border border-gray-100">
                <button
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(expanded === i ? null : i)}
                >
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {r.modality || r.study_type || r.body_part || 'Study'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {(r.signed_at || r.created_at)
                        ? new Date(r.signed_at || r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </div>
                  </div>
                  {expanded === i
                    ? <ChevronUp size={13} className="text-gray-400 flex-shrink-0" />
                    : <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />}
                </button>
                {expanded === i && (
                  <div className="px-3 pb-3 text-xs text-gray-600 bg-gray-50 border-t border-gray-100">
                    {r.impression && (
                      <div className="mt-2">
                        <span className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Impression</span>
                        <p className="mt-0.5 leading-relaxed">{r.impression}</p>
                      </div>
                    )}
                    {r.findings && (
                      <div className="mt-2">
                        <span className="font-semibold text-gray-500 uppercase text-[10px] tracking-wide">Findings</span>
                        <p className="mt-0.5 leading-relaxed line-clamp-4">{r.findings}</p>
                      </div>
                    )}
                    {!r.impression && !r.findings && (
                      <p className="mt-2 text-gray-400">No report content available.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  findings: '',
  impression: '',
  recommendation: '',
  technique: '',
  radiologist_name: '',
  report_status: 'draft',
}

export default function ReportWriter() {
  const { user } = useAuth()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isRadiologist = user?.role === 'radiologist'

  const [orders, setOrders]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState({ ...EMPTY_FORM, radiologist_name: user?.full_name || '' })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedOk, setSavedOk]     = useState(false)
  const [confirmFinalize, setConfirmFinalize] = useState(false)
  const [priorReports, setPriorReports]       = useState([])
  const [signed, setSigned]       = useState(null)
  const [signing, setSigning]     = useState(false)

  // New state
  const [isCritical, setIsCritical]                       = useState(false)
  const [critPhysicianNotified, setCritPhysicianNotified] = useState(false)
  const [attachments, setAttachments]                     = useState([])

  const fetchOrders = useCallback(() => {
    setLoading(true)
    setError('')
    api.get('/imaging/orders', { params: { limit: 300 } })
      .then(r => {
        const list = Array.isArray(r) ? r : (r?.items || r?.data || [])
        const needReport = list.filter(o =>
          ['pending', 'scheduled', 'in_progress', 'acquired'].includes(o.status)
        )
        setOrders(needReport)

        const preId = searchParams.get('order_id')
          ? parseInt(searchParams.get('order_id'), 10)
          : location.state?.orderId
        if (preId) {
          const found = needReport.find(o => o.id === preId) || list.find(o => o.id === preId)
          if (found) selectOrder(found)
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30_000)
    return () => clearInterval(interval)
  }, [fetchOrders])

  function selectOrder(order) {
    setSelected(order)
    setSaveError('')
    setSavedOk(false)
    setConfirmFinalize(false)
    setSigned(order.signed_at ? { at: order.signed_at } : null)
    setIsCritical(order.is_critical || false)
    setCritPhysicianNotified(false)
    setAttachments([])
    setForm({
      findings:         order.findings        || '',
      impression:       order.impression      || '',
      recommendation:   order.recommendation || '',
      technique:        order.notes           || '',
      radiologist_name: order.radiologist_name || user?.full_name || '',
      report_status:    'draft',
    })
    if (order.patient?.id || order.patient_id) {
      const pid = order.patient?.id || order.patient_id
      api.get('/imaging/orders', { params: { patient_id: pid, status: 'completed', limit: 20 } })
        .then(r => {
          const list = Array.isArray(r) ? r : (r?.items || r?.data || [])
          setPriorReports(list.filter(o => o.id !== order.id))
        })
        .catch(() => setPriorReports([]))
    } else {
      setPriorReports([])
    }
  }

  function applyTemplate(tpl) {
    setForm(f => ({
      ...f,
      technique:  tpl.technique  || f.technique,
      findings:   tpl.findings   || f.findings,
      impression: tpl.impression || f.impression,
    }))
    toast.info('Template applied — review and customise before saving.')
  }

  const save = async (finalise) => {
    if (!selected) return
    if (isCritical && !critPhysicianNotified) {
      toast.error('Acknowledge that the referring physician has been notified of this critical finding.')
      return
    }
    setSaving(true)
    setSaveError('')
    setSavedOk(false)
    try {
      await api.put(`/imaging/orders/${selected.id}`, {
        status:           finalise ? 'completed' : 'in_progress',
        findings:         form.findings,
        impression:       form.impression,
        recommendation:   form.recommendation,
        notes:            form.technique,
        radiologist_name: form.radiologist_name,
        is_critical:      isCritical,
        ...(attachments.length ? { attachments: attachments.map(a => ({ name: a.name, type: a.type, data: a.data })) } : {}),
      })
      toast.success(finalise ? 'Report finalized successfully.' : 'Draft saved.')
      setSavedOk(true)
      if (finalise) {
        setConfirmFinalize(false)
        setOrders(prev => prev.filter(o => o.id !== selected.id))
        setSelected(null)
        setForm({ ...EMPTY_FORM, radiologist_name: user?.full_name || '' })
        setPriorReports([])
        setIsCritical(false)
        setCritPhysicianNotified(false)
        setAttachments([])
      } else {
        setOrders(prev => prev.map(o =>
          o.id === selected.id ? { ...o, status: 'in_progress', ...form, notes: form.technique } : o
        ))
        setSelected(prev => ({ ...prev, status: 'in_progress' }))
      }
      setTimeout(() => setSavedOk(false), 3000)
    } catch (err) {
      toast.error(err.message || 'Save failed')
      setSaveError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const signReport = async () => {
    if (!selected) return
    if (isCritical && !critPhysicianNotified) {
      toast.error('Acknowledge that the referring physician has been notified before signing.')
      return
    }
    setSigning(true)
    setSaveError('')
    try {
      await api.put(`/imaging/orders/${selected.id}`, {
        findings:         form.findings,
        impression:       form.impression,
        recommendation:   form.recommendation,
        notes:            form.technique,
        radiologist_name: form.radiologist_name,
        is_critical:      isCritical,
      })
      let signedAt = new Date().toISOString()
      try {
        const res = await api.post(`/imaging/reports/${selected.id}/sign`)
        signedAt = res?.signed_at || signedAt
      } catch {
        await api.patch(`/imaging/orders/${selected.id}`, {
          status: 'signed',
          signed_at: signedAt,
          report_status: 'signed',
        })
      }
      toast.success('Report signed and locked.')
      setSigned({ at: signedAt })
      setOrders(prev => prev.map(o =>
        o.id === selected.id ? { ...o, signed_at: signedAt, status: 'completed' } : o
      ))
    } catch (err) {
      toast.error(err.message || 'Sign failed')
      setSaveError(err.message || 'Sign failed')
    } finally {
      setSigning(false)
    }
  }

  const field = (key) => ({
    value:    form[key],
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
    disabled: !!signed,
    readOnly: !!signed,
  })

  const isReadOnly = !!signed

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Report Writer</h1>
        <p className="text-sm text-gray-500 mt-1">
          {orders.length} order{orders.length !== 1 ? 's' : ''} awaiting report
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={fetchOrders} className="ml-auto underline text-xs">Retry</button>
        </div>
      )}

      {!isRadiologist && (
        <div className="flex items-center gap-3 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <Lock size={15} className="flex-shrink-0" />
          <span>Report writing is restricted to radiologists. You can view reports in read-only mode.</span>
        </div>
      )}

      <div className="flex gap-5" style={{ minHeight: '70vh' }}>
        {/* Order list */}
        <div className="flex-shrink-0 w-64 flex flex-col gap-2">
          {loading && (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-gray-400" />
            </div>
          )}
          {!loading && orders.length === 0 && !error && (
            <div className="card p-8 text-center text-gray-500">
              <CheckCircle size={32} className="mx-auto mb-3 text-green-500" />
              <div className="font-semibold text-gray-700">All caught up!</div>
              <div className="text-sm mt-1">No orders pending a report.</div>
            </div>
          )}
          {!loading && orders.map(order => {
            const isActive = selected?.id === order.id
            return (
              <button
                key={order.id}
                onClick={() => selectOrder(order)}
                className="card p-4 text-left transition-all hover:shadow-md"
                style={isActive ? { borderColor: '#0F2557', borderWidth: 2, background: '#0F255708' } : {}}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs text-gray-400">IMG-{order.id}</span>
                  <span className={`badge ${STATUS_BADGE[order.status] || 'badge-gray'} flex-shrink-0`}>
                    {order.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="font-semibold text-sm mb-0.5" style={{ color: '#0F2557' }}>
                  {order.patient?.full_name || '—'}
                </div>
                <div className="text-xs text-gray-500 mb-1">{order.modality || order.body_part || '—'}</div>
                {(order.ordered_by_name || order.doctor?.full_name) && (
                  <div className="text-xs text-gray-400">Dr. {order.ordered_by_name || order.doctor?.full_name}</div>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                  <Clock size={11} />
                  {timeSince(order.created_at)}
                </div>
                {order.is_critical && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600">
                    <AlertOctagon size={11} />
                    Critical
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Patient context panel (radiologist only) */}
        {isRadiologist && selected && (
          <PatientContextPanel order={selected} priorReports={priorReports} />
        )}

        {/* Report form */}
        <div className="flex-1 min-w-0">
          {!selected ? (
            <div className="card h-full flex flex-col items-center justify-center text-center text-gray-400 py-24">
              <FileEdit size={48} className="mb-4 opacity-30" />
              <div className="font-semibold text-gray-600 text-lg">Select an order to write a report</div>
              <div className="text-sm mt-1">Choose from the list on the left</div>
            </div>
          ) : (
            <div className="card p-6">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 mb-5 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm text-gray-400">IMG-{selected.id}</span>
                    <span className={`badge ${STATUS_BADGE[selected.status] || 'badge-gray'}`}>
                      {selected.status?.replace('_', ' ')}
                    </span>
                    {signed && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        <CheckCircle size={11} />
                        Signed · {new Date(signed.at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  <div className="text-xl font-bold" style={{ color: '#0F2557' }}>
                    {selected.patient?.full_name || '—'}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                    <span>{selected.modality || selected.body_part || '—'}</span>
                    {(selected.ordered_by_name || selected.doctor?.full_name) && (
                      <span>Ordered by: Dr. {selected.ordered_by_name || selected.doctor?.full_name}</span>
                    )}
                    {selected.created_at && (
                      <span>{new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    )}
                  </div>
                </div>
                {/* Print button always visible */}
                <button
                  onClick={() => printReport(selected, form, isCritical, form.radiologist_name)}
                  className="btn-secondary text-xs flex-shrink-0"
                >
                  <Printer size={13} />
                  Print
                </button>
              </div>

              {/* Signed read-only notice */}
              {isReadOnly && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <Lock size={14} />
                  <span>This report has been signed and is now read-only.</span>
                </div>
              )}

              {/* Template picker */}
              {!isReadOnly && <TemplatePanel order={selected} onApply={applyTemplate} />}

              {/* Clinical History (read-only display) */}
              {(selected.clinical_history || selected.reason_for_exam) && (
                <div className="mb-4">
                  <label className="label">Clinical History</label>
                  <div className="input bg-gray-50 text-gray-600 text-sm min-h-[2.5rem]">
                    {selected.clinical_history || selected.reason_for_exam}
                  </div>
                </div>
              )}

              {/* Technique */}
              <div className="mb-4">
                <label className="label">Technique</label>
                <textarea
                  className={`input resize-none ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                  rows={2}
                  placeholder="e.g. Plain X-ray, PA view; contrast-enhanced CT abdomen…"
                  {...field('technique')}
                />
              </div>

              {/* Findings */}
              <div className="mb-4">
                <label className="label">
                  Findings {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className={`input resize-none ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                  rows={7}
                  placeholder="Detailed radiological findings, observations, measurements…"
                  {...field('findings')}
                />
              </div>

              {/* Impression */}
              <div className="mb-4">
                <label className="label">
                  Impression {!isReadOnly && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  className={`input resize-none ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                  rows={3}
                  placeholder="Summary diagnosis / conclusion…"
                  {...field('impression')}
                />
              </div>

              {/* Critical finding toggle */}
              <div className={`mb-4 p-3 rounded-xl border ${isCritical ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div className="relative flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={isCritical}
                      onChange={e => { setIsCritical(e.target.checked); if (!e.target.checked) setCritPhysicianNotified(false) }}
                      disabled={isReadOnly}
                      className="sr-only"
                    />
                    <div
                      className={`w-10 h-5 rounded-full transition-colors ${isCritical ? 'bg-red-500' : 'bg-gray-300'}`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isCritical ? 'translate-x-5' : ''}`}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertOctagon size={15} className={isCritical ? 'text-red-600' : 'text-gray-400'} />
                    <span className={`text-sm font-semibold ${isCritical ? 'text-red-700' : 'text-gray-600'}`}>
                      Critical Finding
                    </span>
                  </div>
                </label>
                {isCritical && (
                  <div className="mt-3 border-t border-red-200 pt-3">
                    <div className="flex items-center gap-2 text-xs text-red-700 font-medium mb-2">
                      <AlertOctagon size={13} />
                      Critical findings require immediate physician notification per protocol.
                    </div>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={critPhysicianNotified}
                        onChange={e => setCritPhysicianNotified(e.target.checked)}
                        disabled={isReadOnly}
                        className="mt-0.5 flex-shrink-0 accent-red-600"
                      />
                      <span className="text-xs text-red-700 leading-snug">
                        I confirm the referring physician has been notified of this critical finding by telephone / direct communication.
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Recommendation */}
              <div className="mb-4">
                <label className="label">Recommendation</label>
                <textarea
                  className={`input resize-none ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                  rows={2}
                  placeholder="Suggested follow-up, additional tests, clinical correlation…"
                  {...field('recommendation')}
                />
              </div>

              {/* Attachments */}
              <AttachmentSection
                attachments={attachments}
                onChange={setAttachments}
                disabled={isReadOnly}
              />

              {/* Radiologist name */}
              <div className="mb-5">
                <label className="label">
                  <User size={13} className="inline mr-1" />
                  Radiologist Name
                </label>
                <input
                  className={`input ${isReadOnly ? 'bg-gray-50 text-gray-500' : ''}`}
                  placeholder="Radiologist name"
                  {...field('radiologist_name')}
                />
              </div>

              {/* Inline feedback */}
              {saveError && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  <AlertCircle size={15} />
                  <span>{saveError}</span>
                </div>
              )}
              {savedOk && !isReadOnly && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                  <CheckCircle size={15} />
                  <span>Saved successfully.</span>
                </div>
              )}

              {/* Actions */}
              {!isReadOnly && (
                <div className="flex gap-3 flex-wrap">
                  {isRadiologist ? (
                    <>
                      <button
                        onClick={() => save(false)}
                        disabled={saving}
                        className="btn-secondary flex-1 justify-center min-w-[120px]"
                      >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                        Save Draft
                      </button>
                      <button
                        onClick={() => setConfirmFinalize(true)}
                        disabled={saving || !form.findings.trim() || !form.impression.trim() || (isCritical && !critPhysicianNotified)}
                        className="btn-primary flex-1 justify-center min-w-[120px]"
                      >
                        Finalize Report
                      </button>
                      <button
                        onClick={signReport}
                        disabled={signing || saving || !form.findings.trim() || !form.impression.trim() || (isCritical && !critPhysicianNotified)}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex-1 min-w-[140px]"
                        style={{ background: '#16A34A' }}
                      >
                        {signing ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
                        Sign &amp; Lock
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => save(false)}
                      disabled={saving}
                      className="btn-secondary flex-1 justify-center"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                      Save Draft
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Finalize confirmation dialog */}
      {confirmFinalize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,37,87,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#16A34A18' }}>
                <CheckCircle size={20} style={{ color: '#16A34A' }} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Finalize Report?</h3>
                <p className="text-xs text-gray-500 mt-0.5">IMG-{selected?.id} · {selected?.patient?.full_name}</p>
              </div>
            </div>
            {isCritical && (
              <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertOctagon size={15} />
                <span>This report is marked as a <strong>Critical Finding</strong>. Ensure the referring physician has been notified.</span>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-5">
              This will mark the order as <strong>Completed</strong> and lock the report. Are you sure you want to finalize?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmFinalize(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={() => save(true)} disabled={saving} className="btn-success flex-1 justify-center">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                Yes, Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
