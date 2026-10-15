import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Lista TODOS os produtos do site (qualquer status) para a planilha do Google.
// Protegido por chave: /api/export/products?key=SUA_CHAVE
// A chave fica na variável de ambiente EXPORT_KEY do Netlify.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const expected = process.env.EXPORT_KEY
  const key = new URL(req.url).searchParams.get('key')

  if (!expected) {
    return NextResponse.json(
      { error: 'EXPORT_KEY não configurada no Netlify.' },
      { status: 500 },
    )
  }
  if (key !== expected) {
    return NextResponse.json({ error: 'Chave inválida.' }, { status: 401 })
  }

  const products = await db.product.findMany({
    include: { company: { select: { name: true, city: true } } },
    orderBy: { expirationDate: 'asc' },
  })

  const rows = products.map((p) => ({
    id: p.id,
    nome: p.name,
    categoria: p.category,
    precoOriginal: p.originalPrice,
    precoPromocional: p.promoPrice,
    desconto: p.originalPrice > 0 ? Math.round((1 - p.promoPrice / p.originalPrice) * 100) : 0,
    quantidade: p.quantity,
    validade: p.expirationDate.toISOString().slice(0, 10),
    status: p.status,
    mercado: p.company?.name ?? '',
    cidade: p.company?.city ?? '',
    criadoEm: p.createdAt.toISOString(),
    atualizadoEm: p.updatedAt.toISOString(),
  }))

  return NextResponse.json({ total: rows.length, geradoEm: new Date().toISOString(), produtos: rows })
}
