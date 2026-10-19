import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './lib/auth.tsx'
import './index.css'

// Prima sorpresa: nel pacchetto desktop la pagina non arriva da un web server
// che riscriva le rotte (protocollo interno di Tauri, oppure file://), quindi un
// reload su /admin non troverebbe nulla. La build desktop imposta VITE_ROUTER=hash.
const Router = import.meta.env.VITE_ROUTER === 'hash' ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
    </Router>
  </StrictMode>,
)
