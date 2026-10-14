'use client'

import { useEffect, useState } from 'react'
import { Package, Timer, ShoppingBag, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'

type Product = {
  id: string
  name: string
  expirationDate: string
  quantity: number
  status: string
  promoPrice: number
  originalPrice: number
}

type Reservation = {
  id: string
  status: string
  quantity: number
  product: { name: string }
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function CompanyDashboard() {
  const { setView } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])

  useEffect(() => {
    fetch('/api/company/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => {})
    fetch('/api/company/reservations')
      .then((r) => r.json())
      .then((d) => setReservations(d.reservations || []))
      .catch(() => {})
  }, [])

  const activeProducts = products.filter((p) => p.status === 'ACTIVE')
  const nearExpiration = activeProducts.filter(
    (p) => daysUntil(p.expirationDate) <= 5,
  )
  const pendingReservations = reservations.filter(
    (r) => r.status === 'PENDING',
  )
  const readyReservations = reservations.filter((r) => r.status === 'READY')
  const deliveredCount = reservations.filter((r) => r.status === 'DELIVERED').length

  const cards = [
    {
      label: 'Produtos ativos',
      value: activeProducts.length,
      icon: Package,
      hint: 'publicados no site',
    },
    {
      label: 'Próximos da validade',
      value: nearExpiration.length,
      icon: Timer,
      hint: 'vencem em até 5 dias',
      onClick: () => setView('company-near-expiration'),
    },
    {
      label: 'Reservas pendentes',
      value: pendingReservations.length,
      icon: ShoppingBag,
      hint: 'aguardando separação',
      onClick: () => setView('company-orders'),
    },
    {
      label: 'Já retirados',
      value: deliveredCount,
      icon: CheckCircle,
      hint: 'pedidos entregues',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            className="rounded-lg border border-border bg-card p-4 text-left hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <c.icon className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">{c.value}</span>
            </div>
            <div className="mt-2 text-sm font-medium">{c.label}</div>
            <div className="text-xs text-muted-foreground">{c.hint}</div>
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Ações rápidas</h3>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setView('company-new-product')}>
            Cadastrar produto
          </Button>
          <Button variant="outline" onClick={() => setView('company-products')}>
            Ver meus produtos
          </Button>
          <Button variant="outline" onClick={() => setView('company-orders')}>
            Ver pedidos recebidos
          </Button>
        </div>
      </div>

      {/* Recent reservations */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold">Reservas recentes</h3>
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma reserva recebida ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {reservations.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm border-b border-border/60 pb-2 last:border-0 last:pb-0"
              >
                <span>{r.product.name}</span>
                <span className="text-muted-foreground">
                  {r.quantity}un · {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
