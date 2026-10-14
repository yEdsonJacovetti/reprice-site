'use client'

import { useEffect } from 'react'
import { Store, Package, Timer, ShoppingBag, LayoutDashboard, Plus } from 'lucide-react'
import { useAppStore, type AppView } from '@/store/app'
import { Button } from '@/components/ui/button'

export function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { view, setView } = useAppStore()

  const items: { key: AppView; label: string; icon: any }[] = [
    { key: 'company-dashboard', label: 'Visão geral', icon: LayoutDashboard },
    { key: 'company-products', label: 'Produtos', icon: Package },
    { key: 'company-near-expiration', label: 'Próximos da validade', icon: Timer },
    { key: 'company-orders', label: 'Pedidos recebidos', icon: ShoppingBag },
  ]

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-bold">Painel da empresa</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie seus produtos, ofertas e reservas.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setView('company-new-product')}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo produto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {items.map((it) => (
            <button
              key={it.key}
              onClick={() => setView(it.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                view === it.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground/80 hover:bg-secondary/40'
              }`}
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
