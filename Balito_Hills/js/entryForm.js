// ============================================================
//  js/entryForm.js — guided entry form (step by step)
//  It asks ONE thing at a time, tells you what to type, and moves on by itself:
//    Invoice no → (Hotel) → Unit → Weight → Extra item → (Amount) → Date → Check & add
//  * Invoice number moves on by itself after the last digit
//  * Unit / Extra item are dropdowns (click, type to filter, ↑ ↓ Enter)
//  * Date is a styled calendar (click a day, or ← → ↑ ↓ PageUp PageDown, Enter)
//  * Enter = next · Alt+← = back · Esc = close · click a step dot to go back and change it
//  * Each step uses the SAME checks as Save (js/validation.js)
//  Rate is a constant (BH_RATES in php/settings.php) so there is nothing to choose.
// ============================================================
(function () {
    if (window.__bhFormBound) return;
    window.__bhFormBound = true;

    const AUTO_OPEN = true;     // true = opens by itself on an empty page. false = only the "Entry Form" button opens it

    const $ = id => document.getElementById(id);
    const esc = s => bhEsc(s);
    const pad = n => String(n).padStart(2, '0');
    const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const nice = s => { const d = parseISO(s); return DOW[d.getDay()] + ' ' + pad(d.getDate()) + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); };
    const money = n => 'R ' + Number(n).toFixed(2);

    // Steps: id, dot label, icon, title, message, hint, the box that gets the cursor
    const STEPS = {
        inv:    { dot: 'Inv No',  icon: '🔢', title: 'Invoice number',  msg: 'Type the number from the invoice slip.',            hint: 'It moves on by itself after the last digit.', focus: 'efInv' },
        hotel:  { dot: 'Hotel',   icon: '🏨', title: 'Hotel',            msg: 'Which hotel is this for?',                           hint: 'Pick it from the list, then press Enter.',    focus: 'efHotel' },
        unit:   { dot: 'Unit',    icon: '🔑', title: 'Hotel unit',       msg: 'Which unit is this for?',                            hint: 'Pick one from the list, or type it, then press Enter.', focus: 'efUnit' },
        weight: { dot: 'Weight',  icon: '⚖️', title: 'Weight',           msg: 'How many kilograms?',                                hint: 'The price is worked out for you.',            focus: 'efWeight' },
        extra:  { dot: 'Extra',   icon: '🏷️', title: 'Extra item',       msg: 'Is there an extra item, like a carpet?',             hint: 'Pick or type it. Nothing extra? Just press Enter to skip.', focus: 'efExtra' },
        amount: { dot: 'Amount',  icon: '💰', title: 'Extra amount',     msg: 'How much is the extra item?',                        hint: 'Amount in Rands, for example 250.',           focus: 'efAmt' },
        date:   { dot: 'Date',    icon: '📅', title: 'Date received',    msg: 'Which day was it received?',                         hint: 'Click a day, or use the arrow keys, then press Enter.', focus: 'efDate' },
        review: { dot: 'Check',   icon: '✅', title: 'Check and add',    msg: 'Everything look right?',                             hint: 'Press Enter to add the line. Click Edit to change something.', focus: 'efNext' }
    };
    const ICON = {
        inv:    '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
        hotel:  '<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>',
        unit:   '<circle cx="8" cy="15" r="4"/><path d="M10.85 12.15L19 4"/><path d="M18 5l3 3"/><path d="M15 8l3 3"/>',
        weight: '<circle cx="12" cy="6" r="3"/><path d="M6.8 9h10.4a1 1 0 0 1 1 .8l1.6 9a1 1 0 0 1-1 1.2H5.2a1 1 0 0 1-1-1.2l1.6-9a1 1 0 0 1 1-.8z"/>',
        extra:  '<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
        amount: '<circle cx="12" cy="12" r="9"/><path d="M10 17V7h3.2a3 3 0 0 1 0 6H10"/><path d="M13 13l3.5 4"/>',
        date:   '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
        review: '<circle cx="12" cy="12" r="9"/><polyline points="8 12.5 11 15.5 16 9"/>'
    };
    const svgIcon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[id]}</svg>`;
    const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
    const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>';
    const FIELD_ORDER = ['inv', 'hotel', 'unit', 'rate', 'weight', 'extra-item', 'extra-amount', 'date'];
    const CLS_STEP = { inv: 'inv', hotel: 'hotel', unit: 'unit', weight: 'weight', 'extra-item': 'extra', 'extra-amount': 'amount', date: 'date' };
    const STEP_FIELDS = { inv: ['inv'], hotel: ['hotel'], unit: ['unit'], weight: ['weight'], extra: ['extra-item'], amount: ['extra-amount'], date: ['date'], review: FIELD_ORDER };

    let autoAt = 0, current = 'inv', maxIdx = 0, added = 0, fromReview = false, noteTimer = null, autoTimer = null;
    const cal = { view: null, hl: null };

    // ── Styles (light + dark follow the page's theme variables) ─────────────────
    const style = document.createElement('style');
    style.textContent = `
      #efOverlay { position: fixed; inset: 0; z-index: 99990; display: none; align-items: center; justify-content: center; padding: 14px;
                   background: rgba(8,10,25,.62); backdrop-filter: blur(4px); }
      #efOverlay.on { display: flex; animation: efFade .22s ease; }
      @keyframes efFade { from { opacity: 0; } to { opacity: 1; } }
      #efBox { width: 580px; max-width: 100%; max-height: 96vh; overflow: auto; text-align: left;
               background: var(--panel); color: var(--text); border: 1px solid var(--line); border-radius: 24px;
               box-shadow: 0 24px 60px rgba(0,0,0,.45); font-family: 'Segoe UI', Arial, sans-serif; animation: efPop .3s cubic-bezier(.22,1,.36,1); }
      @keyframes efPop { from { transform: translateY(14px) scale(.97); opacity: 0; } to { transform: none; opacity: 1; } }

      #efBox .wz-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 22px 26px 4px; }
      #efBox h3 { margin: 0; font-size: 20px; color: var(--text); }
      #efBox .wz-sub { margin: 3px 0 0; font-size: 13px; color: var(--muted); }
      #efX { margin: 0; width: 34px; height: 34px; padding: 0; border-radius: 50%; border: none; background: transparent; color: var(--muted); font-size: 16px; }
      #efX:hover { background: var(--row-hover); color: var(--text); transform: none; }

      /* progress */
      #efBox .wz-prog { padding: 12px 26px 0; }
      #efBox .wz-bar { height: 5px; border-radius: 5px; background: var(--row-hover); overflow: hidden; }
      #efBox .wz-bar i { display: block; height: 100%; width: 0; border-radius: 5px; background: linear-gradient(90deg, #2575fc, #6a11cb); transition: width .5s cubic-bezier(.4,0,.2,1); }
      #efBox .wz-dots { display: flex; justify-content: space-between; margin-top: 10px; }
      #efBox .wz-dot { margin: 0; padding: 0; background: none; border: none; display: flex; flex-direction: column; align-items: center; gap: 4px; cursor: default; font-family: inherit; flex: 1; }
      #efBox .wz-dot b { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700;
                         background: var(--row-hover); color: var(--muted); border: 1.5px solid var(--line); transition: all .3s; }
      #efBox .wz-dot span { font-size: 10.5px; color: var(--muted); letter-spacing: .3px; }
      #efBox .wz-dot.done b { background: #16a34a; color: #fff; border-color: #16a34a; }
      #efBox .wz-dot.done { cursor: pointer; }
      #efBox .wz-dot.on b { background: var(--accent); color: #fff; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(37,117,252,.2); }
      #efBox .wz-dot.on span { color: var(--text); font-weight: 700; }
      #efBox .wz-dot.skip { opacity: .4; }

      /* stage */
      #efBox .wz-stage { position: relative; padding: 18px 26px 6px; min-height: 360px; }
      #efBox .wz-step { display: none; }
      #efBox .wz-step.on { display: block; animation: wzIn .35s cubic-bezier(.22,1,.36,1); }
      @keyframes wzIn { from { opacity: 0; transform: translateX(22px); } to { opacity: 1; transform: none; } }
      #efBox .wz-step.shake { animation: wzShake .35s; }
      @keyframes wzShake { 20%, 60% { transform: translateX(-7px); } 40%, 80% { transform: translateX(7px); } }
      #efBox .wz-head { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
      #efBox .wz-ico { width: 52px; height: 52px; flex: 0 0 52px; border-radius: 16px; display: grid; place-items: center; font-size: 26px; background: var(--row-hover); border: 1px solid var(--line); }
      #efBox .wz-head h4 { margin: 0; font-size: 12px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--accent); }
      #efBox .wz-head p { margin: 3px 0 0; font-size: 21px; font-weight: 700; color: var(--text); line-height: 1.25; }
      #efBox .wz-hint { margin: 10px 2px 0; font-size: 13.5px; color: var(--muted); line-height: 1.5; }
      #efBox .wz-live { margin-top: 12px; font-size: 15px; color: var(--text); }
      #efBox .wz-live b { font-size: 18px; }

      #efBox input, #efBox select { width: 100%; height: 56px; padding: 0 16px; font: 20px 'Segoe UI', Arial, sans-serif; box-sizing: border-box; margin: 0;
               color: var(--field-text); background: var(--field); border: 2px solid var(--line); border-radius: 14px; transition: border-color .15s, box-shadow .15s; }
      #efBox input:focus, #efBox select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 4px rgba(37,117,252,.2); }
      #efBox input.invalid, #efBox select.invalid { border-color: #e11d48 !important; box-shadow: 0 0 0 4px rgba(225,29,72,.16) !important; }
      #efInv { letter-spacing: 6px; font-weight: 700; }
      #efBox .ef-combo { padding-right: 44px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9'%3E%3Cpath d='M1 1l6 6 6-6' fill='none' stroke='%238b93a7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 17px center; }
      #efBox .ef-err { margin-top: 8px; font-size: 14px; line-height: 1.4; color: #e11d48; }
      body.dark-mode #efBox .ef-err { color: #fb7185; }
      #efBox .ef-err em { display: block; font-style: normal; opacity: .75; font-size: 13px; }
      #efBox .wz-f { position: relative; }

      /* dropdown list */
      #efBox .ef-list { position: absolute; left: 0; right: 0; z-index: 30; max-height: 215px; overflow: auto; padding: 6px;
                        background: var(--panel); border: 2px solid var(--accent); border-radius: 14px; box-shadow: 0 16px 36px rgba(0,0,0,.35); }
      #efBox .ef-list[hidden] { display: none; }
      #efBox .ef-opt { padding: 11px 13px; border-radius: 9px; font-size: 16px; cursor: pointer; color: var(--text); }
      #efBox .ef-opt:hover, #efBox .ef-opt.hl { background: var(--accent); color: #fff; }
      #efBox .ef-none { padding: 11px 13px; font-size: 13px; color: var(--muted); }

      /* calendar (inline) */
      #efDate { cursor: pointer; font-weight: 700; margin-bottom: 12px; }
      #efBox .ef-cal { padding: 12px; border: 1.5px solid var(--line); border-radius: 18px; background: var(--field); }
      #efBox .ef-cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      #efBox .ef-cal-head strong { font-size: 15px; color: var(--text); }
      #efBox .ef-cal button { margin: 0; border: none; font-family: inherit; cursor: pointer; }
      #efBox .ef-nav { width: 34px; height: 34px; padding: 0; border-radius: 50%; background: var(--row-hover); color: var(--text); font-size: 18px; line-height: 1; }
      #efBox .ef-nav:hover:not(:disabled) { background: var(--accent); color: #fff; transform: none; }
      #efBox .ef-nav:disabled { opacity: .3; cursor: default; }
      #efBox .ef-dow, #efBox .ef-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; text-align: center; }
      #efBox .ef-dow span { font-size: 10.5px; font-weight: 700; letter-spacing: .5px; color: var(--muted); padding: 3px 0; text-transform: uppercase; }
      #efBox .ef-day { height: 34px; padding: 0; border-radius: 10px; background: transparent; color: var(--text); font-size: 14px; }
      #efBox .ef-day:hover:not(:disabled) { background: var(--row-hover); transform: none; }
      #efBox .ef-day.today { box-shadow: inset 0 0 0 1.5px var(--accent); }
      #efBox .ef-day.hl { background: var(--row-hover); box-shadow: inset 0 0 0 2px var(--accent); }
      #efBox .ef-day.sel { background: var(--accent); color: #fff; font-weight: 700; }
      #efBox .ef-day:disabled { opacity: .22; cursor: default; }
      #efBox .ef-cal-foot { display: flex; gap: 8px; margin-top: 8px; }
      #efBox .ef-chip { flex: 1; padding: 8px 0; border-radius: 20px; background: var(--row-hover); color: var(--text); font-size: 13px; font-weight: 600; }
      #efBox .ef-chip:hover { background: var(--accent); color: #fff; transform: none; }

      /* review */
      #efBox .wz-rev { border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
      #efBox .wz-row { display: flex; align-items: center; gap: 10px; padding: 11px 16px; border-bottom: 1px solid var(--line); }
      #efBox .wz-row:last-child { border-bottom: none; }
      #efBox .wz-row span { flex: 0 0 110px; font-size: 11.5px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--muted); }
      #efBox .wz-row b { flex: 1; font-size: 16px; color: var(--text); }
      #efBox .wz-row button { margin: 0; padding: 4px 12px; border-radius: 14px; border: 1.5px solid var(--accent); background: transparent; color: var(--accent); font: 600 12px 'Segoe UI', Arial, sans-serif; }
      #efBox .wz-row button:hover { background: var(--accent); color: #fff; transform: none; }
      #efBox .wz-total { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 14px 18px; border-radius: 14px; background: var(--row-hover); border: 1px solid var(--line); }
      #efBox .wz-total span { font-size: 12px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--muted); }
      #efBox .wz-total strong { font-size: 28px; color: var(--text); }

      /* footer */
      #efBox .wz-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 26px 22px; }
      #efCount { font-size: 13px; color: var(--muted); }
      #efNote { color: #16a34a; font-weight: 700; opacity: 0; transition: opacity .3s; margin-left: 8px; }
      body.dark-mode #efNote { color: #4ade80; }
      #efNote.on { opacity: 1; }
      #efBox .ef-btns { display: flex; gap: 10px; }
      #efBox .ef-btn { margin: 0; padding: 14px 28px; border: none; border-radius: 28px; font: 700 15px 'Segoe UI', Arial, sans-serif; color: #fff; transition: transform .2s, filter .2s, box-shadow .2s; }
      #efBox .ef-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
      #efBox .ef-btn:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }
      #efBox .ef-btn.go { background: linear-gradient(135deg, #2575fc, #6a11cb); box-shadow: 0 8px 20px rgba(37,117,252,.35); }
      #efBox .ef-btn.ghost { background: var(--row-hover); color: var(--text); border: 1px solid var(--line); }
      #efBox .ef-btn[hidden] { display: none; }

      #invoiceTable tr.ef-new td { animation: efFlash 1.8s ease; }
      @keyframes efFlash { from { background: rgba(46,204,113,.4); } to { background: transparent; } }
      @media (prefers-reduced-motion: reduce) { #efBox * { animation: none !important; transition-duration: .01ms !important; } }
      /* ── Icon tiles ── */
      #efBox .wz-ico { position: relative; width: 58px; height: 58px; flex: 0 0 58px; border-radius: 18px; display: grid; place-items: center; color: #fff; font-size: 0;
                       background: var(--ib); box-shadow: 0 10px 22px var(--ig); border: none; animation: wzPop .6s cubic-bezier(.22,1,.36,1); }
      #efBox .wz-ico svg { width: 28px; height: 28px; }
      #efBox .wz-ico svg * { stroke-dasharray: 64; stroke-dashoffset: 0; animation: wzDraw .9s .15s cubic-bezier(.4,0,.2,1) both; }
      #efBox .wz-ico::after { content: ''; position: absolute; inset: -5px; border-radius: 23px; border: 2px solid var(--ig); opacity: 0; animation: wzRing 2.8s ease-out .8s infinite; }
      @keyframes wzDraw { from { stroke-dashoffset: 64; } to { stroke-dashoffset: 0; } }
      @keyframes wzPop { from { transform: scale(.7) rotate(-8deg); opacity: 0; } to { transform: none; opacity: 1; } }
      @keyframes wzRing { 0% { opacity: .6; transform: scale(.94); } 100% { opacity: 0; transform: scale(1.2); } }
      #efBox .wz-c-inv    { --ib: linear-gradient(135deg,#2575fc,#6a11cb); --ig: rgba(37,117,252,.45); }
      #efBox .wz-c-hotel  { --ib: linear-gradient(135deg,#0ea5e9,#0d9488); --ig: rgba(14,165,233,.45); }
      #efBox .wz-c-unit   { --ib: linear-gradient(135deg,#f59e0b,#ef4444); --ig: rgba(245,158,11,.45); }
      #efBox .wz-c-weight { --ib: linear-gradient(135deg,#22c55e,#0d9488); --ig: rgba(34,197,94,.45); }
      #efBox .wz-c-extra  { --ib: linear-gradient(135deg,#ec4899,#8b5cf6); --ig: rgba(236,72,153,.45); }
      #efBox .wz-c-amount { --ib: linear-gradient(135deg,#fbbf24,#f59e0b); --ig: rgba(251,191,36,.5); }
      #efBox .wz-c-date   { --ib: linear-gradient(135deg,#06b6d4,#3b82f6); --ig: rgba(6,182,212,.45); }
      #efBox .wz-c-review { --ib: linear-gradient(135deg,#16a34a,#84cc16); --ig: rgba(22,163,74,.45); }

      /* ── Footer: Back + Complete form, and a round "Next" with a progress ring ── */
      @property --p { syntax: '<number>'; inherits: true; initial-value: 0; }
      #efBox .wz-status { display: flex; align-items: center; gap: 4px; padding: 0 26px; min-height: 22px; font-size: 13px; color: var(--muted); }
      #efBox .wz-foot { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 28px 24px 26px; }
      #efBox .wz-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      #efBox .wz-ghost { margin: 0; display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; border-radius: 24px; border: 1.5px solid var(--line); background: transparent;
                         color: var(--text); font: 600 14px 'Segoe UI', Arial, sans-serif; transition: all .25s; }
      #efBox .wz-ghost svg { width: 16px; height: 16px; }
      #efBox .wz-ghost:hover { border-color: var(--accent); color: var(--accent); transform: translateY(-1px); }
      #efBox .wz-ghost[hidden] { display: none; }
      #efBox .wz-complete { border-color: #16a34a; color: #16a34a; }
      body.dark-mode #efBox .wz-complete { border-color: #4ade80; color: #4ade80; }
      #efBox .wz-complete:hover { background: #16a34a; border-color: #16a34a; color: #fff; }

      #efBox .wz-next { --ring: #6a11cb; margin: 0; padding: 0; border: none; background: none; display: flex; align-items: center; gap: 14px; cursor: pointer;
                        color: var(--text); font: 700 15px 'Segoe UI', Arial, sans-serif; transition: --p .8s cubic-bezier(.4,0,.2,1); }
      #efBox .wz-next.final { --ring: #16a34a; }
      #efBox .wz-next-orb { position: relative; width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; color: #fff;
                            background: linear-gradient(135deg, #2575fc, #6a11cb); box-shadow: 0 10px 24px rgba(37,117,252,.4);
                            transition: background .4s, box-shadow .4s, transform .35s cubic-bezier(.22,1,.36,1); }
      #efBox .wz-next.final .wz-next-orb { background: linear-gradient(135deg, #16a34a, #0d9488); box-shadow: 0 10px 24px rgba(22,163,74,.4); }
      #efBox .wz-next-orb::before { content: ''; position: absolute; inset: -7px; border-radius: 50%; background: conic-gradient(var(--ring) calc(var(--p) * 1%), var(--line) 0);
                                    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px)); mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px)); }
      #efBox .wz-next-orb svg { width: 26px; height: 26px; display: block; }
      #efBox .wz-next-label { transition: letter-spacing .3s, color .3s; }
      #efBox .wz-next:hover .wz-next-orb { transform: scale(1.08); }
      #efBox .wz-next:hover .wz-next-orb svg { animation: wzNudge 1.1s ease-in-out infinite; }
      #efBox .wz-next:hover .wz-next-label { letter-spacing: .6px; color: var(--accent); }
      #efBox .wz-next:active .wz-next-orb { transform: scale(.96); }
      #efBox .wz-next:focus-visible { outline: none; }
      #efBox .wz-next:focus-visible .wz-next-orb { outline: 3px solid var(--accent); outline-offset: 5px; }
      @keyframes wzNudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5px); } }

      @media print { #efOverlay { display: none !important; } }
    `;
    document.head.appendChild(style);

    // ── Which steps exist right now ─────────────────────────────────────────────
    const hasExtra = () => ($('efExtra') ? $('efExtra').value.trim() !== '' : false);
    const stepList = () => ['inv', ...(BH.hotels.length > 1 ? ['hotel'] : []), 'unit', 'weight', 'extra', 'amount', 'date', 'review'];
    const visible = id => id !== 'amount' || hasExtra();
    const activeSteps = () => stepList().filter(visible);

    // ── Read the form like a table row ─────────────────────────────────────────
    const readData = () => ({
        inv: bhDigits($('efInv').value), hotel: $('efHotel').value, unit: $('efUnit').value.trim(), rate: $('efRate').value,
        weight: $('efWeight').value, extra_item: $('efExtra').value.trim(), extra_amount: $('efAmt').value, date: $('efDate').dataset.iso
    });
    function problem(stepId) {
        const d = readData(), tmp = document.createElement('tbody');
        tmp.innerHTML = buildRowHTML(d);
        const tr = tmp.firstElementChild;
        const rows = Array.from(bhTable().rows).filter(r => !rowIsBlank(r)).map(readRow).concat([readRow(tr)]);
        const p = rowProblem(tr, rows.length, rows);
        if (!p) return null;
        const cls = FIELD_ORDER.find(k => p.el && p.el.classList.contains(k));
        const limit = Math.max(...STEP_FIELDS[stepId].map(f => FIELD_ORDER.indexOf(f)));
        if (FIELD_ORDER.indexOf(cls) > limit) return null;          // a later step's problem: not yet
        let msg = p.msg.replace(/^Line \d+:\s*/, ''), tip = p.tip;
        if (/more than one line/.test(msg)) { msg = `Invoice #${d.inv} is already on your list.`; tip = 'Every line needs its own invoice number.'; }
        return { step: CLS_STEP[cls] || stepId, msg: msg.charAt(0).toUpperCase() + msg.slice(1), tip };
    }

    // ── Dropdown list for Unit / Extra Item ────────────────────────────────────
    function combo(input, getItems) {
        const wrap = input.closest('.wz-f');
        const list = document.createElement('div');
        list.className = 'ef-list'; list.hidden = true;
        wrap.appendChild(list);
        let items = [], idx = -1, picking = false;
        const isOpen = () => !list.hidden;

        function render(filter) {
            const f = (filter || '').toLowerCase(), all = getItems();
            items = f ? all.filter(x => x.toLowerCase().includes(f)).sort((a, b) => b.toLowerCase().startsWith(f) - a.toLowerCase().startsWith(f)) : all.slice();
            idx = items.findIndex(x => x.toLowerCase() === f);
            list.innerHTML = items.length
                ? items.map((x, i) => `<div class="ef-opt${i === idx ? ' hl' : ''}" data-i="${i}">${esc(x)}</div>`).join('')
                : '<div class="ef-none">No match — what you type will be used</div>';
        }
        function show(filter) {
            render(filter);
            list.style.top = (input.offsetTop + input.offsetHeight + 4) + 'px';
            list.hidden = false;
            list.querySelector('.hl')?.scrollIntoView({ block: 'nearest' });
        }
        const hide = () => { list.hidden = true; };
        function mark() {
            list.querySelectorAll('.ef-opt').forEach((o, i) => o.classList.toggle('hl', i === idx));
            list.querySelector('.hl')?.scrollIntoView({ block: 'nearest' });
        }
        function pick(i) {
            picking = true; input.value = items[i]; hide();
            input.dispatchEvent(new Event('input', { bubbles: true })); picking = false;
        }

        input.addEventListener('focus', () => show(''));
        input.addEventListener('click', () => { if (!isOpen()) show(''); });
        input.addEventListener('input', () => { if (!picking && document.activeElement === input) show(input.value); });
        input.addEventListener('blur', () => setTimeout(hide, 130));
        input.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault(); e.stopPropagation();
                if (!isOpen()) show(input.value);
                if (!items.length) return;
                idx = (idx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; mark();
            } else if (e.key === 'Enter' && isOpen() && idx >= 0 && items[idx]) {
                e.preventDefault(); e.stopPropagation(); pick(idx); next();
            } else if (e.key === 'Escape' && isOpen()) {
                e.preventDefault(); e.stopPropagation(); hide();
            } else if (e.key === 'Tab') hide();
        });
        list.addEventListener('mousedown', e => {
            e.preventDefault();
            const o = e.target.closest('.ef-opt');
            if (o) { pick(+o.dataset.i); next(); }
        });
    }
    function unitItems() {            // units used most on this invoice come first
        const count = {}, hotel = $('efHotel') ? $('efHotel').value : '';
        Array.from(bhTable().rows).forEach(r => { if (hotel && r.querySelector('.hotel')?.value !== hotel) return; const u = r.querySelector('.unit')?.value.trim(); if (u) count[u] = (count[u] || 0) + 1; });
        const base = ((BH.unitsByHotel && BH.unitsByHotel[hotel]) || BH.units).slice();
        Object.keys(count).forEach(u => { if (!base.some(b => b.toLowerCase() === u.toLowerCase())) base.push(u); });
        return base.map((u, i) => [u, i]).sort((a, b) => ((count[b[0]] || 0) - (count[a[0]] || 0)) || (a[1] - b[1])).map(x => x[0]);
    }

    // ── Calendar ───────────────────────────────────────────────────────────────
    function setDate(s) { const i = $('efDate'); i.dataset.iso = s; i.value = nice(s); i.classList.remove('invalid'); $('efDateErr').innerHTML = ''; }
    function calRender() {
        const L = bhDateLimits(), sel = $('efDate').dataset.iso, v = cal.view;
        const first = new Date(v.getFullYear(), v.getMonth(), 1), offset = (first.getDay() + 6) % 7, days = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
        $('efCalTitle').textContent = MONTHS[v.getMonth()] + ' ' + v.getFullYear();
        const vm = v.getFullYear() * 12 + v.getMonth(), a = parseISO(L.min), z = parseISO(L.max);
        $('efCal').querySelector('[data-nav="-1"]').disabled = vm <= a.getFullYear() * 12 + a.getMonth();
        $('efCal').querySelector('[data-nav="1"]').disabled  = vm >= z.getFullYear() * 12 + z.getMonth();
        let h = '';
        for (let i = 0; i < offset; i++) h += '<span></span>';
        for (let d = 1; d <= days; d++) {
            const s = v.getFullYear() + '-' + pad(v.getMonth() + 1) + '-' + pad(d), out = s < L.min || s > L.max;
            h += `<button type="button" tabindex="-1" class="ef-day${s === sel ? ' sel' : ''}${s === L.today ? ' today' : ''}${s === cal.hl ? ' hl' : ''}" data-d="${s}"${out ? ' disabled' : ''}>${d}</button>`;
        }
        $('efCalDays').innerHTML = h;
    }
    function calStart() { const s = $('efDate').dataset.iso; cal.hl = s; cal.view = parseISO(s); cal.view.setDate(1); calRender(); }
    function calMove(days, months) {
        const L = bhDateLimits(), d = parseISO(cal.hl);
        if (months) { const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + months); d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); }
        else d.setDate(d.getDate() + days);
        let s = iso(d); if (s < L.min) s = L.min; if (s > L.max) s = L.max;
        cal.hl = s; cal.view = parseISO(s); cal.view.setDate(1); calRender();
    }
    function calPick(s) { const L = bhDateLimits(); if (s < L.min || s > L.max) return false; setDate(s); return true; }
    function quickDate(which) { const L = bhDateLimits(), d = parseISO(L.today); if (which === 'yesterday') d.setDate(d.getDate() - 1); if (calPick(iso(d) < L.min ? L.min : iso(d))) next(); }

    // ── Build the form once ────────────────────────────────────────────────────
    function build() {
        if ($('efOverlay')) return;
        const o = document.createElement('div');
        o.id = 'efOverlay';
        o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', 'Add invoice line');
        const L = bhDateLimits(), S = STEPS;
        const head = id => `<div class="wz-head"><div class="wz-ico wz-c-${id}">${svgIcon(id)}</div><div><h4>${S[id].title}</h4><p>${S[id].msg}</p></div></div>`;
        const hint = id => `<div class="wz-hint">${S[id].hint}</div>`;
        const err = id => `<div class="ef-err" id="${id}Err"></div>`;
        o.innerHTML = `
          <div id="efBox">
            <div class="wz-top">
              <div><h3>Add invoice line</h3><p class="wz-sub">Line <b id="wzLine">1</b></p></div>
              <button type="button" id="efX" aria-label="Close">✕</button>
            </div>
            <div class="wz-prog"><div class="wz-bar"><i id="wzFill"></i></div><div class="wz-dots" id="wzDots"></div></div>

            <div class="wz-stage" id="wzStage">
              <div class="wz-step" data-step="inv">${head('inv')}<div class="wz-f"><input id="efInv" inputmode="numeric" maxlength="${BH.invoiceDigits}" placeholder="00000" autocomplete="off">${err('efInv')}</div>${hint('inv')}</div>
              <div class="wz-step" data-step="hotel">${head('hotel')}<div class="wz-f"><select id="efHotel">${bhHotelOptions(BH.hotels.length === 1 ? BH.hotels[0] : '')}</select>${err('efHotel')}</div>${hint('hotel')}</div>
              <div class="wz-step" data-step="unit">${head('unit')}<div class="wz-f"><input id="efUnit" class="ef-combo" maxlength="50" placeholder="Pick or type the unit" autocomplete="off">${err('efUnit')}</div>${hint('unit')}</div>
              <div class="wz-step" data-step="weight">${head('weight')}<div class="wz-f"><input id="efWeight" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00">${err('efWeight')}</div>${hint('weight')}<div class="wz-live" id="wzLive"></div></div>
              <div class="wz-step" data-step="extra">${head('extra')}<div class="wz-f"><input id="efExtra" class="ef-combo" maxlength="255" placeholder="(optional) e.g. Carpet" autocomplete="off">${err('efExtra')}</div>${hint('extra')}</div>
              <div class="wz-step" data-step="amount">${head('amount')}<div class="wz-f"><input id="efAmt" type="number" step="0.01" min="0" inputmode="decimal" placeholder="0.00">${err('efAmt')}</div>${hint('amount')}</div>
              <div class="wz-step" data-step="date">${head('date')}
                <div class="wz-f"><input id="efDate" readonly autocomplete="off" data-iso="${L.today}" value="${nice(L.today)}">${err('efDate')}</div>
                <div class="ef-cal" id="efCal">
                  <div class="ef-cal-head"><button type="button" class="ef-nav" data-nav="-1" tabindex="-1" aria-label="Previous month">‹</button><strong id="efCalTitle"></strong><button type="button" class="ef-nav" data-nav="1" tabindex="-1" aria-label="Next month">›</button></div>
                  <div class="ef-dow"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
                  <div class="ef-days" id="efCalDays"></div>
                  <div class="ef-cal-foot"><button type="button" class="ef-chip" data-quick="today" tabindex="-1">Today</button><button type="button" class="ef-chip" data-quick="yesterday" tabindex="-1">Yesterday</button></div>
                </div></div>
              <div class="wz-step" data-step="review">${head('review')}<div class="wz-rev" id="wzRev"></div><div class="wz-total"><span>Line total</span><strong id="efTotal">R 0.00</strong></div>${hint('review')}</div>
            </div>
            <select id="efRate" hidden disabled>${bhRateOptions(Object.keys(BH.rates)[0])}</select>

            <div class="wz-status"><span id="efCount">0 lines added</span><span id="efNote"></span></div>
            <div class="wz-foot">
              <div class="wz-left">
                <button type="button" class="wz-ghost" id="efBack">← Back</button>
                <button type="button" class="wz-ghost wz-complete" id="efComplete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>Complete form</button>
              </div>
              <button type="button" class="wz-next" id="efNext"><span class="wz-next-label" id="efNextLabel">Next</span><span class="wz-next-orb"><span id="efNextIco"></span></span></button>
            </div>
          </div>`;
        document.body.appendChild(o);

        $('efX').onclick = close;
        $('efBack').onclick = back;
        $('efNext').onclick = next;
        $('efComplete').onclick = complete;
        o.addEventListener('mousedown', e => { if (e.target === o) close(); });
        o.addEventListener('input', onInput);
        o.addEventListener('keydown', onKey);
        $('wzDots').addEventListener('click', e => { const b = e.target.closest('.wz-dot.done'); if (b) { fromReview = true; go(b.dataset.step); } });
        $('wzRev').addEventListener('click', e => { const b = e.target.closest('[data-edit]'); if (b) { fromReview = true; go(b.dataset.edit); } });

        combo($('efUnit'), unitItems);
        combo($('efExtra'), () => BH.extraItems);
        $('efHotel').addEventListener('change', () => { if (current === 'hotel' && $('efHotel').value) next(); });

        // calendar
        const dateInp = $('efDate');
        dateInp.addEventListener('keydown', e => {
            const k = e.key;
            if (k === 'ArrowLeft' && !e.altKey) calMove(-1); else if (k === 'ArrowRight') calMove(1);
            else if (k === 'ArrowUp') calMove(-7); else if (k === 'ArrowDown') calMove(7);
            else if (k === 'PageUp') calMove(0, -1); else if (k === 'PageDown') calMove(0, 1);
            else if (k === 't' || k === 'T') { quickDate('today'); }
            else if (k === 'Enter') { calPick(cal.hl); next(); }
            else return;
            e.preventDefault(); e.stopPropagation();
        });
        $('efCal').addEventListener('mousedown', e => {
            e.preventDefault();
            const nav = e.target.closest('[data-nav]'), day = e.target.closest('.ef-day'), q = e.target.closest('[data-quick]');
            if (nav && !nav.disabled) { cal.view.setMonth(cal.view.getMonth() + (+nav.dataset.nav)); calRender(); }
            else if (day && !day.disabled) { calPick(day.dataset.d); next(); }
            else if (q) quickDate(q.dataset.quick);
        });
    }

    // ── Typing: digits-only invoice number (+ auto move on), live total ───────
    function liveTotal() {
        const code = $('efRate').value, price = BH.rates[code] ? BH.rates[code].price : 0;
        const c = Math.round(bhNum($('efWeight').value) * price * 100) + Math.round(bhNum($('efAmt').value) * 100);
        $('efTotal').textContent = money(c / 100);
        const w = bhNum($('efWeight').value);
        $('wzLive').innerHTML = w > 0 ? `${w} kg × R${price.toFixed(2)} = <b>${money(Math.round(w * price * 100) / 100)}</b>` : `Rate: R${price.toFixed(2)} per kg`;
    }
    function onInput(e) {
        const t = e.target;
        if (!t.id || !t.id.startsWith('ef')) return;
        t.classList.remove('invalid');
        const er = $(t.id + 'Err'); if (er) er.innerHTML = '';
        if (t.id === 'efInv') {
            formatInvoiceNumber(t);
            clearTimeout(autoTimer);
            if (t.value.length === BH.invoiceDigits && current === 'inv') { const v = t.value; autoTimer = setTimeout(() => { if (current === 'inv' && $('efInv').value === v) { autoAt = Date.now(); next(); } }, 260); }
        }
        if (t.id === 'efExtra') refreshDots();
        liveTotal();
    }
    function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); back(); return; }
        if (e.key !== 'Enter' || e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        if (Date.now() - autoAt < 700) return;      // an Enter pressed just after the automatic move is ignored
        next();
    }

    // ── Moving between steps ───────────────────────────────────────────────────
    function refreshDots() {
        const list = stepList(), idx = Math.max(0, list.indexOf(current));
        $('wzDots').innerHTML = list.map((id, i) => {
            const done = i <= maxIdx && id !== current && visible(id) && id !== 'review';
            return `<button type="button" class="wz-dot${done ? ' done' : ''}${id === current ? ' on' : ''}${visible(id) ? '' : ' skip'}" data-step="${id}" tabindex="-1"><b>${done ? '✓' : i + 1}</b><span>${STEPS[id].dot}</span></button>`;
        }).join('');
        $('wzFill').style.width = (idx / (list.length - 1) * 100) + '%';
    }
    function go(id) {
        current = id;
        const list = stepList(), idx = list.indexOf(id);
        maxIdx = Math.max(maxIdx, idx);
        document.querySelectorAll('#wzStage .wz-step').forEach(s => s.classList.toggle('on', s.dataset.step === id));
        refreshDots();
        $('efBack').hidden = idx === 0;
        updateNext(id, idx, list.length);
        if (id === 'date') calStart();
        if (id === 'review') renderReview();
        liveTotal();
        setTimeout(() => { const el = $(STEPS[id].focus); el && el.focus && el.focus(); if (id === 'hotel' && el) { try { el.showPicker(); } catch (e) {} } if (el && el.select && id !== 'date' && el.tagName === 'INPUT') el.select(); }, 60);
    }
    function renderReview() {
        const d = readData(), price = BH.rates[d.rate] ? BH.rates[d.rate].price : 0, row = (label, val, step) => `<div class="wz-row"><span>${label}</span><b>${val}</b><button type="button" data-edit="${step}">Edit</button></div>`;
        $('wzRev').innerHTML =
            row('Invoice no', esc(d.inv || '—'), 'inv') +
            (BH.hotels.length > 1 ? row('Hotel', esc(d.hotel || '—'), 'hotel') : '') +
            row('Unit', esc(d.unit || '—'), 'unit') +
            row('Weight', esc(d.weight || '0') + ' kg × R' + price.toFixed(2), 'weight') +
            row('Extra', d.extra_item ? esc(d.extra_item) + ' · ' + money(bhNum(d.extra_amount)) : 'None', 'extra') +
            row('Date', esc(nice(d.date)), 'date');
    }
    function showError(p) {
        if (p.step !== current) go(p.step);
        const fieldId = { inv: 'efInv', hotel: 'efHotel', unit: 'efUnit', weight: 'efWeight', extra: 'efExtra', amount: 'efAmt', date: 'efDate' }[p.step];
        setTimeout(() => {
            const el = $(fieldId); el.classList.add('invalid');
            $(fieldId + 'Err').innerHTML = esc(p.msg) + (p.tip ? `<em>${esc(p.tip)}</em>` : '');
            const stepEl = document.querySelector(`#wzStage .wz-step[data-step="${p.step}"]`);
            stepEl.classList.remove('shake'); void stepEl.offsetWidth; stepEl.classList.add('shake');
        }, 70);
    }
    function back() {
        const list = activeSteps(), i = list.indexOf(current);
        if (i > 0) { fromReview = false; go(list[i - 1]); }
    }
    async function next() {
        clearTimeout(autoTimer);
        const id = current;
        if (id === 'hotel' && !$('efHotel').value) { try { $('efHotel').focus(); $('efHotel').showPicker(); } catch (e) {} return; }   // nothing picked yet: just open the list
        if (id === 'extra' && !hasExtra()) $('efAmt').value = '';           // nothing extra → skip the amount
        if (id === 'inv') {                                                    // wait for the database check
            const v = bhDigits($('efInv').value);
            if (v.length === BH.invoiceDigits) await new Promise(res => { checkInvoiceTaken(v, res); setTimeout(res, 1600); });
            if (bhTaken[v] === true) { showError({ step: 'inv', msg: `Invoice #${v} already exists in the database.`, tip: 'Choose a different invoice number.' }); return; }
            if (v && Array.from(bhTable().rows).some(r => !rowIsBlank(r) && bhDigits(r.querySelector('.inv').value) === v)) { showError({ step: 'inv', msg: `Invoice #${v} is already on your list.`, tip: 'Every line needs its own invoice number.' }); return; }
        }
        const p = problem(fromReview || id === 'review' ? 'review' : id);
        if (p) { showError(p); return; }
        if (id === 'review') { add(); return; }
        if (fromReview) { go('review'); fromReview = false; return; }
        const list = activeSteps(), i = list.indexOf(id);
        let t = list[Math.min(i + 1, list.length - 1)];
        if (t === 'hotel' && $('efHotel').value) t = list[Math.min(i + 2, list.length - 1)];   // hotel already chosen → skip it
        go(t);
    }

    // Suggest the next invoice number (highest in the table + 1)
    function suggestInv() {
        const nums = Array.from(bhTable().rows).map(r => parseInt(r.querySelector('.inv')?.value, 10)).filter(n => n > 0);
        if (!nums.length) return '';
        const n = Math.max(...nums) + 1;
        return n <= Math.pow(10, BH.invoiceDigits) - 1 ? String(n).padStart(BH.invoiceDigits, '0') : '';
    }

    // ── Add the line to the table ──────────────────────────────────────────────
    function add() {
        const p = problem('review');
        if (p) { showError(p); return; }
        const d = readData(), tmp = document.createElement('tbody');
        tmp.innerHTML = buildRowHTML(d);
        const clean = readRow(tmp.firstElementChild);
        Array.from(bhTable().rows).filter(rowIsBlank).forEach(r => r.remove());
        const row = addRow(clean);
        row.classList.add('ef-new'); setTimeout(() => row.classList.remove('ef-new'), 1900);
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });

        added++;
        $('efCount').textContent = added + ' line' + (added === 1 ? '' : 's') + ' added';
        const note = $('efNote'), total = $('efTotal').textContent;
        note.textContent = `✓ #${clean.inv} added · ${total}`;
        note.classList.add('on'); clearTimeout(noteTimer); noteTimer = setTimeout(() => note.classList.remove('on'), 3000);

        resetForNext();
    }
    function resetForNext() {                       // hotel and date stay; invoice number is suggested
        ['efUnit', 'efWeight', 'efExtra', 'efAmt'].forEach(id => { $(id).value = ''; $(id).classList.remove('invalid'); });
        $('wzLine').textContent = added + 1;
        $('efInv').value = suggestInv();
        maxIdx = 0; fromReview = false;
        go('inv');
    }

    function updateNext(id, idx, n) {
        const b = $('efNext'), final = id === 'review';
        b.classList.toggle('final', final);
        $('efNextLabel').textContent = final ? 'Add line' : 'Next';
        $('efNextIco').innerHTML = final ? CHECK : ARROW;
        b.style.setProperty('--p', Math.round((idx + 1) / n * 100));
    }
    const dirty = () => ['efUnit', 'efWeight', 'efExtra', 'efAmt'].some(id => $(id).value.trim() !== '') || ($('efInv').value !== '' && $('efInv').value !== suggestInv());
    function finish() {
        close();
        if (added) showPopup('success', `${added} line${added === 1 ? '' : 's'} added to the invoice.`, 'Check the table, then Print and Save.', 5000, null, 'Form complete');
    }
    function complete() {                          // Complete form: add the line on the review step, or close
        if (current === 'review' && !problem('review')) { add(); finish(); return; }
        if (dirty()) {
            showConfirmDialog('Unfinished line', 'This line has not been added yet. Complete the form and discard it?', 'Yes, discard it', 'Keep editing', finish);
            return;
        }
        finish();
    }

    function open() {
        build();
        added = 0; maxIdx = 0; fromReview = false;
        $('efCount').textContent = '0 lines added'; $('efNote').classList.remove('on'); $('wzLine').textContent = '1';
        ['efInv', 'efHotel', 'efUnit', 'efWeight', 'efExtra', 'efAmt', 'efDate'].forEach(id => { $(id).classList.remove('invalid'); const e = $(id + 'Err'); if (e) e.innerHTML = ''; });
        $('efInv').value = suggestInv();
        $('efOverlay').classList.add('on');
        go('inv');
    }
    function close() {
        $('efOverlay')?.classList.remove('on');
        document.activeElement?.blur?.();
    }

    document.addEventListener('DOMContentLoaded', () => {
        $('formBtn')?.addEventListener('click', open);
        // Opens by itself on a fresh, empty page (not right after a save or a failed save)
        if (AUTO_OPEN && !window._pendingPopup && !window._restoreRows) {
            setTimeout(() => { if (Array.from(bhTable().rows).every(rowIsBlank)) open(); }, 350);
        }
    });
})();
