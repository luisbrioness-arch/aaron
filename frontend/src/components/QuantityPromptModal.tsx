import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import type { Product } from '@/types';

const UNIT_LABELS: Record<Product['unit_of_measure'], string> = {
  units: 'unidades',
  kilos: 'kilos',
  liters: 'litros',
};

export function QuantityPromptModal({
  product,
  onConfirm,
  onCancel,
}: {
  product: Product | null;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue('');
  }, [product]);

  if (!product) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const qty = Number(value);
    if (!value || Number.isNaN(qty) || qty <= 0) return;
    onConfirm(qty);
  }

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent title={product.name} description={`Se vende por ${UNIT_LABELS[product.unit_of_measure]}`}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="scale_qty">Cantidad ({UNIT_LABELS[product.unit_of_measure]})</Label>
            <Input
              id="scale_qty"
              type="number"
              min="0.001"
              step="0.001"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">Agregar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
