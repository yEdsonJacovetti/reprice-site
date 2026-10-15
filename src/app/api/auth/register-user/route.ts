import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/session'
import { hashPassword } from '@/lib/password'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, phone, city } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Preencha nome, email e senha.' },
        { status: 400 },
      )
    }

    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email já cadastrado.' },
        { status: 409 },
      )
    }

    const user = await db.user.create({
      data: { name, email, password: hashPassword(String(password)), phone, city },
    })

    await setSession({
      role: 'user',
      id: user.id,
      name: user.name,
      email: user.email,
    })

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } catch (e) {
    console.error('[register-user]', e)
    return NextResponse.json(
      { error: 'Erro ao cadastrar usuário.' },
      { status: 500 },
    )
  }
}
