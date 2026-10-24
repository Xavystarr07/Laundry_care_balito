// ============================================================
//  js/excelExport.js — "Download Excel" button
//  One clean sheet:
//    heading, slogan, billing period, who it is sent to
//    then every HOTEL (A–Z, only hotels that have invoices this period)
//      → every UNIT (numbers first, then names)
//         → its lines, earliest date to latest:
//           Date | KG | Rate | Amount | Extra | Extra Amount | Total
//  Edit colours in XL_COLOURS and the "Sent to" name at the top.
// ============================================================

const XL_SENT_TO = 'Utopia Memorable Luxury Holidays';
const XL_COLS    = ['Date', 'KG', 'Rate', 'Amount', 'Extra', 'Extra Amount', 'Total'];
const XL_COLOURS = {
    ink: '111111', blue: '1565C0', blueDark: '0D47A1', blueSoft: 'E8F1FB',
    grey: 'F3F3F3', zebra: 'F7F7F7', muted: '555555', white: 'FFFFFF'
};

// Units: numbers first (ascending), then names (also used by the PDF)
function xlCompareUnits(a, b) {
    const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return parseInt(a, 10) - parseInt(b, 10);
    if (na) return -1;
    if (nb) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
}

const xlTitleCase = s => String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
const xlCents = n => Math.round(Number(n) * 100);
const xlZero  = () => ({ kg: 0, amt: 0, extra: 0, total: 0 });
function xlAdd(t, l) {
    t.kg    += Number(l.weight);
    t.amt   += Math.round(Number(l.weight) * Number(l.rateprice) * 100);
    t.extra += xlCents(l.extra_amount);
    t.total += xlCents(l.total);
}
function xlMerge(into, t) { into.kg += t.kg; into.amt += t.amt; into.extra += t.extra; into.total += t.total; }

// hotel → unit → lines  (hotels A–Z, units sorted, lines earliest → latest)
function xlGroup(lines) {
    const hotels = new Map();
    lines.forEach(l => {
        if (!hotels.has(l.hotel)) hotels.set(l.hotel, new Map());
        const units = hotels.get(l.hotel);
        if (!units.has(l.unit)) units.set(l.unit, []);
        units.get(l.unit).push(l);
    });
    return Array.from(hotels.keys()).sort((a, b) => a.localeCompare(b)).map(h => ({
        hotel: h,
        units: Array.from(hotels.get(h).keys()).sort(xlCompareUnits).map(u => ({
            unit: u,
            lines: hotels.get(h).get(u).slice().sort((a, b) => a.date.localeCompare(b.date) || a.inv - b.inv)
        }))
    }));
}

