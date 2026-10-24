// main.js — start-up. Keep this file LAST in the script list.

document.addEventListener('DOMContentLoaded', () => {

    // Put back lines after a failed save / undo, otherwise start with one blank line
    const restored = window._restoreRows && window._restoreRows.rows;
    if (restored && restored.length) {
        restored.forEach(r => addRow(r));
        restored.forEach(r => checkInvoiceTaken(r.inv));
    } else {
        addRow();
    }

    // Popup left by php/invoice_handler.php (saved / error)
    if (window._pendingPopup) {
        const p = window._pendingPopup;
        setTimeout(() => showPopup(p.type, p.msg, p.tip || '', p.type === 'success' ? 7000 : 0), 400);
    }

    // Cursor starts in the first Inv No box
    setTimeout(() => bhTable().querySelector('.inv')?.focus(), 150);
});
