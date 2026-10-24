<?php
require_once __DIR__ . '/../php/settings.php';
require_once __DIR__ . '/php/queries.php';
date_default_timezone_set('Africa/Johannesburg');

function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function d($s) { return $s ? date('d M Y', strtotime($s)) : ''; }
function dl($s) { return date('d F Y', strtotime($s)); }
$flags = JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;

try {
    $pdo = bhConnect();
    $periods = $pdo->query('SELECT id, name, start_date, end_date, is_closed FROM bh_periods ORDER BY id DESC')->fetchAll(PDO::FETCH_ASSOC);
} catch (Exception $e) {
    error_log('bh statements: ' . $e->getMessage());
    die('Could not load statements. Run sql/05_periods.sql in Supabase first.');
}
$open = $cur = null;
$pid = (int)($_GET['p'] ?? 0);
foreach ($periods as $p) { if (!$p['is_closed']) $open = $p; if ($p['id'] == $pid) $cur = $p; }
$today     = date('Y-m-d');
$lastClosedId = 0;
foreach ($periods as $p) { if ($p['is_closed']) { $lastClosedId = (int)$p['id']; break; } }
$openLines = $open ? bhStatementLines($pdo, $open['start_date'], $today) : [];
$end       = $cur ? ($cur['end_date'] ?: $today) : '';
$lines     = $cur ? bhStatementLines($pdo, $cur['start_date'], $end) : [];

// hotel → unit → [kg*100, total*100]
$grp = [];
foreach ($lines as $l) {
    $a = $grp[$l['hotel']][$l['unit']] ?? [0, 0];
    $grp[$l['hotel']][$l['unit']] = [$a[0] + (int)round($l['weight'] * 100), $a[1] + (int)round($l['total'] * 100)];
}
$gk = $gc = 0;
foreach ($grp as $us) foreach ($us as $v) { $gk += $v[0]; $gc += $v[1]; }
$m2 = fn($c) => number_format($c / 100, 2);
$to = BH_STATEMENT_TO;
$b  = BH_BUSINESS;
$BHS = $cur ? ['name' => $cur['name'], 'from' => $cur['start_date'], 'to' => $end,
    'periodText' => dl($cur['start_date']) . ' — ' . dl($end), 'total' => $gc / 100,
    'recipient' => $to, 'lines' => $lines] : null;
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Statements — Ballito Hills</title>
<link rel="stylesheet" href="css/statement.css">
</head>
<body>

<?php if (!$cur): ?>
<main class="home">
    <a class="back" href="../invoice_generator.php">⟵ Back to invoice</a>
    <h1>Ballito Hills <span>Statements</span></h1>

    <?php if ($open): ?>
    <p class="now">Current period: <b><?= h($open['name']) ?></b> · from <?= d($open['start_date']) ?> · <?= count($openLines) ?> line<?= count($openLines) == 1 ? '' : 's' ?> · <b>R <?= number_format(array_sum(array_column($openLines, 'total')), 2) ?></b></p>
    <?php endif; ?>

    <div class="cards">
        <button type="button" class="card" data-panel="existing">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>
            <b>Show existing statement</b><small>Choose a month</small>
        </button>
        <?php if ($open): ?>
        <button type="button" class="card" data-panel="capture">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/></svg>
            <b>Capture bill</b><small>Pick the cut-off date</small>
        </button>
        <?php endif; ?>
    </div>

    <section class="panel" id="existing" hidden>
        <?php foreach ($periods as $p): ?>
        <a class="prow" href="?p=<?= (int)$p['id'] ?>">
            <b><?= h($p['name']) ?></b>
            <span><?= d($p['start_date']) ?> — <?= $p['end_date'] ? d($p['end_date']) : 'ongoing' ?></span>
            <em class="chip <?= $p['is_closed'] ? 'closed' : 'open' ?>"><?= $p['is_closed'] ? 'Closed' : 'Open' ?></em>
        </a>
        <?php endforeach; ?>
    </section>

    <?php if ($open): ?>
    <section class="panel" id="capture" hidden>
        <div class="cap">
            <div>
                <p class="lbl">Period starts</p>
                <p class="big"><?= d($open['start_date']) ?></p>
                <p class="lbl">Cut-off date</p>
                <p class="big" id="cutLbl">Pick a date</p>
                <div id="capInfo"></div>
                <button type="button" class="btn" id="capGo" disabled style="margin-top:16px">Close period &amp; start next</button>
            </div>
            <div id="cal"></div>
        </div>
    </section>
    <script>
    window.CAP = <?= json_encode([
        'start' => $open['start_date'],
        'rows'  => array_map(fn($l) => ['d' => $l['date'], 't' => (float)$l['total']], $openLines)
    ], $flags) ?>;
    </script>
    <?php endif; ?>
