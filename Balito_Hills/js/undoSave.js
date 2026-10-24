// undoSave.js — the ✕ on the "saved" popup becomes an animated Undo button
// (only armed for ~30 seconds after a save; php/undo_save.php does the delete)
(function () {
    if (!window._undoAvail) return;

    const style = document.createElement('style');
    style.textContent = `
      #robotPopup.undo-mode #robotPopupClose {
        width: 30px; height: 30px; border-radius: 15px;
        display: flex; align-items: center; justify-content: flex-start;
        font-size: 0; overflow: hidden; white-space: nowrap;
        border: 1.5px solid var(--pp-accent) !important;
        background: transparent; color: var(--pp-accent);
        transition: width .35s cubic-bezier(.4,0,.2,1), background .25s, color .25s;
      }
      #robotPopup.undo-mode #robotPopupClose::before {
        content: '✕'; flex: 0 0 27px; text-align: center; font-size: 13px; line-height: 1;
      }
      #robotPopup.undo-mode #robotPopupClose::after {
        content: 'Undo'; font-family: 'Segoe UI', Arial, sans-serif;
        font-size: 13px; font-weight: 700; letter-spacing: .3px;
        padding-right: 12px; opacity: 0; transform: translateX(-6px);
        transition: opacity .25s ease .1s, transform .3s ease .1s;
      }
      #robotPopup.undo-mode #robotPopupClose:hover,
      #robotPopup.undo-mode #robotPopupClose:focus-visible { width: 86px; background: var(--pp-accent); color: #fff; }
      body.dark-mode #robotPopup.undo-mode #robotPopupClose:hover,
      body.dark-mode #robotPopup.undo-mode #robotPopupClose:focus-visible { color: #0b1020; }
      #robotPopup.undo-mode #robotPopupClose:hover::after,
      #robotPopup.undo-mode #robotPopupClose:focus-visible::after { opacity: 1; transform: none; }
      #robotPopup.undo-mode #robotPopupClose:disabled { opacity: .5; cursor: default; }
    `;
    document.head.appendChild(style);

    const pop = document.getElementById('robotPopup');
    const x   = document.getElementById('robotPopupClose');
    if (!pop || !x) return;

    const orig = window.showPopup;
    let used = false;   // only the first success popup after a save gets Undo

    function leaveUndoMode() {
        pop.classList.remove('undo-mode');
        x.title = 'Close';
        x.setAttribute('aria-label', 'Close');
        x.disabled = false;
    }

    window.showPopup = function (type) {
        leaveUndoMode();
        const result = orig.apply(this, arguments);
        if (!used && type === 'success') {
            used = true;
            pop.classList.add('undo-mode');
            x.title = '';
            x.setAttribute('aria-label', 'Undo');
        }
        return result;
    };

    // Capture phase: runs before the normal "close" handler and replaces it
    pop.addEventListener('click', function (e) {
        if (!pop.classList.contains('undo-mode')) return;
        if (!e.target.closest('#robotPopupClose')) return;
        e.stopPropagation();
        x.disabled = true;

        fetch('php/undo_save.php', { method: 'POST' })
            .then(r => r.json())
            .then(d => {
                if (d.ok) { window.location.href = d.redirect; return; }
                showPopup('warning', d.msg, '', 5000);
            })
            .catch(() => showPopup('error', 'Could not undo. Check your connection.', '', 5000));
    }, true);
})();
