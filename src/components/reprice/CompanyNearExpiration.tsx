'use client'

import { useEffect, useState } from 'react'
import { Timer, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type Product = {
  id: string
  name: string
  category: string
  originalPrice: number
  promoPrice: number
  expirationDate: string
  quantity: number
  status: string
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

export function CompanyNearExpiration() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/company/products')
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .finally(() => setLoading(false))
  }, [])

  const near = products
    .filter((p) => p.status === 'ACTIVE')
    .map((p) => ({ ...p, days: daysUntil(p.expirationDate) }))
    .filter((p) => p.days <= 7)
    .sort((a, b) => a.days - b.days)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Timer className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Próximos da validade</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Produtos que vencem em até 7 dias. Aplique descontos para acelerar a
        saída e evitar perdas.
      </p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : near.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          Nenhum produto próximo da validade. Tudo certo!
        </div>
      ) : (
        <div className="space-y-2">
          {near.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{p.name}</h3>
                  {p.days <= 1 ? (
                    <Badge className="bg-destructive/20 text-destructive border-destructive/40">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Vence hoje
                    </Badge>
                  ) : p.days <= 3 ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/40">
                      {p.days} dias
                    </Badge>
                  ) : (
                    <Badge variant="outline">{p.days} dias</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.category} · {p.quantity} un.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs line-through text-muted-foreground">
                  {formatBRL(p.originalPrice)}
                </div>
                <div className="text-sm font-bold text-primary">
                  {formatBRL(p.promoPrice)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
