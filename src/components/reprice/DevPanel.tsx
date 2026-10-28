'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Code2, LayoutDashboard, Users, Store, Package, ShoppingBag, HelpCircle, Mail,
  Pencil, Trash2, Plus, RefreshCw, Search, LogOut, Headset,
} from 'lucide-react'
import { useAppStore } from '@/store/app'
import { LogoutButton } from '@/components/reprice/LogoutButton'
import { DevChatDesk } from '@/components/reprice/DevChatDesk'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>
type Entity = 'users' | 'companies' | 'products' | 'reservations' | 'faqs' | 'messages'
type Tab = 'overview' | 'chats' | Entity

type Field = {
  key: string
  label: string
  type?: 'text' | 'email' | 'number' | 'date' | 'textarea' | 'password' | 'switch' | 'select'
  options?: { value: string; label: string }[]
  placeholder?: string
}

type Column = {
  label: string
  render: (r: Row) => React.ReactNode
  className?: string
}

const brl = (n: number) =>
  Number(n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const dt = (s: string) => (s ? new Date(s).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—')
const dtt = (s: string) =>
  s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const toInputDate = (s: string) => (s ? new Date(s).toISOString().slice(0, 10) : '')

const PRODUCT_STATUS = [
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'RESERVED', label: 'Reservado' },
  { value: 'SOLD_OUT', label: 'Esgotado' },
  { value: 'EXPIRED', label: 'Vencido' },
]
const RESERVATION_STATUS = [
  { value: 'PENDING', label: 'Pendente' },
  { value: 'READY', label: 'Pronto' },
  { value: 'DELIVERED', label: 'Retirado' },
  { value: 'CANCELLED', label: 'Cancelado' },
]
const MESSAGE_STATUS = [
  { value: 'OPEN', label: 'Aberta' },
  { value: 'RESOLVED', label: 'Resolvida' },
]
const labelOf = (opts: { value: string; label: string }[], v: string) =>
  opts.find((o) => o.value === v)?.label ?? v

type EntityConfig = {
  title: string
  singular: string
  icon: any
  canCreate?: boolean
  searchText: (r: Row) => string
  columns: Column[]
  fields: Field[]
  statusField?: { key: string; options: { value: string; label: string }[] }
  toForm: (r: Row) => Row
  deleteWarning?: string
}

const CONFIG: Record<Entity, EntityConfig> = {
  users: {
    title: 'Usuários',
    singular: 'usuário',
    icon: Users,
    searchText: (r) => `${r.name} ${r.email} ${r.city ?? ''}`,
    columns: [
      { label: 'Nome', render: (r) => <span className="font-medium">{r.name}</span> },
      { label: 'Email', render: (r) => r.email },
      { label: 'Cidade', render: (r) => r.city || '—' },
      { label: 'Reservas', render: (r) => r._count?.reservations ?? 0, className: 'text-right tabular-nums' },
      { label: 'Desde', render: (r) => dt(r.createdAt) },
    ],
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Telefone' },
      { key: 'city', label: 'Cidade' },
      { key: 'password', label: 'Nova senha', type: 'password', placeholder: 'Deixe vazio pra não mudar' },
    ],
    toForm: (r) => ({ name: r.name, email: r.email, phone: r.phone ?? '', city: r.city ?? '', password: '' }),
    deleteWarning: 'As reservas desse usuário também serão apagadas.',
  },
  companies: {
    title: 'Empresas',
    singular: 'empresa',
    icon: Store,
    searchText: (r) => `${r.name} ${r.email} ${r.city ?? ''} ${r.cnpj ?? ''}`,
    columns: [
      { label: 'Nome', render: (r) => <span className="font-medium">{r.name}</span> },
      { label: 'Email', render: (r) => r.email },
      { label: 'Cidade', render: (r) => r.city || '—' },
      { label: 'Produtos', render: (r) => r._count?.products ?? 0, className: 'text-right tabular-nums' },
      { label: 'Desde', render: (r) => dt(r.createdAt) },
    ],
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'cnpj', label: 'CNPJ' },
      { key: 'phone', label: 'Telefone' },
      { key: 'city', label: 'Cidade' },
      { key: 'address', label: 'Endereço' },
      { key: 'password', label: 'Nova senha', type: 'password', placeholder: 'Deixe vazio pra não mudar' },
    ],
    toForm: (r) => ({
      name: r.name, email: r.email, cnpj: r.cnpj ?? '', phone: r.phone ?? '',
      city: r.city ?? '', address: r.address ?? '', password: '',
    }),
    deleteWarning: 'Todos os produtos dessa empresa e as reservas deles também serão apagados.',
  },
  products: {
    title: 'Produtos',
    singular: 'produto',
    icon: Package,
    searchText: (r) => `${r.name} ${r.category} ${r.company?.name ?? ''}`,
    columns: [
      { label: 'Produto', render: (r) => <span className="font-medium">{r.name}</span> },
      { label: 'Mercado', render: (r) => r.company?.name ?? '—' },
      {
        label: 'Preço',
        render: (r) => (
          <span className="whitespace-nowrap">
            <span className="text-muted-foreground line-through text-xs mr-1">{brl(r.originalPrice)}</span>
            {brl(r.promoPrice)}
          </span>
        ),
      },
      { label: 'Qtd', render: (r) => r.quantity, className: 'text-right tabular-nums' },
      {
        label: 'Validade',
        render: (r) => {
          const d = new Date(r.expirationDate)
          const late = d.getTime() < Date.now()
          return <span className={late ? 'text-destructive' : ''}>{dt(r.expirationDate)}</span>
        },
      },
    ],
    statusField: { key: 'status', options: PRODUCT_STATUS },
    fields: [
      { key: 'name', label: 'Nome' },
      { key: 'category', label: 'Categoria' },
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'originalPrice', label: 'Preço original (R$)', type: 'number' },
      { key: 'promoPrice', label: 'Preço promocional (R$)', type: 'number' },
      { key: 'quantity', label: 'Quantidade', type: 'number' },
      { key: 'expirationDate', label: 'Validade', type: 'date' },
      { key: 'imageUrl', label: 'URL da imagem' },
      { key: 'status', label: 'Status', type: 'select', options: PRODUCT_STATUS },
    ],
    toForm: (r) => ({
      name: r.name, category: r.category, description: r.description ?? '',
      originalPrice: r.originalPrice, promoPrice: r.promoPrice, quantity: r.quantity,
      expirationDate: toInputDate(r.expirationDate), imageUrl: r.imageUrl ?? '', status: r.status,
    }),
    deleteWarning: 'As reservas desse produto também serão apagadas.',
  },
  reservations: {
    title: 'Reservas',
    singular: 'reserva',
    icon: ShoppingBag,
    searchText: (r) => `${r.pickupCode} ${r.user?.name ?? ''} ${r.user?.email ?? ''} ${r.product?.name ?? ''} ${r.companyName ?? ''}`,
    columns: [
      { label: 'Código', render: (r) => <code className="text-xs">{String(r.pickupCode).slice(-8).toUpperCase()}</code> },
      { label: 'Cliente', render: (r) => r.user?.name ?? '—' },
      { label: 'Produto', render: (r) => `${r.quantity}× ${r.product?.name ?? '—'}` },
      { label: 'Mercado', render: (r) => r.companyName },
      { label: 'Criada', render: (r) => dtt(r.createdAt) },
    ],
    statusField: { key: 'status', options: RESERVATION_STATUS },
    fields: [
      { key: 'quantity', label: 'Quantidade', type: 'number' },
      { key: 'status', label: 'Status', type: 'select', options: RESERVATION_STATUS },
    ],
    toForm: (r) => ({ quantity: r.quantity, status: r.status }),
  },
  faqs: {
    title: 'FAQ',
    singular: 'pergunta',
    icon: HelpCircle,
    canCreate: true,
    searchText: (r) => `${r.question} ${r.answer}`,
    columns: [
      { label: '#', render: (r) => r.position, className: 'tabular-nums w-10' },
      { label: 'Pergunta', render: (r) => <span className="font-medium">{r.question}</span> },
      {
        label: 'Visível',
        render: (r) => (r.published ? <Badge className="bg-primary text-primary-foreground">Publicada</Badge> : <Badge variant="outline">Oculta</Badge>),
      },
    ],
    fields: [
      { key: 'question', label: 'Pergunta' },
      { key: 'answer', label: 'Resposta', type: 'textarea' },
      { key: 'position', label: 'Ordem (menor aparece primeiro)', type: 'number' },
      { key: 'published', label: 'Publicada na aba Suporte', type: 'switch' },
    ],
    toForm: (r) => ({ question: r.question, answer: r.answer, position: r.position, published: r.published }),
  },
  messages: {
    title: 'Mensagens',
    singular: 'mensagem',
    icon: Mail,
    searchText: (r) => `${r.name} ${r.email} ${r.subject} ${r.message}`,
    columns: [
      { label: 'Recebida', render: (r) => dtt(r.createdAt) },
      { label: 'De', render: (r) => <span>{r.name}<br /><span className="text-xs text-muted-foreground select-all">{r.email}</span></span> },
      {
        label: 'Assunto',
        render: (r) => (
          <details>
            <summary className="cursor-pointer font-medium">{r.subject}</summary>
            <p className="mt-2 whitespace-pre-line text-muted-foreground max-w-prose">{r.message}</p>
          </details>
        ),
      },
    ],
    statusField: { key: 'status', options: MESSAGE_STATUS },
    fields: [{ key: 'status', label: 'Status', type: 'select', options: MESSAGE_STATUS }],
    toForm: (r) => ({ status: r.status }),
  },
}

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'overview', label: 'Visão geral', icon: LayoutDashboard },
  { key: 'chats', label: 'Atendimento', icon: Headset },
  ...(Object.keys(CONFIG) as Entity[]).map((k) => ({ key: k as Tab, label: CONFIG[k].title, icon: CONFIG[k].icon })),
]

