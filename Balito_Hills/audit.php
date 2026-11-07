<?php
// audit.php — read-only list of every edit / delete made on the Invoices page (newest 200)
require_once 'php/session.php';
bhSessionStart();
require_once 'php/settings.php';
date_default_timezone_set('Africa/Johannesburg');
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');

try {
    $pdo  = bhConnect();
    $rows = $pdo->query('SELECT at, action, source_table, row_id, before_data, after_data FROM bh_audit ORDER BY id DESC LIMIT 200')->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    error_log('bh audit: ' . $e->getMessage());
    die('Could not load the audit log.');
}
$L = ['InvoiceNumber' => 'Inv no', 'HotelName' => 'Hotel', 'HotelNumber' => 'Unit', 'RateCode' => 'Rate', 'RatePerKg' => 'Rate/kg',
      'Weight' => 'Weight', 'ExtraItem' => 'Extra item', 'ExtraAmount' => 'Extra amount', 'Total' => 'Total', 'DateReceived' => 'Date'];
$same = fn($a, $b) => (is_numeric($a) && is_numeric($b)) ? (float)$a === (float)$b : (string)$a === (string)$b;
$show = fn($v) => ($v === null || $v === '') ? '—' : $v;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audit Log — Ballito Hills</title>
    <link rel="stylesheet" href="html_css/base.css">
    <link rel="stylesheet" href="html_css/table.css">
    <link rel="stylesheet" href="html_css/inputs.css">
    <link rel="stylesheet" href="html_css/buttons.css">
    <link rel="stylesheet" href="html_css/invoices.css">
</head>
<body>
<div style="height:18px"></div>
<h2 class="page-title">Audit Log</h2>
<div class="frow"><button type="button" class="pill ghost" onclick="window.location.href='invoices.php'">← Saved Invoices</button></div>
<div class="count"><?= count($rows) ?> change<?= count($rows) === 1 ? '' : 's' ?> (newest 200)</div>

<div class="table-wrap">
<table id="linesTable">
    <thead><tr><th>When</th><th>Action</th><th>Inv No</th><th>What changed</th><th>Month table</th></tr></thead>
    <tbody>
    <?php if (!$rows): ?><tr><td colspan="5" class="empty">Nothing has been edited or deleted yet.</td></tr><?php endif; ?>
    <?php foreach ($rows as $r):
        $b = json_decode((string)$r['before_data'], true) ?: [];
        $a = json_decode((string)$r['after_data'], true) ?: [];
        if ($r['action'] === 'edit') {
            $out = [];
            foreach ($L as $k => $lab) {
                $x = $b[$k] ?? ''; $y = $a[$k] ?? '';
                if (!$same($x, $y)) $out[] = $h($lab) . ': <s>' . $h($show($x)) . '</s> → <b>' . $h($show($y)) . '</b>';
            }
            $txt = $out ? implode('<br>', $out) : 'No visible change';
        } else {
            $txt = 'Deleted: ' . $h($b['HotelName'] ?? '') . ' · unit ' . $h($b['HotelNumber'] ?? '') . ' · ' . $h($b['RateCode'] ?? '') . ' · ' . $h($b['Weight'] ?? '') . ' kg · R ' . $h($b['Total'] ?? '');
        }
        $inv = $b['InvoiceNumber'] ?? ($a['InvoiceNumber'] ?? '');
    ?>
        <tr>
            <td><?= $h(date('d M Y H:i', strtotime($r['at']))) ?></td>
            <td class="strong"><?= $r['action'] === 'edit' ? 'Edited' : 'Deleted' ?></td>
            <td class="strong"><?= $h(str_pad((string)$inv, BH_INVOICE_DIGITS, '0', STR_PAD_LEFT)) ?></td>
            <td><?= $txt ?></td>
            <td class="tbl"><?= $h($r['source_table']) ?></td>
        </tr>
    <?php endforeach; ?>
    </tbody>
</table>
</div>
<script src="js/themeToggle.js"></script>
</body>
</html>