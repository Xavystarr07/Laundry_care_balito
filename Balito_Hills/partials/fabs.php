<?php
// ============================================================
//  partials/fabs.php — animated circle buttons, bottom-right
//  Set these BEFORE including it:
//    $fabs     = ['statements', 'invoices'];   // which buttons, bottom → top
//    $fabPlain = true;                         // plain links (no unsaved-data guard)
//  On the invoice page the guard comes from js/navigation.js (statementsFab)
//  and js/shortcuts.js (invoicesFab).
// ============================================================
$fabs     = $fabs ?? ['statements', 'invoices'];
$fabPlain = $fabPlain ?? false;

$defs = [
    'statements' => [
        'id' => 'statementsFab', 'href' => 'monthly_statement/monthly_statement.php', 'label' => 'Monthly Statements', 'cls' => 'fab-green',
        'icon' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/>'
                . '<rect class="b b1" x="5" y="11" width="3.4" height="8" rx="1" fill="currentColor" stroke="none"/>'
                . '<rect class="b b2" x="10.3" y="5" width="3.4" height="14" rx="1" fill="currentColor" stroke="none"/>'
                . '<rect class="b b3" x="15.6" y="8.5" width="3.4" height="10.5" rx="1" fill="currentColor" stroke="none"/></svg>',
    ],
    'invoices' => [
        'id' => 'invoicesFab', 'href' => 'invoices.php', 'label' => 'Saved Invoices', 'cls' => 'fab-purple',
        'icon' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                . '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/>'
                . '<line class="ln l1" x1="8.5" y1="12" x2="15.5" y2="12"/><line class="ln l2" x1="8.5" y1="15.2" x2="15.5" y2="15.2"/><line class="ln l3" x1="8.5" y1="18.4" x2="12.5" y2="18.4"/></svg>',
    ],
];
foreach ($fabs as $i => $key):
    $d = $defs[$key]; $bottom = 24 + $i * 70;
?>
<button type="button" class="fab <?= $d['cls'] ?>" id="<?= $d['id'] ?>" aria-label="<?= $d['label'] ?>" style="bottom:<?= $bottom ?>px"<?= $fabPlain ? ' onclick="window.location.href=\'' . $d['href'] . '\'"' : '' ?>>
    <span class="fab-in">
        <span class="fab-icon"><?= $d['icon'] ?></span>
        <span class="fab-label"><?= $d['label'] ?></span>
        <span class="fab-shine"></span>
    </span>
</button>
<?php endforeach; ?>
