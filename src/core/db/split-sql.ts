/**
 * Split a migration file into statements.
 *
 * Migrations are hand-written SQL files, while the Db contract executes one statement at a
 * time. This keeps the contract small and makes the split testable on its own.
 * A semicolon inside a string literal is not treated as a separator.
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let quote: "'" | '"' | '`' | null = null

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i]
    const next = sql[i + 1]

    if (quote) {
      current += char
      if (char === quote) {
        if (next === quote) {
          current += next
          i += 1
        } else {
          quote = null
        }
      }
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      quote = char
      current += char
      continue
    }

    if (char === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1
      current += '\n'
      continue
    }

    if (char === ';') {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ''
      continue
    }

    current += char
  }

  const last = current.trim()
  if (last) statements.push(last)
  return statements
}
