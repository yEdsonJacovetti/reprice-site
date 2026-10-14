import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

const VALID_STATUSES = ['PENDING', 'READY', 'DELIVERED', 'CANCELLED']

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'company') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const { status } = body as { status: string }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }

  const existing = await db.reservation.findUnique({ where: { id } })
  if (!existing || existing.companyId !== session.id) {
    return NextResponse.json({ error: 'Reserva não encontrada.' }, { status: 404 })
  }

  const reservation = await db.reservation.update({
    where: { id },
    data: { status },
  })

  return NextResponse.json({ reservation })
}
