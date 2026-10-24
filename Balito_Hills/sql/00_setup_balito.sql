-- ============================================================
--  BALLITO HILLS — DATABASE SETUP (run this ONE script, any time)
--  Safe on a new database AND on one that already has the first version.
--  Creates a separate table; Laundry Care's "invoices" is not touched.
--  One row per invoice line. A ticket (invoice number) may have one
--  line per rate, e.g. a WDF line + a WDI line.
-- ============================================================
BEGIN;

CREATE TABLE IF NOT EXISTS Ballito_invoices (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "InvoiceNumber" INT           NOT NULL,
    "HotelName"     VARCHAR(255)  NOT NULL,
    "HotelNumber"   VARCHAR(50)   NOT NULL,          -- the hotel unit
    "RateCode"      VARCHAR(20)   NOT NULL,          -- WDI / WDF
    "RatePerKg"     DECIMAL(10,2) NOT NULL,          -- rate at time of billing
    "Weight"        DECIMAL(10,2) NOT NULL,
    "ExtraItem"     VARCHAR(255),
    "ExtraAmount"   DECIMAL(10,2) NOT NULL DEFAULT 0,
    "Total"         DECIMAL(10,2) NOT NULL,          -- weight x rate + extra
    "DateReceived"  DATE          NOT NULL,
    "CreatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- If the first version was installed, drop its "one line per invoice number" rule
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT con.conname FROM pg_constraint con
    WHERE con.conrelid = 'public.Ballito_invoices'::regclass
      AND con.contype = 'u'
      AND array_length(con.conkey, 1) = 1
      AND (SELECT attname FROM pg_attribute
           WHERE attrelid = con.conrelid AND attnum = con.conkey[1]) = 'InvoiceNumber'
  LOOP
    EXECUTE format('ALTER TABLE public.Ballito_invoices DROP CONSTRAINT %%I', c);
  END LOOP;
END $$;

-- Never two lines of the same rate on one ticket
CREATE UNIQUE INDEX IF NOT EXISTS Ballito_invoices_ticket_rate_unique
    ON Ballito_invoices ("InvoiceNumber", "RateCode");

CREATE INDEX IF NOT EXISTS Ballito_invoices_hotel_idx
    ON Ballito_invoices ("HotelName", "HotelNumber");
CREATE INDEX IF NOT EXISTS Ballito_invoices_date_idx
    ON Ballito_invoices ("DateReceived");

COMMIT;
