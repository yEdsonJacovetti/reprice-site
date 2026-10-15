import { NextResponse } from 'next/server'
import { requireDev } from '@/lib/session'
import { ENTITIES, createEntity, listEntity, type Entity } from '@/lib/dev-entities'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ entity: string }> }) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { entity } = await params
  if (!ENTITIES.includes(entity as Entity)) return NextResponse.json({ error: 'Tabela desconhecida.' }, { status: 404 })
  const rows = await listEntity(entity as Entity)
  return NextResponse.json({ rows })
}

export async function POST(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { entity } = await params
  if (!ENTITIES.includes(entity as Entity)) return NextResponse.json({ error: 'Tabela desconhecida.' }, { status: 404 })
  try {
    const row = await createEntity(entity as Entity, await req.json())
    return NextResponse.json({ row })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || 'Erro ao criar.' }, { status: 400 })
  }
}
