'use client'

// Balão de chat do RePrice (canto inferior direito, em todas as páginas menos
// a área de dev). Primeiro quem responde é a IA; se ela não resolver, a conversa
// vai para a equipe e um dev responde aqui mesmo, pela aba Atendimento.
//
// A conversa fica salva no servidor. O navegador guarda só um "token" para
// continuar a mesma conversa depois de recarregar a página.

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, Headset } from 'lucide-react'
import { useAppStore } from '@/store/app'

type Sender = 'user' | 'bot' | 'agent' | 'system'
type Msg = { id: string; sender: Sender; content: string; createdAt: string }
type Status = 'BOT' | 'WAITING' | 'HUMAN' | 'CLOSED'

const TOKEN_KEY = 'reprice_chat_token'
const POLL_MS = 3000
const WELCOME: Msg = {
  id: 'welcome',
  sender: 'bot',
  content: 'Oi! Sou o assistente do RePrice. Posso tirar dúvidas sobre reservas, retirada e as ofertas de hoje.',
  createdAt: '',
}
const SUGGESTIONS = ['Como faço uma reserva?', 'Quais ofertas vencem primeiro?', 'Quero falar com uma pessoa']

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}
function saveToken(t: string) {
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {}
}

export function ChatWidget() {
  const { session, setView } = useAppStore()
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('BOT')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [unread, setUnread] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  // junta mensagens sem repetir
  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return
    setMessages((cur) => {
      const seen = new Set(cur.map((m) => m.id))
      const fresh = incoming.filter((m) => !seen.has(m.id))
      if (!openRef.current) setUnread((u) => u + fresh.filter((m) => m.sender === 'agent').length)
      return fresh.length ? [...cur, ...fresh] : cur
    })
  }, [])

  // ao carregar a página, retoma a conversa salva
  useEffect(() => {
    const t = readToken()
    if (!t) return
    fetch(`/api/chat?token=${encodeURIComponent(t)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return
        setToken(t)
        setStatus(d.status)
        setMessages(d.messages)
      })
      .catch(() => {})
  }, [])

  // com atendente (ou aguardando), busca mensagens novas a cada 3 s
  const lastAt = [...messages].reverse().find((m) => m.createdAt)?.createdAt ?? ''
  useEffect(() => {
    if (!token || (status !== 'WAITING' && status !== 'HUMAN')) return
    const id = setInterval(async () => {
      try {
        const qs = new URLSearchParams({ token })
        if (lastAt) qs.set('after', lastAt)
        const r = await fetch(`/api/chat?${qs}`)
        if (!r.ok) return
        const d = await r.json()
        setStatus(d.status)
        merge(d.messages)
      } catch {}
    }, POLL_MS)
    return () => clearInterval(id)
  }, [token, status, lastAt, merge])

  useEffect(() => {
    if (open) setUnread(0)
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  if (session?.role === 'dev') return null

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    setInput('')
    setSending(true)
    const temp: Msg = { id: `tmp-${Date.now()}`, sender: 'user', content, createdAt: '' }
    setMessages((m) => [...m, temp])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, message: content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar')
      if (data.token && data.token !== token) {
        setToken(data.token)
        saveToken(data.token)
      }
      setStatus(data.status)
      setMessages((m) => m.filter((x) => x.id !== temp.id))
      merge(data.messages)
    } catch (e) {
      setMessages((m) => [
        ...m.filter((x) => x.id !== temp.id),
        temp,
        { id: `err-${Date.now()}`, sender: 'system', content: (e as Error).message, createdAt: '' },
      ])
    } finally {
      setSending(false)
    }
  }

  const human = status === 'HUMAN'
  const waiting = status === 'WAITING'
  const shown = [WELCOME, ...messages]

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir chat de suporte"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Chat de suporte do RePrice"
          className="fixed bottom-5 right-5 z-50 flex h-[min(560px,calc(100vh-2.5rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border bg-black px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-primary">
                {human ? <Headset className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div>
                <p className="text-sm font-semibold">{human ? 'Equipe RePrice' : 'Assistente RePrice'}</p>
                <p className="text-[11px] text-muted-foreground">
                  {human ? 'Atendente na conversa' : waiting ? 'Aguardando um atendente…' : 'Respostas automáticas com IA'}
                </p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {shown.map((m) =>
              m.sender === 'system' ? (
                <p key={m.id} className="mx-auto max-w-[90%] rounded-md bg-secondary/30 px-3 py-1.5 text-center text-[11px] text-muted-foreground">
                  {m.content}
                </p>
              ) : (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                      m.sender === 'user'
                        ? 'rounded-br-sm bg-primary text-primary-foreground'
                        : m.sender === 'agent'
                          ? 'rounded-bl-sm border border-amber-500/40 bg-amber-500/10'
                          : 'rounded-bl-sm bg-secondary/50'
                    }`}
                  >
                    {m.sender === 'agent' && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">Atendente</p>}
                    {m.content}
                  </div>
                </div>
              ),
            )}
            {sending && status === 'BOT' && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">Digitando…</div>
              </div>
            )}
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-primary/40 px-3 py-1 text-xs text-primary hover:bg-primary/10"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={human || waiting ? 'Escreva para o atendente…' : 'Escreva sua dúvida…'}
              maxLength={800}
              autoComplete="off"
              className="h-10 flex-1 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          {!human && !waiting && (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setView('support')
              }}
              className="pb-2 text-center text-[11px] text-muted-foreground hover:text-foreground"
            >
              Prefere escrever um email para a equipe? Abrir aba Suporte
            </button>
          )}
        </div>
      )}
    </>
  )
}
