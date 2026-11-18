-- Money is stored as whole taka from this version on. Earlier rows stored paisa.
-- Convert existing values once, rounding to the nearest taka.
-- Percent discount values are percentages, not money, so they are left alone.
UPDATE batches SET monthly_fee_minor = CAST(ROUND(monthly_fee_minor / 100.0) AS INTEGER);
UPDATE enrollments SET
  admission_fee_minor = CAST(ROUND(admission_fee_minor / 100.0) AS INTEGER),
  monthly_fee_minor = CAST(ROUND(monthly_fee_minor / 100.0) AS INTEGER);
UPDATE enrollments SET discount_value = CAST(ROUND(discount_value / 100.0) AS INTEGER)
  WHERE discount_kind = 'fixed' AND discount_value > 0;
UPDATE charges SET
  amount_minor = CAST(ROUND(amount_minor / 100.0) AS INTEGER),
  discount_minor = CAST(ROUND(discount_minor / 100.0) AS INTEGER);
UPDATE payments SET amount_minor = CAST(ROUND(amount_minor / 100.0) AS INTEGER);
UPDATE payment_allocations SET amount_minor = CAST(ROUND(amount_minor / 100.0) AS INTEGER);
