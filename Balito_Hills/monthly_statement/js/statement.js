(function () {
const $ = s => document.querySelector(s);
document.querySelectorAll('.card').forEach(c => c.onclick = () => {
    document.querySelectorAll('.card').forEach(x => x.classList.toggle('on', x === c));
    document.querySelectorAll('.panel').forEach(p => p.hidden = p.id !== c.dataset.panel);
});

// WhatsApp: opens a pre-filled message only (put the number like 27821234567)
const WA = '';
$('#waBtn')?.addEventListener('click', () => {
    const S = window.BHS;
    const msg = `Hi, please find the Laundry Care statement for ${S.periodText}. Total: R ${Number(S.total).toFixed(2)}.`;
    window.open('https://wa.me/' + WA + '?text=' + encodeURIComponent(msg), '_blank');
});

$('#reopenBtn')?.addEventListener('click', e => {
    if (!confirm('Reopen this statement? The current open period will be merged back into it, and you will need to close it again with a new cut-off date.')) return;
    fetch('php/reopen_period.php', { method: 'POST', body: new URLSearchParams({ id: e.target.dataset.id }) })
        .then(r => r.json())
        .then(d => d.ok ? (location.href = 'monthly_statement.php') : alert(d.msg))
        .catch(() => alert('Could not reopen. Check your connection.'));
});

$('#reopenBtn')?.addEventListener('click', e => {
    if (!confirm('Reopen this statement? The current open period will be merged back into it, and you will need to close it again with a new cut-off date.')) return;
    fetch('php/reopen_period.php', { method: 'POST', body: new URLSearchParams({ id: e.target.dataset.id }) })
        .then(r => r.json())
        .then(d => d.ok ? (location.href = 'monthly_statement.php') : alert(d.msg))
        .catch(() => alert('Could not reopen. Check your connection.'));
});

const CAP = window.CAP;
if (!CAP) return;
const MN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const t = new Date(), today = iso(t.getFullYear(), t.getMonth(), t.getDate());
const min = CAP.start || today;
const lo = +min.slice(0, 4) * 12 + +min.slice(5, 7) - 1, hi = t.getFullYear() * 12 + t.getMonth();
const fmt = s => new Date(s + 'T00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
let sel = '', y = t.getFullYear(), m = t.getMonth();

function cal() {
    const off = (new Date(y, m, 1).getDay() + 6) % 7, n = new Date(y, m + 1, 0).getDate(), idx = y * 12 + m;
    let h = `<div class="calh"><button type="button" class="nav" data-n="-1" ${idx <= lo ? 'disabled' : ''}>‹</button><b>${MN[m]} ${y}</b><button type="button" class="nav" data-n="1" ${idx >= hi ? 'disabled' : ''}>›</button></div>
        <div class="wd">${['Mo','Tu','We','Th','Fr','Sa','Su'].map(x => `<span>${x}</span>`).join('')}</div><div class="days">${'<i></i>'.repeat(off)}`;
    for (let d = 1; d <= n; d++) {
        const s = iso(y, m, d);
        h += `<button type="button" class="day${s === sel ? ' sel' : ''}${s === today ? ' now' : ''}" data-d="${s}" ${s < min || s > today ? 'disabled' : ''}>${d}</button>`;
    }
    $('#cal').innerHTML = h + '</div>';
}

function info() {
    $('#cutLbl').textContent = sel ? fmt(sel) : 'Pick a date';
    $('#capGo').disabled = !sel;
    if (!sel) { $('#capInfo').innerHTML = ''; return; }
    const inP = CAP.rows.filter(r => r.d <= sel), out = CAP.rows.length - inP.length;
    const tot = inP.reduce((s, r) => s + r.t, 0);
    const nx = new Date(sel + 'T00:00'); nx.setDate(nx.getDate() + 1);
    $('#capInfo').innerHTML = `<div class="stat"><b>${inP.length}</b> line${inP.length === 1 ? '' : 's'} · <b>R ${tot.toFixed(2)}</b></div>
        <div class="stat">Next period starts <b>${fmt(iso(nx.getFullYear(), nx.getMonth(), nx.getDate()))}</b>${out ? `<br><b>${out}</b> later line${out === 1 ? '' : 's'} will move into it` : ''}</div>`;
}

$('#cal').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.n) { m += +b.dataset.n; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } }
    if (b.dataset.d) { sel = b.dataset.d; info(); }
    cal();
});

$('#capGo').onclick = () => {
    if (!sel || !confirm(`Close this period on ${fmt(sel)}? This cannot be undone.`)) return;
    fetch('php/close_period.php', { method: 'POST', body: new URLSearchParams({ end: sel }) })
        .then(r => r.json())
        .then(d => d.ok ? (location.href = '?p=' + d.id) : alert(d.msg))
        .catch(() => alert('Could not close the period. Check your connection.'));
};

cal();
})();