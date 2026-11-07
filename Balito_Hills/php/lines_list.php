<?php
// php/lines_list.php — JSON list of saved lines for the Invoices page
// Filters: q (contains: invoice no / hotel / unit / extra item), hotel, unit, extra, from, to. Sort: sort + dir. Max 300.
require_once __DIR__ . '/session.php';
bhSessionStart();
require_once __DIR__ . '/settings.php';
header('Content-Type: application/json');

$date = function (?string $s) { $d = $s ? DateTimeImmutable::createFromFormat('!Y-m-d', $s) : null; return ($d && $d->format('Y-m-d') === $s) ? $s : null; };

try {
    $pdo   = bhConnect();
    $q     = trim((string)($_GET['q'] ?? ''));
    $hotel = (string)($_GET['hotel'] ?? '');
    $unit  = trim((string)($_GET['unit'] ?? ''));
    $extra = (string)($_GET['extra'] ?? '');
    $from  = $date($_GET['from'] ?? null);
    $to    = $date($_GET['to'] ?? null);

    $sorts = ['date' => '"DateReceived"', 'inv' => '"InvoiceNumber"', 'hotel' => '"HotelName"', 'unit' => '"HotelNumber"',
              'weight' => '"Weight"', 'extra' => '"ExtraAmount"', 'total' => '"Total"'];
    $col = $sorts[$_GET['sort'] ?? 'date'] ?? $sorts['date'];
    $dir = (($_GET['dir'] ?? 'desc') === 'asc') ? 'ASC' : 'DESC';

    $sql = 'SELECT "SourceTable", id, "InvoiceNumber", "HotelName", "HotelNumber", "RateCode", "RatePerKg",
                   "Weight", "ExtraItem", "ExtraAmount", "Total", "DateReceived"
            FROM utopia_all WHERE 1 = 1';
    $p = [];
    if ($q !== '') {
        $sql .= ' AND (CAST("InvoiceNumber" AS TEXT) LIKE :q1 OR "HotelNumber" ILIKE :q2 OR "HotelName" ILIKE :q3 OR "ExtraItem" ILIKE :q4)';
        foreach (['q1', 'q2', 'q3', 'q4'] as $k) $p[':' . $k] = '%' . $q . '%';
    }
    if ($hotel !== '') { $sql .= ' AND "HotelName" = :h';        $p[':h'] = $hotel; }
    if ($unit !== '')  { $sql .= ' AND "HotelNumber" ILIKE :u';  $p[':u'] = '%' . $unit . '%'; }
    if ($extra === 'yes') $sql .= ' AND "ExtraAmount" > 0';
    if ($extra === 'no')  $sql .= ' AND "ExtraAmount" = 0';
    if ($from) { $sql .= ' AND "DateReceived" >= :f'; $p[':f'] = $from; }
    if ($to)   { $sql .= ' AND "DateReceived" <= :t'; $p[':t'] = $to; }
    $sql .= " ORDER BY $col $dir, \"DateReceived\" DESC, \"InvoiceNumber\" DESC, \"RateCode\" LIMIT 301";

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