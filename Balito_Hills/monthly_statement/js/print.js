// ============================================================
//  js/print.js — Prints the statement (same look as Laundry Care's)
//  Prints through a hidden frame on THIS page (no pop-up window, so a
//  pop-up blocker can't stop it). Edit the HTML template to change the layout.
// ============================================================

function printStatement() {
    const table = document.getElementById('statementTable');
    if (!table) { alert('No statement to print.'); return; }

    const B      = BH.business;
    const S      = window.BHS;
    const esc    = bhEscape;
    const lines  = a => (a || []).map(l => `<p>${esc(l)}</p>`).join('');
    const toHtml = S.recipient.map((l, i) => i === 0 ? `<p><strong>To:</strong> ${esc(l)}</p>` : `<p>${esc(l)}</p>`).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${esc(B.name)} — Monthly Statement</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 30px; color: white;
           background: linear-gradient(to right, #4b6cb7, #182848);
           -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    .print-header { display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: flex-start; margin-bottom: 20px; }
    .print-business { grid-column: 2; display: flex; flex-direction: column; align-items: center; text-align: center; }
    .print-business h1 { font-size: 1.6em; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 4px;
                         text-shadow: 2px 2px 5px rgba(0,0,0,0.3); width: 100%; }
    .print-business p { font-size: 13px; line-height: 1.6; width: 100%; }
    .print-contact { grid-column: 3; text-align: right; }
    .print-contact p { font-size: 13px; line-height: 1.6; }

    .print-recipient { margin: 16px 0; font-size: 13px; line-height: 1.8; }
    .print-title { text-align: center; font-size: 1.3em; font-weight: bold; text-decoration: underline;
                   text-transform: uppercase; letter-spacing: 2px; margin: 10px 0 4px; text-shadow: 2px 2px 5px rgba(0,0,0,0.3); }
    .print-tagline { text-align: center; font-style: italic; font-size: 13px; margin-bottom: 6px; }
    .print-period { text-align: center; font-size: 16px; font-weight: bold; margin: 10px auto 16px;
                    background: rgba(255,255,255,0.1); padding: 10px 20px; border-radius: 10px;
                    border: 1px solid rgba(255,255,255,0.3); width: 100%;
                    -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    #statementTable { width: 100%; border-collapse: collapse; margin: 0 auto 20px; background: white;
                      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #statementTable thead { background: linear-gradient(to right, #6a11cb, #2575fc); color: white;
                            -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #statementTable th { padding: 10px 12px; text-align: left; color: white; }
    #statementTable td { padding: 9px 12px; border: 1px solid #ddd; color: black; }
    #statementTable tbody tr:nth-child(even):not(.grand-total-row) { background: #f9f9f9; }
    tr { page-break-inside: avoid; }

    .grand-total-row td { background: linear-gradient(to right, #6a11cb, #2575fc) !important; color: white !important;
                          font-weight: bold !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .banking-title  { text-align: center !important; font-weight: bold !important; padding-top: 16px !important; color: black !important; }
    .banking-detail { text-align: center !important; color: black !important; }

    @media print { body { background: linear-gradient(to right, #4b6cb7, #182848) !important; } }
</style>
</head>
<body>
    <div class="print-header">
        <div class="print-business">
            <h1>${esc(B.name)}</h1>
            ${lines(B.address)}
        </div>
        <div class="print-contact">
            ${(B.emails || []).map(e => `<p>Email: ${esc(e)}</p>`).join('')}
            <p>${esc(B.web)}</p>
            ${lines(B.phones)}
        </div>
    </div>

    <div class="print-recipient">${toHtml}</div>

    <div class="print-title">Monthly Statement</div>
    <div class="print-tagline">"${esc(B.tagline)}"</div>
    <div class="print-period">${esc(S.periodText)}</div>

    ${table.outerHTML}
</body>
</html>`;

    // Hidden frame on this page (kept on-screen but invisible so browsers will print it)
    document.getElementById('printFrame')?.remove();
    const frame = document.createElement('iframe');
    frame.id = 'printFrame';
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none;';
    document.body.appendChild(frame);

    const win = frame.contentWindow;
    win.document.open();
    win.document.write(html);
    win.document.close();

    let finished = false;
    const done = () => {
        if (finished) return;
        finished = true;
        setTimeout(() => frame.remove(), 500);
        if (typeof window.bhAfterPrint === 'function') window.bhAfterPrint();   // "start next month?" (closeMonth.js)
    };
    win.onafterprint = done;

    setTimeout(() => {
        try {
            win.focus();
            win.print();
        } catch (e) {
            alert('Could not open the print dialog: ' + e.message);
            frame.remove();
        }
    }, 400);
}

function bhEscape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('printBtn')?.addEventListener('click', () => window.printStatement());
});