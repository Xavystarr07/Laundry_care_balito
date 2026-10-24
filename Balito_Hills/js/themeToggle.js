// themeToggle.js — Dark / Light mode button, bottom-left (no search button).
// Pill widens to the right on hover to say what it does. Remembered in localStorage.
// Default is DARK. Works on every page that loads this file.

(function () {

const style = document.createElement('style');
style.textContent = `
  #themeToggleWrap { position: fixed; bottom: 24px; left: 24px; z-index: 9000; }

  .theme-fab {
    height: 44px; min-width: 44px; max-width: 44px; padding: 0 12px;
    display: flex; align-items: center; justify-content: flex-start;
    border-radius: 22px; border: none; cursor: pointer; overflow: hidden;
    margin: 0 !important; outline: none; position: relative;
    box-shadow: 0 4px 14px rgba(0,0,0,0.25);
    transition: max-width 0.35s ease, box-shadow 0.3s, background 0.4s;
  }
  #themeBtn { background: linear-gradient(135deg, #1a1a3e, #2d2d6b); color: #f0e68c; }
  body.dark-mode #themeBtn { background: linear-gradient(135deg, #ffd700, #ff8c00); color: #1a1a3e; }
  #themeBtn:hover { max-width: 260px; box-shadow: 0 6px 20px rgba(100,100,255,0.45); }
  body.dark-mode #themeBtn:hover { box-shadow: 0 6px 20px rgba(255,200,0,0.45); }

  #themeIcon {
    display: inline-flex; width: 20px; height: 20px; flex-shrink: 0;
    align-items: center; justify-content: center; font-size: 18px; line-height: 1;
  }
  .theme-fab::after {
    content: attr(data-tip);
    padding: 0 6px 0 10px; font-size: 13px; font-weight: 700; white-space: nowrap;
    font-family: 'Segoe UI', Arial, sans-serif; color: inherit;
    opacity: 0; transition: opacity 0.25s ease 0.1s;
  }
  .theme-fab:hover::after { opacity: 1; }

  @media print { #themeToggleWrap { display: none !important; } }
`;
document.head.appendChild(style);

const wrap = document.createElement('div');
wrap.id = 'themeToggleWrap';
wrap.innerHTML = `
  <button class="theme-fab" id="themeBtn" type="button" data-tip="Switch to light mode">
    <span id="themeIcon">☀️</span>
  </button>
`;
document.body.appendChild(wrap);

const btn  = document.getElementById('themeBtn');
const icon = document.getElementById('themeIcon');

let saved = null;
try { saved = localStorage.getItem('bhDarkMode'); } catch (e) {}
let dark = saved === null ? true : saved === 'true';

function apply(isDark) {
    dark = isDark;
    document.body.classList.toggle('dark-mode', isDark);
    icon.textContent = isDark ? '☀️' : '🌙';
    btn.setAttribute('data-tip', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    try { localStorage.setItem('bhDarkMode', String(isDark)); } catch (e) {}
}

apply(dark);
btn.addEventListener('click', () => apply(!dark));

})();
