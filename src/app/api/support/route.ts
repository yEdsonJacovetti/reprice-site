import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Formulário "Fale com a gente" da aba Suporte.
// As mensagens aparecem na área de dev, em Mensagens.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body.name ?? '').trim().slice(0, 120)
    const email = String(body.email ?? '').trim().slice(0, 160)
    const subject = String(body.subject ?? '').trim().slice(0, 160)
    const message = String(body.message ?? '').trim().slice(0, 4000)

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 })
    }

    await db.supportMessage.create({ data: { name, email, subject, message } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[support]', e)
    return NextResponse.json({ error: 'Não foi possível enviar agora. Tente de novo.' }, { status: 500 })
  }
}
