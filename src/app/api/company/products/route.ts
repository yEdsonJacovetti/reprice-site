import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'company') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const products = await db.product.findMany({
    where: { companyId: session.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ products })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session || session.role !== 'company') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const {
      name,
      description,
      category,
      originalPrice,
      promoPrice,
      expirationDate,
      quantity,
      imageUrl,
    } = body

    if (
      !name ||
      !category ||
      originalPrice == null ||
      promoPrice == null ||
      !expirationDate ||
      !quantity
    ) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios.' },
        { status: 400 },
      )
    }

    const product = await db.product.create({
      data: {
        name,
        description,
        category,
        originalPrice: Number(originalPrice),
        promoPrice: Number(promoPrice),
        expirationDate: new Date(expirationDate),
        quantity: Number(quantity),
        imageUrl: imageUrl || null,
        companyId: session.id,
      },
    })

    return NextResponse.json({ product })
  } catch (e) {
    console.error('[company products POST]', e)
    return NextResponse.json({ error: 'Erro ao cadastrar produto.' }, { status: 500 })
  }
}
