import { Route, Routes } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Toaster } from '@/components/ui/sonner'
import { AdminPage } from '@/pages/AdminPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { LoginPage } from '@/pages/LoginPage'
import { AboutPage } from './pages/AboutPage'
import { ArticlePage } from './pages/ArticlePage'
import { CartPage } from '@/pages/CartPage'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/article/:articleid" element={<ArticlePage />} />
        <Route path="/cart" element={<CartPage />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </div>
  )
}
