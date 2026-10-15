import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'user') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const reservations = await db.reservation.findMany({
    where: { userId: session.id },
    include: { product: { include: { company: { select: { id: true, name: true, city: true, address: true, phone: true } } } } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ reservations })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'user') {
    return NextResponse.json({ error: 'Faça login como cliente.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { productId, quantity } = body as {
      productId: string
      quantity: number
    }

    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Informe produto e quantidade válidos.' },
        { status: 400 },
      )
    }

    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
    }
    if (product.quantity < quantity) {
      return NextResponse.json(
        { error: `Quantidade indisponível. Apenas ${product.quantity} em estoque.` },
        { status: 400 },
      )
    }

    const reservation = await db.reservation.create({
      data: {
        userId: session.id,
        productId,
        companyId: product.companyId,
        quantity,
        status: 'PENDING',
      },
      include: { product: true },
    })

    // Reduce available quantity on the product
    await db.product.update({
      where: { id: productId },
      data: { quantity: product.quantity - quantity },
    })

    return NextResponse.json({ reservation })
  } catch (e) {
    console.error('[reservations POST]', e)
    return NextResponse.json({ error: 'Erro ao reservar produto.' }, { status: 500 })
  }
}
