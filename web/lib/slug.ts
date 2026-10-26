/**
 * Gli URL di un sito vetrina sono contenuto, non dettagli tecnici: /prodotti/3 non
 * dice niente a chi legge (ne' a un motore di ricerca), /prodotti/3-mouse-mx-master-4 si'.
 * Teniamo l'id davanti allo slug: il nome del prodotto puo' cambiare, l'id no, e con
 * l'id in testa la pagina si trova sempre anche dopo una rinomina.
 */

/** "Cuffie Sony WH-1000XM6" -> "cuffie-sony-wh-1000xm6" */
export function slugify(testo: string): string {
  return testo
    .normalize('NFD') // separa le lettere dai segni diacritici
    .replace(/[̀-ͯ]/g, '') // via gli accenti: "à" -> "a"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // tutto il resto diventa un separatore
    .replace(/^-+|-+$/g, '')
}

export function productSlug(prodotto: { id: number; name: string }): string {
  return `${prodotto.id}-${slugify(prodotto.name)}`
}

export function categorySlug(categoria: { name: string }): string {
  return slugify(categoria.name)
}

/** Dallo slug torniamo all'id: tutto quello che viene dopo e' decorazione leggibile. */
export function idFromSlug(slug: string): number | null {
  const trovato = /^(\d+)(?:-|$)/.exec(slug)
  if (!trovato) return null
  const id = Number(trovato[1])
  return Number.isSafeInteger(id) && id > 0 ? id : null
}
