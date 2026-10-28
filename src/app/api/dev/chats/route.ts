import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireDev } from '@/lib/session'

export const dynamic = 'force-dynamic'

// Lista das conversas que precisaram (ou precisam) de atendimento humano.
// Conversas só com a IA não aparecem aqui.
export async function GET() {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const convos = await db.chatConversation.findMany({
    where: {
      OR: [
        { status: { in: ['WAITING', 'HUMAN'] } },
        { messages: { some: { sender: { in: ['agent', 'system'] } } } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
  })

  const order = { WAITING: 0, HUMAN: 1, BOT: 2, CLOSED: 3 } as Record<string, number>
  const rows = convos
    .map((c) => ({
      id: c.id,
      code: c.id.slice(-6).toUpperCase(),
      name: c.name,
      email: c.email,
      status: c.status,
      updatedAt: c.updatedAt.toISOString(),
      last: c.messages[0] ? { sender: c.messages[0].sender, content: c.messages[0].content } : null,
    }))
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))

  return NextResponse.json({ rows })
}
