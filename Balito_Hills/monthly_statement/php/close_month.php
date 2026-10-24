<?php
// ============================================================
//  monthly_statement/php/close_month.php — "Start new month"
//  Creates next month's table (+ refreshes the utopia_all view) and makes it
//  the active table. Old tables stay untouched and still appear on statements.
// ============================================================
require_once __DIR__ . '/../../php/session.php';
bhSessionStart();
require_once __DIR__ . '/../../php/activeTable.php';
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(['ok' => false, 'msg' => 'Invalid request.']); exit; }

try {
    $pdo = bhConnect();
    $pdo->beginTransaction();
    $pdo->query('SELECT pg_advisory_xact_lock(7771)');          // one change at a time

    $cur  = bhActiveTable($pdo);
    if (($_POST['from'] ?? '') !== $cur) {                       // already switched (double click / other PC)
        $pdo->rollBack();
        echo json_encode(['ok' => false, 'msg' => 'The month was already started. Refresh the page.']);
        exit;
    }
    $next = bhNextTable($cur);
    if (!$next) throw new RuntimeException('Bad table name ' . $cur);

    $pdo->prepare('SELECT bh_create_month(:t)')->execute([':t' => $next]);
    $pdo->prepare('UPDATE bh_active SET tbl = :t WHERE id = 1')->execute([':t' => $next]);
    $pdo->commit();

    echo json_encode(['ok' => true, 'closed' => $cur, 'active' => $next]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('bh close_month: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => 'Could not start the new month. Nothing was changed.']);
}
