import { ShoppingCart } from 'lucide-react'
import { useState, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { addCartItem, getErrorMessage } from '@/lib/api'
import { useAuth } from '@/lib/auth'

export function AddToCartButton({ productId, stock }: { productId: number; stock: number }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [adding, setAdding] = useState(false)

  const handleAdd = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!user || user.isAdmin) {
      toast.info('Accedi con un account cliente per aggiungere articoli al carrello.')
      navigate('/login')
      return
    }
    setAdding(true)
    try {
      await addCartItem(productId)
      toast.success('Articolo aggiunto al carrello')
    } catch (error) {
      toast.error(getErrorMessage(error))
    } finally {
      setAdding(false)
    }
  }

  return (
    <Button type="button" className="w-full" disabled={adding || stock < 1} onClick={handleAdd}>
      <ShoppingCart className="size-4" />
      {stock < 1 ? 'Non disponibile' : adding ? 'Aggiunta...' : 'Aggiungi al carrello'}
    </Button>
  )
}
