<?php
// ============================================================
//  php/range.php — picks the statement date range
//  Uses ?from=YYYY-MM-DD&to=YYYY-MM-DD. With nothing chosen, shows
//  the most recent month that has invoices (or this month if empty).
// ============================================================

function bhParseDate(?string $s): ?DateTimeImmutable {
    if (!$s) return null;
    $d = DateTimeImmutable::createFromFormat('!Y-m-d', $s);
    return ($d && $d->format('Y-m-d') === $s) ? $d : null;
}

function bhResolveRange(PDO $pdo): array {
    $from = bhParseDate($_GET['from'] ?? null);
    $to   = bhParseDate($_GET['to']   ?? null);

    if (!$from && !$to) {
        $max  = $pdo->query('SELECT MAX("DateReceived") FROM utopia_all')->fetchColumn();
        $base = $max ? new DateTimeImmutable($max) : new DateTimeImmutable('today');
        $from = $base->modify('first day of this month');
        $to   = $base->modify('last day of this month');
    } elseif (!$from) { $from = $to; }
    elseif   (!$to)   { $to   = $from; }

    if ($from > $to) { [$from, $to] = [$to, $from]; }   // dates picked the wrong way round
    return [$from->format('Y-m-d'), $to->format('Y-m-d')];
}

// "01 September 2026 — 30 September 2026"  (or a single date)
function bhPeriodText(string $from, string $to): string {
    $f = new DateTimeImmutable($from);
    $t = new DateTimeImmutable($to);
    return $from === $to
        ? $f->format('d F Y')
        : $f->format('d F Y') . ' — ' . $t->format('d F Y');
}
