// saveInvoice.js — Save Invoice: validate in the browser, then send to php/invoice_handler.php
// (the server checks everything again and recalculates every total itself)
// Any problem is shown as a popup; if something is broken in the page, an alert says what.

document.addEventListener('DOMContentLoaded', () => {
    if (window.__bhSaveBound) return;          // never attach twice, even if the file is loaded twice
    window.__bhSaveBound = true;

    const form = document.getElementById('invoiceForm');
    const btn  = document.getElementById('saveInvoiceBtn');
    if (!form || !btn) { alert('Save button or form not found on this page.'); return; }

    // Enter key must never save by accident
    form.addEventListener('submit', e => e.preventDefault());

    btn.addEventListener('click', () => {
        try {
            const err = firstError();
            if (err) { flagError(err); return; }

            // Printing is compulsory: Print saves a PDF copy first. Any edit after printing needs a new print.
            if (window.__bhPrintedKey !== JSON.stringify(readAllRows())) {
                const pb = document.getElementById('printBtn');
                pb?.classList.remove('nudge'); void pb?.offsetWidth; pb?.classList.add('nudge');
                showPopup('warning', 'Click Print before saving, so a PDF copy of this invoice is kept.',
                    'The PDF goes to your Downloads folder. If you change anything afterwards, print again.', 0,
                    () => window.__bhPrintedKey === JSON.stringify(readAllRows()), 'Print first');
                return;
            }

            document.getElementById('payload').value = JSON.stringify({ rows: readAllRows() });
            btn.disabled = true;
            form.submit();
        } catch (e) {
            alert('Save error: ' + e.message);
        }
    });

    // Live check: an extra amount needs an item name
    document.addEventListener('change', e => {
        if (!e.target.matches?.('.extra-amount')) return;
        const tr   = e.target.closest('#invoiceTable tr');
        const item = tr?.querySelector('.extra-item');
        if (!item) return;
        if (bhNum(e.target.value) > 0 && item.value.trim() === '') {
            item.classList.add('invalid');
            showPopup('warning', 'Name the extra item.', 'An amount needs an item name (e.g. Carpet).', 0,
                () => item.value.trim() !== '' || bhNum(e.target.value) <= 0, 'Extra item needed');
            item.focus();
        }
    });
});
