import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ user: null })

  if (session.role === 'dev') {
    return NextResponse.json({
      user: { id: session.id, name: session.name, email: session.email, role: 'dev' },
    })
  }

  if (session.role === 'user') {
    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { id: true, name: true, email: true, phone: true, city: true },
    })
    return NextResponse.json({ user: { ...user, role: 'user' } })
  } else {
    const company = await db.company.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        email: true,
        cnpj: true,
        phone: true,
        city: true,
        address: true,
      },
    })
    return NextResponse.json({ user: { ...company, role: 'company' } })
  }
}
