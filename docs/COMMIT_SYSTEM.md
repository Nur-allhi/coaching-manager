# COMMIT_SYSTEM — Commit System

**Status:** live · **Target skill:** `gitnexus` · **Enforced by:** `code-reviewer`

The format, the vocabulary and the atomicity rules for every commit in this repository.

---

## 1. Format

Conventional Commits.

```
<type>(<scope>)<!>: <subject>

<body: why, not what; wrapped at 100 columns>

<footers>
Refs: T-<id>
Fixes: BUG-<id>
BREAKING CHANGE: <what breaks and how to migrate>
```

## 2. Types and release impact

| Type       | Meaning                                        | Version impact            |
| ---------- | ---------------------------------------------- | ------------------------- |
| `feat`     | A new user-visible capability                  | minor                     |
| `fix`      | A bug fix                                      | patch                     |
| `perf`     | A performance improvement, same behaviour      | patch                     |
| `refactor` | An internal restructure, same behaviour        | none                      |
| `docs`     | Documentation only                             | none                      |
| `test`     | Tests only                                     | none                      |
| `style`    | Formatting only, no logic change               | none                      |
| `chore`    | Tooling, config, dependencies, release         | none                      |
| `revert`   | Reverts a prior commit; the body names the SHA | follows the reverted type |

## 3. Rules

1. The scope is **required**, lowercase, and MUST be one of the allowed scopes in §4.
2. The subject is imperative mood, starts lowercase, is **72 characters or fewer**, and has no
   trailing period.
3. A breaking change uses **both** the `!` after the scope and a `BREAKING CHANGE:` footer.
4. Footers reference the ticket (`Refs: T-012`) and any bug (`Fixes: BUG-003`).
5. **One logical change per commit.** The code, its tests, and the README, CHANGELOG or
   documentation it affects go in the same commit.
6. Every commit MUST build and pass lint, typecheck and tests, so the history stays
   bisectable.
7. Refactoring MUST NOT be mixed with a feature or a fix. Formatting churn MUST NOT be mixed
   with a logic change.
8. `--no-verify` MUST NOT be used.
9. Commits others may have pulled MUST NOT be amended or rebased. Your own unpushed commits,
   or commits on your own branch, MAY be rebased with `--force-with-lease`.
10. Forbidden messages: `wip`, `fix`, `fix2`, `stuff`, `update`, `changes`, `asdf`, and
    anything without a type and a scope.

## 4. Allowed scopes

Derived from the modules in [`TAD.md`](TAD.md) §7 and the screens in
[`FRONTEND_SPEC.md`](FRONTEND_SPEC.md) §4.

| Scope         | Covers                                                                  |
| ------------- | ----------------------------------------------------------------------- |
| `repo`        | Repository-wide configuration, tooling, the `.gitignore`, CI wiring     |
| `app`         | The shell, router, registry, providers, error boundary, single-tab lock |
| `db`          | The worker, the `Db` client, migrations, repository helpers             |
| `backup`      | Snapshots, restore, file export and import                              |
| `audit`       | The audit writer, undo, the history panel, the audit viewer             |
| `auth`        | PIN, session, roles, permissions                                        |
| `i18n`        | Translations, the language toggle, the number and date locale plumbing  |
| `money`       | Money formatting, parsing, rounding, the amount helpers                 |
| `dates`       | Date and month helpers, the Asia/Dhaka boundary                         |
| `print`       | The print routes and their `@page` layouts                              |
| `export`      | Excel, CSV and file export plumbing                                     |
| `ui`          | Shared application components, the design tokens, the UI kit glue       |
| `settings`    | The settings module                                                     |
| `academics`   | Years, classes, subjects, batches                                       |
| `students`    | Students, admission, the profile                                        |
| `enrollments` | Enrollments, transfers, discounts                                       |
| `payments`    | Charges, payments, allocation, dues, receipts                           |
| `attendance`  | Sessions and the attendance grid                                        |
| `exams`       | Exams, marks, grades, GPA                                               |
| `leaderboard` | Rankings and the leaderboard                                            |
| `dashboard`   | The dashboard                                                           |
| `reports`     | The reports framework and every report                                  |
| `data-tools`  | Backup UI, import, the danger zone                                      |
| `ci`          | Workflow files and CI scripts                                           |
| `deps`        | Dependency additions, removals and version bumps                        |
| `docs`        | Documents under `docs/`, and `README.md`, `CHANGELOG.md`, `AGENTS.md`   |
| `test`        | Test infrastructure and test-only changes                               |
| `e2e`         | Playwright specs                                                        |
| `release`     | Version bumps, tagging, release notes                                   |
| `scripts`     | One-off scripts such as the seed generator                              |

A scope that is not on this list MUST be added to this table first. Adding one is a change to
this document, and follows the confirmation protocol in [`REPO_RULES.md`](REPO_RULES.md) §1.

## 5. Examples

Good:

```
feat(payments): add partial payment allocation

Allocations are now bounded by the payment amount, so a partial payment
leaves the remainder due instead of being silently dropped.

Refs: T-051
```

```
fix(auth): reject expired refresh tokens

Fixes: BUG-003
```

Bad:

```
fixed stuff
```

```
feat: lots of things
```

The second is bad for two reasons: no scope, and not atomic.

## 6. Pre-commit routine

The agent runs these before every commit.

1. `git status` and `git diff --staged` are read in full. No unrelated or generated files.
2. Lint, typecheck and tests pass.
3. The message validates against §1–§4.

## 7. Enforcement

The enforcement mechanism is a decision and is recorded in [`DECISIONS.md`](DECISIONS.md). The
options that were considered:

| Option | Mechanism                         | Strength                                                           | Cost                                                 |
| ------ | --------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------- |
| A      | Husky + commitlint + lint-staged  | Strongest feedback loop; catches the message before it exists      | Three dev dependencies and a hook install step       |
| B      | commitlint in CI only             | No local setup; bad commits are caught late, after they are pushed | One dev dependency; the author only learns in CI     |
| C      | A dependency-free git hook script | Lightest footprint, nothing to install                             | Weaker rule coverage; the script is ours to maintain |

Signed commits are a separate decision and are not assumed either way.

Until a mechanism is chosen, `code-reviewer` enforces §1–§4 manually on every PR.

## 8. Version impact

Each ticket in [`TICKETS.md`](TICKETS.md) declares a **Version impact**. `code-reviewer`
checks the declared impact against the commits in the PR, per
[`VERSIONING.md`](VERSIONING.md) §3.

| Declared impact | Commits that satisfy it                           |
| --------------- | ------------------------------------------------- |
| `none`          | Only `docs`, `test`, `refactor`, `style`, `chore` |
| `patch`         | At least one `fix` or `perf`, and no `feat`       |
| `minor`         | At least one `feat`                               |
| `major`         | A `!` marker or a `BREAKING CHANGE:` footer       |

## 9. Related documents

| Document                         | Holds                                       |
| -------------------------------- | ------------------------------------------- |
| [`BRANCHING.md`](BRANCHING.md)   | Where the commit goes.                      |
| [`VERSIONING.md`](VERSIONING.md) | What the commit type means for the release. |
| [`REPO_RULES.md`](REPO_RULES.md) | The merge rules that consume these commits. |
