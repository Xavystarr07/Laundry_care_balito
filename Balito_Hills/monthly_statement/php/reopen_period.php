<?php
require_once __DIR__ . '/../../php/activeTable.php';
header('Content-Type: application/json');
try {
    $id  = (int)($_POST['id'] ?? 0);
    $pdo = bhConnect();
    $pdo->beginTransaction();
    $last = $pdo->query('SELECT id FROM bh_periods WHERE is_closed = TRUE ORDER BY id DESC LIMIT 1 FOR UPDATE')->fetchColumn();
    if (!$last || (int)$last !== $id) throw new Exception('Only the most recent closed statement can be reopened.');
    $pdo->query('DELETE FROM bh_periods WHERE is_closed = FALSE');
    $pdo->prepare('UPDATE bh_periods SET is_closed = FALSE, closed_at = NULL, end_date = NULL WHERE id = ?')->execute([$id]);
    $pdo->commit();
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('bh reopen_period: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}