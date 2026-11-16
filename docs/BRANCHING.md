# BRANCHING — Branching System

**Status:** live · **Target skill:** `gitnexus` · **Enforced by:** `code-reviewer`

The branch types, lifecycle and protection rules for this repository. Merge rules live in
[`REPO_RULES.md`](REPO_RULES.md) §2; commit format in
[`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md); releases in [`VERSIONING.md`](VERSIONING.md).

---

## 1. Branch types

| Branch            | Purpose                                             | Receives                                | Merges into           |
| ----------------- | --------------------------------------------------- | --------------------------------------- | --------------------- |
| `main`            | Production. Always deployable and green. Protected. | `dev` release merges, `hotfix/*` merges | —                     |
| `dev`             | Integration. Protected.                             | Squash-merged working branches          | `main` (release only) |
| `feature/<name>`  | A new capability                                    | —                                       | `dev`                 |
| `fix/<name>`      | A bug fix                                           | —                                       | `dev`                 |
| `hotfix/<name>`   | An urgent fix from `main`                           | —                                       | `main`, then `dev`    |
| `refactor/<name>` | A restructure with no behaviour change              | —                                       | `dev`                 |
| `docs/<name>`     | Documentation only                                  | —                                       | `dev`                 |
| `test/<name>`     | Test infrastructure only                            | —                                       | `dev`                 |
| `chore/<name>`    | Tooling, config, dependencies, release              | —                                       | `dev`                 |

## 2. Naming

1. A branch is `<prefix>/<short-kebab-name>`.
2. The name is 2–5 words describing the change: `feature/student-csv-import`,
   `fix/receipt-number-gap`.
3. A branch MUST NOT be named after a ticket number alone. The ticket id goes in the PR title
   and in the commit footer.
4. The prefix MUST match the commit type of the work on the branch. A branch that fixes a bug
   is `fix/*`, not `feature/*`.
5. A merged branch is never reused.

## 3. Lifecycle

Every working branch follows these steps.

1. **Sync.** `git switch dev && git pull --ff-only`. A `hotfix/*` branch starts from `main`
   instead.
2. **Create.** One ticket, one branch:
   `git switch -c feature/<short-kebab-name>`.
3. **Commit.** Per [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md). Every commit builds and passes.
4. **Keep it short-lived.** Aim to merge within 3 working days. If the diff grows past roughly
   800 changed lines, stop and propose a split — that is a decision, and it follows the
   confirmation protocol in `REPO_RULES.md` §1.
5. **Rebase before the PR.** `git fetch && git rebase origin/dev`. Force-push only with
   `--force-with-lease`, only on your own working branch, never on `dev` or `main`.
6. **Open the PR** into `dev`, using the template in §6.
7. **Pre-merge gates.** Lint, typecheck, unit tests and the smoke suite are green, and
   `code-reviewer` has passed.
8. **Ask for confirmation.** Then squash-merge, and delete the branch locally and on the
   remote.
9. **Close the loop.** Update the ticket status, add the `CHANGELOG.md` `[Unreleased]` entry,
   and append to `session_log.md`.

## 4. Release flow

1. Release preparation happens on `chore/release-vX.Y.Z` branched from `dev`.
2. It is merged into `dev` with the human's confirmation.
3. `dev` merges into `main` as a PR with a **merge commit** (`--no-ff`), so each release is
   one visible merge. This needs the human's separate confirmation.
4. `main` is tagged after the merge. See [`VERSIONING.md`](VERSIONING.md) §6.

## 5. Hotfix flow

1. Branch `hotfix/<name>` from `main`.
2. PR into `main`. **Confirmation 1.**
3. Tag a patch release on `main`.
4. A second PR merges the fix into `dev`. **Confirmation 2.** This is what stops `dev` from
   losing the fix.

## 6. PR template

The PR title is a valid Conventional Commit, and it becomes the squash commit message.

```markdown
## Summary

<one line: what and why>

## Ticket / Bugs

T-<id> (Fixes BUG-<id> if applicable)

## Changes

- <bullet per logical change>

## Evidence

- Unit tests: <result>
- E2E: <spec names + result>
- Playwright MCP verification: <viewports checked, console errors count, screenshots path>

## Checklist

- [ ] Definition of Done (docs/REPO_RULES.md) fully met
- [ ] README / CHANGELOG updated if affected
```

## 7. Protection rules

Configure on the hosting platform. The exact settings MUST be confirmed before they are
applied, per `REPO_RULES.md` §1.

| Branch | Required | Checks                      | Merge method      | Force-push | Delete    |
| ------ | -------- | --------------------------- | ----------------- | ---------- | --------- |
| `main` | PR       | CI green, branch up to date | merge commit only | forbidden  | forbidden |
| `dev`  | PR       | CI green, branch up to date | squash only       | forbidden  | forbidden |

## 8. Conflict and housekeeping rules

1. Mechanical conflicts are resolved by the agent. A conflict that requires choosing between
   two behaviours is a decision and follows the confirmation protocol.
2. `main` and `dev` MUST NOT be merged into a working branch. Rebase instead.
3. A branch with no commits for 14 days is flagged to the human. It is never deleted without
   confirmation.
4. A merged branch is never reused.

## 9. Current state

| Branch | Purpose     | Created                    |
| ------ | ----------- | -------------------------- |
| `main` | Production  | At the first commit        |
| `dev`  | Integration | On adoption of this system |

The commits that predate this system are on `main` only and are grandfathered: they do not
use the scope vocabulary in [`COMMIT_SYSTEM.md`](COMMIT_SYSTEM.md) §4. They are not rewritten,
because rewriting published history is worse than a small inconsistency.
