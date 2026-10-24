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
    <input type="text" id="fQ" placeholder="Invoice no, unit or extra item" autocomplete="off">
    <label>From <input type="date" id="fFrom"></label>
    <label>To <input type="date" id="fTo"></label>
    <button type="button" class="pill go" id="fGo">Search</button>
    <button type="button" class="pill ghost" id="fReset">Reset</button>
    <button type="button" class="pill new" onclick="window.location.href='invoice_generator.php'">+ New Invoice</button>
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
<script src="js/invoicesPage.js"></script>
</body>
</html>
