import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { recordMovement } from '@/lib/inventory';
import type { MovementType, Product } from '@/types';

const TYPE_LABELS: Record<MovementType, string> = {
  in: 'Entrada',
  out: 'Salida',
  adjustment: 'Corrección (+/-)',
  loss: 'Merma',
};

export function StockAdjustModal({
  open,
  onOpenChange,
  product,
  onAdjusted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onAdjusted: (productId: string, newStock: number) => void;
}) {
  const [type, setType] = useState<MovementType>('in');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType('in');
    setQuantity('');
    setReason('');
    setUnitCost('');
    setError(null);
  }, [open]);

  if (!product) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!quantity || Number.isNaN(qty) || (type !== 'adjustment' && qty <= 0)) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setSaving(true);
    try {
      const res = await recordMovement({
        product_id: product!.id,
        movement_type: type,
        quantity: qty,
        reason: reason.trim() || undefined,
        unit_cost: type === 'in' && unitCost ? Number(unitCost) : undefined,
      });
      if (!res.success || !res.data) {
        setError(res.message || 'No se pudo registrar el movimiento');
        return;
      }
      onAdjusted(product!.id, res.data.stock_after);
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Ajustar stock" description={`${product.name} · stock actual: ${product.stock_current}`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="movement_type">Tipo de movimiento</Label>
            <Select id="movement_type" value={type} onChange={(e) => setType(e.target.value as MovementType)}>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="quantity">
              Cantidad {type === 'adjustment' ? '(negativa para restar)' : ''}
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          {type === 'in' && (
            <div>
              <Label htmlFor="unit_cost">¿Varió el precio de compra? (opcional)</Label>
              <Input
                id="unit_cost"
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                placeholder={String(product.purchase_price)}
              />
            </div>
          )}

          <div>
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Registrar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
