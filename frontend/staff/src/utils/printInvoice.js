/**
 * printInvoice
 *
 * Opens a print-optimised window containing a formatted invoice and triggers
 * window.print().  All generation happens in the browser — nothing is sent to
 * a server.  Optionally renders a UPI QR code via Google Charts API.
 *
 * @param {Object}  params
 * @param {Object}  params.clinic    - { name, address, phone, email, gstin? }
 * @param {Object}  params.patient   - { name, uhid?, phone?, address? }
 * @param {Object}  params.invoice   - { number, date, paymentMethod, discount?, taxPercent? }
 * @param {Array}   params.items     - [{ description, qty, unitPrice }]
 * @param {string}  [params.upiId]   - Clinic UPI ID (e.g. "clinicname@upi").
 *                                     When provided, a scannable QR and the UPI ID are shown.
 */
export function printInvoice({ clinic = {}, patient = {}, invoice = {}, items = [], upiId }) {
  /* ── Calculations ──────────────────────────────────────────────────────── */
  const lineItems = items.map((item) => ({
    ...item,
    total: Number(item.qty ?? 1) * Number(item.unitPrice ?? 0),
  }));

  const subtotal     = lineItems.reduce((sum, li) => sum + li.total, 0);
  const discountAmt  = Number(invoice.discount ?? 0);
  const taxPercent   = Number(invoice.taxPercent ?? 0);
  const afterDisc    = subtotal - discountAmt;
  const taxAmt       = (afterDisc * taxPercent) / 100;
  const grandTotal   = afterDisc + taxAmt;

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);

  /* ── HTML helpers ──────────────────────────────────────────────────────── */
  const esc = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  /* ── Item rows ─────────────────────────────────────────────────────────── */
  const itemRows = lineItems.length
    ? lineItems
        .map(
          (li, idx) => `
          <tr class="${idx % 2 === 0 ? 're' : 'ro'}">
            <td class="td-sl">${idx + 1}</td>
            <td class="td-desc">${esc(li.description)}</td>
            <td class="td-num">${esc(String(li.qty ?? 1))}</td>
            <td class="td-num">${fmt(Number(li.unitPrice ?? 0))}</td>
            <td class="td-num td-bold">${fmt(li.total)}</td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="5" class="td-empty">No items</td></tr>`;

  /* ── Summary rows ──────────────────────────────────────────────────────── */
  const discountRow =
    discountAmt > 0
      ? `<tr>
           <td class="sum-label">Discount</td>
           <td class="sum-val sum-neg">- ${fmt(discountAmt)}</td>
         </tr>`
      : '';

  const taxRow =
    taxPercent > 0
      ? `<tr>
           <td class="sum-label">Tax (${taxPercent}%)</td>
           <td class="sum-val">+ ${fmt(taxAmt)}</td>
         </tr>`
      : '';

  /* ── UPI / QR section ──────────────────────────────────────────────────── */
  let upiSection = '';
  if (upiId) {
    const encodedUpi = encodeURIComponent(
      `upi://pay?pa=${upiId}&pn=${clinic.name ?? ''}&am=${grandTotal.toFixed(2)}&cu=INR`
    );
    const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodedUpi}`;
    upiSection = `
      <div class="upi-section">
        <div class="upi-label">&#9654;&nbsp; Pay via UPI</div>
        <div class="upi-body">
          <img class="qr-img" src="${qrUrl}" alt="UPI QR Code" />
          <div class="upi-meta">
            <div class="upi-id-label">UPI ID</div>
            <div class="upi-id">${esc(upiId)}</div>
            <div class="upi-hint">Scan the QR code or use the UPI ID above<br/>to pay &#8377;${grandTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>`;
  }

  /* ── GSTIN line ─────────────────────────────────────────────────────────── */
  const gstinLine = clinic.gstin
    ? `<span class="gstin-badge">GSTIN: ${esc(clinic.gstin)}</span>`
    : '';

  /* ── Full HTML ─────────────────────────────────────────────────────────── */
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Invoice ${esc(invoice.number || '')}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { size: A4 portrait; margin: 12mm 14mm; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      width: 100%;
    }

    /* ── Invoice header ── */
    .inv-hdr {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10px;
    }
    .clinic-name {
      font-size: 20px;
      font-weight: 700;
      color: #1a56db;
      line-height: 1.2;
    }
    .clinic-meta {
      margin-top: 4px;
      font-size: 10px;
      color: #4b5563;
      line-height: 1.65;
    }
    .gstin-badge {
      display: inline-block;
      margin-top: 4px;
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      font-size: 9.5px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 3px;
    }
    .inv-title-block { text-align: right; }
    .inv-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a56db;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .inv-number {
      margin-top: 4px;
      font-size: 11px;
      color: #374151;
      font-weight: 600;
    }
    .inv-date { font-size: 10px; color: #6b7280; margin-top: 2px; }

    /* ── Dividers ── */
    .div-bold { border: none; border-top: 2.5px solid #1a56db; margin: 8px 0; }
    .div-thin  { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }

    /* ── Bill to / Invoice meta row ── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 12px;
    }
    .bill-to, .inv-meta { flex: 1; }
    .sec-title {
      font-size: 9px;
      font-weight: 700;
      color: #1a56db;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 5px;
    }
    .bill-name {
      font-size: 13px;
      font-weight: 600;
      color: #111827;
    }
    .bill-detail {
      font-size: 10px;
      color: #4b5563;
      margin-top: 2px;
      line-height: 1.55;
    }
    .inv-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 10.5px;
      padding: 3px 0;
      border-bottom: 1px dashed #f3f4f6;
    }
    .inv-meta-row:last-child { border-bottom: none; }
    .inv-meta-label { color: #6b7280; font-weight: 600; }
    .inv-meta-val   { color: #111827; text-align: right; }

    /* ── Item table ── */
    .item-tbl { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 10px; }
    .item-tbl thead tr { background: #1a56db; color: #fff; }
    .item-tbl thead th {
      padding: 5px 8px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }
    .item-tbl thead th.th-num { text-align: right; }
    .item-tbl tbody td {
      padding: 5px 8px;
      vertical-align: top;
      border-bottom: 1px solid #e5e7eb;
    }
    .td-sl   { width: 28px; color: #9ca3af; font-size: 10px; }
    .td-desc { }
    .td-num  { text-align: right; }
    .td-bold { font-weight: 600; }
    .td-empty { text-align: center; color: #9ca3af; padding: 12px 8px; }
    .re { background: #f9fafb; }
    .ro { background: #fff; }

    /* ── Summary ── */
    .summary-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 14px;
    }
    .summary-tbl { min-width: 220px; border-collapse: collapse; }
    .sum-label {
      font-size: 10.5px;
      color: #4b5563;
      padding: 4px 8px 4px 0;
      text-align: right;
    }
    .sum-val {
      font-size: 10.5px;
      color: #111827;
      padding: 4px 0 4px 8px;
      text-align: right;
      min-width: 90px;
    }
    .sum-neg { color: #dc2626; }
    .sum-subtotal { border-bottom: 1px solid #e5e7eb; }
    .sum-total-row td {
      padding-top: 6px;
      border-top: 2px solid #1a56db;
    }
    .sum-total-label {
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      text-align: right;
      padding-right: 8px;
    }
    .sum-total-val {
      font-size: 13px;
      font-weight: 700;
      color: #1a56db;
      text-align: right;
    }

    /* ── Payment badge ── */
    .payment-row {
      margin-bottom: 10px;
      font-size: 10.5px;
      color: #374151;
    }
    .payment-badge {
      display: inline-block;
      background: #ecfdf5;
      border: 1px solid #6ee7b7;
      color: #065f46;
      font-size: 10px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 3px;
      margin-left: 4px;
    }

    /* ── UPI section ── */
    .upi-section {
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    .upi-label {
      background: #dbeafe;
      color: #1e40af;
      font-size: 10px;
      font-weight: 700;
      padding: 5px 10px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .upi-body {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 10px 14px;
    }
    .qr-img { width: 100px; height: 100px; display: block; flex-shrink: 0; }
    .upi-meta { flex: 1; }
    .upi-id-label { font-size: 9px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
    .upi-id {
      font-size: 13px;
      font-weight: 700;
      color: #1e40af;
      letter-spacing: 0.3px;
      margin: 3px 0 6px;
      font-family: 'Courier New', monospace;
    }
    .upi-hint { font-size: 10px; color: #4b5563; line-height: 1.5; }

    /* ── Footer ── */
    .inv-footer {
      border-top: 1px dashed #d1d5db;
      padding-top: 8px;
      text-align: center;
      font-size: 10px;
      color: #6b7280;
      font-style: italic;
    }
    .inv-footer strong { color: #374151; }

    @media print {
      html, body { width: 180mm; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- ── Invoice header ── -->
  <div class="inv-hdr">
    <div>
      <div class="clinic-name">${esc(clinic.name || 'Health Center')}</div>
      <div class="clinic-meta">
        ${clinic.address ? esc(clinic.address) + '<br/>' : ''}
        ${clinic.phone ? 'Ph: ' + esc(clinic.phone) : ''}${clinic.phone && clinic.email ? ' &nbsp;|&nbsp; ' : ''}${clinic.email ? esc(clinic.email) : ''}
      </div>
      ${gstinLine}
    </div>
    <div class="inv-title-block">
      <div class="inv-title">Invoice</div>
      <div class="inv-number">No. ${esc(invoice.number || '—')}</div>
      <div class="inv-date">${esc(invoice.date || '')}</div>
    </div>
  </div>

  <hr class="div-bold"/>

  <!-- ── Bill-to + Invoice meta ── -->
  <div class="meta-row">
    <div class="bill-to">
      <div class="sec-title">Bill To</div>
      <div class="bill-name">${esc(patient.name || '')}</div>
      <div class="bill-detail">
        ${patient.uhid ? 'UHID: ' + esc(patient.uhid) + '<br/>' : ''}
        ${patient.phone ? 'Ph: ' + esc(patient.phone) + '<br/>' : ''}
        ${patient.address ? esc(patient.address) : ''}
      </div>
    </div>
    <div class="inv-meta">
      <div class="sec-title">Details</div>
      <div class="inv-meta-row">
        <span class="inv-meta-label">Invoice No.</span>
        <span class="inv-meta-val">${esc(invoice.number || '—')}</span>
      </div>
      <div class="inv-meta-row">
        <span class="inv-meta-label">Date</span>
        <span class="inv-meta-val">${esc(invoice.date || '')}</span>
      </div>
      <div class="inv-meta-row">
        <span class="inv-meta-label">Payment</span>
        <span class="inv-meta-val">${esc(invoice.paymentMethod || '—')}</span>
      </div>
    </div>
  </div>

  <!-- ── Line items table ── -->
  <table class="item-tbl">
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th class="th-num">Qty</th>
        <th class="th-num">Unit Price</th>
        <th class="th-num">Total</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- ── Summary ── -->
  <div class="summary-wrap">
    <table class="summary-tbl">
      <tbody>
        <tr class="sum-subtotal">
          <td class="sum-label">Subtotal</td>
          <td class="sum-val">${fmt(subtotal)}</td>
        </tr>
        ${discountRow}
        ${taxRow}
        <tr class="sum-total-row">
          <td class="sum-total-label">TOTAL</td>
          <td class="sum-total-val">${fmt(grandTotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- ── Payment method ── -->
  <div class="payment-row">
    Payment Method:
    <span class="payment-badge">${esc(invoice.paymentMethod || 'N/A')}</span>
  </div>

  <!-- ── UPI / QR (optional) ── -->
  ${upiSection}

  <hr class="div-thin"/>

  <!-- ── Footer ── -->
  <div class="inv-footer">
    Thank you for visiting <strong>${esc(clinic.name || 'us')}</strong>. We wish you good health!
  </div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=700,height=980');
  if (!win) {
    // eslint-disable-next-line no-alert
    alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}
