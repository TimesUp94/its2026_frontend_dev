import { createContext, useContext, useState, type ReactNode } from 'react'
import { TOKEN_KEY, USER_KEY, login as apiLogin, register as apiRegister, type AuthUser } from './api'

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthUser>
  register: (name: string, email: string, password: string) => Promise<AuthUser>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as AuthUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  const saveSession = (token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setUser(user)
    return user
  }

  const login = async (email: string, password: string) => {
    const { token, user } = await apiLogin(email, password)
    return saveSession(token, user)
  }

  const register = async (name: string, email: string, password: string) => {
    const { token, user } = await apiRegister(name, email, password)
    return saveSession(token, user)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }

  return <AuthContext value={{ user, login, register, logout }}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve essere usato dentro AuthProvider')
  }
  return ctx
}
