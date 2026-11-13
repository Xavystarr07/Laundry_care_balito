<?php
// ============================================================
//  invoices.php — Saved invoices: search, edit, delete
//  Data comes from php/lines_list.php; changes go through
//  php/line_update.php / php/line_delete.php (both write to bh_audit).
// ============================================================
require_once 'php/session.php';
bhSessionStart();
require_once 'php/settings.php';
$flags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
$hx = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Saved Invoices — Ballito Hills</title>
    <link rel="stylesheet" href="html_css/base.css">
    <link rel="stylesheet" href="html_css/header.css">
    <link rel="stylesheet" href="html_css/table.css">
    <link rel="stylesheet" href="html_css/inputs.css">
    <link rel="stylesheet" href="html_css/buttons.css">
    <link rel="stylesheet" href="html_css/invoices.css">
    <link rel="stylesheet" href="html_css/fab.css">
</head>
<body>
<script>window.BH = <?php echo json_encode(bhClientConfig(), $flags); ?>;</script>

<div style="height:18px"></div>

<h2 class="page-title">Saved Invoices</h2>

<div class="toolbar">
    <div class="searchbar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="fQ" placeholder="Search invoice no, hotel, unit, extra item" autocomplete="off">
        <button type="button" id="fGo">Search</button>
    </div>
    <div class="sortbox">
        <span>Sort by</span>
        <select id="fSort"><option value="date">Date</option><option value="inv">Invoice no</option><option value="hotel">Hotel</option><option value="unit">Unit</option><option value="weight">Weight</option><option value="extra">Extra amount</option><option value="total">Total</option></select>
        <button type="button" id="fDirBtn" aria-label="Switch order">↓</button>
        <input type="hidden" id="fDir" value="desc">
    </div>
    <button type="button" class="tbtn" id="fToggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/></svg>
        Filter by <em class="badge" id="fBadge" hidden>0</em>
    </button>
    <button type="button" class="tbtn" onclick="window.location.href='audit.php'">Audit log</button>
</div>

<div id="fOverlay"></div>
<aside id="fSide" aria-label="Filters">
    <div class="fs-head"><h3>Filter by</h3><button type="button" id="fClose" aria-label="Close">✕</button></div>
    <div class="fs-body">
        <label>Hotel
            <select id="fHotel"><option value="">All hotels</option><?php foreach (BH_HOTELS as $hn): ?><option value="<?= $hx($hn) ?>"><?= $hx($hn) ?></option><?php endforeach; ?></select>
        </label>
        <label>Unit <input type="text" id="fUnit" list="fUnits" placeholder="All units" autocomplete="off"></label>
        <label>Extras
            <select id="fExtra"><option value="">Any</option><option value="yes">With extra item</option><option value="no">No extra item</option></select>
        </label>
        <div class="fs-dates">
            <label>From <input type="date" id="fFrom"></label>
            <label>To <input type="date" id="fTo"></label>
        </div>
    </div>
    <div class="fs-foot">
        <button type="button" class="pill ghost" id="fReset">Clear all</button>
        <button type="button" class="pill go" id="fApply">Show results</button>
    </div>
    <datalist id="fUnits"></datalist>
</aside>

<div class="count" id="count"></div>
<details class="sum" id="sumBox"></details>

<div class="table-wrap">
    <table id="linesTable">
        <thead>
            <tr>
                <th>Date</th><th>Inv No</th><th>Hotel</th><th>Unit</th><th>Rate</th>
                <th class="num">Weight</th><th>Extra Item</th><th class="num">Amount</th><th class="num">Total</th>
                <th>Statement</th><th></th>
            </tr>
        </thead>
        <tbody id="linesBody"><tr><td colspan="11" class="empty">Loading…</td></tr></tbody>
    </table>
</div>

<datalist id="bhUnits"><?php foreach (BH_UNITS as $u): ?><option value="<?= $hx($u) ?>"><?php endforeach; ?></datalist>
<?php $fabs = ['new', 'statements']; $fabPlain = true; include 'partials/fabs.php'; ?>
<script src="js/invoiceFormat.js"></script>
<script src="js/navigation.js"></script>
<script src="js/themeToggle.js"></script>
<script src="js/pdfWriter.js"></script>
<script src="js/pdfInvoice.js"></script>
<script src="js/invoicesPage.js"></script>
</body>
</html>