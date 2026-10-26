import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { Header } from '@/components/Header'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Il nome della variabile deve combaciare con --font-sans usata in globals.css
const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'minicommerce',
  description: 'Mini e-commerce di articoli informatici, tutto dentro Next.js',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="it" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background">
        <Header />
        <main className="flex-1">{children}</main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
