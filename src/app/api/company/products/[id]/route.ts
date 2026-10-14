import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

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
  const { name, description, category, originalPrice, promoPrice, expirationDate, quantity, imageUrl, status } = body

  const existing = await db.product.findUnique({ where: { id } })
  if (!existing || existing.companyId !== session.id) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
  }

  const updated = await db.product.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(originalPrice !== undefined ? { originalPrice: Number(originalPrice) } : {}),
      ...(promoPrice !== undefined ? { promoPrice: Number(promoPrice) } : {}),
      ...(expirationDate !== undefined ? { expirationDate: new Date(expirationDate) } : {}),
      ...(quantity !== undefined ? { quantity: Number(quantity) } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  })

  return NextResponse.json({ product: updated })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session || session.role !== 'company') {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const existing = await db.product.findUnique({ where: { id } })
  if (!existing || existing.companyId !== session.id) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
  }

  await db.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
