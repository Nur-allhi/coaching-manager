-- Charges, payments and their allocations. All money is integer paisa.
CREATE TABLE charges (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  enrollment_id TEXT NOT NULL REFERENCES enrollments (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  month TEXT,
  kind TEXT NOT NULL,
  description TEXT,
  amount_minor INTEGER NOT NULL,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  UNIQUE (enrollment_id, month, kind)
);
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  receipt_no TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL REFERENCES students (id),
  paid_on TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'cash',
  amount_minor INTEGER NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'valid',
  revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE payment_allocations (
  payment_id TEXT NOT NULL REFERENCES payments (id),
  charge_id TEXT NOT NULL REFERENCES charges (id),
  amount_minor INTEGER NOT NULL,
  PRIMARY KEY (payment_id, charge_id)
);
CREATE INDEX idx_charges_student_month ON charges (student_id, month);
CREATE INDEX idx_payments_student_paid ON payments (student_id, paid_on);
