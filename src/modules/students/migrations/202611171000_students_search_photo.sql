-- T-042 (D-043 B1/C1): FTS5 identity search and a bounded optional photo column.
-- Append-only: the five COMMON columns and every existing migration are untouched.
ALTER TABLE students ADD COLUMN photo BLOB;

CREATE VIRTUAL TABLE students_fts USING fts5(
  student_no, full_name, phone, guardian_name, guardian_phone,
  tokenize = 'unicode61 remove_diacritics 2'
);

-- Keep the index in step with every write. Soft delete is an UPDATE, so the update trigger
-- refreshes the row; list queries join on students and filter deleted_at, so a deleted row's
-- FTS entry can never surface. Restore re-runs the same trigger and the row reappears.
CREATE TRIGGER students_ai AFTER INSERT ON students BEGIN
  INSERT INTO students_fts(rowid, student_no, full_name, phone, guardian_name, guardian_phone)
  VALUES (new.rowid, new.student_no, new.full_name,
          coalesce(new.phone, ''), coalesce(new.guardian_name, ''), coalesce(new.guardian_phone, ''));
END;

CREATE TRIGGER students_ad AFTER DELETE ON students BEGIN
  DELETE FROM students_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER students_au AFTER UPDATE ON students BEGIN
  DELETE FROM students_fts WHERE rowid = old.rowid;
  INSERT INTO students_fts(rowid, student_no, full_name, phone, guardian_name, guardian_phone)
  VALUES (new.rowid, new.student_no, new.full_name,
          coalesce(new.phone, ''), coalesce(new.guardian_name, ''), coalesce(new.guardian_phone, ''));
END;
