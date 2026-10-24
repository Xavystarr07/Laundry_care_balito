<?php
// php/line_delete.php — Delete ONE saved line (Invoices page). The old values are kept in bh_audit.
require_once __DIR__ . '/session.php';
bhSessionStart();
require_once __DIR__ . '/settings.php';
header('Content-Type: application/json');

function fail(string $m): void { echo json_encode(['ok' => false, 'msg' => $m]); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Invalid request.');
$in    = json_decode(file_get_contents('php://input'), true);
$table = (string)($in['table'] ?? '');
$id    = (int)($in['id'] ?? 0);
if (!preg_match('/^utopia_[a-z]{3}_[0-9]{4}$/', $table) || $id < 1) fail('Invalid line.');

try {
    $pdo = bhConnect();
    $pdo->beginTransaction();
    $st = $pdo->prepare('SELECT * FROM utopia_all WHERE "SourceTable" = :t AND id = :id');
    $st->execute([':t' => $table, ':id' => $id]);
    $old = $st->fetch(PDO::FETCH_ASSOC);
    if (!$old) { $pdo->rollBack(); fail('That line was already deleted. Refresh the page.'); }

    $pdo->prepare('DELETE FROM public.' . $table . ' WHERE id = :id')->execute([':id' => $id]);
    $before = array_diff_key($old, ['SourceTable' => 1, 'id' => 1, 'CreatedAt' => 1]);
    $pdo->prepare('INSERT INTO bh_audit (action, source_table, row_id, before_data, after_data)
                   VALUES (\'delete\', :t, :id, CAST(:b AS jsonb), NULL)')
        ->execute([':t' => $table, ':id' => $id, ':b' => json_encode($before)]);
    $pdo->commit();
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('bh line_delete: ' . $e->getMessage());
    fail('Could not delete. Nothing was changed.');
}
