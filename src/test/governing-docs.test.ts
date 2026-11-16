/**
 * Regression test for BUG-001: a spaced conflict marker (`> > > > > > >`) survived in
 * docs/DECISIONS.md after a rebase. The ordinary unspaced form was also possible. Scan every
 * governing doc for both forms so a future rebase cannot leave a broken log behind.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd()) + '/'

const DOCUMENTS = [
  'AGENTS.md',
  'CLAUDE.md',
  'CHANGELOG.md',
  'session_log.md',
  'docs/PLAN.md',
  'docs/PRD.md',
  'docs/TAD.md',
  'docs/SECURITY.md',
  'docs/FRONTEND_SPEC.md',
  'docs/TICKETS.md',
  'docs/REPO_RULES.md',
  'docs/AUTONOMY.md',
  'docs/BRANCHING.md',
  'docs/COMMIT_SYSTEM.md',
  'docs/VERSIONING.md',
  'docs/E2E_TESTING.md',
  'docs/BUGS.md',
  'docs/PROGRESS.md',
  'docs/DECISIONS.md',
  'docs/DEVELOPMENT.md',
]

describe('governing documents', () => {
  it('contain no Git conflict markers, spaced or unspaced', () => {
    const unspaced = /^(<{7}|={7}|>{7})/m
    const spaced = /^(<\s+){7}|(=\s+){7}|(>\s+){7}/m
    for (const doc of DOCUMENTS) {
      const text = readFileSync(`${root}${doc}`, 'utf8')
      expect(unspaced.test(text), `${doc} has an unspaced conflict marker`).toBe(false)
      expect(spaced.test(text), `${doc} has a spaced conflict marker`).toBe(false)
    }
  })
})
