// rowManager.js — build, add and read invoice rows
// Columns: Inv No | Hotel | Hotel Unit | WDI/WDF | Weight | Extra Item | Amount | Total | Date | ✕

const bhTable = () => document.getElementById('invoiceTable');

const bhFmtDate = d => d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');

// Allowed dates: today back to BH.monthsBack months
function bhDateLimits() {
    const today = new Date();
    const min   = new Date();
    min.setMonth(min.getMonth() - (BH.monthsBack || 2));
    return { min: bhFmtDate(min), max: bhFmtDate(today), today: bhFmtDate(today) };
}

function bhHotelOptions(selected) {
    return '<option value="">-- Hotel --</option>' +
        BH.hotels.map(h => `<option value="${bhEsc(h)}"${h === selected ? ' selected' : ''}>${bhEsc(h)}</option>`).join('');
}

function bhRateOptions(selected) {
    return '' +
        Object.entries(BH.rates).map(([code, r]) =>
            `<option value="${bhEsc(code)}"${code === selected ? ' selected' : ''}>${Object.keys(BH.rates).length > 1 ? bhEsc(r.label) + ' — ' : ''}R${bhMoney(r.price)}/kg</option>`
        ).join('');
}

const BH_X_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

function buildRowHTML(d = {}) {
    const L = bhDateLimits();
    const hotel = d.hotel || (BH.hotels.length === 1 ? BH.hotels[0] : '');   // one hotel → pre-selected
    return `
    <tr>
        <td><input type="text" class="inv" inputmode="numeric" maxlength="${BH.invoiceDigits}" placeholder="00000" autocomplete="off" value="${bhEsc(d.inv || '')}"></td>
        <td><select class="hotel">${bhHotelOptions(hotel)}</select></td>
        <td><input type="text" class="unit" list="bhUnits" maxlength="50" placeholder="Unit" autocomplete="off" value="${bhEsc(d.unit || '')}"></td>
        <td><select class="rate" disabled tabindex="-1">${bhRateOptions(d.rate || Object.keys(BH.rates)[0])}</select></td>
        <td><input type="number" class="weight" min="0" step="0.01" placeholder="0.00" value="${bhEsc(d.weight || '')}"></td>
        <td><input type="text" class="extra-item" list="bhExtras" maxlength="255" placeholder="(optional)" autocomplete="off" value="${bhEsc(d.extra_item || '')}"></td>
        <td><input type="number" class="extra-amount" min="0" step="0.01" placeholder="0.00" value="${bhEsc(d.extra_amount || '')}"></td>
        <td><input type="text" class="total" readonly tabindex="-1"></td>
        <td><input type="date" class="date" min="${L.min}" max="${L.max}" value="${bhEsc(d.date || L.today)}"></td>
        <td class="rm-cell"><button type="button" class="rm-btn" title="Remove this line" aria-label="Remove this line">${BH_X_ICON}</button></td>
    </tr>`;
}

function addRow(d = {}) {
    const body = bhTable();
    body.insertAdjacentHTML('beforeend', buildRowHTML(d));
    const tr = body.lastElementChild;
    calculateRow(tr);
    updateGrandTotal();
    return tr;
}

// Add Item button: new line copies hotel / rate / date from the line above
function addRowFromLast() {
    const last = bhTable().lastElementChild;
    const tr = addRow(last ? {
        hotel: last.querySelector('.hotel').value,
        rate:  last.querySelector('.rate').value,
        date:  last.querySelector('.date').value
    } : {});
    tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
    tr.querySelector('.inv').focus({ preventScroll: true });
}

// Read one row into a plain object (strings, exactly as typed)
function readRow(tr) {
    const v = cls => tr.querySelector('.' + cls)?.value ?? '';
    return {
        inv: bhDigits(v('inv')), hotel: v('hotel'), unit: v('unit').trim(), rate: v('rate'),
        weight: v('weight'), extra_item: v('extra-item').trim(), extra_amount: v('extra-amount'),
        date: v('date')
    };
}

const readAllRows = () => Array.from(bhTable().rows).map(readRow);

// Is a row completely empty? (used to ignore it when checking "unsaved data")
function rowIsBlank(tr) {
    const r = readRow(tr);
    return !r.inv && !r.unit && !r.weight && !r.extra_item && !r.extra_amount;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('addRowBtn')?.addEventListener('click', addRowFromLast);
});
