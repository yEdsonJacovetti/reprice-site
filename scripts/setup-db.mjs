// Roda no build: garante que as tabelas existem, remove os dados de exemplo
// antigos e cria o FAQ inicial. Pode rodar quantas vezes quiser.
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
  `CREATE TABLE IF NOT EXISTS "faqs" (
    "id" text PRIMARY KEY,
    "question" text NOT NULL,
    "answer" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "published" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "support_messages" (
    "id" text PRIMARY KEY,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "subject" text NOT NULL,
    "message" text NOT NULL,
    "status" text DEFAULT 'OPEN' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
]

// Perguntas iniciais do FAQ (só entram se a tabela estiver vazia;
// depois disso, edite pela área de dev).
const FAQS = [
  ['O que é o RePrice?', 'É uma plataforma que conecta supermercados e consumidores. Os mercados anunciam produtos próximos da validade com desconto, e você reserva pelo site e retira na loja, evitando desperdício e economizando.'],
  ['Os produtos estão vencidos?', 'Não. Todos os produtos estão dentro da validade. Eles só estão mais perto da data de vencimento, por isso ganham desconto. A data aparece em cada oferta.'],
  ['Como faço uma reserva?', 'Crie uma conta de cliente, escolha os produtos em Ofertas, adicione ao carrinho e confirme a reserva. O pedido aparece em Meus pedidos com um código de retirada.'],
  ['Preciso pagar pelo site?', 'Não. O pagamento é feito direto no mercado, na hora em que você retira os produtos.'],
  ['Como retiro meu pedido?', 'Quando o mercado marcar o pedido como pronto, vá até a loja e mostre o código de retirada que aparece em Meus pedidos.'],
  ['Posso cancelar uma reserva?', 'Sim. Se não puder retirar, entre em contato com o mercado ou com o suporte pelo formulário abaixo para liberarmos os produtos para outra pessoa.'],
  ['Sou um mercado. Como anuncio meus produtos?', 'Crie uma conta do tipo Empresa. No Painel você cadastra os produtos, define o preço promocional e acompanha as reservas recebidas.'],
]

async function main() {
  for (const sql of TABLES) await db.$executeRawUnsafe(sql)
  console.log('[setup-db] Tabelas ok.')

  // Remove o mercado de exemplo e os produtos de exemplo (com as reservas
  // deles), que eram criados automaticamente nas versões anteriores.
  const removed = await db.company.deleteMany({
    where: { email: 'mercadoexemplo@reprice.com' },
  })
  if (removed.count) console.log('[setup-db] Mercado e produtos de exemplo removidos.')

  if ((await db.faq.count()) === 0) {
    await db.faq.createMany({
      data: FAQS.map(([question, answer], i) => ({ question, answer, position: i })),
    })
    console.log(`[setup-db] FAQ inicial criado (${FAQS.length} perguntas).`)
  }
}

main()
  .catch((e) => {
    console.error('[setup-db] Erro:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
