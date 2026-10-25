'use client'

// Página inicial: busca no topo + produtos em destaque.
// A busca procura em TODAS as ofertas disponíveis (nome, categoria e mercado),
// sem diferenciar maiúsculas/minúsculas nem acentos.

import { useEffect, useMemo, useState } from 'react'
import { Leaf, Tag, MapPin, Timer, Recycle, ShoppingCart, Search, X } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

type Product = {
  id: string
  name: string
  category: string
  description?: string | null
  originalPrice: number
  promoPrice: number
  expirationDate: string
  quantity: number
  imageUrl?: string | null
  company: { name: string; city?: string | null }
}

const CATEGORIES = ['Todos', 'Mercearia', 'Laticínios', 'Padaria', 'Açougue', 'Hortifrúti', 'Bebidas', 'Limpeza', 'Higiene']
const FEATURED_COUNT = 8

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function discountOf(p: Product): number {
  return p.originalPrice > 0 ? Math.round(((p.originalPrice - p.promoPrice) / p.originalPrice) * 100) : 0
}

// "Laticínios" e "laticinios" viram a mesma coisa na busca
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

export function HomeView() {
  const { setView, addToCart, session } = useAppStore()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[] | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todos')

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]))
  }, [])

  const searching = search.trim() !== '' || category !== 'Todos'

  // Com busca: todos os resultados. Sem busca: os maiores descontos.
  const shown = useMemo(() => {
    if (!products) return []
    if (!searching) {
      return [...products].sort((a, b) => discountOf(b) - discountOf(a)).slice(0, FEATURED_COUNT)
    }
    const term = normalize(search)
    return products.filter((p) => {
      if (category !== 'Todos' && p.category !== category) return false
      if (!term) return true
      return normalize(`${p.name} ${p.category} ${p.company?.name ?? ''}`).includes(term)
    })
  }, [products, search, category, searching])

  function handleReserve(p: Product) {
    if (!session) {
      toast({ title: 'Faça login', description: 'Entre como cliente para reservar produtos.' })
      setView('login')
      return
    }
    if (session.role !== 'user') {
      toast({ title: 'Só clientes reservam', description: 'Entre com uma conta de cliente para reservar.' })
      return
    }
    addToCart(p.id, 1)
    toast({ title: 'Adicionado ao carrinho', description: `${p.name} (${formatBRL(p.promoPrice)})` })
  }

  function clearSearch() {
    setSearch('')
    setCategory('Todos')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      {/* Busca no topo, centralizada */}
      <section className="flex flex-col items-center gap-4 pt-2">
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className="relative w-full max-w-2xl"
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            id="home-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produtos: arroz, leite, iogurte…"
            aria-label="Buscar produtos"
            autoComplete="off"
            className="h-14 w-full rounded-full border border-primary/40 bg-card pl-12 pr-12 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        <div className="flex flex-wrap justify-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                category === c
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground/80 hover:border-primary/60'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Produtos em destaque / resultados da busca */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {searching
              ? `${shown.length} ${shown.length === 1 ? 'produto encontrado' : 'produtos encontrados'}`
              : 'Ofertas em destaque'}
          </h2>
          {searching ? (
            <Button variant="link" onClick={clearSearch}>
              Limpar busca
            </Button>
          ) : (
            <Button variant="link" onClick={() => setView('products')}>
              Ver todas as ofertas
            </Button>
          )}
        </div>

        {products === null ? (
          <p className="text-sm text-muted-foreground">Carregando ofertas…</p>
        ) : shown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground space-y-2">
            {searching ? (
              <>
                <p>
                  Nenhuma oferta encontrada{search.trim() ? ` para “${search.trim()}”` : ''}
                  {category !== 'Todos' ? ` em ${category}` : ''}.
                </p>
                <p className="text-xs">
                  Tente outro nome ou volte mais tarde: os mercados publicam ofertas novas todo dia.
                </p>
              </>
            ) : (
              <p>Nenhuma oferta disponível ainda. Volte mais tarde.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {shown.map((p) => {
              const days = daysUntil(p.expirationDate)
              return (
                <div key={p.id} className="rounded-lg border border-border bg-card overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-secondary/30 grid place-items-center">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <Leaf className="h-10 w-10 text-primary/50" />
                    )}
                    <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">
                      -{discountOf(p)}%
                    </Badge>
                  </div>
                  <div className="p-3 flex flex-1 flex-col gap-2">
                    <div>
                      <h3 className="font-medium text-sm leading-tight">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.company?.name}
                        {p.company?.city ? ` · ${p.company.city}` : ''}
                      </p>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs line-through text-muted-foreground">{formatBRL(p.originalPrice)}</span>
                      <span className="text-base font-bold text-primary">{formatBRL(p.promoPrice)}</span>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${days <= 2 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      <Timer className="h-3 w-3" />
                      Vence em {days} {days === 1 ? 'dia' : 'dias'}
                    </div>
                    <Button
                      size="sm"
                      className="mt-auto w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleReserve(p)}
                    >
                      Reservar
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Como funciona (mais compacto, depois dos produtos) */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Como funciona</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Tag, title: '1. Encontre', desc: 'Busque ofertas perto da validade com desconto.' },
            { icon: ShoppingCart, title: '2. Reserve', desc: 'Coloque no carrinho e confirme a reserva.' },
            { icon: MapPin, title: '3. Retire', desc: 'Mostre o código de retirada no mercado.' },
            { icon: Recycle, title: '4. Economize', desc: 'Pague na loja e evite o desperdício.' },
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-card p-3 space-y-1">
              <item.icon className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Chamada para mercados */}
      <section className="rounded-lg border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tem um mercado ou atacarejo?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre sua empresa, publique seus produtos próximos da validade e receba reservas dos clientes.
          </p>
        </div>
        <Button onClick={() => setView('register')} className="bg-primary text-primary-foreground hover:bg-primary/90">
          Cadastrar empresa
        </Button>
      </section>
    </div>
  )
}
