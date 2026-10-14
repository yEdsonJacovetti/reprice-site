'use client'

import { useEffect, useState } from 'react'
import { ShoppingCart, Trash2, Leaf, ArrowRight } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Product = {
  id: string
  name: string
  promoPrice: number
  originalPrice: number
  quantity: number
  company: { name: string }
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function CartView() {
  const { cart, setQty, removeFromCart, clearCart, setView, session } = useAppStore()
  const { toast } = useToast()
  const [products, setProducts] = useState<Record<string, Product>>({})
  const [loading, setLoading] = useState(true)

  const productIds = Object.keys(cart)

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts({})
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all(
      productIds.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => r.json())
          .then((d) => [id, d.product] as const),
      ),
    )
      .then((entries) => {
        const map: Record<string, Product> = {}
        for (const [id, p] of entries) if (p) map[id] = p
        setProducts(map)
      })
      .finally(() => setLoading(false))
  }, [productIds.join(','), productIds.length])

  const items = productIds
    .map((id) => ({ product: products[id], qty: cart[id] }))
    .filter((x) => x.product)

  const subtotal = items.reduce(
    (sum, it) => sum + (it.product.promoPrice * it.qty || 0),
    0,
  )
  const originalTotal = items.reduce(
    (sum, it) => sum + (it.product.originalPrice * it.qty || 0),
    0,
  )
  const savings = originalTotal - subtotal

  async function checkout() {
    if (!session) {
      toast({ title: 'Faça login para finalizar.' })
      setView('login')
      return
    }
    setLoading(true)
    try {
      const results = await Promise.all(
        items.map((it) =>
          fetch('/api/reservations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: it.product.id, quantity: it.qty }),
          }),
        ),
      )
      const failed = results.find((r) => !r.ok)
      if (failed) {
        const err = await failed.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao reservar produto')
      }
      clearCart()
      toast({
        title: 'Reserva criada!',
        description: 'Você já pode retirar seus produtos no mercado.',
      })
      setView('orders')
    } catch (e: any) {
      toast({
        title: 'Erro ao finalizar',
        description: e.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Carrinho</h1>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground space-y-3">
          <Leaf className="h-10 w-10 mx-auto text-primary/50" />
          <p>Seu carrinho está vazio.</p>
          <Button onClick={() => setView('products')}>Ver ofertas</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2 space-y-3">
            {items.map(({ product, qty }) => (
              <div
                key={product.id}
                className="rounded-lg border border-border bg-card p-3 flex items-center gap-3"
              >
                <div className="h-14 w-14 grid place-items-center rounded-md bg-secondary/40 shrink-0">
                  <Leaf className="h-6 w-6 text-primary/60" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">{product.company.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs line-through text-muted-foreground">
                      {formatBRL(product.originalPrice)}
                    </span>
                    <span className="text-sm font-bold text-primary">
                      {formatBRL(product.promoPrice)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQty(product.id, qty - 1)}
                  >
                    −
                  </Button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQty(product.id, qty + 1)}
                  >
                    +
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFromCart(product.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <h3 className="font-semibold">Resumo</h3>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal original</span>
                  <span className="line-through text-muted-foreground">
                    {formatBRL(originalTotal)}
                  </span>
                </div>
                <div className="flex justify-between text-primary">
                  <span>Você economiza</span>
                  <span className="font-medium">−{formatBRL(savings)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-primary">{formatBRL(subtotal)}</span>
                </div>
              </div>
              <Button
                onClick={checkout}
                disabled={loading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Finalizar reserva
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
              <Button
                variant="ghost"
                onClick={() => setView('products')}
                className="w-full"
              >
                Continuar comprando
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
