// Tipi del ponte che il preload di Electron espone su window.minicommerce.
// Nel browser la proprieta' non esiste: per questo e' opzionale.
export {}

declare global {
  interface PonteMinicommerce {
    piattaforma: 'electron'
    notifica(titolo: string, corpo: string): Promise<void>
    /** false quando l'utente annulla la finestra di salvataggio */
    esportaCatalogo(csv: string, nomeFile: string): Promise<boolean>
  }

  interface Window {
    minicommerce?: PonteMinicommerce
  }
}
