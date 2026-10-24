<?php
   
// ============================================================
//  php/invoice_handler.php — Saves BALLITO HILLS invoice lines
//  Every line has its OWN invoice number (one DB row per line).
//  Nothing from the browser is trusted: everything is re-checked and
//  the TOTAL is recalculated here (weight x rate + extra amount).
//  All lines are saved in ONE transaction (all or nothing).
// ============================================================

require_once __DIR__ . '/session.php';
bhSessionStart();
date_default_timezone_set('Africa/Johannesburg');

require_once __DIR__ . '/activeTable.php';
require_once __DIR__ . '/activeTable.php';

function backWithPopup(string $type, string $msg, string $tip, ?array $restore = null): void {
    $_SESSION['popup'] = ['type' => $type, 'msg' => $msg, 'tip' => $tip];
    if ($restore !== null) $_SESSION['restore_rows'] = $restore;
    header('Location: ../invoice_generator.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../invoice_generator.php');
    exit;
}

// ── 1. Read payload (+ keep a copy to put back on failure) ───────────────────
$payload = json_decode($_POST['payload'] ?? '', true);
$restore = ['rows' => []];
if (is_array($payload) && isset($payload['rows']) && is_array($payload['rows'])) {
    foreach (array_slice($payload['rows'], 0, BH_MAX_ROWS) as $r) {
        if (!is_array($r)) continue;
        $restore['rows'][] = [
            'inv'          => preg_replace('/\D/', '', (string)($r['inv'] ?? '')),
            'hotel'        => (string)($r['hotel'] ?? ''),
            'unit'         => (string)($r['unit'] ?? ''),
            'rate'         => (string)($r['rate'] ?? ''),
            'weight'       => (string)($r['weight'] ?? ''),
            'extra_item'   => (string)($r['extra_item'] ?? ''),
            'extra_amount' => (string)($r['extra_amount'] ?? ''),
            'date'         => (string)($r['date'] ?? ''),
        ];
    }
}
if (!is_array($payload) || !isset($payload['rows']) || !is_array($payload['rows'])) {
    backWithPopup('error', 'Something went wrong reading the invoice lines.', 'Please try again.', $restore);
}

$rows = $payload['rows'];
if (count($rows) < 1)           backWithPopup('error', 'No lines to save.', 'Add at least one line.', $restore);
if (count($rows) > BH_MAX_ROWS) backWithPopup('error', 'Too many lines at once (max ' . BH_MAX_ROWS . ').', 'Save them in two batches.', $restore);

$today = new DateTimeImmutable('today');
$min   = $today->modify('-' . BH_DATE_MONTHS_BACK . ' months');

// ── 2. Validate every line (nothing is saved unless ALL are valid) ───────────
$clean   = [];
$seenInv = [];
$tickets = [];   // invoice => hotel/unit/date + rates used (a ticket may repeat as WDF + WDI)

foreach ($rows as $i => $r) {
    $n = $i + 1;
    if (!is_array($r)) backWithPopup('error', "Line $n is not valid.", 'Please try again.', $restore);

    // Invoice number
    $invRaw = preg_replace('/\D/', '', (string)($r['inv'] ?? ''));
    $inv    = intval($invRaw);
    if ($invRaw === '' || strlen($invRaw) > BH_INVOICE_DIGITS || $inv < BH_INVOICE_MIN || $inv > BH_INVOICE_MAX) {
        backWithPopup('error', "Line $n: invoice number must be a valid " . BH_INVOICE_DIGITS . "-digit number.", 'Enter the number from the slip.', $restore);
    }

    // Hotel / unit / rate
    $hotel = (string)($r['hotel'] ?? '');
    if (!in_array($hotel, BH_HOTELS, true)) backWithPopup('error', "Line $n: unknown hotel.", 'Pick a hotel from the list.', $restore);

    $unit = trim((string)($r['unit'] ?? ''));
    foreach (BH_UNITS as $su) { if (strcasecmp($su, $unit) === 0) { $unit = $su; break; } }
    if ($unit === '' || mb_strlen($unit) > 50) backWithPopup('error', "Line $n: enter the hotel unit.", 'Up to 50 characters.', $restore);

    $rateKey = (string)($r['rate'] ?? '');
    if (!isset(BH_RATES[$rateKey])) backWithPopup('error', "Line $n: pick a rate.", 'Choose ' . implode(' or ', array_keys(BH_RATES)) . '.', $restore);
    $rate = BH_RATES[$rateKey]['price'];

    // Weight (max 2 decimals, > 0)
    $wRaw = trim((string)($r['weight'] ?? ''));
    if (!preg_match('/^\d{1,4}(\.\d{1,2})?$/', $wRaw) || (float)$wRaw <= 0) {
        backWithPopup('error', "Line $n: weight must be more than 0 (max 2 decimals).", 'Example: 12.5', $restore);
    }
    $weight = round((float)$wRaw, 2);

    // Extra item + amount
    $extraItem = trim((string)($r['extra_item'] ?? ''));
    if (mb_strlen($extraItem) > 255) backWithPopup('error', "Line $n: extra item name is too long.", 'Max 255 characters.', $restore);
    $eRaw = trim((string)($r['extra_amount'] ?? ''));
    if ($eRaw === '') $eRaw = '0';
    if (!preg_match('/^\d{1,5}(\.\d{1,2})?$/', $eRaw)) backWithPopup('error', "Line $n: extra amount is not valid.", 'Use a positive amount, max 2 decimals.', $restore);
    $extraAmount = round((float)$eRaw, 2);
    if ($extraAmount > 0 && $extraItem === '') backWithPopup('error', "Line $n: name the extra item.", 'An amount needs an item name.', $restore);
    if ($extraItem !== '' && $extraAmount <= 0) backWithPopup('error', "Line $n: enter the amount for the extra item.", 'Or clear the item name.', $restore);

    // Date
    $date = (string)($r['date'] ?? '');
    $d    = DateTimeImmutable::createFromFormat('!Y-m-d', $date);
    if (!$d || $d->format('Y-m-d') !== $date || $d < $min || $d > $today) {
        backWithPopup('error', "Line $n: date must be within the last " . BH_DATE_MONTHS_BACK . " months and not in the future.", 'Pick a valid date.', $restore);
    }

    // Same invoice on two lines is allowed ONLY as a pair: same hotel, unit and date, different rate
    if (isset($tickets[$inv])) {
        $t = $tickets[$inv];
        if ($t['hotel'] !== $hotel || $t['unit'] !== $unit || $t['date'] !== $date || isset($t['rates'][$rateKey])) {
            backWithPopup('error', "Line $n: invoice #$inv is on more than one line.",
                'A ticket can repeat only for ' . implode(' + ', array_keys(BH_RATES)) . ' with the same hotel, unit and date.', $restore);
        }
        $tickets[$inv]['rates'][$rateKey] = true;
    } else {
        $tickets[$inv] = ['hotel' => $hotel, 'unit' => $unit, 'date' => $date, 'rates' => [$rateKey => true]];
    }
    $seenInv[$inv] = true;

    // Total — calculated HERE, in cents (same maths as the browser)
    $cents = (int)round($weight * $rate * 100) + (int)round($extraAmount * 100);

    $clean[] = [
        'inv' => $inv, 'hotel' => $hotel, 'unit' => $unit, 'rate' => $rateKey, 'ratePrice' => $rate,
        'weight' => $weight, 'extraItem' => $extraItem, 'extraAmount' => $extraAmount,
        'date' => $date, 'cents' => $cents,
    ];
}

