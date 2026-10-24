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
    $pdo->prepare("DELETE FROM utopia_all WHERE id IN ($ph)")->execute($ids);
} catch (Exception $e) {
    error_log('bh undo_save: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => 'Could not undo. Nothing was changed.']);
    exit;
}

$_SESSION['restore_rows'] = $ls['restore'] ?? ['rows' => []];
$_SESSION['popup'] = ['type' => 'info', 'msg' => 'Save undone. Your lines are back on the list.', 'tip' => 'Edit them and save again.'];
unset($_SESSION['last_save']);
echo json_encode(['ok' => true, 'redirect' => 'invoice_generator.php']);
