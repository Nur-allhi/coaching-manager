# VERSIONING — Versioning System

**Status:** live · **Target skill:** `gitnexus` · **Enforced by:** `code-reviewer`

Semantic Versioning, the sources of truth, and the release procedure.

---

## 1. Policy

1. The project follows **Semantic Versioning 2.0.0**: `MAJOR.MINOR.PATCH`.
2. The first version is **`0.1.0`**. The current version is `0.1.0`.
3. While the version is below `1.0.0`, a breaking change bumps **MINOR**, not MAJOR.
4. `1.0.0` is released only when the human declares the product production-ready.

## 2. Bump rules

The bump is derived from the commits since the last tag.

| Commits since the last tag                             | Bump                                |
| ------------------------------------------------------ | ----------------------------------- |
| Any `BREAKING CHANGE` footer, or a `!` after the scope | **major** (minor while below 1.0.0) |
| Any `feat`                                             | **minor**                           |
| Only `fix` or `perf`                                   | **patch**                           |
| Only `docs`, `test`, `refactor`, `style`, `chore`      | **no release required**             |

A ticket declares its expected **Version impact** in [`TICKETS.md`](TICKETS.md).
`code-reviewer` checks the declaration against the commits in the PR, per
[`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md) §8.

## 3. Sources of truth

There is exactly one version field, and everything else is derived from it or must match it.

| Thing                       | Source of truth                         | Derived                                           |
| --------------------------- | --------------------------------------- | ------------------------------------------------- |
| Product version             | `version` in `package.json`             | Tags, CHANGELOG headings, the version in Settings |
| Persisted schema version    | `schema_version` in `app_meta`          | The migration runner's target                     |
| Backup / export file format | `format_version` in the export manifest | The import validator's compatibility check        |

1. The tag name MUST equal the `package.json` version with a `v` prefix.
2. The version shown in Settings MUST equal the `package.json` version.
3. The CHANGELOG heading for a released version MUST match the tag.
4. These MUST NOT drift. A mismatch is a bug.

## 4. The persisted schema version

1. The schema version is a **monotonic integer**. It is never reused and never decreased.
2. It lives in `app_meta.schema_version` and is owned by the migration runner
   (`TAD.md` §6).
3. Any change to the schema MUST ship with a migration **and** a migration test.
4. A schema change is at least a **MINOR** release, because it changes what a backup taken by
   an older build contains.
5. A snapshot or export whose `schema_version` is **newer** than the running app MUST be
   rejected by the restore validator, before anything is written to the live database.

## 5. The export file format version

1. Backup and export files carry their own `format_version`, separate from
   `schema_version`. Reason: the container format can change without the data changing, and
   vice versa.
2. An export with a newer `format_version` MUST be rejected on import.
3. An export with an older `format_version` MAY be migrated forward on import, provided the
   migration is covered by a test.

## 6. API versions

There is no network API (see `TAD.md` §9). The rule is recorded for the future: if an API is
ever added, its version appears in the path (`/v1`) and changes only for breaking changes.

## 7. Tags

1. Tags are **annotated** (`git tag -a`), named `vX.Y.Z`, and created on `main` only, on the
   release merge commit.
2. The tag message summarises the CHANGELOG entries it covers.
3. Pre-release candidates, if used, are `vX.Y.Z-rc.N` and each one is confirmed by the human
   before it is created.

## 8. Release procedure

Every step needs the human's explicit confirmation, per
[`REPO_RULES.md`](REPO_RULES.md) §1.3.

1. **Verify eligibility.** Every ticket in the batch is complete; `dev` is green; the full
   Playwright suite is green; [`BUGS.md`](BUGS.md) has no open critical or high bug for the
   batch.
2. **Prepare.** Create `chore/release-vX.Y.Z` from `dev`. Bump the `package.json` version, move
   the `[Unreleased]` CHANGELOG entries under `[X.Y.Z] - YYYY-MM-DD`, and add the compare
   links. Commit as `chore(release): vX.Y.Z`.
3. **Merge to `dev`.** PR into `dev` — **confirmation 1**.
4. **Merge to `main`.** PR `dev` → `main` with a merge commit (`--no-ff`) — **confirmation 2**.
5. **Tag.** Tag `main` with `vX.Y.Z`, push the tag, and append the session to
   `session_log.md`.

## 9. Hotfix releases

1. A patch bump, starting from a `hotfix/*` branch off `main`.
2. The same procedure as §8, with the hotfix flow in [`BRANCHING.md`](BRANCHING.md) §5: the
   merge into `main` and the back-merge into `dev` are two separate confirmations.

## 10. Deprecation

1. A deprecated feature is recorded in the CHANGELOG under `Changed`, with the version in
   which it will be removed.
2. It is removed only in a later major release, or a later minor release while below
   `1.0.0`.
3. A removal is a breaking change and follows §1.3.

## 11. Related documents

| Document                               | Holds                                                |
| -------------------------------------- | ---------------------------------------------------- |
| [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md) | Which commits force which bump.                      |
| [`BRANCHING.md`](BRANCHING.md)         | The branches a release moves through.                |
| [`REPO_RULES.md`](REPO_RULES.md)       | The confirmation protocol each step follows.         |
| [`TAD.md`](TAD.md)                     | The schema and migrations the schema version tracks. |
