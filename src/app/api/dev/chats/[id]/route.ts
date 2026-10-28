import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireDev } from '@/lib/session'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

const out = (m: { id: string; sender: string; content: string; createdAt: Date }) => ({
  id: m.id,
  sender: m.sender,
  content: m.content,
  createdAt: m.createdAt.toISOString(),
})

// GET → conversa + mensagens (use ?after=<data ISO> para pegar só as novas)
export async function GET(req: Request, { params }: Ctx) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await params
  const convo = await db.chatConversation.findUnique({ where: { id } })
  if (!convo) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  const after = new URL(req.url).searchParams.get('after')
  const afterDate = after ? new Date(after) : null
  const messages = await db.chatMessage.findMany({
    where: { conversationId: id, ...(afterDate && !isNaN(+afterDate) ? { createdAt: { gt: afterDate } } : {}) },
    orderBy: { createdAt: 'asc' },
    take: 500,
  })
  return NextResponse.json({
    conversation: { id: convo.id, code: convo.id.slice(-6).toUpperCase(), name: convo.name, email: convo.email, status: convo.status },
    messages: messages.map(out),
  })
}

// POST { message } → o dev responde ao cliente (a conversa vira HUMAN)
export async function POST(req: Request, { params }: Ctx) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await params
  const { message } = (await req.json().catch(() => ({}))) as { message?: string }
  const text = String(message ?? '').trim().slice(0, 2000)
  if (!text) return NextResponse.json({ error: 'Mensagem vazia.' }, { status: 400 })

  const convo = await db.chatConversation.findUnique({ where: { id } })
  if (!convo) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  const created = []
  if (convo.status !== 'HUMAN') {
    created.push(
      await db.chatMessage.create({
        data: { conversationId: id, sender: 'system', content: 'Um atendente da equipe RePrice entrou na conversa.' },
      }),
    )
  }
  created.push(await db.chatMessage.create({ data: { conversationId: id, sender: 'agent', content: text } }))
  await db.chatConversation.update({ where: { id }, data: { status: 'HUMAN' } })
  return NextResponse.json({ status: 'HUMAN', messages: created.map(out) })
}

// PATCH { status: 'CLOSED' | 'BOT' } → encerrar ou devolver para a IA
export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { id } = await params
  const { status } = (await req.json().catch(() => ({}))) as { status?: string }
  if (status !== 'CLOSED' && status !== 'BOT') {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }
  const convo = await db.chatConversation.findUnique({ where: { id } })
  if (!convo) return NextResponse.json({ error: 'Conversa não encontrada.' }, { status: 404 })

  const note =
    status === 'CLOSED'
      ? 'Atendimento encerrado. Se precisar de algo mais, é só escrever aqui.'
      : 'O atendente saiu. O assistente automático volta a responder.'
  const msg = await db.chatMessage.create({ data: { conversationId: id, sender: 'system', content: note } })
  await db.chatConversation.update({ where: { id }, data: { status } })
  return NextResponse.json({ status, messages: [out(msg)] })
}
