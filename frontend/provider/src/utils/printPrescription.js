/**
 * printPrescription - Generates and prints a prescription using the browser print API.
 * No external dependencies required. Opens a styled print window (A5 layout).
 *
 * @param {Object} params
 * @param {Object} params.clinic    - { name, address, phone, email }
 * @param {Object} params.doctor   - { name, qualification, mciNumber, speciality }
 * @param {Object} params.patient  - { name, age, gender, uhid }
 * @param {Array}  params.items    - [{ medicine, dosage, frequency, duration, instructions }]
 * @param {string} [params.notes]  - Additional clinical notes / advice
 * @param {string} params.date     - Prescription date (pre-formatted string)
 * @param {string} params.rxId     - Prescription / Rx ID
 */
export function printPrescription({ clinic = {}, doctor = {}, patient = {}, items = [], notes, date, rxId }) {
  const medicineRows = items.length
    ? items
        .map(
          (item, i) => `
        <tr class="${i % 2 === 0 ? 're' : 'ro'}">
          <td>${i + 1}.&nbsp;${esc(item.medicine || '')}</td>
          <td>${esc(item.dosage || '')}</td>
          <td>${esc(item.frequency || '')}</td>
          <td>${esc(item.duration || '')}</td>
          <td>${esc(item.instructions || '')}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:12px 6px;">No medicines prescribed</td></tr>`;

  const notesSection = notes
    ? `<div class="notes">
         <p class="sec-lbl">Notes / Advice</p>
         <p class="notes-txt">${esc(notes)}</p>
       </div>`
    : '';

  const patientMeta = [
    patient.age ? `${esc(patient.age)} yrs` : '',
    patient.gender ? esc(patient.gender) : '',
    patient.uhid ? `UHID: ${esc(patient.uhid)}` : '',
  ]
    .filter(Boolean)
    .join(' &nbsp;|&nbsp; ');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Prescription ${esc(rxId || '')}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A5 portrait; margin: 10mm 12mm; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      width: 100%;
    }

    /* Header */
    .hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 8px;
    }
    .clinic-name {
      font-size: 18px;
      font-weight: 700;
      color: #1a56db;
      letter-spacing: 0.3px;
    }
    .clinic-meta {
      margin-top: 4px;
      font-size: 10px;
      color: #4b5563;
      line-height: 1.65;
    }
    .dr-info { text-align: right; }
    .dr-name {
      font-size: 14px;
      font-weight: 600;
      color: #111827;
    }
    .dr-meta {
      margin-top: 4px;
      font-size: 10px;
      color: #4b5563;
      line-height: 1.65;
    }

    /* Dividers */
    .div-bold { border: none; border-top: 2px solid #1a56db; margin: 6px 0; }
    .div-dash  { border: none; border-top: 1px dashed #d1d5db; margin: 8px 0; }

    /* Patient row */
    .pat-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 5px 0;
    }
    .pat-name { font-size: 13px; font-weight: 600; }
    .pat-meta { font-size: 10px; color: #4b5563; margin-top: 2px; }
    .rx-info  { text-align: right; font-size: 10px; color: #4b5563; }
    .rx-id    { font-weight: 600; color: #374151; }

    /* ℞ symbol */
    .rx-sym {
      font-size: 32px;
      font-weight: 700;
      color: #1a56db;
      line-height: 1;
      margin: 6px 0 4px;
    }

    /* Medicine table */
    .med-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-top: 4px; }
    .med-tbl thead tr { background: #1a56db; color: #fff; }
    .med-tbl thead th {
      padding: 5px 6px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .med-tbl tbody td {
      padding: 5px 6px;
      vertical-align: top;
      border-bottom: 1px solid #e5e7eb;
    }
    .re { background: #f9fafb; }
    .ro { background: #fff; }

    /* Notes */
    .notes {
      margin-top: 10px;
      padding: 7px 9px;
      border-left: 3px solid #1a56db;
      background: #eff6ff;
      border-radius: 0 4px 4px 0;
    }
    .sec-lbl {
      font-size: 10px;
      font-weight: 700;
      color: #1a56db;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .notes-txt { font-size: 10.5px; color: #374151; line-height: 1.5; }

    /* Footer */
    .ftr {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .ftr-note { font-size: 9px; color: #6b7280; font-style: italic; line-height: 1.6; }
    .sig-block { text-align: center; min-width: 120px; }
    .sig-line  { border-top: 1px solid #374151; width: 120px; margin-bottom: 3px; }
    .sig-lbl   { font-size: 9px; font-weight: 600; color: #374151; }
    .sig-qual  { font-size: 9px; color: #6b7280; }

    @media print {
      html, body { width: 148mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="hdr">
    <div>
      <div class="clinic-name">${esc(clinic.name || (clinic.org_type === 'hospital' ? 'Hospital' : 'Clinic'))}</div>
      <div class="clinic-meta">
        ${clinic.address ? esc(clinic.address) + '<br/>' : ''}
        ${clinic.phone ? 'Ph: ' + esc(clinic.phone) : ''}${clinic.phone && clinic.email ? ' &nbsp;|&nbsp; ' : ''}${clinic.email ? 'Email: ' + esc(clinic.email) : ''}
      </div>
    </div>
    <div class="dr-info">
      <div class="dr-name">Dr.&nbsp;${esc(doctor.name || '')}</div>
      <div class="dr-meta">
        ${doctor.qualification ? esc(doctor.qualification) + '<br/>' : ''}
        ${doctor.speciality ? esc(doctor.speciality) + '<br/>' : ''}
        ${doctor.mciNumber ? 'MCI Reg. No.:&nbsp;' + esc(doctor.mciNumber) : ''}
      </div>
    </div>
  </div>

  <hr class="div-bold"/>

  <div class="pat-row">
    <div>
      <div class="pat-name">${esc(patient.name || '')}</div>
      <div class="pat-meta">${patientMeta}</div>
    </div>
    <div class="rx-info">
      <div class="rx-id">Rx ID:&nbsp;${esc(rxId || '')}</div>
      <div>${esc(date || '')}</div>
    </div>
  </div>

  <hr class="div-dash"/>

  <div class="rx-sym">&#8478;</div>

  <table class="med-tbl">
    <thead>
      <tr>
        <th>Medicine</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>${medicineRows}</tbody>
  </table>

  ${notesSection}

  <hr class="div-dash"/>

  <div class="ftr">
    <div class="ftr-note">
      * This prescription is valid for 30 days from the date of issue.<br/>
      * Keep medicines out of reach of children.
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-lbl">Dr.&nbsp;${esc(doctor.name || '')}</div>
      <div class="sig-qual">${esc(doctor.qualification || '')}</div>
    </div>
  </div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

  openPrintWindow(html);
}

/* ── Internal helpers ─────────────────────────────────────────────────────── */

/** Escape HTML special characters to prevent XSS in the generated document. */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Opens a new browser window, writes HTML into it, and triggers print.
 * The window closes itself after the print dialog is dismissed.
 */
function openPrintWindow(html) {
  const win = window.open('', '_blank', 'width=620,height=880');
  if (!win) {
    // eslint-disable-next-line no-alert
    alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
