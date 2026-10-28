'use client'

import { useEffect, useState } from 'react'
import { LifeBuoy, Send, HelpCircle } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'

type Faq = { id: string; question: string; answer: string }

export function SupportView() {
  const { session, setView } = useAppStore()
  const { toast } = useToast()
  const [faqs, setFaqs] = useState<Faq[] | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [name, setName] = useState(session?.role !== 'dev' ? session?.name ?? '' : '')
  const [email, setEmail] = useState(session?.role !== 'dev' ? session?.email ?? '' : '')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/faqs')
      .then((r) => r.json())
      .then((d) => setFaqs(d.faqs ?? []))
      .catch(() => setFaqs([]))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar')
      setSent(true)
      setSubject('')
      setMessage('')
      toast({ title: 'Mensagem enviada', description: 'Vamos responder no seu email.' })
    } catch (err) {
      toast({ title: 'Não foi possível enviar', description: (err as Error).message, variant: 'destructive' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-primary">
          <LifeBuoy className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wider">Suporte</span>
        </div>
        <h1 className="text-2xl font-bold">Como podemos ajudar?</h1>
        <p className="text-muted-foreground text-sm">
          Veja as dúvidas mais comuns. Se não achar sua resposta, mande uma mensagem pra gente.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HelpCircle className="h-4 w-4 text-primary" />
          Perguntas frequentes
        </h2>
        {faqs === null ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há perguntas cadastradas.</p>
        ) : (
          <Accordion type="single" collapsible className="rounded-lg border border-border/60 bg-card px-4">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger className="text-left">{f.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground whitespace-pre-line">
                  {f.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Fale com a gente</h2>
        {sent ? (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm space-y-2">
            <p className="font-medium">Recebemos sua mensagem.</p>
            <p className="text-muted-foreground">Respondemos pelo email que você informou.</p>
            <Button variant="outline" size="sm" onClick={() => setSent(false)}>
              Enviar outra mensagem
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg border border-border/60 bg-card p-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="sup-name">Nome</Label>
                <Input id="sup-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sup-email">Email</Label>
                <Input id="sup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={160} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sup-subject">Assunto</Label>
              <Input id="sup-subject" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={160} placeholder="Ex.: Não consigo retirar meu pedido" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sup-message">Mensagem</Label>
              <Textarea id="sup-message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required maxLength={4000} />
            </div>
            <div>
              <Button type="submit" disabled={sending} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Send className="h-4 w-4 mr-1" />
                {sending ? 'Enviando…' : 'Enviar mensagem'}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* Acesso discreto à área de dev */}
      <div className="pt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setView(session?.role === 'dev' ? 'dev' : 'dev-login')}
          className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          v0.12 · acesso restrito
        </button>
      </div>
    </div>
  )
}
