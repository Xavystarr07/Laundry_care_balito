// ============================================================
//  js/pdfWriter.js — tiny PDF writer (no libraries, works offline)
//  Draws text, rectangles, lines and colour gradients on A4 pages.
//  Used by js/pdfExport.js. You should not need to edit this file.
// ============================================================
const PdfWriter = (function () {

    const PAGE_W = 595, PAGE_H = 842;                 // A4 in points

    // Helvetica character widths (1/1000 em) for ASCII 32–126
    const W_REG  = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
    const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];

    // Characters outside ASCII that we may meet → WinAnsi byte + width
    const SPECIAL = { '—': [0x97, 1000], '–': [0x96, 556], '•': [0x95, 350], '’': [0x92, 222], '‘': [0x91, 222], '“': [0x93, 333], '”': [0x94, 333], '…': [0x85, 1000] };

    function code(ch) {
        if (SPECIAL[ch]) return SPECIAL[ch][0];
        const c = ch.charCodeAt(0);
        if (c >= 32 && c <= 126) return c;
        if (c >= 0xA0 && c <= 0xFF) return c;
        return 63;                                      // '?'
    }
    function width(str, size, bold) {
        let w = 0;
        for (const ch of String(str)) {
            if (SPECIAL[ch]) { w += SPECIAL[ch][1]; continue; }
            const c = ch.charCodeAt(0);
            w += (c >= 32 && c <= 126) ? (bold ? W_BOLD : W_REG)[c - 32] : 556;
        }
        return w * size / 1000;
    }
    const esc = s => Array.from(String(s)).map(ch => {
        const c = code(ch), t = String.fromCharCode(c);
        return (t === '(' || t === ')' || t === '\\') ? '\\' + t : t;
    }).join('');

    const hex = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => (parseInt(h.substr(i, 2), 16) / 255).toFixed(3)).join(' '); };
    const mix = (a, b, t) => { const p = h => [0, 2, 4].map(i => parseInt(h.replace('#', '').substr(i, 2), 16)); const A = p(a), B = p(b);
        return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
    const n = v => (+v).toFixed(2);

    function Doc(opts) {
        const LAND = !!(opts && opts.landscape);                 // A4 landscape when asked
        const PW = LAND ? PAGE_H : PAGE_W, PH = LAND ? PAGE_W : PAGE_H;
        const pages = [];
        let ops = null;

        function addPage() { ops = []; pages.push(ops); }
        const Y = y => PH - y;                      // we draw from the TOP of the page

        // filled rectangle (optionally with a border)
        function rect(x, y, w, h, fill, stroke, lw) {
            let s = '';
            if (fill)   s += hex(fill) + ' rg ';
            if (stroke) s += hex(stroke) + ' RG ' + n(lw || 0.7) + ' w ';
            ops.push(s + n(x) + ' ' + n(Y(y + h)) + ' ' + n(w) + ' ' + n(h) + ' re ' + (fill && stroke ? 'B' : fill ? 'f' : 'S'));
        }
        // left → right colour gradient (thin strips)
        function gradient(x, y, w, h, c1, c2, steps) {
            steps = steps || 60;
            for (let i = 0; i < steps; i++) rect(x + w * i / steps, y, w / steps + 0.6, h, mix(c1, c2, i / (steps - 1)));
        }
        function line(x1, y1, x2, y2, color, lw) {
            ops.push(hex(color) + ' RG ' + n(lw || 0.7) + ' w ' + n(x1) + ' ' + n(Y(y1)) + ' m ' + n(x2) + ' ' + n(Y(y2)) + ' l S');
        }
        // text: opts { size, bold, italic, color, align: left|center|right } — y is the baseline
        function text(str, x, y, o) {
            o = o || {};
            const size = o.size || 11, bold = !!o.bold;
            const font = bold ? '/F2' : (o.italic ? '/F3' : '/F1');
            let px = x;
            const w = width(str, size, bold);
            if (o.align === 'center') px = x - w / 2;
            if (o.align === 'right')  px = x - w;
            ops.push('BT ' + hex(o.color || '#000000') + ' rg ' + font + ' ' + size + ' Tf ' + n(px) + ' ' + n(Y(y)) + ' Td (' + esc(str) + ') Tj ET');
        }

        function build() {
            const objs = [];
            const add = body => { objs.push(body); return objs.length; };
            add('<< /Type /Catalog /Pages 2 0 R >>');                  // 1
            add('');                                                    // 2 (filled below)
            add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');        // 3
            add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');   // 4
            add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>'); // 5
            const kids = [];
            pages.forEach(p => {
                const content = p.join('\n');
                const cId = add('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream');
                const pId = add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ' + cId + ' 0 R >>');
                kids.push(pId + ' 0 R');
            });
            objs[1] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + kids.length + ' >>';

            let out = '%PDF-1.4\n';
            const offsets = [];
            objs.forEach((b, i) => { offsets.push(out.length); out += (i + 1) + ' 0 obj\n' + b + '\nendobj\n'; });
            const xref = out.length;
            out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' +
                   offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
                   'trailer\n<< /Size ' + (objs.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
            const bytes = new Uint8Array(out.length);
            for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
            return bytes;
        }

        return { addPage, rect, gradient, line, text, build, width, PAGE_W: PW, PAGE_H: PH };
    }

    return { Doc };
})();
