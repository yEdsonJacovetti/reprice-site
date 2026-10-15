import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireDev } from '@/lib/session'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const now = new Date()
  const in3days = new Date(now.getTime() + 3 * 86400000)
  const [users, companies, products, activeProducts, expiringSoon, reservations, pending, openMessages, faqs] =
    await Promise.all([
      db.user.count(),
      db.company.count(),
      db.product.count(),
      db.product.count({ where: { status: 'ACTIVE', quantity: { gt: 0 }, expirationDate: { gt: now } } }),
      db.product.count({ where: { expirationDate: { gt: now, lte: in3days } } }),
      db.reservation.count(),
      db.reservation.count({ where: { status: { in: ['PENDING', 'READY'] } } }),
      db.supportMessage.count({ where: { status: 'OPEN' } }),
      db.faq.count(),
    ])

  return NextResponse.json({ users, companies, products, activeProducts, expiringSoon, reservations, pending, openMessages, faqs })
}
