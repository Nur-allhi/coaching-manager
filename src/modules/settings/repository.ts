/**
 * Typed settings repository (T-040, D-041 A1).
 *
 * The `settings` table is key/value/updated_at (no id/version), so the generic repository helpers
 * do not apply — this module owns its table and uses bound SQL directly. Every value is validated
 * with Zod at the boundary; a malformed or absent value falls back to the documented default so a
 * bad row can never break a screen. Writes are audited via the shared writer in the same tx.
 */
import type { Db } from '@/core/db/types'
import { makeAuditContext, writeAudit, type AuditContext } from '@/core/audit/write'
import {
  SETTING_DEFINITIONS,
  type CentreProfile,
  type GradingScale,
  type SettingKey,
  type ThemePreference,
} from './defaults'

type ValueOf<K extends SettingKey> = ReturnType<(typeof SETTING_DEFINITIONS)[K]['schema']['parse']>

/** Read one setting, validated; returns the default when absent or malformed. */
export async function getSetting<K extends SettingKey>(db: Db, key: K): Promise<ValueOf<K>> {
  const definition = SETTING_DEFINITIONS[key]
  const rows = await db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key])
  const raw = rows[0]?.value
  if (raw === undefined) return definition.fallback as ValueOf<K>
  try {
    return definition.schema.parse(JSON.parse(raw)) as ValueOf<K>
  } catch {
    return definition.fallback as ValueOf<K>
  }
}

/** Write one setting with validation, in a transaction with its audit row. */
export async function setSetting<K extends SettingKey>(
  db: Db,
  key: K,
  value: ValueOf<K>,
  ctx: AuditContext = makeAuditContext(),
): Promise<void> {
  const validated = SETTING_DEFINITIONS[key].schema.parse(value)
  await db.tx(async (t) => {
    await t.run(
      'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ' +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      [key, JSON.stringify(validated), ctx.now],
    )
    // Settings are audited by their key as the entity id; no money/PII is stored here.
    await writeAudit(t, ctx, {
      entity: 'settings',
      entityId: key,
      action: 'update',
      before: null,
      after: validated,
    })
  })
}

export interface AllSettings {
  centre: CentreProfile
  currency: string
  gradingScale: GradingScale
  receiptFormat: string
  theme: ThemePreference
}

/** Read all settings in one call for the Settings screen. */
export async function getAllSettings(db: Db): Promise<AllSettings> {
  const [centre, currency, gradingScale, receiptFormat, theme] = await Promise.all([
    getSetting(db, 'centre'),
    getSetting(db, 'currency'),
    getSetting(db, 'gradingScale'),
    getSetting(db, 'receiptFormat'),
    getSetting(db, 'theme'),
  ])
  return { centre, currency, gradingScale, receiptFormat, theme }
}
