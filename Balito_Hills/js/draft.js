// draft.js — autosaves unsaved invoice lines in this browser; restores them after a crash / closed tab
(function () {
    const KEY = 'bhDraft', MAX_AGE = 14 * 864e5;
    const get = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } };
    const put = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) {} };
    let ready = false, timer = null;

    function save() {
        if (!ready) return;
        const rows = Array.from(bhTable().rows).filter(tr => !rowIsBlank(tr)).map(readRow);
        put(rows.length ? { t: Date.now(), rows } : null);
    }
    const later = () => { clearTimeout(timer); timer = setTimeout(save, 400); };

    document.addEventListener('DOMContentLoaded', () => {
        const p = window._pendingPopup;
        if (p && p.type === 'success') put(null);                 // saved OK → draft no longer needed
        const d = get();
        const fresh = d && d.rows && d.rows.length && Date.now() - d.t < MAX_AGE;
        const blank = Array.from(bhTable().rows).every(rowIsBlank);
        if (fresh && blank && !window._restoreRows) {
            bhTable().innerHTML = '';
            d.rows.forEach(r => addRow(r));
            d.rows.forEach(r => checkInvoiceTaken(r.inv));
            const n = d.rows.length;
            showPopup('info', `Restored ${n} unsaved line${n === 1 ? '' : 's'} from your last session.`, 'Check them, then Print and Save.', 8000);
        }
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            if (Array.from(bhTable().rows).every(rowIsBlank)) { showPopup('info', 'Nothing to clear.', '', 2500); return; }
            showConfirmDialog('Reset all lines?', 'This clears every line on this page and the autosaved draft. Invoices already saved in the database are not touched.', 'Yes, reset all', 'Keep them', () => {
                bhTable().innerHTML = '';
                addRow();
                put(null);
                window.__bhPrintedKey = null;
                hidePopup();
                showPopup('info', 'All lines cleared.', '', 3000);
                bhTable().querySelector('.inv')?.focus();
            });
        });
        ready = true;
        document.addEventListener('input', later);
        document.addEventListener('change', later);
        new MutationObserver(later).observe(bhTable(), { childList: true });
    });
})();