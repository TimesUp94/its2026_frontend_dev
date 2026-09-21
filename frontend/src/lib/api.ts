import axios from 'axios'

export interface Product {
  id: number
  name: string
  description: string
  category: string
  brand: string
  price: number
  stock: number
  imageUrl: string | null
  createdAt: string
}

export type ProductInput = Omit<Product, 'id' | 'createdAt'>

export interface AuthUser {
  id: number
  email: string
  name: string
  isAdmin: boolean
}

export interface ProductFilters {
  search?: string
  category?: string
  minPrice?: string
  maxPrice?: string
  sort?: 'name' | 'price' | 'stock' | 'createdAt'
  order?: 'asc' | 'desc'
}

export const TOKEN_KEY = 'minicommerce_token'
export const USER_KEY = 'minicommerce_user'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchProducts(filters: ProductFilters = {}): Promise<Product[]> {
  const { data } = await api.get<Product[]>('/products', { params: filters })
  return data
}

export async function fetchCategories(): Promise<string[]> {
  const { data } = await api.get<string[]>('/products/categories')
  return data
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data } = await api.post<Product>('/products', input)
  return data
}

export async function updateProduct(id: number, input: ProductInput): Promise<Product> {
  const { data } = await api.put<Product>(`/products/${id}`, input)
  return data
}

export async function deleteProduct(id: number): Promise<void> {
  await api.delete(`/products/${id}`)
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', {
    email,
    password,
  })
  return data
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = (error.response?.data as { error?: string } | undefined)?.error
    if (apiError) return apiError
    if (error.response?.status === 401) return 'Sessione scaduta, effettua di nuovo il login'
  }
  return 'Si è verificato un errore, riprova'
}

export const formatPrice = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
}).format
