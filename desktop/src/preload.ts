// Preload: l'unico punto di contatto tra renderer e processo principale.
// Gira in un contesto isolato e in sandbox: puo' usare solo ipcRenderer e contextBridge.
// Non esponiamo mai ipcRenderer direttamente, solo tre funzioni con una firma precisa.
import { contextBridge, ipcRenderer } from 'electron'

const ponte = {
  piattaforma: 'electron' as const,

  async notifica(titolo: string, corpo: string): Promise<void> {
    await ipcRenderer.invoke('minicommerce:notifica', { titolo, corpo })
  },

  /** false quando l'utente annulla la finestra di salvataggio */
  async esportaCatalogo(csv: string, nomeFile: string): Promise<boolean> {
    const salvato: unknown = await ipcRenderer.invoke('minicommerce:esporta-catalogo', {
      csv,
      nomeFile,
    })
    return salvato === true
  },
}

contextBridge.exposeInMainWorld('minicommerce', ponte)
