import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: { company: true },
  })
  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
  }
  return NextResponse.json({ product })
}
