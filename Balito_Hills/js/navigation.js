// navigation.js — Monthly Statements button (with unsaved-data guard) + centred confirm dialog

function hasUnsavedData() {
    return Array.from(bhTable().rows).some(tr => !rowIsBlank(tr));
}

function goToMonthlyStatements() {
    const go = () => { window.location.href = 'monthly_statement/monthly_statement.php'; };
    if (!hasUnsavedData()) { go(); return; }
    showConfirmDialog(
        '⚠️ Unsaved Invoice',
        "This invoice hasn't been saved yet. If you leave now, all data will be lost.",
        'Yes, leave anyway',
        'Stay here',
        go
    );
}

function showConfirmDialog(title, message, confirmText, cancelText, onConfirm) {
    document.getElementById('confirmOverlay')?.remove();

    if (!document.getElementById('confirmDialogStyle')) {
        const s = document.createElement('style');
        s.id = 'confirmDialogStyle';
        s.textContent = `
            @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
            @keyframes popIn { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }
            #confirmOverlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:999999;
                display:flex; align-items:center; justify-content:center; animation:fadeInOverlay .2s ease; }
            #confirmDialog { background:#fff; border-radius:20px; padding:32px 36px; max-width:400px; width:90%;
                text-align:center; box-shadow:0 16px 48px rgba(0,0,0,.22); font-family:'Segoe UI',Arial,sans-serif;
                animation:popIn .25s cubic-bezier(.34,1.56,.64,1); }
            #confirmDialog .cd-icon { font-size:42px; margin-bottom:12px; }
            #confirmDialog h3 { margin:0 0 10px; font-size:18px; color:#222 !important; }
            #confirmDialog p  { margin:0 0 24px; font-size:14px; line-height:1.5; color:#666 !important; }
            #confirmDialog .cd-row { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
            #confirmDialog button { border:none; border-radius:20px; padding:10px 24px; font-size:14px; font-weight:700;
                font-family:inherit; margin:0; transition:transform .15s; }
            #confirmYes { background:linear-gradient(135deg,#e74c3c,#c0392b); color:#fff; box-shadow:0 4px 12px rgba(231,76,60,.3); }
            #confirmNo  { background:#f0f0f0; color:#444; }
            #confirmYes:hover, #confirmNo:hover { transform:scale(1.05); }
            body.dark-mode #confirmDialog { background:linear-gradient(145deg,#1a1a2e,#241b3d);
                border:1px solid rgba(139,92,246,.35); box-shadow:0 16px 48px rgba(0,0,0,.6); }
            body.dark-mode #confirmDialog h3 { color:#fff !important; }
            body.dark-mode #confirmDialog p  { color:#b8b8d4 !important; }
            body.dark-mode #confirmNo { background:#2a2a4a; color:#e0e0f0; }
        `;
        document.head.appendChild(s);
    }

    const overlay = document.createElement('div');
    overlay.id = 'confirmOverlay';
    overlay.innerHTML = `
        <div id="confirmDialog" role="dialog" aria-modal="true">
            <div class="cd-icon">⚠️</div>
            <h3>${bhEsc(title)}</h3>
            <p>${bhEsc(message)}</p>
            <div class="cd-row">
                <button type="button" id="confirmYes">${bhEsc(confirmText)}</button>
                <button type="button" id="confirmNo">${bhEsc(cancelText)}</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#confirmYes').addEventListener('click', () => { overlay.remove(); onConfirm(); });
    overlay.querySelector('#confirmNo').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('statementsFab')?.addEventListener('click', goToMonthlyStatements);
});
