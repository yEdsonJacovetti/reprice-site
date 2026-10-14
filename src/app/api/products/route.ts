import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''

  const products = await db.product.findMany({
    where: {
      status: 'ACTIVE',
      quantity: { gt: 0 },
      expirationDate: { gt: new Date() },
      ...(search
        ? { name: { contains: search } }
        : {}),
      ...(category ? { category } : {}),
    },
    include: { company: true },
    orderBy: { expirationDate: 'asc' },
  })

  return NextResponse.json({ products })
}
