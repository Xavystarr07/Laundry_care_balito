<?php
// ============================================================
//  monthly_statement/monthly_statement.php — BALLITO HILLS statement
//  Shows automatically (no buttons to press). Pick two dates to change the period.
//  Same layout as the Laundry Care monthly statement.
// ============================================================
require_once __DIR__ . '/../php/session.php';
bhSessionStart();
require_once __DIR__ . '/../php/settings.php';
require_once __DIR__ . '/../php/db.php';
require_once __DIR__ . '/../php/activeTable.php';
require_once __DIR__ . '/php/range.php';
require_once __DIR__ . '/php/queries.php';

$error = null;
$active = null;
$error  = null;
$active = null;
try {
    $pdo = bhConnect();
    [$from, $to] = bhResolveRange($pdo);
    $summary = bhUnitSummary($pdo, $from, $to);
    $lines   = bhStatementLines($pdo, $from, $to);
    $active  = bhActiveTable($pdo);
} catch (Exception $e) {
    error_log('bh statement: ' . $e->getMessage());
    $error = 'Could not load the statement. Check config.php and that the balito tables exist.';
    $from = $to = date('Y-m-d');
    $summary = ['rows' => [], 'total' => 0];
    $lines = [];
}
$periodText = bhPeriodText($from, $to);
$flags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Monthly Statement — BALLITO HILLS</title>

    <!-- ── CSS files — one file per concern ── -->
    <link rel="stylesheet" href="css/base.css">     <!-- body, fonts, headings   -->
    <link rel="stylesheet" href="css/header.css">   <!-- top header layout       -->
    <link rel="stylesheet" href="css/table.css">    <!-- statement table         -->
    <link rel="stylesheet" href="css/buttons.css">  <!-- all buttons             -->
    <link rel="stylesheet" href="css/forms.css">    <!-- date pickers            -->
    <link rel="stylesheet" href="css/print.css">    <!-- print-only styles       -->
</head>
<body>

<script>
window.BH  = <?php echo json_encode(bhClientConfig(), $flags); ?>;
window.BHS = <?php echo json_encode([
    'from' => $from, 'to' => $to, 'periodText' => $periodText,
      'recipient' => BH_STATEMENT_TO, 'lines' => $lines,
      'activeTable' => $active, 'nextTable' => $active ? bhNextTable($active) : null,
      'canClose' => $active && substr($from, 0, 7) === bhTableMonth($active),
], $flags); ?>;
</script>

<!-- Business header + recipient + title: edit partials/header.php -->
<div style="height:18px"></div>

<!-- ── Statement period: pick two dates ── -->
<div class="date-period-container">
    <p class="period-label">Statement Period</p>

    <div class="range-controls no-print">
        <button type="button" class="chip" id="prevMonthBtn">‹ Previous month</button>
        <button type="button" class="chip" id="thisMonthBtn">This month</button>
        <button type="button" class="chip" id="nextMonthBtn">Next month ›</button>
    </div>
    <div class="range-inputs no-print">
        <label>From <input type="date" id="dateFrom" value="<?= $h($from) ?>"></label>
        <label>To   <input type="date" id="dateTo"   value="<?= $h($to) ?>"></label>
    </div>

    <div id="periodText" class="period-text"><?= $h($periodText) ?></div>
</div>

<?php if ($error): ?>
    <p class="load-error"><?= $h($error) ?></p>
<?php endif; ?>

<!-- ══════════ STATEMENT TABLE — shown automatically ══════════ -->
<table id="statementTable">
    <thead>
        <tr>
            <th>Hotel Name</th>
            <th>Hotel Unit</th>
            <th>Total</th>
        </tr>
    </thead>
    <tbody>
        <?php if (!empty($summary['rows'])): ?>
            <?php foreach ($summary['rows'] as $row): ?>
                <tr>
                    <td><?= $h($row['HotelName']) ?></td>
                    <td><?= $h($row['HotelNumber']) ?></td>
                    <td>R <?= number_format($row['UnitTotal'], 2) ?></td>
                </tr>
            <?php endforeach; ?>
            <tr class="grand-total-row">
                <td colspan="2"><strong>Grand Total</strong></td>
                
                <td><strong>R <?= number_format($summary['total'], 2) ?></strong></td>
            </tr>
            <?php include 'partials/banking.php'; ?>
        <?php else: ?>
            <tr><td colspan="3">No invoices found for this period.</td></tr>
        <?php endif; ?>
    </tbody>
</table>

<!-- ── Buttons ── -->
<div class="action-row no-print">
    <button type="button" class="print-btn" id="printBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print Statement
    </button>
    <button type="button" class="print-btn" id="pdfBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        Download PDF
    </button>
    <button type="button" class="excel-btn" id="excelBtn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Download Excel
    </button>
    <button type="button" class="excel-btn" id="emailBtn" style="background:linear-gradient(to right,#ea4335,#c5221f)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/></svg>
        Email Statement
    </button>
</div>

<br>
<button class="back-button no-print" type="button" onclick="window.location.href='../invoice_generator.php'">← Back to Invoice Generator</button>

<!-- ── JS files — one file per concern ── -->
<script src="js/dateRange.js"></script>
<script src="js/print.js"></script>
<script src="js/closeMonth.js"></script>
<script src="js/xlsxWriter.js"></script>
  <script src="js/excelExport.js"></script>
  <script src="js/pdfWriter.js"></script>
  <script src="js/pdfExport.js"></script>
  <script src="js/emailStatement.js"></script>

</body>
</html>