</main>
<script src="js/statement.js"></script>

<?php else: ?>
<main class="view">
    <div class="bar noprint">
        <a class="btn ghost" href="monthly_statement.php">⟵ Statements</a>
        <a class="btn ghost" href="../invoice_generator.php">Invoice</a>
        <?php if (!$cur['is_closed']): ?><em class="chip open">Period still open</em><?php endif; ?>
        <?php if ($cur['is_closed'] && (int)$cur['id'] === $lastClosedId): ?><button type="button" class="btn ghost" id="reopenBtn" data-id="<?= (int)$cur['id'] ?>">↺ Reopen</button><?php endif; ?>
        <span class="sp"></span>
        <button type="button" class="act pdf" onclick="window.print()">
            <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg></i>
            Print / Save PDF
        </button>
        <button type="button" class="act xls" id="excelBtn">
            <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/></svg></i>
            Download Excel
        </button>
        <button type="button" class="act mail" id="emailBtn">
            <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg></i>
            Email
        </button>
        <button type="button" class="act wa" id="waBtn">
            <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.7 7L4 20l1.1-4.9A8 8 0 1 1 21 12z"/></svg></i>
            WhatsApp
        </button>
    </div>

    <article id="paper">
        <div class="bar2"></div>
        <header class="ph">
            <div class="brand">
                <h1><?= h($b['name']) ?></h1>
                <div class="tag"><?= h($b['tagline']) ?></div>
                <p><?= implode('<br>', array_map('h', $b['address'])) ?></p>
            </div>
            <div class="contact">
                <div class="web"><?= h($b['web']) ?></div>
                <?php foreach ($b['emails'] as $x): ?><div><?= h($x) ?></div><?php endforeach; ?>
                <?php foreach ($b['phones'] as $x): ?><div><?= h($x) ?></div><?php endforeach; ?>
            </div>
        </header>

        <div class="title">
            <h2>Statement</h2>
            <div class="pno"><span>Month</span><strong><?= h($cur['name']) ?></strong></div>
        </div>

        <div class="meta">
            <div><span>To</span><strong><?= h(rtrim($to[0], ',')) ?></strong><em><?= h(implode(', ', array_slice($to, 1))) ?></em></div>
            <div><span>Period</span><strong><?= d($cur['start_date']) ?> — <?= d($end) ?></strong></div>
            <div><span>Total kg</span><strong><?= $m2($gk) ?></strong></div>
        </div>

        <table>
            <thead><tr><th>Hotel / Unit</th><th class="n">Weight (kg)</th><th class="n">Total</th></tr></thead>
            <tbody>
            <?php if ($grp): foreach ($grp as $hotel => $units): $hk = $hc = 0; ?>
                <tr class="hb"><td colspan="3"><?= h($hotel) ?></td></tr>
                <?php foreach ($units as $unit => $v): $hk += $v[0]; $hc += $v[1]; ?>
                <tr><td>Unit <?= h($unit) ?></td><td class="n"><?= $m2($v[0]) ?></td><td class="n">R <?= $m2($v[1]) ?></td></tr>
                <?php endforeach; ?>
                <tr class="ht"><td><?= h($hotel) ?> total</td><td class="n"><?= $m2($hk) ?></td><td class="n">R <?= $m2($hc) ?></td></tr>
            <?php endforeach; else: ?>
                <tr><td colspan="3">No invoices in this period.</td></tr>
            <?php endif; ?>
            </tbody>
        </table>

        <div class="tot"><div class="tbox">
            <div class="trow"><span>Total weight</span><span><?= $m2($gk) ?> kg</span></div>
            <div class="tgrand"><span>Grand Total</span><strong>R <?= $m2($gc) ?></strong></div>
        </div></div>

        <div class="bank">
            <b>Banking details</b>
            <?php foreach (BH_BANK as $k => $v): ?><?= h($k . ': ' . $v) ?><br><?php endforeach; ?>
        </div>
        <div class="foot"><strong>Thank you for your business</strong></div>
    </article>
</main>
<script>window.BH = <?= json_encode(bhClientConfig(), $flags) ?>; window.BHS = <?= json_encode($BHS, $flags) ?>;</script>
<script src="js/xlsxWriter.js"></script>
<script src="js/excelExport.js"></script>
<script src="js/emailStatement.js"></script>
<script src="js/statement.js"></script>
<?php endif; ?>

</body>
</html>