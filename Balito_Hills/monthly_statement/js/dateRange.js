// dateRange.js — pick two dates (or a month chip) → page reloads with that period.
// The full period is typed out neatly under the pickers, e.g.
//   01 September 2026 — 30 September 2026

(function () {
    const from = document.getElementById('dateFrom');
    const to   = document.getElementById('dateTo');
    if (!from || !to) return;

    const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

    function go(f, t) {
        if (!f || !t) return;
        if (f > t) [f, t] = [t, f];                   // picked the wrong way round → swap
        window.location.search = '?from=' + f + '&to=' + t;
    }

    function monthRange(base, offset) {
        const first = new Date(base.getFullYear(), base.getMonth() + offset, 1);
        const last  = new Date(base.getFullYear(), base.getMonth() + offset + 1, 0);
        return [iso(first), iso(last)];
    }

    from.addEventListener('change', () => go(from.value, to.value || from.value));
    to.addEventListener('change',   () => go(from.value || to.value, to.value));

    const base = () => parse(from.value || iso(new Date()));
    document.getElementById('prevMonthBtn')?.addEventListener('click', () => go(...monthRange(base(), -1)));
    document.getElementById('nextMonthBtn')?.addEventListener('click', () => go(...monthRange(base(),  1)));
    document.getElementById('thisMonthBtn')?.addEventListener('click', () => go(...monthRange(new Date(), 0)));
})();
