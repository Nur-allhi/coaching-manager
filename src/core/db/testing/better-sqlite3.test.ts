import { describeDbContract } from '../contract'
import { createBetterSqliteDb } from './better-sqlite3'

describeDbContract('better-sqlite3', () => createBetterSqliteDb())
