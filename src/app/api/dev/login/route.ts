import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { setSession } from '@/lib/session'

// Login da área de dev. Email e senha ficam nas variáveis DEV_EMAIL e
// DEV_PASSWORD do Netlify (nunca no código).
function same(a: string, b: string) {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export async function POST(req: Request) {
  const devEmail = process.env.DEV_EMAIL
  const devPassword = process.env.DEV_PASSWORD
  if (!devEmail || !devPassword) {
    return NextResponse.json(
      { error: 'Área de dev não configurada (faltam DEV_EMAIL e DEV_PASSWORD no Netlify).' },
      { status: 503 },
    )
  }

  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string
    password?: string
  }

  // pequena espera para dificultar tentativas em massa
  await new Promise((r) => setTimeout(r, 400))

  if (!email || !password || !same(email.trim().toLowerCase(), devEmail.trim().toLowerCase()) || !same(password, devPassword)) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 401 })
  }

  // sessão de dev dura 8 horas
  await setSession({ role: 'dev', id: 'dev', name: 'Dev', email: devEmail }, 60 * 60 * 8)
  return NextResponse.json({ role: 'dev', id: 'dev', name: 'Dev', email: devEmail })
}
