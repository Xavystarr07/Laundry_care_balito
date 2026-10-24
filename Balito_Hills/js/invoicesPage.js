// ============================================================
//  js/invoicesPage.js — Saved Invoices page: list, search, edit window, delete
//  Server rules live in php/line_update.php / php/line_delete.php.
// ============================================================
(function () {
    const $ = id => document.getElementById(id);
    let rows = [];

    const money = n => 'R ' + Number(n).toFixed(2);
    const hotelOpts = sel => BH.hotels.map(h => `<option value="${bhEsc(h)}"${h === sel ? ' selected' : ''}>${bhEsc(h)}</option>`).join('');
    const rateOpts  = sel => Object.entries(BH.rates).map(([c, r]) => `<option value="${bhEsc(c)}"${c === sel ? ' selected' : ''}>${bhEsc(r.label)} — R${Number(r.price).toFixed(2)}/kg</option>`).join('');

    // ── List ─────────────────────────────────────────────────────────────────
    function load() {
        const p = new URLSearchParams({ q: $('fQ').value.trim(), from: $('fFrom').value, to: $('fTo').value });
        fetch('php/lines_list.php?' + p)
            .then(r => r.json())
            .then(d => {
                if (!d.ok) { showPopup('error', d.msg, '', 0); return; }
                rows = d.rows;
                render(d.limited);
            })
            .catch(() => showPopup('error', 'Could not reach the server.', '', 0));
    }

    function render(limited) {
        const body = $('linesBody');
        const sum = rows.reduce((s, r) => s + Math.round(r.total * 100), 0) / 100;
        $('count').textContent = rows.length
            ? rows.length + ' line' + (rows.length === 1 ? '' : 's') + ' · total ' + money(sum) + (limited ? ' (showing the newest 300 — narrow the search)' : '')
            : '';
        if (!rows.length) { body.innerHTML = '<tr><td colspan="11" class="empty">No invoices found.</td></tr>'; return; }
        body.innerHTML = rows.map((r, i) => `
            <tr>
                <td>${bhEsc(r.date)}</td>
                <td class="strong">${String(r.inv).padStart(BH.invoiceDigits, '0')}</td>
                <td>${bhEsc(r.hotel)}</td>
                <td>${bhEsc(r.unit)}</td>
                <td>${bhEsc(r.rate)}</td>
                <td class="num">${r.weight.toFixed(2)} kg</td>
                <td>${bhEsc(r.extra_item) || '—'}</td>
                <td class="num">${r.extra_amount > 0 ? money(r.extra_amount) : '—'}</td>
                <td class="num strong">${money(r.total)}</td>
                <td class="tbl">${bhEsc(r.table)}</td>
                <td><button type="button" class="act edit" data-edit="${i}">Edit</button><button type="button" class="act del" data-del="${i}">Delete</button></td>
            </tr>`).join('');
    }

    $('linesBody').addEventListener('click', e => {
        const ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
        if (ed) openEdit(rows[+ed.dataset.edit]);
        if (dl) confirmDelete(rows[+dl.dataset.del]);
    });

    $('fGo').addEventListener('click', load);
    $('fReset').addEventListener('click', () => { $('fQ').value = ''; $('fFrom').value = ''; $('fTo').value = ''; load(); });
    [$('fQ'), $('fFrom'), $('fTo')].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') load(); }));
    $('fFrom').addEventListener('change', load);
    $('fTo').addEventListener('change', load);

    // ── Delete ───────────────────────────────────────────────────────────────
    function confirmDelete(r) {
        showConfirmDialog(
            'Delete this line?',
            `Invoice #${r.inv} · unit ${r.unit} · ${r.rate} · ${money(r.total)}. This removes it from the statement. (A copy is kept in the audit log.)`,
            'Yes, delete', 'Keep it',
            () => post('php/line_delete.php', { table: r.table, id: r.id }).then(d => {
                if (d.ok) { showPopup('success', 'Line deleted.', '', 3000); load(); }
                else showPopup('error', d.msg, '', 0);
            })
        );
    }

    const post = (url, data) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(r => r.json()).catch(() => ({ ok: false, msg: 'Could not reach the server.' }));

    // ── Edit window ──────────────────────────────────────────────────────────
    function openEdit(r) {
        document.getElementById('edOverlay')?.remove();
        const o = document.createElement('div');
        o.id = 'edOverlay';
        o.innerHTML = `
          <div id="edBox">
            <h3>Edit line · <span style="font-weight:400;color:var(--muted)">${bhEsc(r.table)}</span></h3>
            <div class="grid">
              <div><label>Invoice no</label><input id="edInv" inputmode="numeric" maxlength="${BH.invoiceDigits}" value="${bhEsc(String(r.inv).padStart(BH.invoiceDigits, '0'))}"></div>
              <div><label>Date</label><input id="edDate" type="date" value="${bhEsc(r.date)}"></div>
              <div class="full"><label>Hotel</label><select id="edHotel">${hotelOpts(r.hotel)}</select></div>
              <div><label>Hotel unit</label><input id="edUnit" list="bhUnits" maxlength="50" value="${bhEsc(r.unit)}"></div>
              <div><label>Rate</label><select id="edRate">${rateOpts(r.rate)}</select></div>
              <div><label>Weight (kg)</label><input id="edWeight" type="number" step="0.01" min="0" value="${r.weight}"></div>
              <div><label>Extra item</label><input id="edExtra" list="bhExtras" maxlength="255" value="${bhEsc(r.extra_item)}"></div>
              <div class="full"><label>Extra amount (R)</label><input id="edAmt" type="number" step="0.01" min="0" value="${r.extra_amount || ''}"></div>
            </div>
            <div id="edTotal"></div>
            <div id="edErr"></div>
            <div class="row"><button type="button" class="pill go" id="edSave">Save changes</button><button type="button" class="pill ghost" id="edCancel">Cancel</button></div>
          </div>`;
        document.body.appendChild(o);

        const f = id => o.querySelector(id);
        const num = v => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
        function preview() {
            const code = f('#edRate').value;
            const price = code === r.rate ? r.rateprice : (BH.rates[code] ? BH.rates[code].price : 0);
            const c = Math.round(num(f('#edWeight').value) * price * 100) + Math.round(num(f('#edAmt').value) * 100);
            f('#edTotal').textContent = 'Total: ' + money(c / 100);
        }
        o.addEventListener('input', preview); o.addEventListener('change', preview); preview();
        f('#edInv').addEventListener('input', e => { e.target.value = bhDigits(e.target.value); });

        f('#edCancel').onclick = () => o.remove();
        o.addEventListener('click', e => { if (e.target === o) o.remove(); });
        f('#edSave').onclick = function () {
            this.disabled = true; f('#edErr').textContent = '';
            post('php/line_update.php', {
                table: r.table, id: r.id, inv: f('#edInv').value, hotel: f('#edHotel').value, unit: f('#edUnit').value,
                rate: f('#edRate').value, weight: f('#edWeight').value, extra_item: f('#edExtra').value,
                extra_amount: f('#edAmt').value, date: f('#edDate').value
            }).then(d => {
                if (d.ok) { o.remove(); showPopup('success', 'Line saved. New total ' + money(d.total) + '.', '', 3500); load(); }
                else { f('#edErr').textContent = d.msg; this.disabled = false; }
            });
        };
    }

    load();
})();
