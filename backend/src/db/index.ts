import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.ts';

const sqlite = new Database(process.env.DATABASE_URL ?? 'minicommerce.db');
sqlite.pragma('journal_mode = WAL');
// SQLite non applica le foreign key se non vengono abilitate a ogni connessione
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
