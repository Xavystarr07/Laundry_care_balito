<?php
// php/check_invoice.php — JSON: does this invoice number already exist?
require_once __DIR__ . '/activeTable.php';
require_once __DIR__ . '/activeTable.php';

header('Content-Type: application/json');

$number = intval(preg_replace('/\D/', '', trim($_GET['invoice_number'] ?? '')));
if ($number < BH_INVOICE_MIN || $number > BH_INVOICE_MAX) {
    echo json_encode(['exists' => false]);
    exit;
}

try {
    $pdo  = bhConnect();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM utopia_all WHERE "InvoiceNumber" = :num');
    $stmt->execute([':num' => $number]);
    echo json_encode(['exists' => (int)$stmt->fetchColumn() > 0]);
} catch (Exception $e) {
    error_log('bh check_invoice: ' . $e->getMessage());
    echo json_encode(['exists' => false, 'error' => true]);
}
