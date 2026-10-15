'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/app'
import { Header } from '@/components/reprice/Header'
import { Footer } from '@/components/reprice/Footer'
import { HomeView } from '@/components/reprice/HomeView'
import { AuthView } from '@/components/reprice/AuthView'
import { ProductsView } from '@/components/reprice/ProductsView'
import { CartView } from '@/components/reprice/CartView'
import { OrdersView } from '@/components/reprice/OrdersView'
import { CompanyLayout } from '@/components/reprice/CompanyLayout'
import { CompanyDashboard } from '@/components/reprice/CompanyDashboard'
import { CompanyProducts } from '@/components/reprice/CompanyProducts'
import { CompanyNearExpiration } from '@/components/reprice/CompanyNearExpiration'
import { CompanyOrders } from '@/components/reprice/CompanyOrders'
import { CompanyNewProduct } from '@/components/reprice/CompanyNewProduct'
import { SupportView } from '@/components/reprice/SupportView'
import { DevLoginView } from '@/components/reprice/DevLoginView'
import { DevPanel } from '@/components/reprice/DevPanel'

export default function Home() {
  const { view, session, loadingSession, setSession, setLoadingSession, setView } =
    useAppStore()

  // Load session on mount
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setSession({
            role: d.user.role,
            id: d.user.id,
            name: d.user.name,
            email: d.user.email,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSession(false))
  }, [setSession, setLoadingSession])

  // Guard company-only views
  useEffect(() => {
    if (!session && view.startsWith('company-')) {
      setView('login')
    }
    if (session?.role === 'company' && ['cart', 'orders'].includes(view)) {
      setView('company-dashboard')
    }
    if (view === 'dev' && session?.role !== 'dev') {
      setView('dev-login')
    }
    if (session?.role === 'dev' && (view.startsWith('company-') || ['cart', 'orders'].includes(view))) {
      setView('dev')
    }
  }, [session, view, setView])

  function renderView() {
    switch (view) {
      case 'login':
        return <AuthView mode="login" />
      case 'register':
        return <AuthView mode="register" />
      case 'products':
        return <ProductsView />
      case 'cart':
        return <CartView />
      case 'orders':
        return <OrdersView />
      case 'company-dashboard':
        return (
          <CompanyLayout>
            <CompanyDashboard />
          </CompanyLayout>
        )
      case 'company-products':
        return (
          <CompanyLayout>
            <CompanyProducts />
          </CompanyLayout>
        )
      case 'company-near-expiration':
        return (
          <CompanyLayout>
            <CompanyNearExpiration />
          </CompanyLayout>
        )
      case 'company-orders':
        return (
          <CompanyLayout>
            <CompanyOrders />
          </CompanyLayout>
        )
      case 'company-new-product':
        return (
          <CompanyLayout>
            <CompanyNewProduct />
          </CompanyLayout>
        )
      case 'support':
        return <SupportView />
      case 'dev-login':
        return <DevLoginView />
      case 'dev':
        return <DevPanel />
      case 'home':
      default:
        return <HomeView />
    }
  }

  if (loadingSession) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">{renderView()}</main>
      <Footer />
    </div>
  )
}
