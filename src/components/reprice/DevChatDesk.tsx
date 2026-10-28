'use client'

// Aba "Atendimento" da área de dev: lista as conversas que a IA passou para
// a equipe e permite conversar com o cliente em tempo (quase) real.
// A lista atualiza a cada 5 s e a conversa aberta a cada 3 s.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Send, Bot, RefreshCw, CheckCircle2, Undo2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

type Status = 'BOT' | 'WAITING' | 'HUMAN' | 'CLOSED'
type Row = {
  id: string
  code: string
  name: string
  email: string | null
  status: Status
  updatedAt: string
  last: { sender: string; content: string } | null
}
type Msg = { id: string; sender: 'user' | 'bot' | 'agent' | 'system'; content: string; createdAt: string }
type Convo = { id: string; code: string; name: string; email: string | null; status: Status }

const STATUS: Record<Status, { label: string; cls: string }> = {
  WAITING: { label: 'Aguardando', cls: 'bg-amber-500 text-black' },
  HUMAN: { label: 'Em atendimento', cls: 'bg-primary text-primary-foreground' },
  BOT: { label: 'Com a IA', cls: 'bg-secondary text-foreground' },
  CLOSED: { label: 'Encerrado', cls: 'bg-secondary/60 text-muted-foreground' },
}

const time = (s: string) =>
  new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function DevChatDesk() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const loadList = useCallback(async () => {
    try {
      const r = await fetch('/api/dev/chats')
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setRows(d.rows)
    } catch (e) {
      toast({ title: 'Erro ao carregar conversas', description: (e as Error).message, variant: 'destructive' })
      setRows([])
    }
  }, [toast])

  useEffect(() => {
    loadList()
    const id = setInterval(loadList, 5000)
    return () => clearInterval(id)
  }, [loadList])

  const waiting = rows?.filter((r) => r.status === 'WAITING').length ?? 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-semibold">
          Atendimento{' '}
          {waiting > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-black">{waiting} aguardando</span>
          )}
        </h2>
        <Button variant="outline" size="icon" onClick={loadList} aria-label="Recarregar">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Lista de conversas */}
        <div className="flex max-h-[560px] flex-col gap-1 overflow-y-auto rounded-lg border border-border/60 p-1">
          {rows === null ? (
            <p className="p-3 text-sm text-muted-foreground">Carregando…</p>
          ) : rows.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">
              Nenhuma conversa ainda. Quando a IA não conseguir ajudar um cliente, a conversa aparece aqui.
            </p>
          ) : (
            rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                className={`rounded-md p-3 text-left transition-colors ${
                  selected === r.id ? 'bg-secondary/60' : 'hover:bg-secondary/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{r.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[r.status].cls}`}>
                    {STATUS[r.status].label}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {r.last ? `${r.last.sender === 'agent' ? 'Você: ' : ''}${r.last.content}` : '—'}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                  #{r.code} · {time(r.updatedAt)}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Conversa aberta */}
        {selected ? (
          <Conversation key={selected} id={selected} onChange={loadList} />
        ) : (
          <div className="grid min-h-[300px] place-items-center rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Escolha uma conversa na lista para ler e responder.
          </div>
        )}
      </div>
    </div>
  )
}

function Conversation({ id, onChange }: { id: string; onChange: () => void }) {
  const { toast } = useToast()
  const [convo, setConvo] = useState<Convo | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id))
      const fresh = incoming.filter((m) => !seen.has(m.id))
      return fresh.length ? [...cur, ...fresh] : cur
    })
  }, [])

  const lastAt = messages.length ? messages[messages.length - 1].createdAt : ''

  useEffect(() => {
    let stop = false
    async function poll() {
      try {
        const qs = lastAt ? `?after=${encodeURIComponent(lastAt)}` : ''
        const r = await fetch(`/api/dev/chats/${id}${qs}`)
        const d = await r.json()
        if (!r.ok || stop) return
        setConvo(d.conversation)
        merge(d.messages)
      } catch {}
    }
    poll()
    const t = setInterval(poll, 3000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [id, lastAt, merge])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function reply(e: React.FormEvent) {
    e.preventDefault()
    const content = text.trim()
    if (!content) return
    setBusy(true)
    try {
      const r = await fetch(`/api/dev/chats/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setText('')
      setConvo((c) => (c ? { ...c, status: d.status } : c))
      merge(d.messages)
      onChange()
    } catch (err) {
      toast({ title: 'Não foi possível enviar', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: 'CLOSED' | 'BOT') {
    setBusy(true)
    try {
      const r = await fetch(`/api/dev/chats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setConvo((c) => (c ? { ...c, status: d.status } : c))
      merge(d.messages)
      onChange()
      toast({ title: status === 'CLOSED' ? 'Atendimento encerrado' : 'Conversa devolvida para a IA' })
    } catch (err) {
      toast({ title: 'Erro', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  if (!convo) {
    return <div className="rounded-lg border border-border/60 p-6 text-sm text-muted-foreground">Carregando conversa…</div>
  }

  const active = convo.status === 'WAITING' || convo.status === 'HUMAN'

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-lg border border-border/60">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-secondary/20 px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className="truncate font-semibold">{convo.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="select-all">{convo.email || 'sem email (visitante)'}</span> · #{convo.code}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[convo.status].cls}`}>
          {STATUS[convo.status].label}
        </span>
        {active && (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus('BOT')}>
              <Undo2 className="h-4 w-4" /> Devolver à IA
            </Button>
            <Button size="sm" disabled={busy} onClick={() => setStatus('CLOSED')} className="bg-amber-500 text-black hover:bg-amber-400">
              <CheckCircle2 className="h-4 w-4" /> Encerrar
            </Button>
          </>
        )}
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) =>
          m.sender === 'system' ? (
            <p key={m.id} className="mx-auto max-w-[90%] rounded-md bg-secondary/30 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
              {m.content}
            </p>
          ) : (
            <div key={m.id} className={`flex ${m.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                  m.sender === 'agent'
                    ? 'rounded-br-sm bg-amber-500 text-black'
                    : m.sender === 'bot'
                      ? 'rounded-bl-sm border border-border/60 bg-secondary/20 text-muted-foreground'
                      : 'rounded-bl-sm bg-secondary/60'
                }`}
              >
                <p className="mb-0.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {m.sender === 'user' ? <User className="h-3 w-3" /> : m.sender === 'bot' ? <Bot className="h-3 w-3" /> : null}
                  {m.sender === 'user' ? 'Cliente' : m.sender === 'bot' ? 'IA' : 'Você'} · {time(m.createdAt)}
                </p>
                {m.content}
              </div>
            </div>
          ),
        )}
      </div>

      <form onSubmit={reply} className="flex items-center gap-2 border-t border-border/60 p-3">
        <input
          id={`dev-chat-input-${id}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={convo.status === 'CLOSED' ? 'Responder reabre o atendimento…' : 'Responder ao cliente…'}
          maxLength={2000}
          autoComplete="off"
          className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-amber-500"
        />
        <Button type="submit" disabled={busy || !text.trim()} className="rounded-full bg-amber-500 text-black hover:bg-amber-400">
          <Send className="h-4 w-4" /> Enviar
        </Button>
      </form>
    </div>
  )
}
