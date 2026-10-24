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
   (works on a new database and on the first version. Creates a NEW table "Ballito_invoices"; Laundry Care's table is untouched)
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
