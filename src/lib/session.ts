// Sessão por cookie ASSINADO (HMAC-SHA256).
// Antes o cookie era só base64 e qualquer um podia editar e virar outra conta.
// Agora o servidor confere a assinatura; cookie alterado = sessão inválida.

import { cookies } from 'next/headers'
import { createHash, createHmac, timingSafeEqual } from 'crypto'

export type SessionRole = 'user' | 'company' | 'dev'

export type SessionUser =
  | { role: SessionRole; id: string; name: string; email: string }
  | null

const SESSION_COOKIE = 'reprice_session'

// Segredo da assinatura: SESSION_SECRET se existir; senão, derivado da URL do
// banco (que já é secreta). Assim funciona sem configurar nada a mais.
function secret(): string {
  const s =
    process.env.SESSION_SECRET ||
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    'reprice-dev-local'
  return createHash('sha256').update('reprice-session:' + s).digest('hex')
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export async function getSession(): Promise<SessionUser> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  const [payload, sig] = raw.split('.')
  if (!payload || !sig) return null
  const expected = Buffer.from(sign(payload))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed?.role || !parsed?.id) return null
    if (parsed.exp && Date.now() > parsed.exp) return null
    return { role: parsed.role, id: parsed.id, name: parsed.name, email: parsed.email }
  } catch {
    return null
  }
}

export async function setSession(user: Exclude<SessionUser, null>, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const store = await cookies()
  const payload = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + maxAgeSeconds * 1000 }),
  ).toString('base64url')
  store.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export async function requireDev() {
  const s = await getSession()
  return s && s.role === 'dev' ? s : null
}
