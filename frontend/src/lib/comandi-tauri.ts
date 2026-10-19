import { invoke, isTauri } from '@tauri-apps/api/core'

/**
 * Esempio di comando Rust chiamato dal frontend.
 *
 * Lato Rust (frontend/src-tauri/src/lib.rs):
 *   #[tauri::command]
 *   fn conta_esauriti(scorte: Vec<i64>) -> usize
 *
 * Nel browser il comando non esiste, quindi si calcola lo stesso valore in JS:
 * serve a far vedere che il confine fra web e desktop e' una funzione sola.
 */
export async function contaEsauriti(scorte: number[]): Promise<number> {
  if (!isTauri()) return scorte.filter((scorta) => scorta <= 0).length
  return await invoke<number>('conta_esauriti', { scorte })
}
