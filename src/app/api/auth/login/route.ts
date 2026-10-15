import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { setSession } from '@/lib/session'
import { hashPassword, isHashed, verifyPassword } from '@/lib/password'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, role } = body as {
      email: string
      password: string
      role: 'user' | 'company'
    }

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Preencha email, senha e tipo de conta.' },
        { status: 400 },
      )
    }

    if (role === 'user') {
      const user = await db.user.findUnique({ where: { email } })
      if (!user || !verifyPassword(user.password, password)) {
        return NextResponse.json(
          { error: 'Email ou senha inválidos.' },
          { status: 401 },
        )
      }
      if (!isHashed(user.password)) {
        await db.user.update({ where: { id: user.id }, data: { password: hashPassword(password) } })
      }
      await setSession({
        role: 'user',
        id: user.id,
        name: user.name,
        email: user.email,
      })
      return NextResponse.json({
        role: 'user',
        id: user.id,
        name: user.name,
        email: user.email,
      })
    } else {
      const company = await db.company.findUnique({ where: { email } })
      if (!company || !verifyPassword(company.password, password)) {
        return NextResponse.json(
          { error: 'Email ou senha inválidos.' },
          { status: 401 },
        )
      }
      if (!isHashed(company.password)) {
        await db.company.update({ where: { id: company.id }, data: { password: hashPassword(password) } })
      }
      await setSession({
        role: 'company',
        id: company.id,
        name: company.name,
        email: company.email,
      })
      return NextResponse.json({
        role: 'company',
        id: company.id,
        name: company.name,
        email: company.email,
      })
    }
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json(
      { error: 'Erro ao fazer login.' },
      { status: 500 },
    )
  }
}
