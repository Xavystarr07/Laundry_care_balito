<?php
// php/lines_list.php — JSON list of saved lines for the Invoices page
// Filters: q (contains: invoice no / hotel / unit / extra item), hotel, unit, extra, from, to. Sort: sort + dir. Max 300.
// Also returns the statement each line belongs to, and totals per hotel/unit for the whole filter.
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

    $sql = 'SELECT "SourceTable", u.id, p.name AS "PeriodName", p.is_closed AS "PeriodClosed", "InvoiceNumber", "HotelName", "HotelNumber", "RateCode", "RatePerKg",
                   "Weight", "ExtraItem", "ExtraAmount", "Total", "DateReceived"
            FROM utopia_all u
            LEFT JOIN bh_line_period lp ON lp.source_table = u."SourceTable" AND lp.row_id = u.id
            LEFT JOIN bh_periods p ON p.id = lp.period_id
            WHERE 1 = 1';
    $p = [];
    if ($q !== '') {
        $sql .= ' AND (CAST("InvoiceNumber" AS TEXT) LIKE :q1 OR "HotelNumber" ILIKE :q2 OR "HotelName" ILIKE :q3 OR "ExtraItem" ILIKE :q4)';
        foreach (['q1', 'q2', 'q3', 'q4'] as $k) $p[':' . $k] = '%' . $q . '%';
        if (ctype_digit($q) && ltrim($q, '0') !== '') $p[':q1'] = '%' . ltrim($q, '0') . '%';   // 069 → 69
    }
    if ($hotel !== '') { $sql .= ' AND "HotelName" = :h';        $p[':h'] = $hotel; }
    if ($unit !== '')  { $sql .= ' AND "HotelNumber" ILIKE :u';  $p[':u'] = '%' . $unit . '%'; }
    if ($extra === 'yes') $sql .= ' AND "ExtraAmount" > 0';
    if ($extra === 'no')  $sql .= ' AND "ExtraAmount" = 0';
    if ($from) { $sql .= ' AND "DateReceived" >= :f'; $p[':f'] = $from; }
    if ($to)   { $sql .= ' AND "DateReceived" <= :t'; $p[':t'] = $to; }
    $base = $sql;
    $sql .= " ORDER BY $col $dir, \"DateReceived\" DESC, \"InvoiceNumber\" DESC, \"RateCode\" LIMIT 301";

    $st = $pdo->prepare($sql);
    $st->execute($p);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    $limited = count($rows) > 300;
    if ($limited) array_pop($rows);

    // totals per hotel + unit for EVERYTHING matching the filters (not just the 300 shown)
    $sm = $pdo->prepare('SELECT "HotelName", "HotelNumber", COUNT(*) AS n, SUM("Weight") AS kg, SUM("Total") AS tot
                         FROM (' . $base . ') s GROUP BY "HotelName", "HotelNumber" ORDER BY "HotelName", "HotelNumber"');
    $sm->execute($p);
    $sum = array_map(fn($r) => ['hotel' => $r['HotelName'], 'unit' => $r['HotelNumber'], 'lines' => (int)$r['n'],
                                'kg' => (float)$r['kg'], 'total' => (float)$r['tot']], $sm->fetchAll(PDO::FETCH_ASSOC));

    echo json_encode(['ok' => true, 'limited' => $limited, 'summary' => $sum, 'rows' => array_map(fn($r) => [
        'table' => $r['SourceTable'], 'id' => (int)$r['id'], 'inv' => (int)$r['InvoiceNumber'],
        'hotel' => $r['HotelName'], 'unit' => $r['HotelNumber'], 'rate' => $r['RateCode'],
        'rateprice' => (float)$r['RatePerKg'], 'weight' => (float)$r['Weight'],
        'extra_item' => $r['ExtraItem'] ?? '', 'extra_amount' => (float)$r['ExtraAmount'],
        'total' => (float)$r['Total'], 'date' => $r['DateReceived'],
        'period' => $r['PeriodName'] ?? '', 'closed' => in_array($r['PeriodClosed'], [true, 't', '1', 1], true),
    ], $rows)]);
} catch (Exception $e) {
    error_log('bh lines_list: ' . $e->getMessage());
    echo json_encode(['ok' => false, 'msg' => 'Could not load the invoices. Check the database setup.']);
}