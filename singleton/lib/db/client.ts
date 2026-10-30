import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.ts'

/**
 * Apre la connessione a SQLite. Sta in un file separato da index.ts perche'
 * quest'ultimo e' marcato 'server-only' e quindi non sarebbe importabile dagli
 * script da riga di comando (il seed).
 */
export function createDb() {
  const sqlite = new Database(process.env.DATABASE_URL ?? 'minicommerce.db')
  sqlite.pragma('journal_mode = WAL')
  // SQLite non applica le foreign key se non vengono abilitate a ogni connessione
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

export type Db = ReturnType<typeof createDb>
