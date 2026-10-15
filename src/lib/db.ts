import { PrismaClient } from '@prisma/client'

// Aceita DATABASE_URL (banco próprio) ou as variáveis do banco do Netlify.
const url =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DB_URL ||
  process.env.NETLIFY_DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error'],
    ...(url ? { datasourceUrl: url } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