// ── 3. Save everything in one transaction ────────────────────────────────────
try {
    $pdo = bhConnect();
} catch (Exception $e) {
    error_log('bh handler connect: ' . $e->getMessage());
    backWithPopup('error', 'Database connection failed.', 'Check config.php credentials.', $restore);
}

try {
    $pdo->beginTransaction();

    // Lock each invoice number (sorted → no deadlocks)
    $numbers = array_keys($seenInv);
    sort($numbers);
    $lock = $pdo->prepare('SELECT pg_advisory_xact_lock(CAST(:n AS BIGINT))');
    foreach ($numbers as $num) $lock->execute([':n' => $num]);

    $check = $pdo->prepare('SELECT 1 FROM utopia_all WHERE "InvoiceNumber" = :n LIMIT 1');
    foreach ($numbers as $num) {
        $check->execute([':n' => $num]);
        if ($check->fetchColumn()) {
            $pdo->rollBack();
            backWithPopup('dupe', "Invoice #$num already exists in the database. Nothing was saved.", "Change that line's invoice number and save again.", $restore);
        }
    }

    $ins = $pdo->prepare('
        INSERT INTO ' . bhActiveTable($pdo) . '
            ("InvoiceNumber", "HotelName", "HotelNumber", "RateCode", "RatePerKg", "Weight",
             "ExtraItem", "ExtraAmount", "Total", "DateReceived")
        VALUES
            (:inv, :hotel, :unit, :rate, :rateprice, :weight, :extra, :extraamt, :total, :date)
        RETURNING id
    ');

    $sumCents = 0;
    $savedIds = [];
    foreach ($clean as $c) {
        $ins->execute([
            ':inv'       => $c['inv'],
            ':hotel'     => $c['hotel'],
            ':unit'      => $c['unit'],
            ':rate'      => $c['rate'],
            ':rateprice' => number_format($c['ratePrice'], 2, '.', ''),
            ':weight'    => number_format($c['weight'], 2, '.', ''),
            ':extra'     => $c['extraItem'] === '' ? null : $c['extraItem'],
            ':extraamt'  => number_format($c['extraAmount'], 2, '.', ''),
            ':total'     => number_format($c['cents'] / 100, 2, '.', ''),
            ':date'      => $c['date'],
        ]);
        $savedIds[] = (int)$ins->fetchColumn();
        $ins->closeCursor();
        $sumCents += $c['cents'];
    }

    $pdo->commit();
    $_SESSION['last_save'] = ['type' => 'Ballito', 'ids' => $savedIds, 'time' => time(), 'restore' => $restore];

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log('bh handler save: ' . $e->getMessage());
    backWithPopup('error', 'Could not save — nothing was saved.', 'Your lines are still here. Try again, or contact your system administrator.', $restore);
}

// ── 4. Success ───────────────────────────────────────────────────────────────
$count = count($clean);
backWithPopup('success',
    "$count line" . ($count === 1 ? '' : 's') . ' saved (R' . number_format($sumCents / 100, 2) . ' total)',
    'Ready for the next invoice.');
