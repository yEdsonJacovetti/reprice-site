'use client'

import { useEffect, useMemo, useState } from 'react'
import { Leaf, Search, Timer, ShoppingCart } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

type Product = {
  id: string
  name: string
  description?: string | null
  category: string
  originalPrice: number
  promoPrice: number
  expirationDate: string
  quantity: number
  imageUrl?: string | null
  company: { name: string; city?: string | null }
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const CATEGORIES = [
  'Todos',
  'Mercearia',
  'Laticínios',
  'Padaria',
  'Açougue',
  'Hortifrúti',
  'Bebidas',
  'Limpeza',
  'Higiene',
]

export function ProductsView() {
  const { setView, addToCart, session } = useAppStore()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')
  const [sort, setSort] = useState<'expiration' | 'discount' | 'price'>('expiration')

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]))
  }, [])

  const filtered = useMemo(() => {
    const list = products.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      if (category !== 'Todos' && p.category !== category) return false
      return true
    })

    if (sort === 'expiration') {
      list.sort((a, b) => +new Date(a.expirationDate) - +new Date(b.expirationDate))
    } else if (sort === 'discount') {
      const disc = (p: Product) =>
        (p.originalPrice - p.promoPrice) / p.originalPrice
      list.sort((a, b) => disc(b) - disc(a))
    } else {
      list.sort((a, b) => a.promoPrice - b.promoPrice)
    }
    return list
  }, [products, search, category, sort])

  function handleAdd(p: Product) {
    if (!session) {
      toast({
        title: 'Faça login',
        description: 'Entre para reservar produtos.',
      })
      setView('login')
      return
    }
    addToCart(p.id, 1)
    toast({
      title: 'Adicionado ao carrinho',
      description: `${p.name} (${formatBRL(p.promoPrice)})`,
    })
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Ofertas disponíveis</h1>
        <p className="text-sm text-muted-foreground">
          Produtos próximos da validade com desconto. Reserve e retire sem fila.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expiration">Vence em breve</SelectItem>
            <SelectItem value="discount">Maior desconto</SelectItem>
            <SelectItem value="price">Menor preço</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhuma oferta encontrada com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const days = daysUntil(p.expirationDate)
            const discount = Math.round(
              ((p.originalPrice - p.promoPrice) / p.originalPrice) * 100,
            )
            return (
              <div
                key={p.id}
                className="rounded-lg border border-border bg-card overflow-hidden flex flex-col"
              >
                <div className="aspect-square bg-secondary/30 grid place-items-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Leaf className="h-10 w-10 text-primary/50" />
                  )}
                </div>
                <div className="p-3 space-y-2 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm leading-tight">{p.name}</h3>
                    <Badge className="bg-primary text-primary-foreground text-xs shrink-0">
                      -{discount}%
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{p.company?.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs line-through text-muted-foreground">
                      {formatBRL(p.originalPrice)}
                    </span>
                    <span className="text-base font-bold text-primary">
                      {formatBRL(p.promoPrice)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {days} {days === 1 ? 'dia' : 'dias'}
                    </span>
                    <span>{p.quantity} un.</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 mt-auto"
                    onClick={() => handleAdd(p)}
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Reservar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
