<?php
// ============================================================
//  php/activeTable.php — which monthly table new invoices are saved into
//  (stored in the bh_active table; changed by "start new month" on the statement)
// ============================================================
require_once __DIR__ . '/settings.php';

const BH_MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

function bhActiveTable(PDO $pdo): string {
    $t = $pdo->query('SELECT tbl FROM bh_active WHERE id = 1')->fetchColumn();
    if (!$t || !preg_match('/^utopia_[a-z]{3}_[0-9]{4}$/', $t)) {
        throw new RuntimeException('Active table not set — run sql/01_active_table.sql');
    }
    return $t;
}

// 'utopia_sep_2026' → '2026-09'
function bhTableMonth(string $t): ?string {
    if (!preg_match('/^utopia_([a-z]{3})_([0-9]{4})$/', $t, $m)) return null;
    $i = array_search($m[1], BH_MONTHS, true);
    return $i === false ? null : $m[2] . '-' . str_pad((string)($i + 1), 2, '0', STR_PAD_LEFT);
}

// 'utopia_sep_2026' → 'utopia_oct_2026'
function bhNextTable(string $t): ?string {
    $ym = bhTableMonth($t);
    if (!$ym) return null;
    $d = (new DateTimeImmutable($ym . '-01'))->modify('+1 month');
    return 'utopia_' . BH_MONTHS[(int)$d->format('n') - 1] . '_' . $d->format('Y');
}
