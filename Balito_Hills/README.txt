============================================================
  BALLITO HILLS — INVOICE APP — FILE STRUCTURE GUIDE
============================================================

Ballito_Hills/
│
├── invoice_generator.php        ← MAIN PAGE (entry point)
├── config.php                   ← DATABASE LOGIN (same values as Laundry Care)
│
├── php/
│   ├── settings.php             ← *** RATES, HOTELS, BUSINESS DETAILS — EDIT HERE ***
│   ├── db.php                   ← database connection
│   ├── session.php              ← own session cookie (no clash with Laundry Care)
│   ├── invoice_handler.php      ← SAVE: validates + recalculates + inserts (one transaction)
│   ├── check_invoice.php        ← "does this invoice number exist?" (JSON)
│   ├── undo_helper.php          ← arms the Undo ✕ after a save
│   └── undo_save.php            ← deletes the last save (30 second window)
│
├── html_css/
│   ├── base.css                 ← page colours, light + dark theme variables
│   ├── header.css               ← top header layout
│   ├── table.css                ← invoice table, red ✕ buttons, grand total
│   ├── inputs.css               ← fields + selects
│   ├── buttons.css              ← all buttons
│   └── print.css                ← Ctrl+P safety
│
├── js/
│   ├── invoiceFormat.js         ← digits-only, money + escape helpers
│   ├── rowManager.js            ← build / add / read rows
│   ├── calc.js                  ← row total + grand total
│   ├── rowRemove.js             ← red ✕ per line
│   ├── validation.js            ← row checks + duplicate invoice check
│   ├── saveInvoice.js           ← Save Invoice button
│   ├── printInvoice.js          ← printed copy (white, A4 landscape)
│   ├── navigation.js            ← Monthly Statements button + confirm dialog
│   ├── popupNotify.js           ← bottom-middle popups
│   ├── themeToggle.js           ← dark / light button
│   ├── undoSave.js              ← ✕ on "saved" popup = Undo
│   ├── draft.js                 ← autosaves unsaved lines in the browser + "Reset all" button
│   ├── entryForm.js             ← step-by-step Entry Form popup
│   ├── shortcuts.js             ← Ctrl+S, Enter = new line, Saved Invoices button
│   ├── pdfWriter.js             ← tiny PDF engine (no libraries)
│   ├── pdfInvoice.js            ← builds the invoice PDF (called by printInvoice.js)
│   ├── invoicesPage.js          ← Saved Invoices page: search, edit, delete, reprint
│   └── main.js                  ← start-up (keep LAST)
│
├── partials/
│   └── header.php               ← business header (reads php/settings.php)
│
├── monthly_statement/
│   ├── monthly_statement.php    ← STATEMENT PAGE (shows automatically)
│   ├── php/
│   │   ├── range.php            ← picks the date range (+ typed-out period text)
│   │   └── queries.php          ← SQL: per-unit totals + all lines
│   ├── css/  base, header, table, buttons, forms, print
│   ├── js/
│   │   ├── dateRange.js         ← two date pickers + month chips
│   │   ├── print.js             ← printed statement (blue, like Laundry Care)
│   │   ├── excelExport.js       ← Excel layout (Statement + Detail sheets)
│   │   └── xlsxWriter.js        ← builds the .xlsx file (no edits needed)
│   └── partials/  header.php, banking.php
│
└── sql/
    ├── 00_setup_Ballito.sql          ← RUN FIRST in Supabase (new or existing install)
    └── 03_import_september_2026.sql ← optional: loads the September PDF tickets

============================================================
  HOW TO INSTALL
============================================================
1. Copy the Ballito_Hills folder to  C:\xampp\htdocs\
2. Open config.php → paste the SAME database values as Laundry Care.
3. Supabase → SQL editor → run  sql/00_setup_Ballito.sql
   (OLD first-version script. The live app now uses MONTHLY tables, see DATABASE below.)
4. Visit  http://localhost/Ballito_Hills/invoice_generator.php

============================================================
  QUICK EDIT GUIDE
============================================================
Change a rate / hotel / unit / extra item / business, bank or
statement-recipient details                     → php/settings.php  (only place)
Can't connect to database                       → config.php
Save fails / wrong data saved                   → php/invoice_handler.php
Total calculating wrong                         → js/calc.js  (+ php/invoice_handler.php)
Row checks / error messages                     → js/validation.js
Table looks wrong                               → html_css/table.css
Buttons look wrong                              → html_css/buttons.css
Printed copy looks wrong                        → js/printInvoice.js
Colours / dark mode                             → html_css/base.css

