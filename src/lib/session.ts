// Session helpers for RePrice - simple cookie-based session (no NextAuth
// to keep the project lean for academic scope).

import { cookies } from 'next/headers'

export type SessionUser =
  | { role: 'user'; id: string; name: string; email: string }
  | { role: 'company'; id: string; name: string; email: string }
  | null

const SESSION_COOKIE = 'reprice_session'

export async function getSession(): Promise<SessionUser> {
  const store = await cookies()
  const raw = store.get(SESSION_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = JSON.parse(atob(raw)) as Exclude<SessionUser, null>
    return parsed
  } catch {
    return null
  }
}

export async function setSession(user: Exclude<SessionUser, null>) {
  const store = await cookies()
  const value = btoa(JSON.stringify(user))
  store.set(SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
