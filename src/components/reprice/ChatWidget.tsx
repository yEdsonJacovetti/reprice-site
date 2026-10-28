'use client'

// Balão de chat do assistente (canto inferior direito, em todas as páginas
// menos a área de dev). Conversa com /api/chat, que usa a IA do Groq.

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, Ticket } from 'lucide-react'
import { useAppStore } from '@/store/app'

type Msg = { role: 'user' | 'assistant'; content: string; ticket?: string | null }

const WELCOME: Msg = {
  role: 'assistant',
  content: 'Oi! Sou o assistente do RePrice. Posso tirar dúvidas sobre reservas, retirada e as ofertas de hoje.',
}

const SUGGESTIONS = ['Como faço uma reserva?', 'Quais ofertas vencem primeiro?', 'Como retiro meu pedido?']

export function ChatWidget() {
  const { session, setView } = useAppStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([WELCOME])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [ticketOpened, setTicketOpened] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  if (session?.role === 'dev') return null

  async function send(text: string) {
    const content = text.trim()
    if (!content || sending) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // a mensagem de boas-vindas não vai para a IA
          messages: next.filter((m) => m !== WELCOME).map(({ role, content }) => ({ role, content })),
          ticketOpened,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao responder')
      if (data.ticket) setTicketOpened(true)
      setMessages((m) => [...m, { role: 'assistant', content: data.reply, ticket: data.ticket }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: (e as Error).message }])
    } finally {
      setSending(false)
    }
  }

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
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Assistente RePrice</p>
                <p className="text-[11px] text-muted-foreground">Respostas automáticas com IA</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fechar chat" className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-secondary/50'
                  }`}
                >
                  {m.content}
                  {m.ticket && (
                    <div className="mt-2 flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 text-xs text-primary">
                      <Ticket className="h-3 w-3" />
                      Chamado #{m.ticket} aberto para a equipe
                      {!session && ' (deixe seu email na aba Suporte para receber resposta)'}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-secondary/50 px-3 py-2 text-sm text-muted-foreground">Digitando…</div>
              </div>
            )}
            {messages.length === 1 && (
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
              placeholder="Escreva sua dúvida…"
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
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setView('support')
            }}
            className="pb-2 text-center text-[11px] text-muted-foreground hover:text-foreground"
          >
            Prefere escrever para a equipe? Abrir aba Suporte
          </button>
        </div>
      )}
    </>
  )
}
