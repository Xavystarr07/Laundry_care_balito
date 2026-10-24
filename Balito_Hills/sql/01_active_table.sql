-- Run ONCE in Supabase. Remembers which monthly table new invoices go into.
-- (The statement's "start new month" step updates this for you from now on.)
CREATE TABLE IF NOT EXISTS bh_active (
    id  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    tbl TEXT NOT NULL
);
INSERT INTO bh_active (id, tbl) VALUES (1, 'utopia_sep_2026') ON CONFLICT (id) DO NOTHING;

SELECT * FROM bh_active;   -- expect: 1 | utopia_sep_2026
