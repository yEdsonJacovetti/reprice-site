// Chat de suporte do RePrice: IA (Groq) + atendimento humano.
//
// Cada conversa fica salva no banco (chat_conversations / chat_messages) e é
// identificada por um "token" secreto guardado no navegador do cliente.
//
// Status da conversa:
//   BOT     → a IA responde
//   WAITING → a IA não resolveu; aguardando alguém da equipe (aba Atendimento na área de dev)
//   HUMAN   → um dev está conversando com o cliente; a IA fica quieta
//   CLOSED  → atendimento encerrado; se o cliente escrever de novo, volta para a IA
//
// POST /api/chat  { token?, message }        → envia mensagem do cliente
// GET  /api/chat?token=...&after=<data ISO>  → busca mensagens novas (o chat consulta a cada 3 s)
//
// Variáveis de ambiente: GROQ_API_KEY (obrigatória), GROQ_MODEL (opcional).

import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export const dynamic = 'force-dynamic'

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

const publicMsg = (m: { id: string; sender: string; content: string; createdAt: Date }) => ({
  id: m.id,
  sender: m.sender,
  content: m.content,
  createdAt: m.createdAt.toISOString(),
})

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
- Se não souber resolver, se for reclamação ou problema com pedido, ou se a pessoa pedir para falar com alguém: diga que vai chamar uma pessoa da equipe para continuar a conversa aqui mesmo e termine a resposta com ${TICKET_TAG}
${userName ? `- O cliente se chama ${userName}.` : ''}

${context}`
}

async function askAI(conversationId: string, userName?: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return `O assistente automático ainda não foi configurado. Vou chamar alguém da equipe. ${TICKET_TAG}`

  const history = await db.chatMessage.findMany({
    where: { conversationId, sender: { in: ['user', 'bot'] } },
    orderBy: { createdAt: 'desc' },
    take: MAX_HISTORY,
  })
  const model = process.env.GROQ_MODEL || DEFAULT_MODEL
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
        { role: 'system', content: systemPrompt(await buildContext(), userName) },
        ...history.reverse().map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.content })),
      ],
    }),
  })
  const data = await res.json()
  if (!res.ok) {
    console.error('[chat] Groq', res.status, data?.error?.message)
    throw new Error(data?.error?.message || `Groq ${res.status}`)
  }
  return String(data?.choices?.[0]?.message?.content ?? '').trim()
}

// ---------- GET: mensagens novas da conversa ----------
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const after = url.searchParams.get('after')
  const convo = token ? await db.chatConversation.findUnique({ where: { token } }) : null
  if (!convo) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  const afterDate = after ? new Date(after) : null
  const messages = await db.chatMessage.findMany({
    where: { conversationId: convo.id, ...(afterDate && !isNaN(+afterDate) ? { createdAt: { gt: afterDate } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: 200,
  })
  return NextResponse.json({ status: convo.status, messages: messages.map(publicMsg) })
}

// ---------- POST: mensagem do cliente ----------
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if (tooMany(ip)) {
    return NextResponse.json({ error: 'Muitas mensagens seguidas. Espere um minutinho.' }, { status: 429 })
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string; message?: string }
  const text = String(body.message ?? '').trim().slice(0, 800)
  if (!text) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })

  const session = await getSession()
  const customer = session && session.role !== 'dev' ? session : null

  // acha a conversa pelo token ou cria uma nova
  let convo = body.token ? await db.chatConversation.findUnique({ where: { token: body.token } }) : null
  if (!convo) {
    convo = await db.chatConversation.create({
      data: {
        token: randomBytes(24).toString('hex'),
        userId: customer?.id ?? null,
        name: customer?.name ?? 'Visitante',
        email: customer?.email ?? null,
      },
    })
  }
  if (convo.status === 'CLOSED') {
    convo = await db.chatConversation.update({ where: { id: convo.id }, data: { status: 'BOT' } })
  }

  const created = [await db.chatMessage.create({ data: { conversationId: convo.id, sender: 'user', content: text } })]

  // Com atendente na conversa (ou aguardando), a IA não responde
  if (convo.status === 'WAITING' || convo.status === 'HUMAN') {
    await db.chatConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } })
    return NextResponse.json({ token: convo.token, status: convo.status, messages: created.map(publicMsg) })
  }

  let reply: string
  try {
    reply = await askAI(convo.id, customer?.role === 'user' ? customer.name : undefined)
  } catch (e) {
    console.error('[chat]', e)
    reply = `O assistente automático está fora do ar agora. Vou chamar alguém da equipe. ${TICKET_TAG}`
  }

  const handoff = reply.includes(TICKET_TAG)
  reply = reply.replaceAll(TICKET_TAG, '').trim() || 'Vou chamar alguém da equipe para te ajudar.'
  created.push(await db.chatMessage.create({ data: { conversationId: convo.id, sender: 'bot', content: reply } }))

  let status = convo.status
  if (handoff) {
    // ---- Automação: passa a conversa para um humano ----
    status = 'WAITING'
    await db.chatConversation.update({ where: { id: convo.id }, data: { status } })
    created.push(
      await db.chatMessage.create({
        data: {
          conversationId: convo.id,
          sender: 'system',
          content: 'Conversa enviada para a equipe. Um atendente vai responder aqui mesmo. Pode deixar esta janela aberta.',
        },
      }),
    )
    // e deixa um registro em Mensagens (aba Suporte da área de dev)
    await db.supportMessage.create({
      data: {
        name: convo.name,
        email: convo.email ?? 'não informado',
        subject: `[Chat] ${text.slice(0, 120)}`,
        message: `Cliente pediu atendimento humano pelo chat. Responda na aba Atendimento da área de dev (conversa ${convo.id.slice(-6).toUpperCase()}).`,
      },
    })
  } else {
    await db.chatConversation.update({ where: { id: convo.id }, data: { updatedAt: new Date() } })
  }

  return NextResponse.json({ token: convo.token, status, messages: created.map(publicMsg) })
}
