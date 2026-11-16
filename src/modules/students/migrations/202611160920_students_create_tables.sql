-- Students and the indexes used by search, phone lookup and sorting.
CREATE TABLE students (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  student_no TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  gender TEXT,
  dob TEXT,
  phone TEXT,
  guardian_name TEXT,
  guardian_phone TEXT,
  address TEXT,
  school_name TEXT,
  admitted_on TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT
);
CREATE INDEX idx_students_full_name ON students (full_name);
CREATE INDEX idx_students_phone ON students (phone);
