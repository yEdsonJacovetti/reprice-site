'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/app'
import { Button } from '@/components/ui/button'
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
import { useToast } from '@/hooks/use-toast'

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

export function CompanyNewProduct() {
  const { setView } = useAppStore()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Mercearia')
  const [originalPrice, setOriginalPrice] = useState('')
  const [promoPrice, setPromoPrice] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [quantity, setQuantity] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/company/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          category,
          originalPrice: Number(originalPrice),
          promoPrice: Number(promoPrice),
          expirationDate,
          quantity: Number(quantity),
          imageUrl: imageUrl || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao cadastrar')
      }
      toast({ title: 'Produto cadastrado!', description: name })
      setView('company-products')
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
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">Cadastrar novo produto</h2>
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-border bg-card p-4 space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="np-name">Nome do produto *</Label>
          <Input
            id="np-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Arroz 5kg"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-desc">Descrição (opcional)</Label>
          <Textarea
            id="np-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes do produto"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="np-cat">Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="np-cat">
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
            <Label htmlFor="np-qty">Quantidade em estoque *</Label>
            <Input
              id="np-qty"
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
            <Label htmlFor="np-orig">Preço original (R$) *</Label>
            <Input
              id="np-orig"
              type="number"
              step="0.01"
              required
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="28.90"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-promo">Preço promocional (R$) *</Label>
            <Input
              id="np-promo"
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
          <Label htmlFor="np-exp">Data de validade *</Label>
          <Input
            id="np-exp"
            type="date"
            required
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-img">URL da imagem (opcional)</Label>
          <Input
            id="np-img"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setView('company-products')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {saving ? 'Salvando...' : 'Cadastrar produto'}
          </Button>
        </div>
      </form>
    </div>
  )
}
