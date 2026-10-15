// Senhas com scrypt (embaralhadas). Formato salvo: scrypt$<salt>$<hash>
// Contas antigas com senha em texto puro continuam entrando; no próximo
// login a senha é convertida automaticamente.
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(plain, salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function isHashed(stored: string): boolean {
  return stored.startsWith('scrypt$')
}

export function verifyPassword(stored: string, plain: string): boolean {
  if (!stored) return false
  if (!isHashed(stored)) {
    const a = Buffer.from(stored)
    const b = Buffer.from(plain)
    return a.length === b.length && timingSafeEqual(a, b)
  }
  const [, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'hex')
  const got = scryptSync(plain, salt, 64)
  return expected.length === got.length && timingSafeEqual(expected, got)
}
