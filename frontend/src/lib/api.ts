import axios from 'axios'

export interface Category {
  id: number
  name: string
  description: string
  /** Numero di articoli collegati, calcolato dal backend */
  productCount: number
  createdAt: string
}

export interface Product {
  id: number
  name: string
  description: string
  categoryId: number
  /** Nome della categoria, fornito dalla join lato backend */
  category: string
  brand: string
  price: number
  stock: number
  imageUrl: string | null
  createdAt: string
}

/** In scrittura la categoria si indica con il suo id, non con il nome */
export interface ProductInput {
  name: string
  description: string
  categoryId: number
  brand: string
  price: number
  stock: number
  imageUrl: string | null
}

export interface AuthUser {
  id: number
  email: string
  name: string
  isAdmin: boolean
}

export interface CartItem {
  id: number
  quantity: number
  product: Product
  subtotal: number
}

export interface Cart {
  items: CartItem[]
  total: number
}

export interface MockOrderInput {
  paymentCardholder: string
  paymentLastFour: string
}

export interface MockOrder {
  id: number
  status: 'accepted'
  total: number
  createdAt: string
  payment: { method: 'mock-card'; cardholder: string; lastFour: string }
  items: Array<{ productId: number; productName: string; unitPrice: number; quantity: number }>
  message: string
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
export const CART_UPDATED_EVENT = 'minicommerce:cart-updated'

// Seconda sorpresa: nel pacchetto desktop il proxy di Vite non esiste, quindi
// serve l'URL assoluto del backend. Sul web la variabile non c'e' e resta '/api'.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '/api' })

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

export async function fetchProduct(productId: number): Promise<Product> {
  const { data } = await api.get<Product>(`/products/${productId}`)
  return data
}

export async function fetchCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories')
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

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
    name,
    email,
    password,
  })
  return data
}

export async function fetchCart(): Promise<Cart> {
  const { data } = await api.get<Cart>('/cart')
  return data
}

export async function addCartItem(productId: number, quantity = 1): Promise<void> {
  await api.post('/cart/items', { productId, quantity })
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export async function updateCartItem(productId: number, quantity: number): Promise<void> {
  await api.patch(`/cart/items/${productId}`, { quantity })
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export async function removeCartItem(productId: number): Promise<void> {
  await api.delete(`/cart/items/${productId}`)
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export async function clearCart(): Promise<void> {
  await api.delete('/cart')
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
}

export async function placeMockOrder(input: MockOrderInput): Promise<MockOrder> {
  const { data } = await api.post<MockOrder>('/orders', input)
  window.dispatchEvent(new Event(CART_UPDATED_EVENT))
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
