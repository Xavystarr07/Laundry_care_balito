-- Run ONCE in Supabase. Records every edit / delete made on the Invoices page
-- (what the line looked like before and after), so mistakes can be traced.
CREATE TABLE IF NOT EXISTS bh_audit (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    action       TEXT   NOT NULL,          -- 'edit' / 'delete'
    source_table TEXT   NOT NULL,          -- e.g. utopia_sep_2026
    row_id       BIGINT NOT NULL,
    before_data  JSONB,
    after_data   JSONB
);
SELECT COUNT(*) AS audit_rows FROM bh_audit;   -- expect 0
