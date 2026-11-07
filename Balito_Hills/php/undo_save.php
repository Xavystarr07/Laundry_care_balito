<?php
// Deletes ONLY the rows saved in this session's last save, within 30 seconds.
require_once __DIR__ . '/session.php';
bhSessionStart();
header('Content-Type: application/json');
require_once __DIR__ . '/activeTable.php';

$ls = $_SESSION['last_save'] ?? null;
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !$ls || empty($ls['ids']) || time() - $ls['time'] > 30) {
    echo json_encode(['ok' => false, 'msg' => 'Too late to undo. This save can no longer be undone.']);
    exit;
}

try {
    $pdo = bhConnect();
    $ids = array_map('intval', $ls['ids']);
    $ph  = implode(',', array_fill(0, count($ids), '?'));
    $tbl = (string)($ls['table'] ?? '');
    if (!preg_match('/^utopia_[a-z]{3}_[0-9]{4}$/', $tbl)) throw new Exception('Save has no table recorded.');
    $pdo->beginTransaction();
    $pdo->prepare("DELETE FROM public.$tbl WHERE id IN ($ph)")->execute($ids);
    $pdo->prepare("DELETE FROM bh_line_period WHERE source_table = ? AND row_id IN ($ph)")->execute(array_merge([$tbl], $ids));
    $pdo->commit();
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('bh undo_save: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => 'Could not undo. Nothing was changed.']);
    exit;
}

$_SESSION['restore_rows'] = $ls['restore'] ?? ['rows' => []];
$_SESSION['popup'] = ['type' => 'info', 'msg' => 'Save undone. Your lines are back on the list.', 'tip' => 'Edit them and save again.'];
unset($_SESSION['last_save']);
echo json_encode(['ok' => true, 'redirect' => 'invoice_generator.php']);
