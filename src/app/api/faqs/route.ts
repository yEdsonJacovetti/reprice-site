import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// FAQ público (só perguntas publicadas), usado na aba Suporte.
export async function GET() {
  const faqs = await db.faq.findMany({
    where: { published: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, question: true, answer: true },
  })
  return NextResponse.json({ faqs })
}
