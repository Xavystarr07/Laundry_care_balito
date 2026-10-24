// invoiceFormat.js — small helpers: digits-only invoice numbers, money, escaping

function bhDigits(s) {
    return String(s || '').replace(/\D/g, '').slice(0, (window.BH && BH.invoiceDigits) || 5);
}

// Used on every Inv No box while typing
function formatInvoiceNumber(input) {
    input.value = bhDigits(input.value);
}

function bhNum(v) {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
}

function bhMoney(n) {
    return Number(n || 0).toFixed(2);
}

function bhEsc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
