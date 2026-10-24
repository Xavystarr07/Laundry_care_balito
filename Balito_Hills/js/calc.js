// calc.js — row total = weight x rate + extra amount, and the grand total
// Maths is done in whole cents so the browser and php/invoice_handler.php always agree.

function rowCents(tr) {
    const code   = tr.querySelector('.rate').value;
    const rate   = BH.rates[code] ? BH.rates[code].price : 0;
    const weight = bhNum(tr.querySelector('.weight').value);
    const extra  = bhNum(tr.querySelector('.extra-amount').value);
    return {
        cents: Math.round(weight * rate * 100) + Math.round(extra * 100),
        hasInput: weight > 0 || extra > 0
    };
}

function calculateRow(tr) {
    const { cents, hasInput } = rowCents(tr);
    tr.querySelector('.total').value = hasInput ? (cents / 100).toFixed(2) : '';
}

function updateGrandTotal() {
    let cents = 0;
    Array.from(bhTable().rows).forEach(tr => {
        const r = rowCents(tr);
        if (r.hasInput) cents += r.cents;
    });
    document.getElementById('grandTotal').textContent = (cents / 100).toFixed(2);
}

// One delegated listener covers every row, including ones added later
['input', 'change'].forEach(evt => {
    document.addEventListener(evt, e => {
        const tr = e.target.closest?.('#invoiceTable tr');
        if (!tr) return;
        if (e.target.matches('.weight, .extra-amount, .rate')) {
            calculateRow(tr);
            updateGrandTotal();
        }
    });
});
