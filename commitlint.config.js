/**
 * Commit message rules. The source of truth is docs/COMMIT_SYSTEM.md §3.
 *
 * The two rules that commitlint has no built-in for are defined as a small local plugin:
 * a 72-character subject limit and the list of forbidden subjects. Every other rule uses
 * a built-in so there is nothing extra to maintain.
 */
const ALLOWED_SCOPES = [
  'repo',
  'app',
  'db',
  'backup',
  'audit',
  'auth',
  'i18n',
  'money',
  'dates',
  'print',
  'export',
  'ui',
  'settings',
  'academics',
  'students',
  'enrollments',
  'payments',
  'attendance',
  'exams',
  'leaderboard',
  'dashboard',
  'reports',
  'data-tools',
  'ci',
  'deps',
  'docs',
  'test',
  'e2e',
  'release',
  'scripts',
]

const FORBIDDEN_SUBJECTS = new Set(['wip', 'fix', 'fix2', 'stuff', 'update', 'changes', 'asdf'])

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-max-length': ({ subject }) => [
          (subject ?? '').length <= 72,
          'subject must be 72 characters or fewer',
        ],
        'subject-forbidden': ({ subject }) => [
          !FORBIDDEN_SUBJECTS.has((subject ?? '').toLowerCase().trim()),
          'subject is on the forbidden list in docs/COMMIT_SYSTEM.md §3',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'style', 'chore', 'revert'],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'scope-empty': [2, 'never'],
    'scope-enum': [2, 'always', ALLOWED_SCOPES],
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 72],
    'subject-forbidden': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 120],
    'body-max-line-length': [2, 'always', 100],
    'footer-max-line-length': [2, 'always', 100],
  },
}
