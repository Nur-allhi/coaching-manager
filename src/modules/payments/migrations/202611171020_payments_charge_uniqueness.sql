-- T-050 (D-046 A1): a unique key that also covers one-off charges, whose month is NULL.
-- SQLite treats NULLs as distinct in UNIQUE constraints, so the table's original
-- UNIQUE(enrollment_id, month, kind) does not stop two admission charges. This expression index
-- folds NULL month to '' and makes the generator's INSERT ... ON CONFLICT DO NOTHING idempotent
-- for both dated monthly charges and undated admission charges. Append-only.
CREATE UNIQUE INDEX idx_charges_oneoff
  ON charges (enrollment_id, COALESCE(month, ''), kind);
