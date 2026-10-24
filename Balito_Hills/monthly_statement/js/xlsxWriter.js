// ============================================================
//  js/xlsxWriter.js — tiny .xlsx writer (no libraries, works offline)
//  Builds a real Excel file with colours, borders, number formats,
//  merged cells, frozen headers and print setup.
//  Used by js/excelExport.js. You should not need to edit this file.
// ============================================================
const XlsxWriter = (function () {

    const enc = new TextEncoder();
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
                              .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    // ── ZIP (stored, no compression) ─────────────────────────────────────────
    const CRC = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; }
    function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

    function zip(files) {
        const now = new Date();
        const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
        const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
        const parts = [], central = [];
        let offset = 0;
        files.forEach(f => {
            const name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
            const lh = new DataView(new ArrayBuffer(30));
            lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true);
            lh.setUint16(8, 0, true); lh.setUint16(10, dosTime, true); lh.setUint16(12, dosDate, true);
            lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
            lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
            parts.push(new Uint8Array(lh.buffer), name, data);

            const ch = new DataView(new ArrayBuffer(46));
            ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
            ch.setUint16(10, 0, true); ch.setUint16(12, dosTime, true); ch.setUint16(14, dosDate, true);
            ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
            ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
            central.push(new Uint8Array(ch.buffer), name);
            offset += 30 + name.length + data.length;
        });
        const cdSize = central.reduce((s, p) => s + p.length, 0);
        const end = new DataView(new ArrayBuffer(22));
        end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
        end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
        const all = [...parts, ...central, new Uint8Array(end.buffer)];
        const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
        let pos = 0; all.forEach(p => { out.set(p, pos); pos += p.length; });
        return out;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    function colName(i) { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
    const addr = (r, c) => colName(c) + (r + 1);
    function serial(iso) {                       // 'YYYY-MM-DD' → Excel date number
        const [y, m, d] = iso.split('-').map(Number);
        return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
    }

    // number formats: id 164+ are custom
    const NUMFMT = { general: 0, int: 1, kg: 2, money: 4, rand: 164, date: 165 };
    const CUSTOM_FMT = { 164: '"R" #,##0.00', 165: 'dd/mm/yyyy' };

    // ── Workbook ─────────────────────────────────────────────────────────────
    function Workbook() {
        const fonts = [], fills = [], borders = [], xfs = [];
        const reg = (arr, obj) => { const k = JSON.stringify(obj); let i = arr.findIndex(x => x.k === k); if (i < 0) { arr.push({ k, v: obj }); i = arr.length - 1; } return i; };

        reg(fonts, { sz: 11 });
        reg(fills, { none: 1 });
        reg(fills, { gray: 1 });
        reg(borders, {});
        reg(xfs, { f: 0, fi: 0, b: 0, n: 0, h: null, v: null, w: false, ind: 0 });

        // spec: { bold, italic, size, color, fill, border, fmt, h, v, wrap, indent }
        function style(spec) {
            spec = spec || {};
            const f  = reg(fonts, { b: !!spec.bold, i: !!spec.italic, sz: spec.size || 11, c: spec.color || '000000' });
            const fi = spec.fill ? reg(fills, { rgb: spec.fill }) : 0;
            const b  = spec.border ? reg(borders, { t: spec.border }) : 0;
            return reg(xfs, { f, fi, b, n: NUMFMT[spec.fmt || 'general'], h: spec.h || (['kg','money','rand'].includes(spec.fmt) ? 'right' : null), v: spec.v || 'center', w: !!spec.wrap, ind: spec.indent || (['kg','money','rand'].includes(spec.fmt) ? 1 : 0) });
        }

        const sheets = [];
        function addSheet(name) {
            const sh = { name, cells: {}, merges: [], widths: [], heights: {}, freeze: 0, landscape: true };
            sh.set = (r, c, value, spec) => { sh.cells[r + ',' + c] = { value, s: style(spec) }; };
            // fill a whole range with one style (so merged / banded areas look solid)
            sh.fillRange = (r1, c1, r2, c2, spec) => { for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (!sh.cells[r + ',' + c]) sh.set(r, c, null, spec); };
            sh.merge = (r1, c1, r2, c2) => sh.merges.push(addr(r1, c1) + ':' + addr(r2, c2));
            sheets.push(sh);
            return sh;
             // Banking details (not used)
        }

        const bColor = 'D9D9D9';
        function borderXml(t) {
            const side = (n, st, col) => st ? `<${n} style="${st}"><color rgb="FF${col}"/></${n}>` : `<${n}/>`;
            const all = t === 'all', bot = t === 'bottom', top = t === 'top';
            return '<border>' +
                side('left',  all ? 'thin' : '', bColor) + side('right', all ? 'thin' : '', bColor) +
                side('top',   all ? 'thin' : top ? 'medium' : '', top ? '111111' : bColor) +
                side('bottom', (all || bot) ? 'thin' : '', bColor) + '<diagonal/></border>';
        }

        function stylesXml() {
            const fx = fonts.map(({ v }) => `<font>${v.b ? '<b/>' : ''}${v.i ? '<i/>' : ''}<sz val="${v.sz || 11}"/><color rgb="FF${v.c || '000000'}"/><name val="Calibri"/></font>`).join('');
            const fl = fills.map(({ v }) => v.none ? '<fill><patternFill patternType="none"/></fill>'
                : v.gray ? '<fill><patternFill patternType="gray125"/></fill>'
                : `<fill><patternFill patternType="solid"><fgColor rgb="FF${v.rgb}"/><bgColor indexed="64"/></patternFill></fill>`).join('');
            const bx = borders.map(({ v }) => borderXml(v.t)).join('');
            const xx = xfs.map(({ v }) => {
                const al = (v.h || v.v || v.w || v.ind)
                    ? `<alignment${v.h ? ` horizontal="${v.h}"` : ''}${v.v ? ` vertical="${v.v}"` : ''}${v.w ? ' wrapText="1"' : ''}${v.ind ? ` indent="${v.ind}"` : ''}/>` : '';
                return `<xf numFmtId="${v.n}" fontId="${v.f}" fillId="${v.fi}" borderId="${v.b}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${al}</xf>`;
            }).join('');
            const nf = Object.entries(CUSTOM_FMT).map(([id, code]) => `<numFmt numFmtId="${id}" formatCode="${esc(code)}"/>`).join('');
            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="${Object.keys(CUSTOM_FMT).length}">${nf}</numFmts>
<fonts count="${fonts.length}">${fx}</fonts>
<fills count="${fills.length}">${fl}</fills>
<borders count="${borders.length}">${bx}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xfs.length}">${xx}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
        }

        function sheetXml(sh, index) {
            let maxR = 0, maxC = 0;
            Object.keys(sh.cells).forEach(k => { const [r, c] = k.split(',').map(Number); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); });

            const rows = [];
            for (let r = 0; r <= maxR; r++) {
                let cx = '';
                for (let c = 0; c <= maxC; c++) {
                    const cell = sh.cells[r + ',' + c];
                    if (!cell) continue;
                    const a = addr(r, c), v = cell.value;
                    if (v === null || v === undefined || v === '') cx += `<c r="${a}" s="${cell.s}"/>`;
                    else if (typeof v === 'number') cx += `<c r="${a}" s="${cell.s}"><v>${v}</v></c>`;
                    else if (v && v.date) cx += `<c r="${a}" s="${cell.s}"><v>${serial(v.date)}</v></c>`;
                    else cx += `<c r="${a}" s="${cell.s}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
                }
                const ht = sh.heights[r] ? ` ht="${sh.heights[r]}" customHeight="1"` : '';
                if (cx || ht) rows.push(`<row r="${r + 1}"${ht}>${cx}</row>`);
            }

            const cols = sh.widths.length ? '<cols>' + sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>' : '';
            const pane = sh.freeze ? `<pane ySplit="${sh.freeze}" topLeftCell="A${sh.freeze + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>` : '';
            const merges = sh.merges.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : '';

            return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${addr(maxR, maxC)}"/>
<sheetViews><sheetView workbookViewId="0" showGridLines="0"${index === 0 ? ' tabSelected="1"' : ''}>${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
${cols}<sheetData>${rows.join('')}</sheetData>${merges}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${sh.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
        }

        function build() {
            const files = [
                { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
                { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
                { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>` },
                { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
                { name: 'xl/styles.xml', data: stylesXml() },
                ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s, i) }))
            ];
            return zip(files);
        }

        return { addSheet, build };
    }

    return { Workbook };
})();
