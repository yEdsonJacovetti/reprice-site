// Roda no build: garante que as tabelas existem e coloca os dados de exemplo
// se o banco estiver vazio. Pode rodar quantas vezes quiser (não apaga nada).
import { PrismaClient } from '@prisma/client'
import { resolveDbUrl } from './db-url.mjs'

const url = resolveDbUrl()
if (!url) {
  console.error(`
[setup-db] Nenhum banco configurado.
Cadastre a variável DATABASE_URL no Netlify:
  Site configuration > Environment variables > Add a variable
  Nome: DATABASE_URL   Valor: postgresql://... (Neon ou o banco do Netlify)
Depois faça o deploy de novo.
`)
  process.exit(1)
}

const db = new PrismaClient({ datasourceUrl: url })

const TABLES = [
  `CREATE TABLE IF NOT EXISTS "companies" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "cnpj" text,
    "phone" text,
    "city" text,
    "address" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password" text NOT NULL,
    "phone" text,
    "city" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "products" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "description" text,
    "category" text NOT NULL,
    "original_price" double precision NOT NULL,
    "promo_price" double precision NOT NULL,
    "expiration_date" timestamp NOT NULL,
    "quantity" integer NOT NULL,
    "image_url" text,
    "status" text DEFAULT 'ACTIVE' NOT NULL,
    "company_id" text NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "reservations" (
    "id" text PRIMARY KEY,
    "quantity" integer NOT NULL,
    "status" text DEFAULT 'PENDING' NOT NULL,
    "pickup_code" text NOT NULL,
    "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "product_id" text NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "company_id" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
]

const days = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  for (const sql of TABLES) await db.$executeRawUnsafe(sql)
  console.log('[setup-db] Tabelas ok.')

  const count = await db.product.count()
  if (count > 0) {
    console.log(`[setup-db] Banco já tem ${count} produto(s). Seed pulado.`)
    return
  }

  const company = await db.company.upsert({
    where: { email: 'mercadoexemplo@reprice.com' },
    update: {},
    create: {
      name: 'Mercado Exemplo',
      email: 'mercadoexemplo@reprice.com',
      password: '123456',
      cnpj: '00.000.000/0001-00',
      phone: '(11) 9999-0000',
      city: 'São Paulo',
      address: 'Rua das Ofertas, 100',
    },
  })

  const samples = [
    { name: 'Arroz 5kg Tio João', description: 'Pacote de arroz branco tipo 1, 5kg.', category: 'Mercearia', originalPrice: 28.9, promoPrice: 18.5, expirationDate: days(15), quantity: 12 },
    { name: 'Leite Integral 1L', description: 'Caixa de leite integral, 1 litro.', category: 'Laticínios', originalPrice: 6.49, promoPrice: 3.99, expirationDate: days(5), quantity: 30 },
    { name: 'Pão Francês (6un)', description: 'Pacote com 6 pães franceses.', category: 'Padaria', originalPrice: 9.0, promoPrice: 5.0, expirationDate: days(1), quantity: 8 },
    { name: 'Carne Moída 1kg', description: 'Carne moída resfriada, 1kg.', category: 'Açougue', originalPrice: 39.9, promoPrice: 24.9, expirationDate: days(2), quantity: 5 },
    { name: 'Banana Prata 1kg', description: 'Banana prata madura, 1kg.', category: 'Hortifrúti', originalPrice: 7.5, promoPrice: 3.99, expirationDate: days(3), quantity: 20 },
    { name: 'Iogurte Natural 170g', description: 'Pote de iogurte natural, 170g.', category: 'Laticínios', originalPrice: 4.49, promoPrice: 1.99, expirationDate: days(4), quantity: 25 },
  ]

  await db.product.createMany({ data: samples.map((s) => ({ ...s, companyId: company.id })) })
  console.log(`[setup-db] Criados ${samples.length} produtos de exemplo.`)
}

main()
  .catch((e) => {
    console.error('[setup-db] Erro:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
