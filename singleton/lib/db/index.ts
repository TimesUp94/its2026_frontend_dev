import 'server-only'

import { createDb, type Db } from './client.ts'

/**
 * Connessione unica al database.
 *
 * Qui sta la differenza con l'altra versione del progetto: non c'e' nessun
 * server Express davanti, e' Next stesso, lato server, a parlare con SQLite.
 * In sviluppo Next ricarica i moduli a ogni modifica, quindi la connessione
 * viene tenuta su globalThis per non aprirne una nuova a ogni hot reload.
 */
const globalForDb = globalThis as unknown as { db?: Db }

export const db = globalForDb.db ?? createDb()
if (process.env.NODE_ENV !== 'production') globalForDb.db = db
