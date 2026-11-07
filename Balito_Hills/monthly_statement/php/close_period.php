<?php
require_once __DIR__ . '/../../php/activeTable.php';
date_default_timezone_set('Africa/Johannesburg');
header('Content-Type: application/json');
$end = $_POST['end'] ?? '';
try {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $end)) throw new Exception('Pick a cut-off date.');
    $pdo = bhConnect();
    $pdo->beginTransaction();
    $p = $pdo->query('SELECT id, start_date FROM bh_periods WHERE is_closed = FALSE ORDER BY id LIMIT 1 FOR UPDATE')->fetch(PDO::FETCH_ASSOC);
    if (!$p) throw new Exception('No open period.');
    if ($end < $p['start_date'] || $end > date('Y-m-d')) throw new Exception('Date must be between the period start and today.');
    $e    = new DateTimeImmutable($end);
    $next = $e->modify('+1 day')->format('Y-m-d');
    $nm   = $e->modify('first day of next month');
    $pdo->prepare('UPDATE bh_periods SET is_closed = TRUE, closed_at = now(), end_date = ? WHERE id = ?')->execute([$end, $p['id']]);
    $n = $pdo->prepare('INSERT INTO bh_periods (name, start_date) VALUES (?, ?) RETURNING id');
    $n->execute([$nm->format('F Y'), $next]);
    $nid = (int)$n->fetchColumn();
    // lines dated after the cut-off move into the new period
    $pdo->prepare('UPDATE bh_line_period lp SET period_id = ? FROM utopia_all u WHERE lp.period_id = ? AND u."SourceTable" = lp.source_table AND u.id = lp.row_id AND u."DateReceived" > ?')->execute([$nid, $p['id'], $end]);

    // new invoices go into the month table after the cut-off (if not already there)
    $cur = bhActiveTable($pdo);
    $t   = 'utopia_' . BH_MONTHS[(int)$nm->format('n') - 1] . '_' . $nm->format('Y');
    if (bhTableMonth($t) > bhTableMonth($cur)) {
        $pdo->prepare('SELECT bh_create_month(:t)')->execute([':t' => $t]);
        $pdo->prepare('UPDATE bh_active SET tbl = :t WHERE id = 1')->execute([':t' => $t]);
    }
    $pdo->commit();
    echo json_encode(['ok' => true, 'id' => $p['id']]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('bh close_period: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}