// Chat de suporte do RePrice com IA (Groq).
//
// Fluxo:
// 1. Recebe as últimas mensagens da conversa.
// 2. Monta um contexto curto com o FAQ publicado e algumas ofertas reais.
// 3. Pergunta à IA do Groq.
// 4. AUTOMAÇÃO: se a IA não souber resolver (ou o cliente pedir uma pessoa),
//    o próprio servidor abre um chamado em "Mensagens" na área de dev,
//    com a conversa inteira anexada.
//
// Variáveis de ambiente (Vercel → Settings → Environment Variables):
//   GROQ_API_KEY  → sua chave do Groq (obrigatória)
//   GROQ_MODEL    → opcional; padrão "openai/gpt-oss-20b" (o mais barato)

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-oss-20b'
const TICKET_TAG = '[[CHAMADO]]'
const MAX_HISTORY = 6 // só as últimas mensagens vão para a IA (gasta menos token)

// Limite simples: 12 mensagens por minuto por IP (evita gastar a cota do Groq)
const hits = new Map<string, number[]>()
function tooMany(ip: string): boolean {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 12
}

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const day = (d: Date) => d.toISOString().slice(0, 10).split('-').reverse().join('/')

async function buildContext(): Promise<string> {
  const [faqs, offers] = await Promise.all([
    db.faq.findMany({
      where: { published: true },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { question: true, answer: true },
    }),
    db.product.findMany({
      where: { status: 'ACTIVE', quantity: { gt: 0 }, expirationDate: { gt: new Date() } },
      orderBy: { expirationDate: 'asc' },
      take: 15,
      include: { company: { select: { name: true, city: true } } },
    }),
  ])

  const faqText = faqs.map((f) => `P: ${f.question}\nR: ${f.answer}`).join('\n\n') || '(sem perguntas cadastradas)'
  const offerText =
    offers
      .map((p) => {
        const off = p.originalPrice > 0 ? Math.round((1 - p.promoPrice / p.originalPrice) * 100) : 0
        const where = [p.company?.name, p.company?.city].filter(Boolean).join(', ')
        return `- ${p.name} (${p.category}): ${brl(p.promoPrice)} (de ${brl(p.originalPrice)}, -${off}%), vence ${day(p.expirationDate)}, ${p.quantity} un., ${where}`
      })
      .join('\n') || '(nenhuma oferta ativa agora)'

  return `PERGUNTAS FREQUENTES:\n${faqText}\n\nOFERTAS DISPONÍVEIS AGORA (até 15, das que vencem primeiro):\n${offerText}`
}

function systemPrompt(context: string, userName?: string) {
  return `Você é o assistente de suporte do RePrice, um site onde supermercados vendem com desconto produtos perto da validade. O cliente reserva pelo site, retira na loja mostrando o código de retirada e paga na hora.

Regras:
- Responda em português do Brasil, de forma curta e simpática (no máximo 4 frases).
- Use SOMENTE as informações abaixo. Não invente preços, produtos, prazos, mercados ou políticas.
- Para ver pedidos, o cliente usa "Meus pedidos" no menu; você não tem acesso aos pedidos dele.
- Fale só de assuntos do RePrice. Para outros assuntos, diga educadamente que só ajuda com o RePrice.
- Se não souber resolver, se for reclamação ou problema com pedido, ou se a pessoa pedir para falar com alguém: diga que vai abrir um chamado para a equipe e termine a resposta com ${TICKET_TAG}
${userName ? `- O cliente se chama ${userName}.` : ''}

${context}`
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (tooMany(ip)) {
    return NextResponse.json({ error: 'Muitas mensagens seguidas. Espere um minutinho.' }, { status: 429 })
  }

  const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[]; ticketOpened?: boolean }
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
    .slice(-MAX_HISTORY)

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      reply: 'O assistente ainda não foi configurado. Use o formulário "Fale com a gente" na aba Suporte.',
      ticket: null,
    })
  }

  const session = await getSession()
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL

  let reply = ''
  let wantsTicket = false
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_completion_tokens: 700,
        // modelos gpt-oss "pensam" antes de responder; "low" gasta menos token
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        messages: [
          { role: 'system', content: systemPrompt(await buildContext(), session?.role === 'user' ? session.name : undefined) },
          ...messages,
        ],
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      console.error('[chat] Groq', res.status, data?.error?.message)
      throw new Error(data?.error?.message || `Groq ${res.status}`)
    }
    reply = String(data?.choices?.[0]?.message?.content ?? '').trim()
    wantsTicket = reply.includes(TICKET_TAG)
  } catch (e) {
    console.error('[chat]', e)
    return NextResponse.json(
      { error: 'O assistente está fora do ar agora. Tente de novo ou use o formulário da aba Suporte.' },
      { status: 502 },
    )
  }

  // ---- Automação: abrir chamado quando a IA não resolve ----
  let ticket: string | null = null
  if (reply.includes(TICKET_TAG)) {
    reply = reply.replaceAll(TICKET_TAG, '').trim()
  }
  // só um chamado por conversa
  if (wantsTicket && !body.ticketOpened) {
    const transcript = messages
      .map((m) => `${m.role === 'user' ? 'Cliente' : 'Assistente'}: ${m.content}`)
      .concat(`Assistente: ${reply}`)
      .join('\n\n')
    const firstQuestion = messages.find((m) => m.role === 'user')?.content ?? 'Conversa do chat'
    const created = await db.supportMessage.create({
      data: {
        name: session?.name ?? 'Visitante (chat)',
        email: session?.email ?? 'não informado',
        subject: `[Chat] ${firstQuestion.slice(0, 120)}`,
        message: transcript.slice(0, 4000),
      },
    })
    ticket = created.id.slice(-6).toUpperCase()
  }

  if (!reply) reply = 'Desculpe, não consegui responder agora. Pode reformular a pergunta?'
  return NextResponse.json({ reply, ticket })
}
