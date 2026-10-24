// popupNotify.js — Notification toast, bottom-centre, light + dark themes.
// showPopup(type, message, tip, durationMs, watch)
//   type:  error | warning | success | info | dupe
//   watch: (optional) function that returns true once the problem is fixed → popup hides itself

(function () {

const style = document.createElement('style');
style.textContent = `
  #robotPopup {
    --pp-bg:#ffffff; --pp-text:#1f2937; --pp-muted:#6b7280; --pp-line:#e5e7eb;
    --pp-accent:#2563eb; --pp-soft:#eff6ff;
    position: fixed; left: 50%; bottom: 28px;
    width: min(540px, calc(100vw - 32px));
    display: flex; align-items: flex-start; gap: 14px;
    padding: 16px 14px 18px 16px;
    background: var(--pp-bg); color: var(--pp-text);
    border: 1px solid var(--pp-line); border-left: 5px solid var(--pp-accent);
    border-radius: 14px; box-shadow: 0 14px 40px rgba(15,23,42,0.2);
    font-family: 'Segoe UI', Arial, sans-serif; font-size: 14px; text-align: left;
    z-index: 99999; overflow: hidden;
    opacity: 0; transform: translate(-50%, 18px); pointer-events: none;
    transition: opacity 0.25s ease, transform 0.25s ease;
  }
  #robotPopup.show { opacity: 1; transform: translate(-50%, 0); pointer-events: all; }

  body.dark-mode #robotPopup {
    --pp-bg:#181b30; --pp-text:#f1f2fa; --pp-muted:#a9adc8; --pp-line:#2c3050;
    box-shadow: 0 14px 40px rgba(0,0,0,0.6);
  }
  #robotPopup.type-error   { --pp-accent:#dc2626; --pp-soft:#fee2e2; }
  #robotPopup.type-warning { --pp-accent:#d97706; --pp-soft:#fef3c7; }
  #robotPopup.type-success { --pp-accent:#16a34a; --pp-soft:#dcfce7; }
  #robotPopup.type-info    { --pp-accent:#2563eb; --pp-soft:#dbeafe; }
  #robotPopup.type-dupe    { --pp-accent:#7c3aed; --pp-soft:#ede9fe; }
  body.dark-mode #robotPopup.type-error   { --pp-accent:#f87171; --pp-soft:rgba(248,113,113,0.15); }
  body.dark-mode #robotPopup.type-warning { --pp-accent:#fbbf24; --pp-soft:rgba(251,191,36,0.15); }
  body.dark-mode #robotPopup.type-success { --pp-accent:#4ade80; --pp-soft:rgba(74,222,128,0.15); }
  body.dark-mode #robotPopup.type-info    { --pp-accent:#7aa2ff; --pp-soft:rgba(122,162,255,0.15); }
  body.dark-mode #robotPopup.type-dupe    { --pp-accent:#a78bfa; --pp-soft:rgba(167,139,250,0.15); }

  #robotPopupFace {
    width: 38px; height: 38px; flex-shrink: 0; border-radius: 50%;
    background: var(--pp-soft); color: var(--pp-accent);
    display: flex; align-items: center; justify-content: center;
  }
  #robotPopupFace svg { width: 20px; height: 20px; }
  #robotPopupBody { flex: 1; min-width: 0; }
  #robotPopupTitle { font-size: 15px; font-weight: 700; line-height: 1.3; color: var(--pp-text); }
  #robotPopupMsg   { margin-top: 3px; font-size: 14px; line-height: 1.5; color: var(--pp-text); }
  #robotPopupSolution { margin-top: 6px; font-size: 13px; line-height: 1.45; color: var(--pp-muted); }

  #robotPopupClose {
    width: 28px; height: 28px; flex-shrink: 0; border-radius: 50%; border: none;
    background: transparent; color: var(--pp-muted); font-size: 14px; line-height: 1; cursor: pointer;
    margin: 0 !important; padding: 0 !important; box-shadow: none !important; transition: background .15s, color .15s;
  }
  #robotPopupClose:hover { background: var(--pp-soft); color: var(--pp-accent); transform: none; }

  #robotPopupProgress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; }
  #robotPopupProgressBar { height: 100%; width: 100%; background: var(--pp-accent); opacity: 0.55; transition: width linear; }
`;
document.head.appendChild(style);

const popup = document.createElement('div');
popup.id = 'robotPopup';
popup.setAttribute('role', 'alert');
popup.setAttribute('aria-live', 'polite');
popup.innerHTML = `
  <div id="robotPopupFace"></div>
  <div id="robotPopupBody">
    <div id="robotPopupTitle"></div>
    <div id="robotPopupMsg"></div>
    <div id="robotPopupSolution"></div>
  </div>
  <button id="robotPopupClose" type="button" title="Close" aria-label="Close">✕</button>
  <div id="robotPopupProgress"><div id="robotPopupProgressBar"></div></div>
`;
document.body.appendChild(popup);
document.getElementById('robotPopupClose').addEventListener('click', hidePopup);

const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICONS = {
    error:   svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12.5"/><circle cx="12" cy="16" r="0.6" fill="currentColor"/>'),
    warning: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.6" fill="currentColor"/>'),
    success: svg('<circle cx="12" cy="12" r="10"/><polyline points="8 12.5 11 15.5 16 9"/>'),
    info:    svg('<circle cx="12" cy="12" r="10"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor"/>'),
    dupe:    svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>')
};
const TITLES = { error: 'Please fix this', warning: 'Please check', success: 'Done', info: 'Note', dupe: 'Already in use' };

// Plain, professional text: strip emoji
const clean = s => String(s || '')
    .replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '')
    .replace(/\s{2,}/g, ' ').trim();

let autoTimer = null, watchTimer = null;

function clearTimers() {
    if (autoTimer)  { clearTimeout(autoTimer);  autoTimer = null; }
    if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
}

window.showPopup = function (type, msg, solution = '', duration = 6000, watch = null, title = null) {
    type = ICONS[type] ? type : 'info';
    const el = document.getElementById('robotPopup');
    clearTimers();

    el.className = 'show type-' + type;
    document.getElementById('robotPopupFace').innerHTML = ICONS[type];
    document.getElementById('robotPopupTitle').textContent = title || TITLES[type];
    document.getElementById('robotPopupMsg').textContent = clean(msg);
    const tip = clean(solution);
    const tipEl = document.getElementById('robotPopupSolution');
    tipEl.textContent = tip;
    tipEl.style.display = tip ? 'block' : 'none';

    const bar  = document.getElementById('robotPopupProgressBar');
    const prog = document.getElementById('robotPopupProgress');
    bar.style.transition = 'none';
    bar.style.width = '100%';
    prog.style.display = duration > 0 ? 'block' : 'none';
    if (duration > 0) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            bar.style.transition = `width ${duration}ms linear`;
            bar.style.width = '0%';
        }));
        autoTimer = setTimeout(hidePopup, duration);
    }

    // Disappear the moment the problem is fixed
    if (typeof watch === 'function') {
        watchTimer = setInterval(() => {
            let ok = false;
            try { ok = !!watch(); } catch (e) { ok = false; }
            if (ok) hidePopup();
        }, 150);
    }
};

function hidePopup() {
    document.getElementById('robotPopup').classList.remove('show');
    clearTimers();
}
window.hidePopup = hidePopup;

})();
