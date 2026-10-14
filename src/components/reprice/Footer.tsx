'use client'

import { Leaf, Recycle, Tag, MapPin } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-black">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Leaf className="h-4 w-4" />
          RePrice
        </div>
        <p className="text-xs">
          Produtos que ganham uma nova chance · Preços que ganham uma nova vida
        </p>
        <p className="text-xs">© {new Date().getFullYear()} RePrice — Projeto acadêmico</p>
      </div>
    </footer>
  )
}
