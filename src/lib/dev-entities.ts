// Configuração das tabelas que a área de dev pode ver e editar.
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'

export type Entity = 'users' | 'companies' | 'products' | 'reservations' | 'faqs' | 'messages'
export const ENTITIES: Entity[] = ['users', 'companies', 'products', 'reservations', 'faqs', 'messages']

const PRODUCT_STATUS = ['ACTIVE', 'RESERVED', 'SOLD_OUT', 'EXPIRED']
const RESERVATION_STATUS = ['PENDING', 'READY', 'DELIVERED', 'CANCELLED']
const MESSAGE_STATUS = ['OPEN', 'RESOLVED']

/* eslint-disable @typescript-eslint/no-explicit-any */
function delegate(entity: Entity): any {
  switch (entity) {
    case 'users': return db.user
    case 'companies': return db.company
    case 'products': return db.product
    case 'reservations': return db.reservation
    case 'faqs': return db.faq
    case 'messages': return db.supportMessage
  }
}

export async function listEntity(entity: Entity) {
  switch (entity) {
    case 'users':
      return db.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, phone: true, city: true, createdAt: true, _count: { select: { reservations: true } } },
      })
    case 'companies':
      return db.company.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, cnpj: true, phone: true, city: true, address: true, createdAt: true, _count: { select: { products: true } } },
      })
    case 'products':
      return db.product.findMany({
        orderBy: { expirationDate: 'asc' },
        include: { company: { select: { id: true, name: true } } },
      })
    case 'reservations': {
      const rows = await db.reservation.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true } },
          product: { select: { id: true, name: true, promoPrice: true } },
        },
      })
      const companies = await db.company.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.companyId))] } },
        select: { id: true, name: true },
      })
      const names = Object.fromEntries(companies.map((c) => [c.id, c.name]))
      return rows.map((r) => ({ ...r, companyName: names[r.companyId] ?? '—' }))
    }
    case 'faqs':
      return db.faq.findMany({ orderBy: [{ position: 'asc' }, { createdAt: 'asc' }] })
    case 'messages':
      return db.supportMessage.findMany({ orderBy: { createdAt: 'desc' } })
  }
}

const str = (v: unknown, max = 500) => String(v ?? '').trim().slice(0, max)
const optStr = (v: unknown, max = 500) => {
  const s = str(v, max)
  return s ? s : null
}

// Monta o "data" do update/create só com campos permitidos.
export function cleanData(entity: Entity, body: Record<string, unknown>, creating = false) {
  const has = (k: string) => creating || Object.prototype.hasOwnProperty.call(body, k)
  const data: Record<string, unknown> = {}

  switch (entity) {
    case 'users':
    case 'companies':
      if (has('name')) data.name = str(body.name, 120)
      if (has('email')) data.email = str(body.email, 160).toLowerCase()
      if (has('phone')) data.phone = optStr(body.phone, 40)
      if (has('city')) data.city = optStr(body.city, 80)
      if (entity === 'companies') {
        if (has('cnpj')) data.cnpj = optStr(body.cnpj, 30)
        if (has('address')) data.address = optStr(body.address, 200)
      }
      if (typeof body.password === 'string' && body.password.length > 0) {
        if (body.password.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.')
        data.password = hashPassword(body.password)
      }
      if (data.name === '' || data.email === '') throw new Error('Nome e email são obrigatórios.')
      break

    case 'products':
      if (has('name')) data.name = str(body.name, 160)
      if (has('description')) data.description = optStr(body.description, 1000)
      if (has('category')) data.category = str(body.category, 60)
      if (has('originalPrice')) data.originalPrice = Number(body.originalPrice)
      if (has('promoPrice')) data.promoPrice = Number(body.promoPrice)
      if (has('quantity')) data.quantity = Math.max(0, Math.floor(Number(body.quantity)))
      if (has('expirationDate')) data.expirationDate = new Date(String(body.expirationDate))
      if (has('imageUrl')) data.imageUrl = optStr(body.imageUrl, 500)
      if (has('status')) {
        if (!PRODUCT_STATUS.includes(String(body.status))) throw new Error('Status inválido.')
        data.status = body.status
      }
      for (const k of ['originalPrice', 'promoPrice', 'quantity']) {
        if (k in data && !Number.isFinite(data[k] as number)) throw new Error(`Valor inválido em ${k}.`)
      }
      if ('expirationDate' in data && isNaN((data.expirationDate as Date).getTime())) throw new Error('Data de validade inválida.')
      break

    case 'reservations':
      if (has('status')) {
        if (!RESERVATION_STATUS.includes(String(body.status))) throw new Error('Status inválido.')
        data.status = body.status
      }
      if (has('quantity')) data.quantity = Math.max(1, Math.floor(Number(body.quantity)))
      break

    case 'faqs':
      if (has('question')) data.question = str(body.question, 300)
      if (has('answer')) data.answer = str(body.answer, 3000)
      if (has('position')) data.position = Math.floor(Number(body.position) || 0)
      if (has('published')) data.published = body.published === undefined ? true : Boolean(body.published)
      if (data.question === '' || data.answer === '') throw new Error('Pergunta e resposta são obrigatórias.')
      break

    case 'messages':
      if (has('status')) {
        if (!MESSAGE_STATUS.includes(String(body.status))) throw new Error('Status inválido.')
        data.status = body.status
      }
      break
  }
  return data
}

export async function updateEntity(entity: Entity, id: string, body: Record<string, unknown>) {
  return delegate(entity).update({ where: { id }, data: cleanData(entity, body) })
}

export async function deleteEntity(entity: Entity, id: string) {
  return delegate(entity).delete({ where: { id } })
}

export async function createEntity(entity: Entity, body: Record<string, unknown>) {
  if (entity !== 'faqs') throw new Error('Criação não disponível para esta tabela.')
  return db.faq.create({ data: cleanData('faqs', body, true) as any })
}
