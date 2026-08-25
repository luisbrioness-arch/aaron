import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Checkbox } from '@/components/ui/Input';
import { createProduct, updateProduct } from '@/lib/products';
import type { Category, Product, UnitOfMeasure } from '@/types';

interface FormState {
  sku: string;
  barcode: string;
  name: string;
  category_id: string;
  unit_of_measure: UnitOfMeasure;
  is_scale_item: boolean;
  has_expiration: boolean;
  purchase_price: string;
  selling_price: string;
  stock_critical: string;
  stock_current: string;
}

const EMPTY_FORM: FormState = {
  sku: '',
  barcode: '',
  name: '',
  category_id: '',
  unit_of_measure: 'units',
  is_scale_item: false,
  has_expiration: false,
  purchase_price: '',
  selling_price: '',
  stock_critical: '10',
  stock_current: '0',
};

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  categories,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  categories: Category[];
  onSaved: (product: Product) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(product);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (product) {
      setForm({
        sku: product.sku,
        barcode: product.barcode ?? '',
        name: product.name,
        category_id: product.category?.id ?? '',
        unit_of_measure: product.unit_of_measure,
        is_scale_item: product.is_scale_item,
        has_expiration: product.has_expiration,
        purchase_price: String(product.purchase_price),
        selling_price: String(product.selling_price),
        stock_critical: String(product.stock_critical),
        stock_current: String(product.stock_current),
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, product]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const purchasePrice = Number(form.purchase_price);
    const sellingPrice = Number(form.selling_price);
    const stockCritical = Number(form.stock_critical);
    if (!form.sku.trim() || !form.name.trim()) {
      setError('SKU y nombre son obligatorios');
      return;
    }
    if (Number.isNaN(purchasePrice) || Number.isNaN(sellingPrice)) {
      setError('Precio de compra y de venta deben ser números');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || null,
        name: form.name.trim(),
        category_id: form.category_id || null,
        unit_of_measure: form.unit_of_measure,
        is_scale_item: form.is_scale_item,
        has_expiration: form.has_expiration,
        purchase_price: purchasePrice,
        selling_price: sellingPrice,
        stock_critical: Number.isNaN(stockCritical) ? 10 : stockCritical,
      };

      const res = isEditing
        ? await updateProduct(product!.id, payload)
        : await createProduct({ ...payload, stock_current: Number(form.stock_current) || 0 });

      if (!res.success || !res.data) {
        setError(res.message || 'No se pudo guardar el producto');
        return;
      }
      onSaved(res.data);
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={isEditing ? 'Editar producto' : 'Agregar producto'}
        description={isEditing ? form.sku : 'El stock inicial queda registrado como movimiento de entrada.'}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={(e) => set('sku', e.target.value)}
                disabled={isEditing}
                required
              />
            </div>
            <div>
              <Label htmlFor="barcode">Código de barras</Label>
              <Input id="barcode" value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category">Categoría</Label>
              <Select id="category" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="unit">Unidad de medida</Label>
              <Select
                id="unit"
                value={form.unit_of_measure}
                onChange={(e) => set('unit_of_measure', e.target.value as UnitOfMeasure)}
              >
                <option value="units">Unidades</option>
                <option value="kilos">Kilos</option>
                <option value="liters">Litros</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.is_scale_item} onChange={(e) => set('is_scale_item', e.target.checked)} />
              Se vende a granel/balanza
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.has_expiration} onChange={(e) => set('has_expiration', e.target.checked)} />
              Tiene vencimiento
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="purchase_price">Precio de compra</Label>
              <Input
                id="purchase_price"
                type="number"
                min="0"
                step="0.01"
                value={form.purchase_price}
                onChange={(e) => set('purchase_price', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="selling_price">Precio de venta</Label>
              <Input
                id="selling_price"
                type="number"
                min="0"
                step="0.01"
                value={form.selling_price}
                onChange={(e) => set('selling_price', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="stock_critical">Stock crítico</Label>
              <Input
                id="stock_critical"
                type="number"
                min="0"
                step="0.001"
                value={form.stock_critical}
                onChange={(e) => set('stock_critical', e.target.value)}
              />
            </div>
          </div>

          {!isEditing && (
            <div>
              <Label htmlFor="stock_current">Stock inicial</Label>
              <Input
                id="stock_current"
                type="number"
                min="0"
                step="0.001"
                value={form.stock_current}
                onChange={(e) => set('stock_current', e.target.value)}
              />
            </div>
          )}

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
