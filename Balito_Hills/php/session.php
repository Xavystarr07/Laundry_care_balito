<?php
// php/session.php — BALLITO HILLS uses its OWN session cookie so it never
// clashes with Laundry Care (both run on localhost).
function bhSessionStart(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_name('BallitoSESSID');
        session_start();
    }
}