export function DevPanel() {
  const [tab, setTab] = useState<Tab>('overview')
  const [waitingChats, setWaitingChats] = useState(0)

  // aviso de clientes esperando atendimento, atualizado a cada 15 s
  useEffect(() => {
    const check = () =>
      fetch('/api/dev/stats')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setWaitingChats(d.waitingChats ?? 0))
        .catch(() => {})
    check()
    const t = setInterval(check, 15000)
    return () => clearInterval(t)
  }, [])


  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-500 text-black">
            <Code2 className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg font-bold">Área de dev</h1>
            <p className="text-xs text-muted-foreground">Gerencie usuários, empresas, produtos, reservas e o suporte.</p>
          </div>
        </div>
        <LogoutButton label="Sair da área de dev" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr] gap-6">
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
                tab === t.key ? 'bg-amber-500 text-black font-medium' : 'text-foreground/80 hover:bg-secondary/40'
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {t.key === 'chats' && waitingChats > 0 && (
                <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">{waitingChats}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === 'overview' ? (
            <Overview onGo={setTab} />
          ) : tab === 'chats' ? (
            <DevChatDesk />
          ) : (
            <EntityManager key={tab} entity={tab} />
          )}
        </div>
      </div>
    </div>
  )
}

function Overview({ onGo }: { onGo: (t: Tab) => void }) {
  const [s, setS] = useState<Row | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    fetch('/api/dev/stats')
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error)
        setS(d)
      })
      .catch((e) => setErr(e.message || 'Erro ao carregar'))
  }, [])

  if (err) return <p className="text-sm text-destructive">{err}</p>
  if (!s) return <p className="text-sm text-muted-foreground">Carregando…</p>

  const tiles: { label: string; value: number; hint?: string; go: Tab; warn?: boolean }[] = [
    { label: 'Usuários', value: s.users, go: 'users' },
    { label: 'Empresas', value: s.companies, go: 'companies' },
    { label: 'Produtos', value: s.products, hint: `${s.activeProducts} à venda agora`, go: 'products' },
    { label: 'Vencem em até 3 dias', value: s.expiringSoon, go: 'products', warn: s.expiringSoon > 0 },
    { label: 'Reservas', value: s.reservations, hint: `${s.pending} em andamento`, go: 'reservations' },
    { label: 'Chats aguardando atendente', value: s.waitingChats ?? 0, go: 'chats', warn: (s.waitingChats ?? 0) > 0 },
    { label: 'Mensagens abertas', value: s.openMessages, go: 'messages', warn: s.openMessages > 0 },
    { label: 'Perguntas no FAQ', value: s.faqs, go: 'faqs' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((t) => (
        <button
          key={t.label}
          onClick={() => onGo(t.go)}
          className="text-left rounded-lg border border-border/60 bg-card p-4 hover:border-amber-500/60 transition-colors"
        >
          <div className={`text-3xl font-bold tabular-nums ${t.warn ? 'text-amber-400' : ''}`}>{t.value}</div>
          <div className="text-sm">{t.label}</div>
          {t.hint && <div className="text-xs text-muted-foreground mt-1">{t.hint}</div>}
        </button>
      ))}
    </div>
  )
}

