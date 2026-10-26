import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { StructuredData } from '@/components/StructuredData'
import { organizationJsonLd, webSiteJsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo'

/**
 * next/font scarica il font una volta sola, in fase di build, e lo serve dal nostro
 * dominio: nessuna chiamata a Google quando l'utente apre la pagina (meglio per la
 * privacy e per il GDPR) e nessun salto di layout, perche' Next calcola le metriche
 * del font e le mette nel CSS.
 */
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

/**
 * I metadati comuni a tutto il sito.
 *
 * metadataBase e' obbligatorio perche' Next possa trasformare '/prodotti/3-...' in
 * un indirizzo assoluto: i tag canonical e Open Graph relativi non servono a niente.
 *
 * title.template fa il resto: ogni pagina dichiara solo il proprio titolo e diventa
 * "ThinkPad X1 Carbon Gen 12 | minicommerce".
 *
 * Qui NON mettiamo alternates.canonical: si eredita, e un canonical sbagliato e'
 * peggio di nessun canonical. Ogni pagina dichiara il suo.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'minicommerce - informatica e accessori per studio e lavoro',
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: 'ITS - corso di Frontend Development' }],
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: SITE_NAME,
    url: '/',
    title: 'minicommerce - informatica e accessori per studio e lavoro',
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        {/* Le due schede "chi siamo" per le macchine: una per l'organizzazione, una
            per il sito. Stanno nel layout perche' valgono per ogni pagina. */}
        <StructuredData data={organizationJsonLd()} />
        <StructuredData data={webSiteJsonLd()} />
        <a
          href="#contenuto"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Salta al contenuto
        </a>
        <Header />
        <div id="contenuto" className="flex-1">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  )
}
