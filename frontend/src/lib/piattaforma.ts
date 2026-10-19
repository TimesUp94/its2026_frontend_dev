// Astrazione di piattaforma: la UI chiama sempre questa interfaccia e non sa
// se sta girando nel browser, in Electron o in Tauri.

export type NomePiattaforma = 'web' | 'electron' | 'tauri'

export interface Piattaforma {
  nome: NomePiattaforma
  notifica(titolo: string, corpo: string): Promise<void>
  /** false quando l'utente annulla il salvataggio */
  esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
}

/** Senza il BOM Excel apre il CSV con gli accenti sbagliati */
const BOM = '\ufeff'

/** Implementazione di riserva: funziona in qualunque browser, anche senza guscio nativo. */
const piattaformaWeb: Piattaforma = {
  nome: 'web',
  async notifica(titolo, corpo) {
    if (!('Notification' in window)) return
    const permesso =
      Notification.permission === 'default'
        ? await Notification.requestPermission()
        : Notification.permission
    if (permesso === 'granted') new Notification(titolo, { body: corpo })
  },
  async esportaCatalogo(csv, nomeFile) {
    // Nel browser non esiste una vera finestra di salvataggio: si scarica un Blob
    const url = URL.createObjectURL(new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = nomeFile
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    return true
  },
}

function piattaformaElectron(ponte: PonteMinicommerce): Piattaforma {
  return {
    nome: 'electron',
    // Il BOM e il dialogo di salvataggio li mette il processo principale
    notifica: (titolo, corpo) => ponte.notifica(titolo, corpo),
    esportaCatalogo: (csv, nomeFile) => ponte.esportaCatalogo(csv, nomeFile),
  }
}

export function usaPiattaforma(): Piattaforma {
  const ponte = window.minicommerce
  if (ponte?.piattaforma === 'electron') return piattaformaElectron(ponte)
  return piattaformaWeb
}
