-- Exams and exam results. Marks are REAL; they are not money.
CREATE TABLE exams (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  batch_id TEXT NOT NULL REFERENCES batches (id),
  subject_id TEXT REFERENCES subjects (id),
  name TEXT NOT NULL,
  held_on TEXT NOT NULL,
  full_marks REAL NOT NULL,
  pass_marks REAL NOT NULL
);
CREATE TABLE exam_results (
  exam_id TEXT NOT NULL REFERENCES exams (id),
  student_id TEXT NOT NULL REFERENCES students (id),
  marks REAL,
  absent INTEGER NOT NULL DEFAULT 0,
  remark TEXT,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (exam_id, student_id)
);
CREATE INDEX idx_exam_results_student ON exam_results (student_id);
