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
  // A CREATE TRIGGER body ends each statement with its own `;`. Treat those semicolons as
  // content until the matching END so the whole trigger reaches the Db as one statement.
  let triggerDepth = 0

  /** True when `text` ends in a whole keyword (not part of a longer identifier). */
  const endsWithWord = (text: string, word: string): boolean => {
    const start = text.length - word.length
    return (
      start >= 0 &&
      text.slice(start).toUpperCase() === word &&
      (start === 0 || !/[A-Za-z0-9_]/.test(text[start - 1] ?? ''))
    )
  }

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

    if (char === ';' && triggerDepth === 0) {
      const statement = current.trim()
      if (statement) statements.push(statement)
      current = ''
      continue
    }

    current += char

    if (endsWithWord(current, 'BEGIN') && current.toUpperCase().includes('CREATE TRIGGER')) {
      triggerDepth += 1
    } else if (endsWithWord(current, 'END') && triggerDepth > 0) {
      triggerDepth -= 1
    }
  }

  const last = current.trim()
  if (last) statements.push(last)
  return statements
}
