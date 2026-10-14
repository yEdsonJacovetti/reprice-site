'use client'

import { useEffect, useState } from 'react'
import { Leaf, Tag, MapPin, Timer, Recycle, ShoppingCart } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Product = {
  id: string
  name: string
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

export function HomeView() {
  const { setView, addToCart, session } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]))
  }, [])

  const featured = products.slice(0, 4)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* Hero */}
      <section className="rounded-2xl bg-gradient-to-br from-black via-zinc-900 to-primary/20 border border-primary/30 p-8 md:p-12">
        <div className="flex flex-col items-start gap-4 max-w-2xl">
          <Badge className="bg-primary/20 text-primary border border-primary/40">
            <Leaf className="h-3 w-3 mr-1" /> Antidesperdício
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Produtos que ganham uma <span className="text-primary">nova chance</span>.
            Preços que ganham uma nova vida.
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            O RePrice conecta supermercados e consumidores para vender produtos
            próximos da data de validade com desconto. Você economiza, evita o
            desperdício e ainda retira rápido, sem fila.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => setView('products')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Ver ofertas
            </Button>
            {!session && (
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('register')}
              >
                Criar conta
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              icon: Tag,
              title: '1. Encontre',
              desc: 'Veja produtos próximos da validade com desconto nos mercados perto de você.',
            },
            {
              icon: ShoppingCart,
              title: '2. Reserve',
              desc: 'Escolha os produtos, adicione ao carrinho e finalize a reserva online.',
            },
            {
              icon: MapPin,
              title: '3. Retire',
              desc: 'Vá até o ponto exclusivo de retirada no mercado e apresente seu QR Code.',
            },
            {
              icon: Recycle,
              title: '4. Economize',
              desc: 'Pague menos, evite o desperdício e ajude o planeta.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-card p-4 space-y-2"
            >
              <item.icon className="h-6 w-6 text-primary" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured offers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Ofertas em destaque</h2>
          <Button variant="link" onClick={() => setView('products')}>
            Ver todas
          </Button>
        </div>

        {featured.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
            Nenhuma oferta disponível ainda. Volte mais tarde.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((p) => {
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
                  <div className="p-3 space-y-2 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm leading-tight">{p.name}</h3>
                      <Badge className="bg-primary text-primary-foreground text-xs">
                        -{discount}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {p.company?.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs line-through text-muted-foreground">
                        {formatBRL(p.originalPrice)}
                      </span>
                      <span className="text-base font-bold text-primary">
                        {formatBRL(p.promoPrice)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="h-3 w-3" />
                      Vence em {days} {days === 1 ? 'dia' : 'dias'}
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={() => {
                        if (!session) {
                          setView('login')
                          return
                        }
                        addToCart(p.id, 1)
                      }}
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

      {/* Companies CTA */}
      <section className="rounded-lg border border-border bg-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Tem um mercado ou atacarejo?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Cadastre sua empresa, publique seus produtos próximos da validade e
            receba reservas dos clientes.
          </p>
        </div>
        <Button
          onClick={() => setView('register')}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Cadastrar empresa
        </Button>
      </section>
    </div>
  )
}
