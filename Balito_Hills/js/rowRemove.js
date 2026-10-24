// rowRemove.js — the red ✕ on the right of every line
// With only one line left, ✕ clears it (keeps hotel / rate / date) instead of deleting it.

document.addEventListener('click', e => {
    const btn = e.target.closest('.rm-btn');
    if (!btn) return;

    const tr   = btn.closest('tr');
    const body = bhTable();

    if (body.rows.length <= 1) {
        const keep = { hotel: tr.querySelector('.hotel').value, rate: tr.querySelector('.rate').value };
        body.innerHTML = '';
        addRow(keep);
        showPopup('info', 'Line cleared.', 'Hotel and rate were kept.', 2500);
    } else {
        const n = Array.from(body.rows).indexOf(tr) + 1;
        tr.remove();
        showPopup('success', `Line ${n} removed.`, '', 2500);
    }
    updateGrandTotal();
});
