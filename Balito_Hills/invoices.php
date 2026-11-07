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

<div class="filters">
    <div class="frow">
        <input type="text" id="fQ" placeholder="Search: invoice no, hotel, unit, extra item" autocomplete="off">
    </div>
    <div class="frow">
        <label>Hotel <select id="fHotel"><option value="">All hotels</option><?php foreach (BH_HOTELS as $hn): ?><option value="<?= htmlspecialchars($hn, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($hn, ENT_QUOTES, 'UTF-8') ?></option><?php endforeach; ?></select></label>
        <label>Unit <input type="text" id="fUnit" list="fUnits" placeholder="All units" autocomplete="off"></label>
        <label>Extras <select id="fExtra"><option value="">Any</option><option value="yes">With extra item</option><option value="no">No extra item</option></select></label>
        <label>From <input type="date" id="fFrom"></label>
        <label>To <input type="date" id="fTo"></label>
    </div>
    <div class="frow">
        <label>Sort by <select id="fSort"><option value="date">Date</option><option value="inv">Invoice no</option><option value="hotel">Hotel</option><option value="unit">Unit</option><option value="weight">Weight</option><option value="extra">Extra amount</option><option value="total">Total</option></select></label>
        <label>Order <select id="fDir"><option value="desc">High → Low ↓</option><option value="asc">Low → High ↑</option></select></label>
        <span class="fbtns">
            <button type="button" class="pill go" id="fGo">Search</button>
            <button type="button" class="pill ghost" id="fReset">Reset</button>
            <button type="button" class="pill new" onclick="window.location.href='invoice_generator.php'">+ New Invoice</button>
        </span>
    </div>
    <datalist id="fUnits"></datalist>
</div>
<div class="count" id="count"></div>

<div class="table-wrap">
    <table id="linesTable">
        <thead>
            <tr>
                <th>Date</th><th>Inv No</th><th>Hotel</th><th>Unit</th><th>Rate</th>
                <th class="num">Weight</th><th>Extra Item</th><th class="num">Amount</th><th class="num">Total</th>
                <th>Month table</th><th></th>
            </tr>
        </thead>
        <tbody id="linesBody"><tr><td colspan="11" class="empty">Loading…</td></tr></tbody>
    </table>
</div>

<datalist id="bhUnits"><?php foreach (BH_UNITS as $u): ?><option value="<?= htmlspecialchars($u, ENT_QUOTES, 'UTF-8') ?>"><?php endforeach; ?></datalist>
  <?php $fabs = ['statements']; $fabPlain = true; include 'partials/fabs.php'; ?>
<script src="js/invoiceFormat.js"></script>
<script src="js/navigation.js"></script>
<script src="js/themeToggle.js"></script>
<script src="js/pdfWriter.js"></script>
<script src="js/pdfInvoice.js"></script>
<script src="js/invoicesPage.js"></script>
</body>
</html>
