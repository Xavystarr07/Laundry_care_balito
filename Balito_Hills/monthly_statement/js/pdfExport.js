// ============================================================
//  js/pdfExport.js — "Download PDF" button
//  Builds the statement as a real PDF (same look as the printed statement:
//  blue background, purple-to-blue header + grand total, banking details).
//  Edit the LAYOUT block for sizes; colours in PDF_COLOURS.
// ============================================================

const PDF_COLOURS = { bg1: '#4b6cb7', bg2: '#182848', head1: '#6a11cb', head2: '#2575fc', white: '#ffffff', line: '#dddddd', zebra: '#f9f9f9', ink: '#000000' };
const PDF_LAYOUT  = { margin: 50, rowH: 25, headH: 28, bottom: 60 };

// Per-unit totals from the statement lines (cents), numbers first then text
function pdfUnitRows(lines) {
    const map = new Map();
    lines.forEach(l => {
        const k = l.hotel + '|' + l.unit;
        if (!map.has(k)) map.set(k, { hotel: l.hotel, unit: l.unit, cents: 0 });
        map.get(k).cents += Math.round(Number(l.total) * 100);
    });
    return Array.from(map.values()).sort((a, b) => a.hotel.localeCompare(b.hotel) || xlCompareUnits(a.unit, b.unit));
}

const pdfMoney = c => 'R ' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildStatementPdf(S) {
    const C = PDF_COLOURS, L = PDF_LAYOUT;
    const B = BH.business;
    const doc = PdfWriter.Doc();
    const W = doc.PAGE_W, H = doc.PAGE_H;
    const tx = L.margin, tw = W - L.margin * 2;
    const col = [tx, tx + tw * 0.46, tx + tw * 0.74];          // Hotel | Unit | Total
    const rows = pdfUnitRows(S.lines);
    const grand = rows.reduce((s, r) => s + r.cents, 0);

    const newPage = () => { doc.addPage(); doc.gradient(0, 0, W, H, C.bg1, C.bg2, 90); };
    const tableHead = y => {
        doc.gradient(tx, y, tw, L.headH, C.head1, C.head2, 70);
        ['Hotel Name', 'Hotel Unit', 'Total'].forEach((t, i) => doc.text(t, col[i] + 10, y + 18, { size: 11, bold: true, color: C.white }));
        return y + L.headH;
    };

    // ── Page 1: header, recipient, title, period ──
    newPage();
    doc.text(B.name, W / 2, 56, { size: 22, bold: true, color: C.white, align: 'center' });
    B.address.forEach((l, i) => doc.text(l, W / 2, 76 + i * 14, { size: 10, color: C.white, align: 'center' }));
    const contact = [...B.emails.map(e => 'Email: ' + e), B.web, ...B.phones];
    contact.forEach((l, i) => doc.text(l, W - L.margin, 60 + i * 13, { size: 9.5, color: C.white, align: 'right' }));

    let y = 150;
    S.recipient.forEach((l, i) => {
        if (i === 0) { doc.text('To:', tx, y, { size: 11, bold: true, color: C.white }); doc.text(l, tx + 24, y, { size: 11, color: C.white }); }
        else doc.text(l, tx, y, { size: 11, color: C.white });
        y += 15;
    });

    y = 238;
    doc.text('MONTHLY STATEMENT', W / 2, y, { size: 17, bold: true, color: C.white, align: 'center' });
    const tw2 = doc.width('MONTHLY STATEMENT', 17, true);
    doc.line(W / 2 - tw2 / 2, y + 3, W / 2 + tw2 / 2, y + 3, C.white, 1);
    doc.text('"' + B.tagline + '"', W / 2, y + 22, { size: 10, italic: true, color: C.white, align: 'center' });

    doc.rect(W / 2 - 150, y + 36, 300, 30, '#5a77bd', '#8fa6d8', 0.8);
    doc.text(S.periodText, W / 2, y + 56, { size: 12.5, bold: true, color: C.white, align: 'center' });

    y = y + 90;
    y = tableHead(y);

    // ── Table rows (new page when full) ──
    const limit = H - L.bottom;
    if (!rows.length) {
        doc.rect(tx, y, tw, L.rowH, C.white, C.line);
        doc.text('No invoices found for this period.', tx + 10, y + 17, { size: 10 });
        y += L.rowH;
    }
    rows.forEach((r, i) => {
        if (y + L.rowH > limit) { newPage(); y = tableHead(L.margin); }
        doc.rect(tx, y, tw, L.rowH, i % 2 ? C.zebra : C.white);
        doc.line(tx, y + L.rowH, tx + tw, y + L.rowH, C.line, 0.6);
        doc.text(r.hotel, col[0] + 10, y + 17, { size: 10.5 });
        doc.text(String(r.unit), col[1] + 10, y + 17, { size: 10.5 });
        doc.text(pdfMoney(r.cents), col[2] + 10, y + 17, { size: 10.5 });
        y += L.rowH;
    });

    // ── Grand total (spans the first two columns) ──
    if (y + L.rowH + 20 + (Object.keys(BH.bank).length + 1) * 20 > limit) { newPage(); y = L.margin; }
    doc.gradient(tx, y, tw, L.rowH + 2, C.head1, C.head2, 70);
    doc.text('Grand Total', col[0] + 10, y + 18, { size: 11, bold: true, color: C.white });
    doc.text(pdfMoney(grand), col[2] + 10, y + 18, { size: 11, bold: true, color: C.white });
    y += L.rowH + 2;

    // ── Banking details ──
    doc.rect(tx, y, tw, 26, C.white, C.line);
    doc.text('Banking Details', W / 2, y + 18, { size: 11, bold: true, align: 'center' });
    y += 26;
    Object.entries(BH.bank).forEach(([k, v]) => {
        doc.rect(tx, y, tw, 20, C.white, C.line);
        doc.text(k + ': ' + v, W / 2, y + 14, { size: 10, align: 'center' });
        y += 20;
    });

    return doc.build();
}

function pdfFileName(S) { return `Ballito_Hills_Statement_${S.from}_to_${S.to}.pdf`; }

function downloadPdf() {
    const S = window.BHS;
    if (!S) return;
    const blob = new Blob([buildStatementPdf(S)], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = pdfFileName(S);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('pdfBtn')?.addEventListener('click', downloadPdf);
});
