'use client'

import { create } from 'zustand'

export type SessionRole = 'user' | 'company'

export type SessionInfo = {
  role: SessionRole
  id: string
  name: string
  email: string
}

type AppState = {
  session: SessionInfo | null
  loadingSession: boolean
  setSession: (s: SessionInfo | null) => void
  setLoadingSession: (v: boolean) => void

  cart: Record<string, number> // productId -> quantity
  addToCart: (productId: string, qty?: number) => void
  removeFromCart: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  clearCart: () => void

  view: AppView
  setView: (v: AppView) => void
}

export type AppView =
  | 'home'
  | 'login'
  | 'register'
  | 'products'
  | 'cart'
  | 'orders'
  | 'company-dashboard'
  | 'company-products'
  | 'company-near-expiration'
  | 'company-orders'
  | 'company-new-product'

export const useAppStore = create<AppState>((set) => ({
  session: null,
  loadingSession: true,
  setSession: (s) => set({ session: s }),
  setLoadingSession: (v) => set({ loadingSession: v }),

  cart: {},
  addToCart: (productId, qty = 1) =>
    set((state) => ({
      cart: { ...state.cart, [productId]: (state.cart[productId] || 0) + qty },
    })),
  removeFromCart: (productId) =>
    set((state) => {
      const next = { ...state.cart }
      delete next[productId]
      return { cart: next }
    }),
  setQty: (productId, qty) =>
    set((state) => {
      const next = { ...state.cart }
      if (qty <= 0) delete next[productId]
      else next[productId] = qty
      return { cart: next }
    }),
  clearCart: () => set({ cart: {} }),

  view: 'home',
  setView: (v) => set({ view: v }),
}))
