import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'company') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const reservations = await db.reservation.findMany({
    where: { companyId: session.id },
    include: { product: true, user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ reservations })
}
