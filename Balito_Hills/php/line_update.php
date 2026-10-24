<?php
// ============================================================
//  php/line_update.php — Edit ONE saved line (Invoices page)
//  Same rules as saving: everything is re-checked and the total is
//  recalculated here. The change is written to bh_audit (before / after).
// ============================================================
require_once __DIR__ . '/session.php';
bhSessionStart();
date_default_timezone_set('Africa/Johannesburg');
require_once __DIR__ . '/settings.php';
header('Content-Type: application/json');

function fail(string $m): void { echo json_encode(['ok' => false, 'msg' => $m]); exit; }

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Invalid request.');
$in = json_decode(file_get_contents('php://input'), true);
if (!is_array($in)) fail('Invalid request.');

$table = (string)($in['table'] ?? '');
$id    = (int)($in['id'] ?? 0);
if (!preg_match('/^utopia_[a-z]{3}_[0-9]{4}$/', $table) || $id < 1) fail('Invalid line.');

// ── Validate the new values ──────────────────────────────────────────────────
$invRaw = preg_replace('/\D/', '', (string)($in['inv'] ?? ''));
$inv = intval($invRaw);
if ($invRaw === '' || strlen($invRaw) > BH_INVOICE_DIGITS || $inv < BH_INVOICE_MIN || $inv > BH_INVOICE_MAX) fail('Invoice number must be a valid ' . BH_INVOICE_DIGITS . '-digit number.');

$hotel = (string)($in['hotel'] ?? '');
if (!in_array($hotel, BH_HOTELS, true)) fail('Pick a hotel from the list.');
$unit = trim((string)($in['unit'] ?? ''));
foreach (BH_UNITS as $su) { if (strcasecmp($su, $unit) === 0) { $unit = $su; break; } }
if ($unit === '' || mb_strlen($unit) > 50) fail('Enter the hotel unit (up to 50 characters).');
$rateKey = (string)($in['rate'] ?? '');
if (!isset(BH_RATES[$rateKey])) fail('Pick a rate.');

$wRaw = trim((string)($in['weight'] ?? ''));
if (!preg_match('/^\d{1,4}(\.\d{1,2})?$/', $wRaw) || (float)$wRaw <= 0) fail('Weight must be more than 0 (max 2 decimals).');
$weight = round((float)$wRaw, 2);

$extraItem = trim((string)($in['extra_item'] ?? ''));
if (mb_strlen($extraItem) > 255) fail('Extra item name is too long.');
$eRaw = trim((string)($in['extra_amount'] ?? ''));
if ($eRaw === '') $eRaw = '0';
if (!preg_match('/^\d{1,5}(\.\d{1,2})?$/', $eRaw)) fail('Extra amount is not valid.');
$extraAmount = round((float)$eRaw, 2);
if ($extraAmount > 0 && $extraItem === '') fail('Name the extra item.');
if ($extraItem !== '' && $extraAmount <= 0) fail('Enter the amount for the extra item, or clear the item name.');

$date = (string)($in['date'] ?? '');
$d = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
if (!$d || $d->format('Y-m-d') !== $date || $d > new DateTimeImmutable('today') || $d < new DateTimeImmutable('2020-01-01')) fail('Pick a valid date (not in the future).');

try {
    $pdo = bhConnect();
    $pdo->beginTransaction();
    $pdo->prepare('SELECT pg_advisory_xact_lock(CAST(:n AS BIGINT))')->execute([':n' => $inv]);

    // The line as it is now
    $st = $pdo->prepare('SELECT * FROM utopia_all WHERE "SourceTable" = :t AND id = :id');
    $st->execute([':t' => $table, ':id' => $id]);
    $old = $st->fetch(PDO::FETCH_ASSOC);
    if (!$old) { $pdo->rollBack(); fail('That line no longer exists. Refresh the page.'); }

    // Same invoice on other lines is allowed only as a pair (same hotel/unit/date, different rate)
    $st = $pdo->prepare('SELECT "HotelName", "HotelNumber", "RateCode", "DateReceived" FROM utopia_all
                         WHERE "InvoiceNumber" = :n AND NOT ("SourceTable" = :t AND id = :id)');
    $st->execute([':n' => $inv, ':t' => $table, ':id' => $id]);
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $o) {
        if ($o['HotelName'] !== $hotel || $o['HotelNumber'] !== $unit || $o['DateReceived'] !== $date || $o['RateCode'] === $rateKey) {
            $pdo->rollBack();
            fail("Invoice #$inv is already used by another line. A ticket can repeat only as a " . implode(' + ', array_keys(BH_RATES)) . ' pair with the same hotel, unit and date.');
        }
    }

    // Keep the historical rate unless the rate code changed
    $ratePrice = ($old['RateCode'] === $rateKey) ? (float)$old['RatePerKg'] : BH_RATES[$rateKey]['price'];
    $cents = (int)round($weight * $ratePrice * 100) + (int)round($extraAmount * 100);

    $new = [
        'InvoiceNumber' => $inv, 'HotelName' => $hotel, 'HotelNumber' => $unit, 'RateCode' => $rateKey,
        'RatePerKg' => number_format($ratePrice, 2, '.', ''), 'Weight' => number_format($weight, 2, '.', ''),
        'ExtraItem' => $extraItem === '' ? null : $extraItem, 'ExtraAmount' => number_format($extraAmount, 2, '.', ''),
        'Total' => number_format($cents / 100, 2, '.', ''), 'DateReceived' => $date,
    ];

    $pdo->prepare('UPDATE public.' . $table . ' SET "InvoiceNumber" = :inv, "HotelName" = :hotel, "HotelNumber" = :unit,
                   "RateCode" = :rate, "RatePerKg" = :rp, "Weight" = :w, "ExtraItem" = :ei, "ExtraAmount" = :ea,
                   "Total" = :tot, "DateReceived" = :dt WHERE id = :id')->execute([
        ':inv' => $new['InvoiceNumber'], ':hotel' => $new['HotelName'], ':unit' => $new['HotelNumber'], ':rate' => $new['RateCode'],
        ':rp' => $new['RatePerKg'], ':w' => $new['Weight'], ':ei' => $new['ExtraItem'], ':ea' => $new['ExtraAmount'],
        ':tot' => $new['Total'], ':dt' => $new['DateReceived'], ':id' => $id,
    ]);

    $before = array_diff_key($old, ['SourceTable' => 1, 'id' => 1, 'CreatedAt' => 1]);
    $pdo->prepare('INSERT INTO bh_audit (action, source_table, row_id, before_data, after_data)
                   VALUES (\'edit\', :t, :id, CAST(:b AS jsonb), CAST(:a AS jsonb))')
        ->execute([':t' => $table, ':id' => $id, ':b' => json_encode($before), ':a' => json_encode($new)]);

    $pdo->commit();
    echo json_encode(['ok' => true, 'total' => $cents / 100]);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
    error_log('bh line_update: ' . $e->getMessage());
    fail(($e instanceof PDOException && $e->getCode() === '23505')
        ? 'That invoice number and rate already exist on another line.'
        : 'Could not save the change. Nothing was changed.');
}
