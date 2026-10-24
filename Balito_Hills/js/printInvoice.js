// ============================================================
//  js/printInvoice.js — Validates, then prints a clean white copy
//  Prints through a hidden frame on THIS page: no extra window to close,
//  and a double click can never print twice.
//  Business details come from php/settings.php.
// ============================================================

function printInvoice() {
    if (window.__bhPrinting) return;                 // ignore double clicks
    const err = firstError();
    if (err) { flagError(err); return; }

    const rows  = readAllRows();
    const B     = BH.business;
    const lines = a => (a || []).map(bhEsc).join('<br>');

    let grandCents = 0, totalKg = 0;
    const tableRows = rows.map(r => {
        const rate   = BH.rates[r.rate].price;
        const weight = bhNum(r.weight);
        const extra  = bhNum(r.extra_amount);
        const cents  = Math.round(weight * rate * 100) + Math.round(extra * 100);
        grandCents += cents;
        totalKg    += weight;
        return `
        <tr>
            <td class="c-code">${bhEsc(r.inv)}</td>
            <td>${bhEsc(r.hotel)}</td>
            <td>${bhEsc(r.unit)}</td>
            <td>${bhEsc(BH.rates[r.rate].label)}</td>
            <td class="num">${weight.toFixed(2)}</td>
            <td>${bhEsc(r.extra_item) || '—'}</td>
            <td class="num">${extra > 0 ? 'R ' + extra.toFixed(2) : '—'}</td>
            <td class="num strong">R ${(cents / 100).toFixed(2)}</td>
            <td>${bhEsc(r.date)}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${bhEsc(B.name)} — Invoice</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; color-scheme: light !important; }
    :root { --blue: #1565C0; --blue-dark: #0D47A1; --line: #D9D9D9; --muted: #444; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff !important; color: #111 !important;
           padding: 8px 10px; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .bar { height: 8px; background: linear-gradient(90deg, var(--blue-dark), #2196F3); border-radius: 4px; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; }
    .brand h1 { font-size: 28px; letter-spacing: 3px; text-transform: uppercase; font-weight: 800; }
    .brand .tag { margin-top: 2px; font-size: 10.5px; letter-spacing: 2px; color: var(--blue); font-weight: 700; }
    .brand p { margin-top: 10px; font-size: 12.5px; line-height: 1.55; color: #222; }
    .contact { text-align: right; font-size: 12.5px; line-height: 1.7; color: #222; }
    .contact .web { color: var(--blue); font-weight: 700; }

    .title-row { display: flex; justify-content: space-between; align-items: flex-end; margin: 22px 0 14px; padding-bottom: 10px; border-bottom: 2px solid #111; }
    .title-row h2 { font-size: 26px; letter-spacing: 6px; font-weight: 300; text-transform: uppercase; }
    .count { text-align: right; }
    .count span { display: block; font-size: 10.5px; letter-spacing: 1.5px; color: var(--muted); text-transform: uppercase; }
    .count strong { font-size: 22px; letter-spacing: 2px; color: var(--blue-dark); }

    table { width: 100%; border-collapse: collapse; }
    thead { display: table-header-group; }
    th { background: #111 !important; color: #fff !important; padding: 10px 10px; text-align: left; font-size: 11px;
         letter-spacing: 1px; text-transform: uppercase; font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    th.num, td.num { text-align: right; }
    td { padding: 8px 10px; border-bottom: 1px solid var(--line); font-size: 12.5px; }
    tbody tr:nth-child(even) td { background: #F7F7F7 !important; }
    tr { page-break-inside: avoid; }
    td.c-code { font-family: Consolas, 'Courier New', monospace; font-weight: 700; }
    td.strong { font-weight: 700; }

    .totals { display: flex; justify-content: flex-end; margin-top: 18px; page-break-inside: avoid; }
    .totals-box { min-width: 290px; border: 2px solid #111; border-radius: 10px; overflow: hidden; }
    .totals-row { display: flex; justify-content: space-between; padding: 7px 16px; font-size: 13px; color: var(--muted); }
    .totals-grand { display: flex; justify-content: space-between; align-items: center; padding: 13px 16px;
                    background: var(--blue-dark) !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .totals-grand span { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; }
    .totals-grand strong { font-size: 22px; }

    .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid var(--line); text-align: center; color: var(--muted); font-size: 12px; page-break-inside: avoid; }
    .footer strong { display: block; color: #111; font-size: 13px; margin-bottom: 3px; }
    .footer em { letter-spacing: 2px; font-size: 10.5px; color: var(--blue); font-style: normal; font-weight: 700; text-transform: uppercase; }
</style>
</head>
<body>
    <div class="bar"></div>

    <div class="header">
        <div class="brand">
            <h1>${bhEsc(B.name)}</h1>
            <div class="tag">${bhEsc(B.tagline)}</div>
            <p>${lines(B.address)}</p>
        </div>
        <div class="contact">
            <div class="web">${bhEsc(B.web)}</div>
            ${(B.emails || []).map(e => `<div>${bhEsc(e)}</div>`).join('')}
            ${(B.phones || []).map(p => `<div>${bhEsc(p)}</div>`).join('')}
        </div>
    </div>

    <div class="title-row">
        <h2>Invoice</h2>
        <div class="count"><span>Lines</span><strong>${rows.length}</strong></div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Inv No</th><th>Hotel</th><th>Unit</th><th>Rate</th>
                <th class="num">Weight (kg)</th><th>Extra Item</th>
                <th class="num">Amount</th><th class="num">Total</th><th>Date</th>
            </tr>
        </thead>
        <tbody>${tableRows}</tbody>
    </table>

    <div class="totals">
        <div class="totals-box">
            <div class="totals-row"><span>Total weight</span><span>${totalKg.toFixed(2)} kg</span></div>
            <div class="totals-grand"><span>Grand Total</span><strong>R ${(grandCents / 100).toFixed(2)}</strong></div>
        </div>
    </div>

    <div class="footer">
        <strong>Thank you for your business</strong>
        <em>${bhEsc(B.name)}</em>
    </div>
</body>
</html>`;

    // 1) Save a PDF copy first (goes to your Downloads folder), 2) remember this exact invoice was printed
    try { downloadInvoicePdf(rows); } catch (e) { alert('Could not create the PDF: ' + e.message); return; }
    window.__bhPrintedKey = JSON.stringify(rows);

    // 3) Print dialog through a hidden frame on THIS page (invisible but on-screen, so browsers will print it)
    window.__bhPrinting = true;
    document.getElementById('printFrame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'printFrame';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none;';
    document.body.appendChild(frame);

    const win = frame.contentWindow;
    win.document.open();
    win.document.write(html);
    win.document.close();

    const finish = () => setTimeout(() => { frame.remove(); window.__bhPrinting = false; }, 500);
    win.onafterprint = finish;
    setTimeout(() => { window.__bhPrinting = false; }, 60000);       // safety release

    setTimeout(() => {
        try { win.focus(); win.print(); }
        catch (e) { alert('Could not open the print dialog: ' + e.message); finish(); }
    }, 400);
}

// Attach once, even if this file is loaded twice
if (!window.__bhPrintBound) {
    window.__bhPrintBound = true;
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('printBtn')?.addEventListener('click', printInvoice);
    });
}
