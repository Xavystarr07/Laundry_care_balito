// validation.js — checks every line before Save / Print + live duplicate-invoice check
// firstError() returns { el, msg, tip } for the first problem found, or null.

const bhTaken = {};   // cache of database checks: '12345' -> true / false

function checkInvoiceTaken(v, cb) {
    if (v.length !== BH.invoiceDigits) return;
    if (Object.prototype.hasOwnProperty.call(bhTaken, v)) { cb && cb(bhTaken[v]); return; }
    fetch('php/check_invoice.php?invoice_number=' + encodeURIComponent(v))
        .then(r => r.json())
        .then(d => { bhTaken[v] = !!d.exists; cb && cb(bhTaken[v]); })
        .catch(() => {});
}

function rowProblem(tr, n, rows) {
    const q = c => tr.querySelector('.' + c);
    const r = readRow(tr);
    const L = bhDateLimits();
    const P = `Line ${n}: `;

    if (!r.inv)                               return { el: q('inv'), msg: P + 'enter the invoice number.', tip: 'Type the number from the slip.' };
    if (r.inv.length < BH.invoiceDigits)      return { el: q('inv'), msg: P + `invoice "${r.inv}" is too short — it must be ${BH.invoiceDigits} digits.`, tip: 'For example: ' + r.inv.padStart(BH.invoiceDigits, '0') };
    if (bhTaken[r.inv] === true)              return { el: q('inv'), msg: P + `invoice #${r.inv} already exists in the database.`, tip: 'Choose a different invoice number.' };
    if (!r.hotel)                             return { el: q('hotel'), msg: P + 'pick a hotel.', tip: 'Choose it from the list.' };
    if (!r.unit)                              return { el: q('unit'), msg: P + 'enter the hotel unit.', tip: 'Type the unit number or name.' };
    if (!r.rate)                              return { el: q('rate'), msg: P + 'pick WDI or WDF.', tip: 'Choose the rate from the list.' };
    // A ticket may repeat only as a pair (e.g. WDF + WDI) with the same hotel, unit and date
    if (rows.some((x, j) => j !== n - 1 && x.inv === r.inv &&
            (x.hotel !== r.hotel || x.unit !== r.unit || x.date !== r.date || x.rate === r.rate)))
                                              return { el: q('inv'), msg: P + `invoice #${r.inv} is on more than one line.`, tip: 'Every line needs its own invoice number.' };
    if (!/^\d{1,4}(\.\d{1,2})?$/.test(r.weight) || bhNum(r.weight) <= 0)
                                              return { el: q('weight'), msg: P + 'weight must be more than 0 (max 2 decimals).', tip: 'Example: 12.5' };
    const hasAmt = bhNum(r.extra_amount) > 0;
    if (r.extra_amount !== '' && !/^\d{1,5}(\.\d{1,2})?$/.test(r.extra_amount))
                                              return { el: q('extra-amount'), msg: P + 'extra amount is not valid.', tip: 'Positive amount, max 2 decimals.' };
    if (hasAmt && !r.extra_item)              return { el: q('extra-item'), msg: P + 'name the extra item.', tip: 'An amount needs an item name.' };
    if (r.extra_item && !hasAmt)              return { el: q('extra-amount'), msg: P + 'enter the amount for the extra item.', tip: 'Or clear the item name.' };
    if (!r.date || r.date < L.min || r.date > L.max)
                                              return { el: q('date'), msg: P + `date must be within the last ${BH.monthsBack} months and not in the future.`, tip: 'Pick a valid date.' };
    return null;
}

function firstError() {
    const trs  = Array.from(bhTable().rows);
    const rows = trs.map(readRow);
    if (!trs.length) return { el: null, msg: 'There are no lines on this invoice.', tip: 'Click Add Item.' };
    for (let i = 0; i < trs.length; i++) {
        const p = rowProblem(trs[i], i + 1, rows);
        if (p) return p;
    }
    return null;
}

// Show an error popup that disappears the moment the problem is fixed
  function errTitle(err) {
      const m = err.msg.toLowerCase();
      const rules = [['no lines', 'No lines yet'], ['already exists', 'Invoice already used'], ['more than one line', 'Invoice number repeated'],
          ['too short', 'Invoice number too short'], ['invoice number', 'Invoice number needed'], ['pick a hotel', 'Hotel needed'],
          ['hotel unit', 'Unit needed'], ['pick wdi', 'Rate needed'], ['weight', 'Weight needed'], ['name the extra', 'Extra item needed'],
          ['amount for the extra', 'Extra amount needed'], ['extra amount', 'Check the extra amount'], ['date', 'Check the date']];
      for (const [k, t] of rules) if (m.includes(k)) return t;
      return 'Check this line';
  }
  function flagError(err) {
    document.querySelectorAll('.invalid').forEach(e => e.classList.remove('invalid'));
    if (err.el) { err.el.classList.add('invalid'); err.el.scrollIntoView({ behavior: 'smooth', block: 'center' }); err.el.focus({ preventScroll: true }); }
    showPopup('error', err.msg, err.tip || '', 0, () => { const e = firstError(); return !e || e.msg !== err.msg; }, errTitle(err));
}

// ── Live: Inv No box ─────────────────────────────────────────────────────────
document.addEventListener('input', e => {
    if (!e.target.matches('.inv')) return;
    formatInvoiceNumber(e.target);
    e.target.classList.remove('invalid');
    const v = e.target.value;
    if (v.length !== BH.invoiceDigits) return;

    checkInvoiceTaken(v, taken => {
        if (e.target.value !== v || !taken) return;
        e.target.classList.add('invalid');
        showPopup('dupe', `Invoice #${v} already exists in the database.`, 'Try a different invoice number before saving.', 0, () => e.target.value !== v);
    });
});

// Clear the red border as soon as a field is edited
['input', 'change'].forEach(evt => document.addEventListener(evt, e => {
    if (e.target.classList?.contains('invalid') && !e.target.matches('.inv')) e.target.classList.remove('invalid');
}));
