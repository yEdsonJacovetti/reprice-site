'use client'

import { useEffect, useState } from 'react'
import { Leaf, Pencil, Trash2, Plus } from 'lucide-react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Product = {
  id: string
  name: string
  description?: string | null
  category: string
  originalPrice: number
  promoPrice: number
  expirationDate: string
  quantity: number
  imageUrl?: string | null
  status: string
}

const CATEGORIES = [
  'Mercearia',
  'Laticínios',
  'Padaria',
  'Açougue',
  'Hortifrúti',
  'Bebidas',
  'Limpeza',
  'Higiene',
]

function formatBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr)
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}

export function CompanyProducts() {
  const { setView } = useAppStore()
  const { toast } = useToast()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [open, setOpen] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/company/products')
      const data = await res.json()
      setProducts(data.products || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDelete(id: string) {
    if (!confirm('Excluir este produto?')) return
    const res = await fetch(`/api/company/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast({ title: 'Produto excluído' })
      load()
    } else {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  function openEdit(p: Product) {
    setEditing(p)
    setOpen(true)
  }

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Meus produtos</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" />
              Novo produto
            </Button>
          </DialogTrigger>
          <ProductFormDialog
            product={editing}
            onSaved={() => {
              setOpen(false)
              load()
            }}
          />
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground space-y-3">
          <Leaf className="h-10 w-10 mx-auto text-primary/50" />
          <p>Você ainda não cadastrou produtos.</p>
          <Button onClick={openCreate}>Cadastrar primeiro produto</Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Produto</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Preços</th>
                <th className="px-3 py-2 font-medium">Validade</th>
                <th className="px-3 py-2 font-medium">Qtd</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const days = Math.ceil(
                  (new Date(p.expirationDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24),
                )
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{p.category}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col">
                        <span className="text-xs line-through text-muted-foreground">
                          {formatBRL(p.originalPrice)}
                        </span>
                        <span className="text-primary font-medium">
                          {formatBRL(p.promoPrice)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={days <= 3 ? 'text-destructive' : ''}>
                        {days} {days === 1 ? 'dia' : 'dias'}
                      </span>
                    </td>
                    <td className="px-3 py-2">{p.quantity}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline">{p.status}</Badge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ProductFormDialog({
  product,
  onSaved,
}: {
  product: Product | null
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [name, setName] = useState(product?.name || '')
  const [description, setDescription] = useState(product?.description || '')
  const [category, setCategory] = useState(product?.category || 'Mercearia')
  const [originalPrice, setOriginalPrice] = useState(
    product ? String(product.originalPrice) : '',
  )
  const [promoPrice, setPromoPrice] = useState(
    product ? String(product.promoPrice) : '',
  )
  const [expirationDate, setExpirationDate] = useState(
    product ? toInputDate(product.expirationDate) : '',
  )
  const [quantity, setQuantity] = useState(
    product ? String(product.quantity) : '',
  )
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name,
        description,
        category,
        originalPrice: Number(originalPrice),
        promoPrice: Number(promoPrice),
        expirationDate,
        quantity: Number(quantity),
        imageUrl: imageUrl || null,
      }
      const url = product
        ? `/api/company/products/${product.id}`
        : '/api/company/products'
      const method = product ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar')
      }
      toast({ title: product ? 'Produto atualizado' : 'Produto cadastrado' })
      onSaved()
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>
          {product ? 'Editar produto' : 'Cadastrar produto'}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSave} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-name">Nome do produto</Label>
          <Input
            id="p-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Arroz 5kg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-desc">Descrição (opcional)</Label>
          <Textarea
            id="p-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do produto"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-cat">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="p-cat">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-qty">Quantidade</Label>
            <Input
              id="p-qty"
              type="number"
              required
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Ex.: 10"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-orig">Preço original (R$)</Label>
            <Input
              id="p-orig"
              type="number"
              step="0.01"
              required
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="28.90"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-promo">Preço promocional (R$)</Label>
            <Input
              id="p-promo"
              type="number"
              step="0.01"
              required
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              placeholder="18.50"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-exp">Data de validade</Label>
          <Input
            id="p-exp"
            type="date"
            required
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-img">URL da imagem (opcional)</Label>
          <Input
            id="p-img"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? 'Salvando...' : product ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </div>
      </form>
    </DialogContent>
  )
}
