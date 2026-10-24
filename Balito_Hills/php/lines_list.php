<?php
// php/lines_list.php — JSON list of saved lines for the Invoices page
// Filters: q (invoice no / unit / extra item), from, to (dates). Newest first, max 300.
require_once __DIR__ . '/session.php';
bhSessionStart();
require_once __DIR__ . '/settings.php';
header('Content-Type: application/json');

$date = function (?string $s) { $d = $s ? DateTimeImmutable::createFromFormat('!Y-m-d', $s) : null; return ($d && $d->format('Y-m-d') === $s) ? $s : null; };

try {
    $pdo = bhConnect();
    $q    = trim((string)($_GET['q'] ?? ''));
    $from = $date($_GET['from'] ?? null);
    $to   = $date($_GET['to'] ?? null);

    $sql = 'SELECT "SourceTable", id, "InvoiceNumber", "HotelName", "HotelNumber", "RateCode", "RatePerKg",
                   "Weight", "ExtraItem", "ExtraAmount", "Total", "DateReceived"
            FROM utopia_all WHERE 1 = 1';
    $p = [];
    if ($q !== '') {
        if (ctype_digit($q) && strlen($q) <= 9) { $sql .= ' AND ("InvoiceNumber" = :qn OR "HotelNumber" ILIKE :ql)'; $p[':qn'] = (int)$q; }
        else                                    { $sql .= ' AND ("HotelNumber" ILIKE :ql OR "ExtraItem" ILIKE :ql)'; }
        $p[':ql'] = '%' . $q . '%';
    }
    if ($from) { $sql .= ' AND "DateReceived" >= :f'; $p[':f'] = $from; }
    if ($to)   { $sql .= ' AND "DateReceived" <= :t'; $p[':t'] = $to; }
    $sql .= ' ORDER BY "DateReceived" DESC, "InvoiceNumber" DESC, "RateCode" LIMIT 301';

    $st = $pdo->prepare($sql);
    $st->execute($p);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $limited = count($rows) > 300;
    if ($limited) array_pop($rows);

    echo json_encode(['ok' => true, 'limited' => $limited, 'rows' => array_map(fn($r) => [
        'table' => $r['SourceTable'], 'id' => (int)$r['id'], 'inv' => (int)$r['InvoiceNumber'],
        'hotel' => $r['HotelName'], 'unit' => $r['HotelNumber'], 'rate' => $r['RateCode'],
        'rateprice' => (float)$r['RatePerKg'], 'weight' => (float)$r['Weight'],
        'extra_item' => $r['ExtraItem'] ?? '', 'extra_amount' => (float)$r['ExtraAmount'],
        'total' => (float)$r['Total'], 'date' => $r['DateReceived'],
    ], $rows)]);
} catch (Exception $e) {
    error_log('bh lines_list: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => 'Could not load the invoices. Check the database setup.']);
}
