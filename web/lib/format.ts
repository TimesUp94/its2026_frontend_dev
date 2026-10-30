/** Gli stessi formati del frontend React: prezzi in euro, date in italiano. */

export const formatPrice = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
}).format

export const formatDateTime = new Intl.DateTimeFormat('it-IT', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format

/**
 * La meta description che Google mostra sotto il titolo viene tagliata intorno ai
 * 160 caratteri: meglio tagliarla noi su una parola intera che farla troncare a meta'.
 */
export function troncaDescrizione(testo: string, massimo = 155): string {
  const pulito = testo.replace(/\s+/g, ' ').trim()
  if (pulito.length <= massimo) return pulito
  const tagliato = pulito.slice(0, massimo)
  const ultimoSpazio = tagliato.lastIndexOf(' ')
  return `${(ultimoSpazio > 60 ? tagliato.slice(0, ultimoSpazio) : tagliato).trimEnd()}...`
}
