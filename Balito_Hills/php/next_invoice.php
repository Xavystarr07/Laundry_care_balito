<?php
// php/next_invoice.php — JSON: last saved invoice number + step
require_once __DIR__ . '/settings.php';
header('Content-Type: application/json');
$step = 1;   // 1 = 200 → 201.  Use 2 for 200 → 202
try {
    $pdo  = bhConnect();
    // For the HIGHEST number instead of the latest saved, use: SELECT MAX("InvoiceNumber") FROM utopia_all
    $last = (int)$pdo->query('SELECT "InvoiceNumber" FROM utopia_all ORDER BY "CreatedAt" DESC, id DESC LIMIT 1')->fetchColumn();
    echo json_encode(['ok' => true, 'next' => $last > 0 ? $last + $step : 0]);
} catch (Exception $e) {
    error_log('bh next_invoice: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'next' => 0]);
}