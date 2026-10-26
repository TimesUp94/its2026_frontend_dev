/**
 * Un oggetto JavaScript diventa un blocco <script type="application/ld+json">.
 *
 * dangerouslySetInnerHTML qui e' obbligato: React non puo' mettere testo dentro
 * uno <script>. Il rischio e' reale, quindi lo chiudiamo a mano: se una descrizione
 * contenesse "</script>" il browser chiuderebbe il blocco e il resto diventerebbe
 * HTML eseguibile. Sostituendo "<" con la sua forma < il JSON resta valido e
 * il tag non si puo' chiudere per sbaglio.
 */
export function StructuredData({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }}
    />
  )
}