HOW A LINE IS SAVED
Each line is saved as ONE row. A ticket (invoice number) may appear on two
lines ONLY as a pair — same hotel, unit and date, one WDF + one WDI.
Each line:
  Total = Weight x Rate + Extra Amount  (recalculated on the server)
The rate at the time is stored too, so old invoices never change if rates change.

============================================================
  DATABASE (Supabase / PostgreSQL) — BALLITO = "UTOPIA"
============================================================
Balito tables start with  bh_  or  utopia_ . Everything else in the project
(may_2026, june_2026, invoices, lc_*, teremok_*, etc.) belongs to Laundry Care /
Teremok / Umhlanga. NEVER touch those from this app.

TABLES
  utopia_oct_2026, utopia_nov_2026 ...  One table per MONTH, one row per invoice line.
                                         Names must match utopia_xxx_YYYY (xxx = jan..dec).
                                         Columns: id, InvoiceNumber, HotelName, HotelNumber (unit),
                                         RateCode, RatePerKg, Weight, ExtraItem, ExtraAmount,
                                         Total, DateReceived, CreatedAt.
                                         Unique on (InvoiceNumber, RateCode).
  utopia_all (VIEW)                      All month tables stacked, plus a "SourceTable" column.
                                         Every page READS from this. Rebuilt by bh_create_month().
  bh_active                              ONE row (id=1): tbl = month table that NEW invoices go into.
  bh_periods                             Statement periods: id, name ("November 2026"), start_date,
                                         end_date, is_closed, closed_at, fuel_days, fuel_rate.
                                         Only one period is open at a time.
  bh_line_period                         Links each line to a period: (source_table, row_id, period_id).
                                         No link = shows "—" under Statement and is missing from statements.
                                         Row count must equal utopia_all.
  bh_audit                               Log of every edit / delete from the Saved Invoices page
                                         (before_data / after_data as JSON).

SQL FUNCTIONS / TRIGGERS (live in Supabase, not in the project files)
  bh_create_month(tbl text)   Creates a month table + indexes, attaches the duplicate trigger,
                              and rebuilds the utopia_all view. Safe to run twice.
                              Called by php/activeTable.php and monthly_statement/php/close_period.php.
  bh_block_dupes() + trigger bh_dupes (on every month table, BEFORE INSERT)
                              Rejects an InvoiceNumber + RateCode that already exists in ANY month table.
                              Protects against SQL-editor inserts and wrong-table saves.

HOW SAVING FLOWS
  1. invoice_handler.php validates, recalculates totals in cents, locks invoice numbers.
  2. bhActiveTable() picks the month table (follows the OPEN period name, never goes backwards).
  3. INSERT goes into public.$actTbl  (NEVER hardcode a month table name in PHP).
  4. A bh_line_period row links each new line to the open period.
  5. Undo (30 s) deletes the lines and their links.

SAFETY FEATURES
  Draft autosave   js/draft.js saves unsaved table lines to the browser (localStorage key bhDraft,
                   14 days) and restores them on reload. Cleared after a successful save.
  Reset all        Red button on the invoice page. Asks "are you sure", clears the table + draft.
                   Does NOT touch saved database lines (use Delete on Saved Invoices).
  Print first      Save is blocked until Print has made a PDF copy of the exact current lines.

WHEN INSERTING BY HAND IN THE SQL EDITOR
  1. Insert into the CURRENT month table (SELECT tbl FROM bh_active).
  2. Then link the lines:
     INSERT INTO bh_line_period (source_table, row_id, period_id)
     SELECT 'utopia_nov_2026', id, (SELECT id FROM bh_periods WHERE is_closed = FALSE ORDER BY id LIMIT 1)
     FROM utopia_nov_2026 WHERE "InvoiceNumber" BETWEEN 223 AND 232 ON CONFLICT DO NOTHING;
  3. Never insert the same invoice twice (the trigger will error if you do).

USEFUL CHECKS
  All Balito tables + row counts:  see the query in the chat history, or list tables LIKE 'bh\_%' / 'utopia\_%'.
  Lines with no statement link:
    SELECT u."SourceTable", u."InvoiceNumber" FROM utopia_all u
    LEFT JOIN bh_line_period lp ON lp.source_table = u."SourceTable" AND lp.row_id = u.id
    WHERE lp.row_id IS NULL;

============================================================
  RULES FOR WHOEVER EDITS THIS PROJECT (the owner's preferences)
============================================================
  - Give changes as FIND / REPLACE blocks that are easy to copy and paste.
  - Keep replies short (minimise tokens). Do NOT test unless asked.
  - Code must fit the existing structure (settings in php/settings.php, one file per concern).
