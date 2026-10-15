import { NextResponse } from 'next/server'
import { requireDev } from '@/lib/session'
import { ENTITIES, deleteEntity, updateEntity, type Entity } from '@/lib/dev-entities'

type Ctx = { params: Promise<{ entity: string; id: string }> }

function prismaMessage(e: unknown): string {
  const code = (e as { code?: string })?.code
  if (code === 'P2002') return 'Já existe um registro com esse email.'
  if (code === 'P2025') return 'Registro não encontrado (talvez já tenha sido apagado).'
  return (e as Error)?.message || 'Erro ao salvar.'
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { entity, id } = await params
  if (!ENTITIES.includes(entity as Entity)) return NextResponse.json({ error: 'Tabela desconhecida.' }, { status: 404 })
  try {
    const row = await updateEntity(entity as Entity, id, await req.json())
    return NextResponse.json({ ok: true, id: row.id })
  } catch (e) {
    return NextResponse.json({ error: prismaMessage(e) }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await requireDev())) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  const { entity, id } = await params
  if (!ENTITIES.includes(entity as Entity)) return NextResponse.json({ error: 'Tabela desconhecida.' }, { status: 404 })
  try {
    await deleteEntity(entity as Entity, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: prismaMessage(e) }, { status: 400 })
  }
}
