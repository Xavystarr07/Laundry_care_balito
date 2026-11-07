<?php
require_once __DIR__ . '/../../php/activeTable.php';
header('Content-Type: application/json');
try {
    $id = (int)($_POST['id'] ?? 0); $days = (int)($_POST['days'] ?? 0); $rate = round((float)($_POST['rate'] ?? 0), 2);
    if ($id < 1 || $days < 0 || $days > 366 || $rate < 0) throw new Exception('Invalid fuel values.');
    $pdo = bhConnect();
    $pdo->prepare('UPDATE bh_periods SET fuel_days = ?, fuel_rate = ? WHERE id = ?')->execute([$days, $rate, $id]);
    echo json_encode(['ok' => true]);
} catch (Exception $e) {
    error_log('bh save_fuel: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => $e->getMessage()]);
}