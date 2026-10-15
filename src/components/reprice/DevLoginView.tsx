'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DevLoginView() {
  const { setView, setSession, clearCart } = useAppStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/dev/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Acesso negado.')
      clearCart()
      setSession({ role: 'dev', id: data.id, name: data.name, email: data.email })
      setView('dev')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-border/60 bg-card p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h1 className="font-semibold">Acesso restrito</h1>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dev-email">Email</Label>
          <Input id="dev-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dev-password">Senha</Label>
          <Input id="dev-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
        <button type="button" onClick={() => setView('support')} className="text-xs text-muted-foreground hover:text-foreground">
          Voltar ao suporte
        </button>
      </form>
    </div>
  )
}
