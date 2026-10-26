import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'

/*
 * IL FEED RSS, in quindici righe.
 *
 * Un file dentro src/pages che non finisce in .astro diventa una rotta che
 * restituisce quello che vuole: qui XML. Il feed nasce dagli stessi dati delle
 * pagine, quindi non puo' andare fuori sincrono con il blog.
 */
export async function GET(context: APIContext) {
  const post = (await getCollection('blog', ({ data }) => !data.bozza)).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  )

  return rss({
    title: 'Il blog di minicommerce',
    description: "Guide all'acquisto, confronti e appunti di bottega sul mondo dei computer.",
    // context.site e' il valore di "site" in astro.config.mjs: senza quello non si
    // possono scrivere indirizzi assoluti, e un feed con link relativi non serve.
    site: context.site!,
    items: post.map((articolo) => ({
      title: articolo.data.title,
      description: articolo.data.description,
      pubDate: articolo.data.pubDate,
      link: `/blog/${articolo.id}/`,
      categories: articolo.data.tags,
      author: articolo.data.author,
    })),
    customData: '<language>it-it</language>',
  })
}
