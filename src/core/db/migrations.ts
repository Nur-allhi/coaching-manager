/**
 * The migration set. Each module contributes its own SQL; this file is the registry that
 * the runner sorts by version. Modules will expose their own slice through their index.ts
 * once their services land.
 */
import type { Migration } from './migrate'
import coreMeta from '../../modules/settings/migrations/202611160900_core_meta.sql?raw'
import academics from '../../modules/academics/migrations/202611160910_academics_create_tables.sql?raw'
import students from '../../modules/students/migrations/202611160920_students_create_tables.sql?raw'
import enrollments from '../../modules/enrollments/migrations/202611160930_enrollments_create_tables.sql?raw'
import payments from '../../modules/payments/migrations/202611160940_payments_create_tables.sql?raw'
import attendance from '../../modules/attendance/migrations/202611160950_attendance_create_tables.sql?raw'
import exams from '../../modules/exams/migrations/202611160960_exams_create_tables.sql?raw'
import studentSearch from '../../modules/students/migrations/202611171000_students_search_photo.sql?raw'

export const migrations: readonly Migration[] = [
  { version: 202611160900, module: 'settings', name: 'core_meta', sql: coreMeta },
  {
    version: 202611160910,
    module: 'academics',
    name: 'create_tables',
    sql: academics,
  },
  { version: 202611160920, module: 'students', name: 'create_tables', sql: students },
  {
    version: 202611160930,
    module: 'enrollments',
    name: 'create_tables',
    sql: enrollments,
  },
  { version: 202611160940, module: 'payments', name: 'create_tables', sql: payments },
  {
    version: 202611160950,
    module: 'attendance',
    name: 'create_tables',
    sql: attendance,
  },
  { version: 202611160960, module: 'exams', name: 'create_tables', sql: exams },
  {
    version: 202611171000,
    module: 'students',
    name: 'search_photo',
    sql: studentSearch,
  },
]