function xlBuildSheet(wb, S) {
    const sh = wb.addSheet('Excel Sheet');
    const C = XL_COLOURS, last = XL_COLS.length - 1;
    sh.widths = [15, 11, 11, 15, 24, 15, 16];
    sh.landscape = false;
    let r = 0;

    // one merged row across all columns
    const band = (text, spec, height) => {
        sh.set(r, 0, text, spec);
        sh.fillRange(r, 1, r, last, spec);
        sh.merge(r, 0, r, last);
        if (height) sh.heights[r] = height;
        r++;
    };

    // ── Heading (nothing else at the top) ──
    band(xlTitleCase(BH.business.name) + ' Excel Sheet', { bold: true, size: 20, color: C.ink }, 32);
    band('"A fresh start in every wash"', { italic: true, bold: true, size: 10.5, color: C.blue }, 18);
    r++; sh.heights[r - 1] = 8;
    band('Excel sheet for period: ' + S.periodText, { bold: true, size: 12, color: C.ink }, 22);
    band('Sent to: ' + XL_SENT_TO, { size: 12, color: C.ink }, 22);
    sh.fillRange(r, 0, r, last, { border: 'top' }); sh.heights[r] = 6; r += 2;

    const groups = xlGroup(S.lines);
    if (!groups.length) {
        band('No invoices found for this period.', { italic: true, color: C.muted });
        return sh;
    }

    const grand = xlZero();
    groups.forEach(g => {
        const hTot = xlZero();
        band(g.hotel, { bold: true, size: 14, color: C.white, fill: C.blueDark, indent: 1 }, 28);

        g.units.forEach(u => {
            const uTot = xlZero();
            band('Unit: ' + u.unit, { bold: true, size: 12, color: C.ink, fill: C.blueSoft, indent: 1 }, 24);

            XL_COLS.forEach((t, i) => sh.set(r, i, t, { bold: true, size: 10, color: C.white, fill: C.ink, h: (i === 0 || i === 4) ? 'left' : 'right', indent: 1 }));
            sh.heights[r] = 22; r++;

            u.lines.forEach((l, k) => {
                const b = { border: 'bottom', fill: k % 2 ? C.zebra : null };
                const w = Number(l.weight), rate = Number(l.rateprice), ex = Number(l.extra_amount);
                sh.set(r, 0, { date: l.date }, { ...b, fmt: 'date', h: 'left', indent: 1 });
                sh.set(r, 1, w, { ...b, fmt: 'kg' });
                sh.set(r, 2, rate, { ...b, fmt: 'money' });
                sh.set(r, 3, Math.round(w * rate * 100) / 100, { ...b, fmt: 'money' });
                sh.set(r, 4, l.extra_item || '', { ...b, indent: 1 });
                sh.set(r, 5, ex > 0 ? ex : null, { ...b, fmt: 'money' });
                sh.set(r, 6, Number(l.total), { ...b, fmt: 'money', bold: true });
                sh.heights[r] = 20; r++;
                xlAdd(uTot, l);
            });

            const st = { bold: true, fill: C.grey, border: 'top' };
            sh.set(r, 0, 'Unit ' + u.unit + ' total', { ...st, h: 'left', indent: 1 });
            sh.set(r, 1, Math.round(uTot.kg * 100) / 100, { ...st, fmt: 'kg' });
            sh.set(r, 2, null, st);
            sh.set(r, 3, uTot.amt / 100, { ...st, fmt: 'money' });
            sh.set(r, 4, null, st);
            sh.set(r, 5, uTot.extra / 100, { ...st, fmt: 'money' });
            sh.set(r, 6, uTot.total / 100, { ...st, fmt: 'money' });
            sh.heights[r] = 22; r += 2;                 // blank row between units
            xlMerge(hTot, uTot);
        });

        const ht = { bold: true, fill: C.blueSoft, border: 'top', color: C.blueDark };
        sh.set(r, 0, g.hotel + ' total', { ...ht, h: 'left', indent: 1 });
        sh.set(r, 1, Math.round(hTot.kg * 100) / 100, { ...ht, fmt: 'kg' });
        sh.set(r, 2, null, ht);
        sh.set(r, 3, hTot.amt / 100, { ...ht, fmt: 'money' });
        sh.set(r, 4, null, ht);
        sh.set(r, 5, hTot.extra / 100, { ...ht, fmt: 'money' });
        sh.set(r, 6, hTot.total / 100, { ...ht, fmt: 'money' });
        sh.heights[r] = 24; r += 2;                     // blank row between hotels
        xlMerge(grand, hTot);
    });

    const gt = { bold: true, size: 11, color: C.white, fill: C.blueDark };
    sh.set(r, 0, 'GRAND TOTAL', { ...gt, h: 'left', indent: 1 });
    sh.set(r, 1, Math.round(grand.kg * 100) / 100, { ...gt, fmt: 'kg' });
    sh.set(r, 2, null, gt);
    sh.set(r, 3, grand.amt / 100, { ...gt, fmt: 'money' });
    sh.set(r, 4, null, gt);
    sh.set(r, 5, grand.extra / 100, { ...gt, fmt: 'money' });
    sh.set(r, 6, grand.total / 100, { ...gt, fmt: 'rand', size: 12 });
    sh.heights[r] = 28;
    return sh;
}

// ── Build + download ─────────────────────────────────────────────────────────
function xlBuildWorkbook(S) {
    const wb = XlsxWriter.Workbook();
    xlBuildSheet(wb, S);
    return wb.build();
}

function downloadExcel() {
    const S = window.BHS;
    if (!S) return;
    const blob = new Blob([xlBuildWorkbook(S)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `Ballito_Hills_Statement_${S.from}_to_${S.to}.xlsx`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('excelBtn')?.addEventListener('click', downloadExcel);
});
