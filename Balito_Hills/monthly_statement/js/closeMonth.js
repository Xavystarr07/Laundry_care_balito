// ============================================================
//  js/closeMonth.js — after the statement is printed, offer to start next month
//  Only offered when the printed period is the month currently being saved into.
//  Calls php/close_month.php, which creates the new table and switches to it.
// ============================================================
(function () {
    const S = window.BHS;
    if (!S || !S.canClose || !S.nextTable) return;

    const ABBR  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const label = t => { const m = /^utopia_([a-z]{3})_(\d{4})$/.exec(t || ''); return m ? NAMES[ABBR.indexOf(m[1])] + ' ' + m[2] : t; };

    // Wrap Print: when the print window closes (printed or cancelled), ask
    const orig = window.printStatement;
    window.bhAfterPrint = () => ask();   // print.js calls this when printing finishes
    window.printStatement = function () {
        const w = orig();
        if (w && w.then) w.then(ask);
        return w;
    };

    function ensureStyle() {
        if (document.getElementById('cmStyle')) return;
        const s = document.createElement('style');
        s.id = 'cmStyle';
        s.textContent = `
          #cmOverlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:99999; display:flex; align-items:center; justify-content:center; }
          #cmBox { background:#fff; color:#1f2937; border-radius:20px; padding:30px 34px; max-width:440px; width:90%; text-align:center;
                   font-family:'Segoe UI',Arial,sans-serif; box-shadow:0 20px 50px rgba(0,0,0,.35); }
          #cmBox h3 { margin:0 0 10px; font-size:19px; color:#111; text-shadow:none; text-transform:none; letter-spacing:0; }
          #cmBox p  { margin:0 0 22px; font-size:14px; line-height:1.6; color:#4b5563; }
          #cmBox .row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
          #cmBox button { margin:0; border:none; border-radius:24px; padding:12px 24px; font:600 14px 'Segoe UI',Arial,sans-serif; }
          #cmYes { background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; }
          #cmNo  { background:#eef0f4; color:#374151; }
          #cmBox button:hover { transform:translateY(-1px); filter:brightness(1.05); }
        `;
        document.head.appendChild(s);
    }

    function show(title, text, buttons) {
        ensureStyle();
        document.getElementById('cmOverlay')?.remove();
        const o = document.createElement('div');
        o.id = 'cmOverlay';
        o.innerHTML = `<div id="cmBox"><h3>${title}</h3><p>${text}</p><div class="row">${buttons}</div></div>`;
        document.body.appendChild(o);
        return o;
    }

    function ask() {
        const cur = label(S.activeTable), next = label(S.nextTable);
        const o = show('Start ' + next + '?',
            `Done printing? From now on, new invoices will be saved into <strong>${S.nextTable}</strong>.<br>
             Invoices already in <strong>${S.activeTable}</strong> stay there and still appear on statements.`,
            `<button type="button" id="cmYes">Yes, start ${next}</button><button type="button" id="cmNo">Not now</button>`);
        o.querySelector('#cmNo').onclick = () => o.remove();
        o.querySelector('#cmYes').onclick = function () {
            this.disabled = true; this.textContent = 'Working…';
            fetch('php/close_month.php', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'from=' + encodeURIComponent(S.activeTable) })
                .then(r => r.json())
                .then(d => {
                    if (d.ok) {
                        const o2 = show('All set', `${cur} is closed. New invoices now go into <strong>${d.active}</strong>.`, `<button type="button" id="cmYes">OK</button>`);
                        o2.querySelector('#cmYes').onclick = () => window.location.reload();
                    } else {
                        const o2 = show('Could not start the month', d.msg || 'Please try again.', `<button type="button" id="cmNo">Close</button>`);
                        o2.querySelector('#cmNo').onclick = () => o2.remove();
                    }
                })
                .catch(() => { o.remove(); alert('Could not reach the server. Nothing was changed.'); });
        };
    }
})();
