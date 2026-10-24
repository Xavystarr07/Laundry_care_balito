<?php
// ============================================================
//  php/queries.php — All SQL for the BALLITO HILLS statement
//  Edit individual functions to change what data is fetched
// ============================================================

// Units are sorted numerically first (9, 10, 144 …), then text (30T, Karen)
const BH_UNIT_ORDER = '
    "HotelName",
    (CASE WHEN "HotelNumber" ~ \'^[0-9]+$\' THEN 0 ELSE 1 END),
    (CASE WHEN "HotelNumber" ~ \'^[0-9]+$\' THEN CAST("HotelNumber" AS BIGINT) END),
    "HotelNumber"';

// One row per hotel + unit with the total for the period (the table on the page)
function bhUnitSummary(PDO $pdo, string $from, string $to): array {
    $stmt = $pdo->prepare('
        SELECT "HotelName", "HotelNumber", SUM("Total") AS "UnitTotal"
        FROM utopia_all
        WHERE "DateReceived" BETWEEN :f AND :t
        GROUP BY "HotelName", "HotelNumber"
        ORDER BY ' . BH_UNIT_ORDER);
    $stmt->execute([':f' => $from, ':t' => $to]);
    $rows  = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $total = array_sum(array_column($rows, 'UnitTotal'));
    return ['rows' => $rows, 'total' => $total];
}

// Every saved line in the period (feeds the Excel download)
function bhStatementLines(PDO $pdo, string $from, string $to): array {
    $stmt = $pdo->prepare('
        SELECT "InvoiceNumber", "HotelName", "HotelNumber", "RateCode", "RatePerKg",
               "Weight", "ExtraItem", "ExtraAmount", "Total", "DateReceived"
        FROM utopia_all
        WHERE "DateReceived" BETWEEN :f AND :t
        ORDER BY ' . BH_UNIT_ORDER . ', "DateReceived", "InvoiceNumber", "RateCode"');
    $stmt->execute([':f' => $from, ':t' => $to]);

    return array_map(fn($r) => [
        'inv'          => (int)$r['InvoiceNumber'],
        'hotel'        => $r['HotelName'],
        'unit'         => $r['HotelNumber'],
        'rate'         => $r['RateCode'],
        'rateprice'    => (float)$r['RatePerKg'],
        'weight'       => (float)$r['Weight'],
        'extra_item'   => $r['ExtraItem'] ?? '',
        'extra_amount' => (float)$r['ExtraAmount'],
        'total'        => (float)$r['Total'],
        'date'         => $r['DateReceived'],
    ], $stmt->fetchAll(PDO::FETCH_ASSOC));
}
