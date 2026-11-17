/**
 * Test-only route (`/__seed-fixture`) for T-044: inserts rows from the shared deterministic
 * generator so `seed.spec.ts` proves the e2e suite consumes the same data as the CLI. Not product UI.
 */
import { useState } from 'react'
import { makeAuditContext } from '@/core/audit/write'
import { getDb } from '@/core/db/client'
import { create } from '@/modules/students/repository'
import { generateStudents } from '../../../scripts/seed-data.ts'

export function SeedFixture() {
  const db = getDb()
  const [count, setCount] = useState('50')
  const [status, setStatus] = useState('idle')

  async function seed() {
    const n = Number(count)
    if (!Number.isSafeInteger(n) || n < 1) return
    setStatus('seeding')
    const ctx = makeAuditContext('seed-fixture')
    for (const row of generateStudents(n)) await create(db, ctx, { ...row })
    setStatus(String(n))
  }

  return (
    <main className="space-y-3 p-6">
      <h1 className="text-xl font-semibold">Seed fixture</h1>
      <input
        aria-label="Students to seed"
        data-testid="seed-count"
        value={count}
        onChange={(event) => setCount(event.target.value)}
      />
      <button type="button" data-testid="seed-go" onClick={() => void seed()}>
        Seed
      </button>
      <p data-testid="fixture-status">{status}</p>
    </main>
  )
}
