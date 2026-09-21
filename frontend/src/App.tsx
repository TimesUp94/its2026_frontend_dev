import { Route, Routes } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Toaster } from '@/components/ui/sonner'
import { AdminPage } from '@/pages/AdminPage'
import { CatalogPage } from '@/pages/CatalogPage'
import { LoginPage } from '@/pages/LoginPage'

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Routes>
        <Route path="/" element={<CatalogPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <Toaster richColors position="top-right" />
    </div>
  )
}
