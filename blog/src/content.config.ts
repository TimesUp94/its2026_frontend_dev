import { defineCollection, z } from 'astro:content'
import { glob } from 'astro/loaders'

/**
 * LA COLLEZIONE DI CONTENUTI.
 *
 * Qui si dichiara che esistono dei post, dove stanno e che forma ha il loro
 * frontmatter. Da questo momento due cose diventano vere:
 *
 *  1. Astro genera i tipi TypeScript: nelle pagine, post.data.title e' una stringa
 *     e post.data.pubDate e' una Date, con l'autocompletamento.
 *  2. Un frontmatter sbagliato ferma la BUILD, non il visitatore. Scrivete "pubdate"
 *     invece di "pubDate" e il messaggio d'errore vi dice file, campo e motivo.
 *
 * I limiti sulla description non sono pignoleria: sotto i 50 caratteri non dice
 * niente, sopra i 160 Google la taglia. Il controllo e' qui una volta per tutte,
 * invece di essere una buona intenzione in fondo a una checklist.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string().min(10).max(70),
    description: z.string().min(50).max(160),
    pubDate: z.coerce.date(),
    author: z.string().default('Redazione minicommerce'),
    tags: z.array(z.string()).min(1),
    /** Gli id degli articoli del catalogo di cui parla il post (vedi src/lib/shop.ts). */
    prodotti: z.array(z.number().int().positive()).default([]),
    bozza: z.boolean().default(false),
  }),
})

export const collections = { blog }
