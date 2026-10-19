import { isTauri } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

/**
 * Ponte fra l'app React e il sistema operativo.
 *
 * Le pagine non sanno dove stanno girando: chiedono `usaPiattaforma()` e usano
 * sempre la stessa interfaccia. L'implementazione web resta il fallback e deve
 * funzionare nel browser; quella tauri usa i plugin dialog/fs/notification.
 */
export type NomePiattaforma = 'web' | 'electron' | 'tauri'

export interface Piattaforma {
  nome: NomePiattaforma
  notifica(titolo: string, corpo: string): Promise<void>
  /** Ritorna false se l'utente ha annullato il salvataggio. */
  esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
}

const piattaformaWeb: Piattaforma = {
  nome: 'web',
  async notifica(titolo, corpo) {
    if (!('Notification' in window)) return
    let permesso = Notification.permission
    if (permesso === 'default') permesso = await Notification.requestPermission()
    if (permesso === 'granted') new Notification(titolo, { body: corpo })
  },
  async esportaCatalogo(csv, nomeFile) {
    // Nel browser non si puo' scegliere la cartella: si scarica e basta.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = nomeFile
    link.click()
    URL.revokeObjectURL(url)
    return true
  },
}

const piattaformaTauri: Piattaforma = {
  nome: 'tauri',
  async notifica(titolo, corpo) {
    let concesso = await isPermissionGranted()
    if (!concesso) concesso = (await requestPermission()) === 'granted'
    if (concesso) sendNotification({ title: titolo, body: corpo })
  },
  async esportaCatalogo(csv, nomeFile) {
    const percorso = await save({
      defaultPath: nomeFile,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (!percorso) return false
    // Il file scelto nel dialogo viene aggiunto allo scope del plugin fs:
    // senza il dialogo questa scrittura verrebbe rifiutata.
    await writeTextFile(percorso, csv)
    return true
  },
}

export function usaPiattaforma(): Piattaforma {
  return isTauri() ? piattaformaTauri : piattaformaWeb
}
