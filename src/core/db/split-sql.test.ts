import { describe, expect, it } from 'vitest'
import { splitSql } from './split-sql'

describe('splitSql', () => {
  it('splits statements and drops comments', () => {
    expect(splitSql("-- a comment\nCREATE TABLE t (id TEXT); INSERT INTO t VALUES ('x');")).toEqual(
      ['CREATE TABLE t (id TEXT)', "INSERT INTO t VALUES ('x')"],
    )
  })

  it('keeps a semicolon inside a quoted string', () => {
    expect(splitSql("INSERT INTO t VALUES ('a;b');")).toEqual(["INSERT INTO t VALUES ('a;b')"])
  })

  it('handles escaped quotes and a trailing statement without a semicolon', () => {
    expect(splitSql("INSERT INTO t VALUES ('it''s'); SELECT 1")).toEqual([
      "INSERT INTO t VALUES ('it''s')",
      'SELECT 1',
    ])
  })

  it('returns nothing for a file of comments only', () => {
    expect(splitSql('-- nothing here\n-- still nothing')).toEqual([])
  })

  it('keeps a CREATE TRIGGER body with internal semicolons as one statement', () => {
    const sql =
      '-- search index\n' +
      'CREATE TABLE t (id TEXT);\n' +
      'CREATE TRIGGER t_ai AFTER INSERT ON t BEGIN ' +
      'INSERT INTO log VALUES (new.id); UPDATE log SET n = 1 WHERE id = new.id; ' +
      'END;\n' +
      'SELECT 1;'
    expect(splitSql(sql)).toEqual([
      'CREATE TABLE t (id TEXT)',
      'CREATE TRIGGER t_ai AFTER INSERT ON t BEGIN ' +
        'INSERT INTO log VALUES (new.id); UPDATE log SET n = 1 WHERE id = new.id; END',
      'SELECT 1',
    ])
  })
})
