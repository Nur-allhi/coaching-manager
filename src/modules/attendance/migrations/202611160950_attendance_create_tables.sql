-- Attendance sessions and per-student records.
CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  batch_id TEXT NOT NULL REFERENCES batches (id),
  held_on TEXT NOT NULL,
  UNIQUE (batch_id, held_on)
);
CREATE TABLE attendance_records (
  session_id TEXT NOT NULL REFERENCES attendance_sessions (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  status TEXT NOT NULL,
  PRIMARY KEY (session_id, student_id)
);
CREATE INDEX idx_attendance_records_student ON attendance_records (student_id);
