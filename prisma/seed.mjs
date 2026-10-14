// Popula o banco com dados de exemplo na primeira vez.
// Roda no build do Netlify; se já existir algum produto, não faz nada.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const days = (n) => {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  const count = await db.product.count()
  if (count > 0) {
    console.log(`[seed] Banco já tem ${count} produto(s). Nada a fazer.`)
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
  console.log(`[seed] Criados ${samples.length} produtos de exemplo.`)
}

main()
  .catch((e) => {
    console.error('[seed] Erro:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
