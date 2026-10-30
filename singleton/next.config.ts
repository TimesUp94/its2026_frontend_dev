import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /**
   * better-sqlite3 e' un modulo nativo: non va impacchettato da Turbopack,
   * deve restare un require() di Node lato server. E' la riga che rende
   * possibile parlare con SQLite direttamente dai Server Component.
   */
  serverExternalPackages: ['better-sqlite3'],

  /** Tailwind v4 passa da Turbopack, non da PostCSS. */
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
}

export default nextConfig
