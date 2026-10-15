import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/session'
import { hashPassword } from '@/lib/password'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, email, password, cnpj, phone, city, address } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Preencha nome, email e senha.' },
        { status: 400 },
      )
    }

    const existing = await db.company.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'Email já cadastrado.' },
        { status: 409 },
      )
    }

    const company = await db.company.create({
      data: { name, email, password: hashPassword(String(password)), cnpj, phone, city, address },
    })

    await setSession({
      role: 'company',
      id: company.id,
      name: company.name,
      email: company.email,
    })

    return NextResponse.json({
      id: company.id,
      name: company.name,
      email: company.email,
    })
  } catch (e) {
    console.error('[register-company]', e)
    return NextResponse.json(
      { error: 'Erro ao cadastrar empresa.' },
      { status: 500 },
    )
  }
}
