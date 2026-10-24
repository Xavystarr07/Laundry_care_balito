<?php
// ============================================================
//  php/settings.php — THE ONE PLACE TO EDIT
//  Rate, hotels + their units, extra items, business details, bank
//  details, statement recipient, email, limits.
//  The pages (JS) and the save handler (PHP) both read from here,
//  so you never have to change two files.
// ============================================================

// ── Rate per kg (one constant rate — nothing to choose) ──────
//    Keep the key 'WDI': it is the code saved in the RateCode column.
const BH_RATES = [
    'WDI' => ['label' => 'Rate', 'price' => 31.00],
];

// ── Hotels = the property groups (Hotel list in the form) ────
const BH_HOTELS = [
    'Ballito Hills',
    'Ballito Village',
    'Simbithi Eco Estate',
    'Beverly Hills Estate',
    'Dunkirk Estate',
    'Zululami Estate',
    'Glen Eagles',
    'Tahari Coastal Estate',
    'Burleigh',
];

// ── Units for each hotel (the Unit dropdown follows the chosen hotel; you can still type any) ──
const BH_UNITS_BY_HOTEL = [
    'Ballito Hills' => ['53', '58', '164', '169', '171', '258', '356', '366', '369', '493', '771', '824', '825', '830', '851', '865', '1001', '1002', '1017', '1146', '1153', '1240', '1279', '1318'],
    'Ballito Village' => ['77', '144', '244', '304'],
    'Simbithi Eco Estate' => ['16 Tamboti', '21 Tamboti', '38 Fuschia Way'],
    'Beverly Hills Estate' => ['17 Malibu', '46 Malibu', '48 Mahogony Drive', '8 Belair'],
    'Dunkirk Estate' => ['6 Forest', '18 Forest Apartment', '9 Forest Apartment', '9 Dash Apartment', '10 Dash Apartment', '11 Dash Apartment', '15 Dash Apartment', '11 Gowrie Lane', '3 Sameja Drive', '48 Sameja Drive', '116 Sameja Drive', '146 Sameja Drive', '205 Sameja Drive', '6 Ashwood Close', 'RR7 The Glades', 'Family Home 19'],
    'Zululami Estate' => ['22 Mbali Loop', '21 Husk'],
    'Glen Eagles' => ['10'],
    'Tahari Coastal Estate' => ['30'],
    'Burleigh' => ['108', '204'],
];
// All units in one list (used for spelling/case matching) — do not edit
define('BH_UNITS', array_values(array_unique(array_merge(...array_values(BH_UNITS_BY_HOTEL)))));

// ── Extra Item suggestions (dropdown; you can still type any) ─
const BH_EXTRA_ITEMS = [
    'Carpet',
];

// ── Business details (printed invoice, statement) ────────────
const BH_BUSINESS = [
    'name'     => 'LAUNDRY CARE',
    'tagline'  => 'A FRESH START IN EVERY WASH',
    'address'  => ['2 Tottenham Road', 'Parkgate', 'Cornubia'],
    'web'      => 'www.laundrycare.co.za',
    'emails'   => ['donovanmark14@gmail.com', 'laundry_care@outlook.com'],
    'phones'   => ['Cell: 062 283 9374', 'Cell: 069 780 0340'],
];

// ── Monthly statement: who it is addressed to ────────────────
const BH_STATEMENT_TO = [
    'Utopia Holidays,',
    'Karen Landman',
    '2 Avenue Hills',
    'Ballito',
];

// ── Banking details (bottom of the statement) ────────────────
const BH_BANK = [
    'Bank'           => 'FNB',
    'Account Holder' => 'Laundry Care',
    'Account Number' => '63179920872',
    'Account Type'   => 'Cheque',
];

// ── Statement email (to the client, cc yourself) ─────────────
const BH_EMAIL = [
    'to'      => 'ballito-estates@utopiaholidays.co.za',
    'cc'      => 'donovanmark14@gmail.com',
    'subject' => 'Laundry Care statement — {month}',
    'body'    => "Hi there,\n\nI hope you are well. :)\n\nBelow is the Laundry Care Excel sheet and statement for {month} (billing period: {period}).\n\nWarm regards,\nXavier\nLaundry Care",
];

// ── Limits ───────────────────────────────────────────────────
const BH_INVOICE_DIGITS    = 5;      // invoice numbers are exactly this many digits
const BH_INVOICE_MIN       = 1;
const BH_INVOICE_MAX       = 99999;
const BH_DATE_MONTHS_BACK  = 2;      // dates allowed: today back to N months ago
const BH_MAX_ROWS          = 200;    // lines per save

// ── Passed to the browser (do not edit) ──────────────────────
function bhClientConfig(): array {
    return [
        'rates'         => BH_RATES,
        'hotels'        => BH_HOTELS,
        'units'         => BH_UNITS,
        'unitsByHotel'  => BH_UNITS_BY_HOTEL,
        'extraItems'    => BH_EXTRA_ITEMS,
        'business'      => BH_BUSINESS,
        'statementTo'   => BH_STATEMENT_TO,
        'bank'          => BH_BANK,
        'email'         => BH_EMAIL,
        'invoiceDigits' => BH_INVOICE_DIGITS,
        'monthsBack'    => BH_DATE_MONTHS_BACK,
        'maxRows'       => BH_MAX_ROWS,
    ];
}

// ── Database connection (used by every page) ─────────────────
if (!function_exists('bhConnect')) {
    function bhConnect(): PDO {
        require_once __DIR__ . '/../config.php';
        return new PDO(
            "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME,
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
    }
}
