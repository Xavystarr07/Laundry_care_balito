// ============================================================
//  js/emailStatement.js — "Email Statement" button
//  Downloads the Excel + PDF, then shows the message ready to send:
//  To / CC / subject / message come from php/settings.php (BH_EMAIL).
//  A web page cannot attach files by itself, so you attach the two downloaded files.
// ============================================================
(function () {
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const fill = (t, v) => String(t).replace(/\{month\}/g, v.month).replace(/\{period\}/g, v.period);

    function values() {
        const S = window.BHS, [y, m] = S.from.split('-').map(Number);
        return { month: MONTHS[m - 1] + ' ' + y, period: S.periodText };
    }

    function style() {
        if (document.getElementById('emStyle')) return;
        const s = document.createElement('style');
        s.id = 'emStyle';
        s.textContent = `
          #emOverlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:99999; display:flex; align-items:center; justify-content:center; padding:12px; }
          #emBox { background:#fff; color:#1f2937; border-radius:20px; padding:26px 28px; width:560px; max-width:100%; max-height:92vh; overflow:auto;
                   font-family:'Segoe UI',Arial,sans-serif; text-align:left; box-shadow:0 20px 50px rgba(0,0,0,.35); }
          #emBox h3 { margin:0 0 6px; font-size:19px; color:#111; text-transform:none; letter-spacing:0; text-shadow:none; }
          #emBox .note { font-size:13px; color:#4b5563; margin:0 0 16px; line-height:1.5; }
          #emBox label { display:block; font-size:11px; font-weight:700; letter-spacing:1px; text-transform:uppercase; color:#6b7280; margin:10px 0 4px; }
          #emBox input, #emBox textarea { width:100%; box-sizing:border-box; border:1.5px solid #d1d5db; border-radius:10px; padding:9px 12px; font:14px 'Segoe UI',Arial,sans-serif; color:#111; background:#fff; }
          #emBox textarea { min-height:150px; resize:vertical; line-height:1.5; }
          #emBox .row { display:flex; gap:10px; flex-wrap:wrap; margin-top:18px; }
          #emBox button { margin:0; border:none; border-radius:22px; padding:11px 20px; font:600 14px 'Segoe UI',Arial,sans-serif; color:#fff; }
          #emBox .go   { background:linear-gradient(135deg,#ea4335,#c5221f); }
          #emBox .mail { background:linear-gradient(135deg,#2575fc,#1a4fb0); }
          #emBox .copy { background:#4b5563; }
          #emBox .close{ background:#eef0f4; color:#374151; margin-left:auto; }
          #emBox button:hover { transform:translateY(-1px); filter:brightness(1.07); }
        `;
        document.head.appendChild(s);
    }

    function open() {
        const E = BH.email, v = values();
        style();
        document.getElementById('emOverlay')?.remove();
        const o = document.createElement('div');
        o.id = 'emOverlay';
        o.innerHTML = `
          <div id="emBox">
            <h3>Email the statement</h3>
            <p class="note">The <strong>Excel</strong> and <strong>PDF</strong> were just downloaded. Open the email below, then attach both files from your Downloads folder.</p>
            <label>To</label><input id="emTo" value="">
            <label>CC</label><input id="emCc" value="">
            <label>Subject</label><input id="emSub" value="">
            <label>Message</label><textarea id="emBody"></textarea>
            <div class="row">
              <button type="button" class="go" id="emGmail">Open in Gmail</button>
              <button type="button" class="mail" id="emMailto">Open mail app</button>
              <button type="button" class="copy" id="emCopy">Copy message</button>
              <button type="button" class="close" id="emClose">Close</button>
            </div>
          </div>`;
        document.body.appendChild(o);
        o.querySelector('#emTo').value   = E.to;
        o.querySelector('#emCc').value   = E.cc;
        o.querySelector('#emSub').value  = fill(E.subject, v);
        o.querySelector('#emBody').value = fill(E.body, v);

        const f = id => o.querySelector(id).value;
        const q = () => ({ to: f('#emTo'), cc: f('#emCc'), su: f('#emSub'), body: f('#emBody') });

        o.querySelector('#emGmail').onclick = () => {
            const m = q();
            window.open('https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.to) + '&cc=' + encodeURIComponent(m.cc) +
                        '&su=' + encodeURIComponent(m.su) + '&body=' + encodeURIComponent(m.body), '_blank');
        };
        o.querySelector('#emMailto').onclick = () => {
            const m = q();
            window.location.href = 'mailto:' + encodeURIComponent(m.to).replace(/%40/g, '@') + '?cc=' + encodeURIComponent(m.cc) +
                                   '&subject=' + encodeURIComponent(m.su) + '&body=' + encodeURIComponent(m.body);
        };
        o.querySelector('#emCopy').onclick = function () {
            navigator.clipboard?.writeText(f('#emBody')).then(() => { this.textContent = 'Copied ✓'; });
        };
        o.querySelector('#emClose').onclick = () => o.remove();
        o.addEventListener('click', e => { if (e.target === o) o.remove(); });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('emailBtn')?.addEventListener('click', () => {
            downloadExcel();
            setTimeout(downloadPdf, 700);        // second download shortly after the first
            setTimeout(open, 900);
        });
    });
})();
