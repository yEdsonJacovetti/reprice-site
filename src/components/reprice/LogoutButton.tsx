'use client'

// Botão "Sair" com janela de confirmação.
// Ao clicar, abre um pop-up perguntando se a pessoa quer mesmo sair;
// só desloga depois de confirmar.

import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const ROLE_LABEL = { user: 'cliente', company: 'empresa', dev: 'dev' } as const

export function LogoutButton({ label = 'Sair', className }: { label?: string; className?: string }) {
  const { session, cart, clearCart, setView } = useAppStore()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  if (!session) return null
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)

  async function confirmLogout() {
    setLeaving(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      clearCart()
      useAppStore.setState({ session: null })
      setView('home')
      setLeaving(false)
      setOpen(false)
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" className={className} onClick={() => setOpen(true)}>
        <LogOut className="h-4 w-4" />
        {label}
      </Button>

      <AlertDialog open={open} onOpenChange={(o) => !leaving && setOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair da conta?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Você está conectado como{' '}
                  <strong className="text-foreground">{session.name}</strong> ({ROLE_LABEL[session.role]}).
                </p>
                {cartCount > 0 && (
                  <p>
                    Seu carrinho tem {cartCount} {cartCount === 1 ? 'item' : 'itens'} que ainda não{' '}
                    {cartCount === 1 ? 'foi reservado e será esvaziado' : 'foram reservados e serão esvaziados'}.
                  </p>
                )}
                <p>Pra entrar com outra conta, saia e faça login de novo.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Continuar conectado</AlertDialogCancel>
            <Button
              onClick={confirmLogout}
              disabled={leaving}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              <LogOut className="h-4 w-4" />
              {leaving ? 'Saindo…' : 'Sim, sair'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
