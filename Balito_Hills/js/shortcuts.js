// ============================================================
//  js/shortcuts.js — keyboard shortcuts + "Saved Invoices" button (invoice page)
//    Ctrl+S                     → Save Invoice
//    Enter in the last Date box → new line (copies hotel / rate / date)
// ============================================================
document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        document.getElementById('saveInvoiceBtn')?.click();
        return;
    }
    if (e.key === 'Enter' && e.target.matches?.('.date')) {
        const tr = e.target.closest('tr');
        if (tr && tr === bhTable().lastElementChild) { e.preventDefault(); addRowFromLast(); }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('invoicesFab')?.addEventListener('click', () => {
        const go = () => { window.location.href = 'invoices.php'; };
        if (!hasUnsavedData()) { go(); return; }
        showConfirmDialog('⚠️ Unsaved Invoice', "This invoice hasn't been saved yet. If you leave now, all data will be lost.", 'Yes, leave anyway', 'Stay here', go);
    });
});
