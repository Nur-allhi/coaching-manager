-- Enrollments: one student may be in several batches.
CREATE TABLE enrollments (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  student_id TEXT NOT NULL REFERENCES students (id),
  batch_id TEXT NOT NULL REFERENCES batches (id),
  enrolled_on TEXT NOT NULL,
  left_on TEXT,
  admission_fee_minor INTEGER NOT NULL DEFAULT 0,
  monthly_fee_minor INTEGER NOT NULL,
  discount_kind TEXT NOT NULL DEFAULT 'none',
  discount_value INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX idx_enrollments_student ON enrollments (student_id);
CREATE INDEX idx_enrollments_batch ON enrollments (batch_id);
