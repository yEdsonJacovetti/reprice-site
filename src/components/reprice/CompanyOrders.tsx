'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Reservation = {
  id: string
  status: string
  quantity: number
  pickupCode: string
  createdAt: string
  product: {
    id: string
    name: string
    promoPrice: number
  }
  user: { id: string; name: string; email: string; phone?: string | null }
}

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const NEXT: Record<string, string> = {
  PENDING: 'READY',
  READY: 'DELIVERED',
  DELIVERED: '',
  CANCELLED: '',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Em separação',
  READY: 'Pronto para retirada',
  DELIVERED: 'Retirado',
  CANCELLED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  READY: 'bg-primary/20 text-primary border-primary/40',
  DELIVERED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/40',
  CANCELLED: 'bg-destructive/20 text-destructive border-destructive/40',
}

export function CompanyOrders() {
  const { toast } = useToast()
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/company/reservations')
      const data = await res.json()
      setReservations(data.reservations || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function updateStatus(id: string, status: string) {
    const res = await fetch(`/api/company/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
      return
    }
    toast({ title: 'Status atualizado' })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Pedidos recebidos</h2>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : reservations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          Nenhuma reserva recebida ainda.
        </div>
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => {
            const nextStatus = NEXT[r.status]
            return (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-card p-3 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-sm">{r.product.name}</h3>
                    <Badge variant="outline" className={STATUS_COLORS[r.status]}>
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {r.user.name}
                    </span>
                    <span>{r.user.email}</span>
                    <span>Qtd: {r.quantity}</span>
                    <span>{formatBRL(r.product.promoPrice * r.quantity)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pedido em{' '}
                    {new Date(r.createdAt).toLocaleString('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Código</div>
                    <div className="font-mono text-sm bg-secondary/40 px-2 py-1 rounded">
                      {r.pickupCode.slice(0, 8).toUpperCase()}
                    </div>
                  </div>
                  {nextStatus ? (
                    <Button
                      size="sm"
                      onClick={() => updateStatus(r.id, nextStatus)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      Avançar para {STATUS_LABELS[nextStatus]}
                    </Button>
                  ) : (
                    <Select
                      onValueChange={(v) => updateStatus(r.id, v)}
                      defaultValue={r.status}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Em separação</SelectItem>
                        <SelectItem value="READY">Pronto para retirada</SelectItem>
                        <SelectItem value="DELIVERED">Retirado</SelectItem>
                        <SelectItem value="CANCELLED">Cancelar</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
