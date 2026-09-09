import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Search, X, Ban, Pencil, Tag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { searchProducts } from '@/lib/products';
import { createPromotion, deactivatePromotion, listPromotions, updatePromotion } from '@/lib/promotions';
import type { PromotionInput } from '@/lib/promotions';
import type { Promotion, PromotionType, Product } from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

function describePromotion(p: Promotion) {
  if (p.type === 'nxm') return `Compra ${p.buy_quantity} y paga ${p.pay_quantity}`;
  return `Pack de ${p.buy_quantity} a ${money(p.pack_price ?? 0)}`;
}

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);

  function refresh() {
    setLoading(true);
    listPromotions()
      .then((res) => {
        if (res.success && res.data) setPromotions(res.data);
        else setError(res.message || 'No se pudieron cargar las promociones');
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleDeactivate(p: Promotion) {
    if (!confirm(`¿Desactivar "${p.name}"?`)) return;
    const res = await deactivatePromotion(p.id);
    if (res.success) {
      setPromotions((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      alert(res.message || 'No se pudo desactivar');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Promociones & Ofertas</h1>
          <p className="text-sm text-muted-foreground font-medium">Configura reglas automáticas 2x1, 3x2 y packs a precio especial</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="shadow-sm shadow-emerald-500/20"
        >
          <Plus className="size-4 mr-1" />
          Nueva Promoción
        </Button>
      </div>

      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}
      {loading && <p className="text-sm font-medium text-muted-foreground">Cargando promociones…</p>}

      {!loading && promotions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/80 py-14 text-center text-sm text-muted-foreground bg-card">
          No hay promociones activas en este momento. Crea una para incentivar las ventas en el POS.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                  <Tag className="size-4" />
                </div>
                <div className="font-display font-bold text-foreground text-base">{p.name}</div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => {
                    setEditing(p);
                    setFormOpen(true);
                  }}
                  title="Editar promoción"
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  onClick={() => handleDeactivate(p)}
                  title="Desactivar promoción"
                >
                  <Ban className="size-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2">
              {describePromotion(p)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <Badge variant="neutral">{p.product_ids.length} producto(s) en oferta</Badge>
              {p.ends_at && <Badge variant="warning">Vence: {p.ends_at}</Badge>}
            </div>
          </div>
        ))}
      </div>

      <PromotionFormModal open={formOpen} onOpenChange={setFormOpen} promotion={editing} onSaved={refresh} />
    </div>
  );
}

function PromotionFormModal({
  open,
  onOpenChange,
  promotion,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: Promotion | null;
  onSaved: () => void;
}) {
  const isEditing = Boolean(promotion);
  const [name, setName] = useState('');
  const [type, setType] = useState<PromotionType>('nxm');
  const [buyQuantity, setBuyQuantity] = useState('2');
  const [payQuantity, setPayQuantity] = useState('1');
  const [packPrice, setPackPrice] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setQuery('');
    setResults([]);
    if (promotion) {
      setName(promotion.name);
      setType(promotion.type);
      setBuyQuantity(String(promotion.buy_quantity ?? ''));
      setPayQuantity(String(promotion.pay_quantity ?? ''));
      setPackPrice(String(promotion.pack_price ?? ''));
      setEndsAt(promotion.ends_at ?? '');
      // Los productos ya seleccionados se muestran solo por id hasta que
      // el admin los vuelva a buscar — no hay endpoint para "traer
      // productos por lista de ids" todavía, así que se listan como
      // chips mínimos en vez de perder la selección.
      setSelectedProducts(
        promotion.product_ids.map((id) => ({ id, name: id, sku: '' }) as unknown as Product),
      );
    } else {
      setName('');
      setType('nxm');
      setBuyQuantity('2');
      setPayQuantity('1');
      setPackPrice('');
      setEndsAt('');
      setSelectedProducts([]);
    }
  }, [open, promotion]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchProducts(query.trim())
        .then((res) => setResults(res.success && res.data ? res.data : []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function addProduct(p: Product) {
    setSelectedProducts((prev) => (prev.some((x) => x.id === p.id) ? prev : [...prev, p]));
    setQuery('');
    setResults([]);
  }

  function removeProduct(id: string) {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    if (selectedProducts.length === 0) {
      setError('Selecciona al menos un producto');
      return;
    }
    const buy = Number(buyQuantity);
    if (!buy || buy <= 0) {
      setError(type === 'nxm' ? 'La cantidad a comprar debe ser positiva' : 'El tamaño del pack debe ser positivo');
      return;
    }
    if (type === 'nxm') {
      const pay = Number(payQuantity);
      if (!pay || pay <= 0 || pay >= buy) {
        setError('"Paga" debe ser positivo y menor que "Compra"');
        return;
      }
    } else {
      const price = Number(packPrice);
      if (!packPrice || price < 0) {
        setError('El precio del pack es obligatorio');
        return;
      }
    }

    const input: PromotionInput = {
      name: name.trim(),
      type,
      buy_quantity: buy,
      pay_quantity: type === 'nxm' ? Number(payQuantity) : undefined,
      pack_price: type === 'pack_price' ? Number(packPrice) : undefined,
      ends_at: endsAt || null,
      product_ids: selectedProducts.map((p) => p.id),
    };

    setSaving(true);
    try {
      const res = isEditing ? await updatePromotion(promotion!.id, input) : await createPromotion(input);
      if (!res.success) {
        setError(res.message || 'No se pudo guardar la promoción');
        return;
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEditing ? 'Editar promoción' : 'Nueva promoción'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="promo_name">Nombre</Label>
            <Input id="promo_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="2x1 Bebidas 1.5L" required />
          </div>

          <div>
            <Label htmlFor="promo_type">Tipo</Label>
            <Select id="promo_type" value={type} onChange={(e) => setType(e.target.value as PromotionType)}>
              <option value="nxm">Compra N y paga M (2x1, 3x2)</option>
              <option value="pack_price">Pack a precio fijo</option>
            </Select>
          </div>

          {type === 'nxm' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="buy_qty">Compra</Label>
                <Input id="buy_qty" type="number" min="1" step="1" value={buyQuantity} onChange={(e) => setBuyQuantity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pay_qty">Paga</Label>
                <Input id="pay_qty" type="number" min="1" step="1" value={payQuantity} onChange={(e) => setPayQuantity(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="pack_size">Unidades del pack</Label>
                <Input id="pack_size" type="number" min="1" step="1" value={buyQuantity} onChange={(e) => setBuyQuantity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pack_price">Precio del pack</Label>
                <Input id="pack_price" type="number" min="0" step="1" value={packPrice} onChange={(e) => setPackPrice(e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="ends_at">Vigente hasta (opcional)</Label>
            <Input id="ends_at" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </div>

          <div>
            <Label>Productos</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto…" className="pl-8" />
            </div>
            {query.trim() !== '' && results.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-card">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addProduct(p)}
                    className="block w-full px-3 py-1.5 text-left text-sm hover:bg-secondary"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {selectedProducts.map((p) => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-xs">
                  {p.name}
                  <button type="button" onClick={() => removeProduct(p.id)}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
