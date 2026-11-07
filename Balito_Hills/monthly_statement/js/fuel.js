(function () {
    const btn = document.getElementById('fuelBtn');
    if (!btn || !window.FUEL) return;
    btn.onclick = () => {
        const F = window.FUEL, o = document.createElement('div');
        const inp = 'width:100%;box-sizing:border-box;padding:9px;margin:4px 0 12px;border:1.5px solid #d1d5db;border-radius:10px;font-size:15px';
        const bt = 'border:none;border-radius:20px;padding:10px 18px;font-weight:700;color:#fff;cursor:pointer;';
        o.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:12px';
        o.innerHTML = `<div style="background:#fff;color:#1f2937;border-radius:18px;padding:24px;width:320px;max-width:100%;font:14px 'Segoe UI',Arial,sans-serif;text-align:left">
            <b style="font-size:18px">⛽ Fuel levy</b><br><br>
            Days<input id="fuD" type="number" min="0" step="1" value="${F.days}" style="${inp}">
            Rate per day (R)<input id="fuR" type="number" min="0" step="0.01" value="${F.rate}" style="${inp}">
            <div id="fuT" style="font-weight:700;margin-bottom:14px"></div>
            <button type="button" id="fuS" style="${bt}background:#16a34a">Save</button>
            <button type="button" id="fuC" style="${bt}background:#6b7280">Cancel</button></div>`;
        document.body.appendChild(o);
        const d = o.querySelector('#fuD'), r = o.querySelector('#fuR'), t = o.querySelector('#fuT');
        const calc = () => t.textContent = 'Total: R ' + ((parseInt(d.value) || 0) * (parseFloat(r.value) || 0)).toFixed(2);
        d.oninput = r.oninput = calc; calc();
        o.querySelector('#fuC').onclick = () => o.remove();
        o.querySelector('#fuS').onclick = () => {
            fetch('php/save_fuel.php', { method: 'POST', body: new URLSearchParams({ id: F.id, days: d.value || 0, rate: r.value || 0 }) })
                .then(x => x.json()).then(j => j.ok ? location.reload() : alert(j.msg))
                .catch(() => alert('Could not save fuel. Check your connection.'));
        };
    };
})();