function EntityManager({ entity }: { entity: Entity }) {
  const cfg = CONFIG[entity]
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState<Row | null>(null) // {} = criar
  const [deleting, setDeleting] = useState<Row | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/dev/${entity}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRows(d.rows)
    } catch (e) {
      toast({ title: 'Erro ao carregar', description: (e as Error).message, variant: 'destructive' })
      setRows([])
    }
  }, [entity, toast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    const term = q.trim().toLowerCase()
    return term ? rows.filter((r) => cfg.searchText(r).toLowerCase().includes(term)) : rows
  }, [rows, q, cfg])

  async function patch(id: string, body: Row) {
    const r = await fetch(`/api/dev/${entity}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Erro ao salvar')
  }

  async function changeStatus(row: Row, value: string) {
    try {
      await patch(row.id, { [cfg.statusField!.key]: value })
      setRows((prev) => prev?.map((x) => (x.id === row.id ? { ...x, [cfg.statusField!.key]: value } : x)) ?? null)
      toast({ title: 'Status atualizado' })
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      const r = await fetch(`/api/dev/${entity}/${deleting.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao apagar')
      toast({ title: `${cfg.singular[0].toUpperCase()}${cfg.singular.slice(1)} apagado(a)` })
      setDeleting(null)
      load()
    } catch (e) {
      toast({ title: 'Erro', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold mr-auto">
          {cfg.title}{' '}
          <span className="text-sm font-normal text-muted-foreground tabular-nums">
            {rows ? (q ? `${filtered.length} de ${rows.length}` : rows.length) : ''}
          </span>
        </h2>
        <div className="relative">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input id={`dev-search-${entity}`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="pl-8 w-48" />
        </div>
        <Button variant="outline" size="icon" onClick={load} aria-label="Recarregar">
          <RefreshCw className="h-4 w-4" />
        </Button>
        {cfg.canCreate && (
          <Button onClick={() => setEditing({})} className="bg-amber-500 text-black hover:bg-amber-400">
            <Plus className="h-4 w-4 mr-1" /> Nova {cfg.singular}
          </Button>
        )}
      </div>

      <div className="rounded-lg border border-border/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {cfg.columns.map((c) => (
                <th key={c.label} className={`px-3 py-2 font-medium ${c.className ?? ''}`}>{c.label}</th>
              ))}
              {cfg.statusField && <th className="px-3 py-2 font-medium">Status</th>}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows === null ? (
              <tr><td className="px-3 py-6 text-muted-foreground" colSpan={99}>Carregando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-3 py-6 text-muted-foreground" colSpan={99}>{q ? 'Nada encontrado.' : 'Nenhum registro ainda.'}</td></tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="border-t border-border/40 align-top">
                  {cfg.columns.map((c) => (
                    <td key={c.label} className={`px-3 py-2 ${c.className ?? ''}`}>{c.render(r)}</td>
                  ))}
                  {cfg.statusField && (
                    <td className="px-3 py-2">
                      <Select value={r[cfg.statusField.key]} onValueChange={(v) => changeStatus(r, v)}>
                        <SelectTrigger className="h-8 w-[130px]">
                          <SelectValue>{labelOf(cfg.statusField.options, r[cfg.statusField.key])}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {cfg.statusField.options.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      {entity !== 'messages' && (
                        <Button variant="ghost" size="icon" onClick={() => setEditing(r)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleting(r)} aria-label="Apagar" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditDialog
          entity={entity}
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar {cfg.singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (deleting.name || deleting.question || deleting.subject || deleting.product?.name)}
              {cfg.deleteWarning ? ` — ${cfg.deleteWarning}` : ''} Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EditDialog({ entity, row, onClose, onSaved }: { entity: Entity; row: Row; onClose: () => void; onSaved: () => void }) {
  const cfg = CONFIG[entity]
  const creating = !row.id
  const { toast } = useToast()
  const [form, setForm] = useState<Row>(() =>
    creating ? { question: '', answer: '', position: 0, published: true } : cfg.toForm(row),
  )
  const [saving, setSaving] = useState(false)

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { ...form }
      if ('password' in body && !body.password) delete body.password
      const r = await fetch(creating ? `/api/dev/${entity}` : `/api/dev/${entity}/${row.id}`, {
        method: creating ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Erro ao salvar')
      toast({ title: creating ? 'Criado' : 'Salvo' })
      onSaved()
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{creating ? `Nova ${cfg.singular}` : `Editar ${cfg.singular}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-3">
          {cfg.fields.map((f) => {
            const id = `dev-${entity}-${f.key}`
            if (f.type === 'switch') {
              return (
                <div key={f.key} className="flex items-center justify-between gap-3">
                  <Label htmlFor={id}>{f.label}</Label>
                  <Switch id={id} checked={!!form[f.key]} onCheckedChange={(v) => set(f.key, v)} />
                </div>
              )
            }
            if (f.type === 'select') {
              return (
                <div key={f.key} className="grid gap-1.5">
                  <Label htmlFor={id}>{f.label}</Label>
                  <Select value={form[f.key]} onValueChange={(v) => set(f.key, v)}>
                    <SelectTrigger id={id}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {f.options!.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )
            }
            return (
              <div key={f.key} className="grid gap-1.5">
                <Label htmlFor={id}>{f.label}</Label>
                {f.type === 'textarea' ? (
                  <Textarea id={id} rows={4} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <Input
                    id={id}
                    type={f.type ?? 'text'}
                    step={f.type === 'number' ? 'any' : undefined}
                    autoComplete={f.type === 'password' ? 'new-password' : undefined}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
              </div>
            )
          })}
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="bg-amber-500 text-black hover:bg-amber-400">
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
