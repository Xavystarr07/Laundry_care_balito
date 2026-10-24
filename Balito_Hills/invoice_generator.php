<?php
// ============================================================
//  invoice_generator.php — BALLITO HILLS main entry point
//  Edit CSS links below to add/remove stylesheets
//  Edit JS links at the bottom to add/remove scripts
//  Rates / hotels / business details: php/settings.php
// ============================================================
require_once 'php/session.php';
bhSessionStart();
require_once 'php/settings.php';
require_once 'php/undo_helper.php';

$undo    = undoAvailable();
$popup   = $_SESSION['popup']        ?? null; unset($_SESSION['popup']);
$restore = $_SESSION['restore_rows'] ?? null; unset($_SESSION['restore_rows']);
$flags   = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BALLITO HILLS Invoice</title>

    <!-- ── CSS files — one file per concern ── -->
    <link rel="stylesheet" href="html_css/base.css">     <!-- body, colours (light + dark) -->
    <link rel="stylesheet" href="html_css/header.css">   <!-- top header layout            -->
    <link rel="stylesheet" href="html_css/table.css">    <!-- invoice table + ✕ buttons    -->
    <link rel="stylesheet" href="html_css/inputs.css">   <!-- fields, selects              -->
    <link rel="stylesheet" href="html_css/buttons.css">  <!-- all buttons                  -->
    <link rel="stylesheet" href="html_css/print.css">    <!-- Ctrl+P safety                -->
<link rel="stylesheet" href="html_css/fab.css">

</head>
<body>

<!-- Settings from php/settings.php → JS (single source of truth) -->
<script>window.BH = <?php echo json_encode(bhClientConfig(), $flags); ?>;</script>
<?php if ($undo): ?>
<script>window._undoAvail = <?php echo json_encode($undo, $flags); ?>;</script>
<?php endif; ?>
<?php if ($popup): ?>
<script>window._pendingPopup = <?php echo json_encode($popup, $flags); ?>;</script>
<?php endif; ?>
<?php if ($restore): ?>
<script>window._restoreRows = <?php echo json_encode($restore, $flags); ?>;</script>
<?php endif; ?>

<!-- Business header: edit php/settings.php -->
<div style="height:18px"></div>

<form id="invoiceForm" method="post" action="php/invoice_handler.php">

    <div class="table-wrap">
        <table>
            <thead>
                <tr>
                    <th class="c-inv">Inv No</th>
                    <th class="c-hotel">Hotel</th>
                    <th class="c-unit">Hotel Unit</th>
                    <th class="c-rate">Rate</th>
                    <th class="c-weight">Weight (kg)</th>
                    <th class="c-extra">Extra Item</th>
                    <th class="c-amount">Amount (R)</th>
                    <th class="c-total">Total (R)</th>
                    <th class="c-date">Date</th>
                    <th class="rm-th"></th>
                </tr>
            </thead>
            <tbody id="invoiceTable"><!-- rows are built by js/rowManager.js --></tbody>
        </table>
    </div>

    <!-- ── Action buttons (icon circles that widen on hover) ── -->
      <div class="btn-row">
          <button type="button" class="uv-btn" id="formBtn" style="border:2px solid #14b8a6;color:#14b8a6;--btn-fill:#14b8a6">
              <svg class="uv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Entry Form</span>
          </button>
        <button type="button" class="uv-btn add-item" id="addRowBtn">
            <svg class="uv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Add Item</span>
        </button>
        <button type="button" class="uv-btn print-btn" id="printBtn">
            <svg class="uv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Print</span>
        </button>
    </div>

    <!-- ── Save Invoice ── -->
    <div class="save-row">
        <button type="button" class="uv-btn" id="saveInvoiceBtn">
            <svg class="uv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>Save Invoice</span>
        </button>
    </div>

    <!-- ── Grand Total ── -->
    <div class="grand-total-row">
        <h3>Grand Total: R<span id="grandTotal">0.00</span></h3>
    </div>

    <input type="hidden" name="payload" id="payload">

</form>

<?php $fabs = ['statements', 'invoices']; include 'partials/fabs.php'; ?>

<!-- ── JS files — one file per concern ── -->
<script src="js/popupNotify.js"></script>   <!-- success/error popups          -->
<script src="js/invoiceFormat.js"></script> <!-- digits-only + money helpers  -->
<script src="js/rowManager.js"></script>    <!-- build / add rows             -->
<script src="js/calc.js"></script>          <!-- row total + grand total      -->
<script src="js/rowRemove.js"></script>     <!-- red ✕ per row                -->
<script src="js/validation.js"></script>    <!-- row checks + duplicate check -->
<script src="js/saveInvoice.js"></script>   <!-- Save Invoice button          -->
<script src="js/pdfWriter.js"></script>     <!-- PDF builder                  -->
<script src="js/pdfInvoice.js"></script>    <!-- invoice PDF                  -->
<script src="js/printInvoice.js"></script>  <!-- PDF copy + print             -->
<script src="js/navigation.js"></script>    <!-- Monthly Statements + dialog  -->
<script src="js/themeToggle.js"></script>   <!-- dark / light button          -->
<script src="js/undoSave.js"></script>      <!-- ✕ on "saved" popup = Undo    -->
<script src="js/shortcuts.js"></script>     <!-- Ctrl+S, Enter, Saved Invoices -->
<script src="js/main.js"></script>          <!-- start-up (keep LAST)         -->
  <script src="js/entryForm.js"></script>
</body>
</html>
