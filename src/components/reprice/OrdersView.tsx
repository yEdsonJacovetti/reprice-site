'use client'

import { useEffect, useState } from 'react'
import { Package, QrCode, Store, MapPin } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Reservation = {
  id: string
  quantity: number
  status: string
  pickupCode: string
  createdAt: string
  product: {
    id: string
    name: string
    promoPrice: number
    company: { name: string; city?: string | null; address?: string | null }
  }
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function statusLabel(status: string) {
  switch (status) {
    case 'PENDING':
      return { label: 'Em separação', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' }
    case 'READY':
      return { label: 'Pronto para retirada', color: 'bg-primary/20 text-primary border-primary/40' }
    case 'DELIVERED':
      return { label: 'Retirado', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40' }
    case 'CANCELLED':
      return { label: 'Cancelado', color: 'bg-destructive/20 text-destructive border-destructive/40' }
    default:
      return { label: status, color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40' }
  }
}

export function OrdersView() {
  const { session, setView } = useAppStore()
  const { toast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    let active = true
    fetch('/api/reservations')
      .then((r) => r.json())
      .then((d) => {
        if (active) setReservations(d.reservations || [])
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [session])

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center space-y-4">
        <Package className="h-10 w-10 mx-auto text-primary/50" />
        <h1 className="text-xl font-bold">Faça login para ver seus pedidos</h1>
        <Button onClick={() => setView('login')}>Entrar</Button>
      </div>
    )
  }

  if (!loading && reservations.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center space-y-4">
        <Package className="h-10 w-10 mx-auto text-primary/50" />
        <h1 className="text-xl font-bold">Nenhuma reserva ainda</h1>
        <p className="text-sm text-muted-foreground">
          Quando você reservar produtos, eles aparecem aqui.
        </p>
        <Button onClick={() => setView('products')}>Ver ofertas</Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-primary" />
        <h1 className="text-2xl font-bold">Meus pedidos</h1>
      </div>

      <div className="space-y-3">
        {reservations.map((r) => {
          const s = statusLabel(r.status)
          return (
            <div
              key={r.id}
              className="rounded-lg border border-border bg-card p-4 flex flex-col md:flex-row md:items-center gap-4"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{r.product.name}</h3>
                  <Badge variant="outline" className={s.color}>
                    {s.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Store className="h-3 w-3" />
                    {r.product.company.name}
                  </span>
                  {r.product.company.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {r.product.company.address}
                    </span>
                  )}
                  <span>Qtd: {r.quantity}</span>
                  <span>{formatBRL(r.product.promoPrice * r.quantity)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Feito em{' '}
                  {new Date(r.createdAt).toLocaleString('pt-BR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </p>
              </div>

              <div className="flex flex-col items-start md:items-end gap-1">
                <div className="text-xs text-muted-foreground">Código de retirada</div>
                <div className="font-mono text-sm bg-secondary/40 px-3 py-1.5 rounded-md">
                  {r.pickupCode.slice(0, 8).toUpperCase()}
                </div>
                {r.status === 'READY' && (
                  <Badge className="bg-primary text-primary-foreground mt-1">
                    <QrCode className="h-3 w-3 mr-1" />
                    Pronto para retirar
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
