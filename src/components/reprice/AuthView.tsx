'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { User as UserIcon, Store, Leaf } from 'lucide-react'

export function AuthView({ mode }: { mode: 'login' | 'register' }) {
  const { setView, setSession } = useAppStore()
  const { toast } = useToast()
  const [role, setRole] = useState<'user' | 'company'>('user')
  const [loading, setLoading] = useState(false)

  // shared
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // user extras
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')

  // company extras
  const [cnpj, setCnpj] = useState('')
  const [address, setAddress] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'register') {
        const url =
          role === 'user' ? '/api/auth/register-user' : '/api/auth/register-company'
        const body =
          role === 'user'
            ? { name, email, password, phone, city }
            : { name, email, password, cnpj, phone, city, address }
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar')
        setSession({
          role,
          id: data.id,
          name: data.name,
          email: data.email,
        })
        toast({ title: 'Conta criada!', description: `Bem-vindo(a), ${data.name}` })
        setView(role === 'user' ? 'home' : 'company-dashboard')
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao entrar')
        setSession({
          role: data.role,
          id: data.id,
          name: data.name,
          email: data.email,
        })
        toast({
          title: 'Login feito!',
          description: `Olá, ${data.name}`,
        })
        setView(data.role === 'user' ? 'home' : 'company-dashboard')
      }
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Algo deu errado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-lg border border-border bg-card p-6 space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-bold">
            {mode === 'login' ? 'Entrar no RePrice' : 'Criar conta'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Acesse sua conta para reservar ofertas.'
              : 'Escolha o tipo de conta que deseja criar.'}
          </p>
        </div>

        <Tabs value={role} onValueChange={(v) => setRole(v as 'user' | 'company')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user">
              <UserIcon className="h-3 w-3 mr-1" /> Cliente
            </TabsTrigger>
            <TabsTrigger value="company">
              <Store className="h-3 w-3 mr-1" /> Empresa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: João Silva"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade (opcional)</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                    />
                  </div>
                </>
              )}
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading
                  ? 'Carregando...'
                  : mode === 'login'
                    ? 'Entrar'
                    : 'Criar conta de cliente'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="company" className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === 'register' && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="cname">Nome da empresa</Label>
                    <Input
                      id="cname"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex.: Mercado Exemplo"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                    <Input
                      id="cnpj"
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="00.000.000/0001-00"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Endereço (opcional)</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua das Ofertas, 100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade (opcional)</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="São Paulo"
                    />
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mercado@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={loading}
              >
                {loading
                  ? 'Carregando...'
                  : mode === 'login'
                    ? 'Entrar como empresa'
                    : 'Cadastrar empresa'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              Não tem conta?{' '}
              <button
                onClick={() => setView('register')}
                className="text-primary hover:underline"
              >
                Criar conta
              </button>
            </>
          ) : (
            <>
              Já tem conta?{' '}
              <button
                onClick={() => setView('login')}
                className="text-primary hover:underline"
              >
                Entrar
              </button>
            </>
          )}
        </div>

        {mode === 'login' && (
          <div className="text-xs text-muted-foreground rounded-md border border-dashed border-border p-3">
            <p className="font-medium text-foreground mb-1">Conta de demonstração:</p>
            <p>Empresa: mercadoexemplo@reprice.com / 123456</p>
          </div>
        )}
      </div>
    </div>
  )
}
