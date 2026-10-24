// ============================================================
//  js/pdfInvoice.js — builds the invoice as a real PDF (A4 landscape)
//  Same black / blue design as the printed copy. Called by js/printInvoice.js,
//  so every invoice is saved as a PDF before it can be stored.
//  Edit colours in INV_COLOURS and column widths in INV_COLS.
// ============================================================

const INV_COLOURS = { blue: '#1565C0', blueDark: '#0D47A1', blue2: '#2196F3', ink: '#111111', muted: '#444444', line: '#D9D9D9', zebra: '#F7F7F7', white: '#ffffff' };
const INV_COLS = [   // key, heading, width, align
    ['inv', 'INV NO', 62, 'left'], ['hotel', 'HOTEL', 120, 'left'], ['unit', 'UNIT', 62, 'left'], ['rate', 'RATE', 52, 'left'],
    ['weight', 'WEIGHT (KG)', 76, 'right'], ['extra', 'EXTRA ITEM', 110, 'left'], ['amount', 'AMOUNT', 76, 'right'],
    ['total', 'TOTAL', 80, 'right'], ['date', 'DATE', 60, 'left']
];
const invMoney = c => 'R ' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function buildInvoicePdf(rows) {
    const C = INV_COLOURS, B = BH.business;
    const doc = PdfWriter.Doc({ landscape: true });
    const W = doc.PAGE_W, H = doc.PAGE_H, M = 36, TW = W - M * 2;
    const rowH = 22, bottom = 48;

    // Row data (cents, same maths as the server)
    let grand = 0, kg = 0;
    const data = rows.map(r => {
        const rate = BH.rates[r.rate].price, w = bhNum(r.weight), e = bhNum(r.extra_amount);
        const cents = Math.round(w * rate * 100) + Math.round(e * 100);
        grand += cents; kg += w;
        return { inv: r.inv, hotel: r.hotel, unit: r.unit, rate: BH.rates[r.rate].label, weight: w.toFixed(2),
                 extra: r.extra_item || '—', amount: e > 0 ? invMoney(Math.round(e * 100)) : '—', total: invMoney(cents), date: r.date };
    });

    // x positions of the columns
    const xs = []; let acc = M;
    INV_COLS.forEach(c => { xs.push(acc); acc += c[2]; });

    const topBar = () => doc.gradient(M, 26, TW, 8, C.blueDark, C.blue2, 60);
    const head = y => {
        doc.rect(M, y, TW, 24, C.ink);
        INV_COLS.forEach((c, i) => doc.text(c[1], c[3] === 'right' ? xs[i] + c[2] - 8 : xs[i] + 8, y + 16, { size: 8, bold: true, color: C.white, align: c[3] }));
        return y + 24;
    };

    doc.addPage();
    topBar();
    doc.text(B.name, M, 72, { size: 24, bold: true, color: C.ink });
    doc.text(B.tagline, M, 87, { size: 8.5, bold: true, color: C.blue });
    B.address.forEach((l, i) => doc.text(l, M, 106 + i * 13, { size: 9.5, color: '#222222' }));
    const contact = [B.web, ...B.emails, ...B.phones];
    contact.forEach((l, i) => doc.text(l, W - M, 66 + i * 13.5, { size: 9.5, bold: i === 0, color: i === 0 ? C.blue : '#222222', align: 'right' }));

    let y = 168;
    doc.text('INVOICE', M, y + 14, { size: 20, bold: true, color: C.ink });
    doc.text('LINES', W - M, y - 2, { size: 8, color: C.muted, align: 'right' });
    doc.text(String(rows.length), W - M, y + 16, { size: 18, bold: true, color: C.blueDark, align: 'right' });
    doc.line(M, y + 26, W - M, y + 26, C.ink, 1.4);
    y = head(y + 38);

    data.forEach((r, i) => {
        if (y + rowH > H - bottom) { doc.addPage(); topBar(); y = head(46); }
        doc.rect(M, y, TW, rowH, i % 2 ? C.zebra : C.white);
        doc.line(M, y + rowH, M + TW, y + rowH, C.line, 0.6);
        INV_COLS.forEach((c, k) => {
            const strong = c[0] === 'inv' || c[0] === 'total';
            doc.text(String(r[c[0]]), c[3] === 'right' ? xs[k] + c[2] - 8 : xs[k] + 8, y + 15, { size: 9.5, bold: strong, align: c[3] });
        });
        y += rowH;
    });

    // Totals box + footer
    if (y + 40 + 34 + 70 > H - bottom) { doc.addPage(); topBar(); y = 46; }
    y += 18;
    const bw = 250, bx = W - M - bw;
    doc.rect(bx, y, bw, 24, C.white, C.ink, 1.4);
    doc.text('Total weight', bx + 14, y + 16, { size: 9.5, color: C.muted });
    doc.text(kg.toFixed(2) + ' kg', bx + bw - 14, y + 16, { size: 9.5, color: C.muted, align: 'right' });
    doc.rect(bx, y + 24, bw, 36, C.blueDark, C.ink, 1.4);
    doc.text('GRAND TOTAL', bx + 14, y + 47, { size: 9, bold: true, color: C.white });
    doc.text(invMoney(grand), bx + bw - 14, y + 49, { size: 16, bold: true, color: C.white, align: 'right' });

    y += 96;
    doc.line(M, y, W - M, y, C.line, 0.7);
    doc.text('Thank you for your business', W / 2, y + 18, { size: 10, bold: true, color: C.ink, align: 'center' });
    doc.text(B.name, W / 2, y + 32, { size: 8.5, bold: true, color: C.blue, align: 'center' });

    return doc.build();
}

function invoicePdfName(rows) {
    return 'Invoice_' + rows[0].inv + (rows.length > 1 ? '_+' + (rows.length - 1) : '') + '.pdf';
}

function downloadInvoicePdf(rows) {
    const blob = new Blob([buildInvoicePdf(rows)], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = invoicePdfName(rows);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}
