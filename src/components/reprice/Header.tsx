'use client'

import Link from 'next/link'
import { ShoppingCart, LogOut, User as UserIcon, Store, Code2 } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Header() {
  const { session, cart, setView, clearCart } = useAppStore()

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-black/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <button
          onClick={() => setView('home')}
          className="flex items-center"
          aria-label="RePrice — início"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/reprice-logo.png" alt="RePrice" className="h-7 w-auto" />
        </button>

        <nav className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('home')}
            className="text-foreground/80 hover:text-foreground"
          >
            Início
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('products')}
            className="text-foreground/80 hover:text-foreground"
          >
            Ofertas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('support')}
            className="text-foreground/80 hover:text-foreground"
          >
            Suporte
          </Button>

          {session?.role === 'user' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('cart')}
                className="relative text-foreground/80 hover:text-foreground"
              >
                <ShoppingCart className="h-4 w-4" />
                Carrinho
                {cartCount > 0 && (
                  <Badge className="ml-1 bg-primary text-primary-foreground">
                    {cartCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView('orders')}
                className="text-foreground/80 hover:text-foreground"
              >
                Meus pedidos
              </Button>
            </>
          )}

          {session?.role === 'company' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('company-dashboard')}
              className="text-foreground/80 hover:text-foreground"
            >
              Painel
            </Button>
          )}

          {session?.role === 'dev' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('dev')}
              className="text-amber-400 hover:text-amber-300"
            >
              <Code2 className="h-4 w-4" />
              Dev
            </Button>
          )}

          {!session ? (
            <Button
              size="sm"
              onClick={() => setView('login')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Entrar
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                {session.role === 'company' ? (
                  <Store className="h-3 w-3" />
                ) : session.role === 'dev' ? (
                  <Code2 className="h-3 w-3" />
                ) : (
                  <UserIcon className="h-3 w-3" />
                )}
                {session.name}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  clearCart()
                  setView('home')
                  useAppStore.setState({ session: null })
                }}
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
