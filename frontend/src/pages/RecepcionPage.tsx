import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Search, Trash2, PackageCheck, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { searchProducts } from '@/lib/products';
import { listSuppliers, createSupplier } from '@/lib/suppliers';
import { createPurchase, listPurchases, receivePurchase } from '@/lib/purchases';
import type { Product, PurchaseSummary, Supplier } from '@/types';

interface ReceiveLine {
  product: Product;
  quantity: string;
  unitCost: string;
  expirationDate: string;
  lotCode: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

const STATUS_LABEL: Record<PurchaseSummary['status'], string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  received: 'Recibida',
  cancelled: 'Cancelada',
};
const STATUS_VARIANT: Record<PurchaseSummary['status'], 'neutral' | 'warning' | 'ok' | 'danger'> = {
  pending: 'neutral',
  partial: 'warning',
  received: 'ok',
  cancelled: 'danger',
};

export function RecepcionPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [lines, setLines] = useState<ReceiveLine[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [recent, setRecent] = useState<PurchaseSummary[]>([]);

  function refreshSuppliers() {
    listSuppliers()
      .then((res) => setSuppliers(res.success && res.data ? res.data : []))
      .catch(() => {});
  }

  function refreshRecent() {
    listPurchases()
      .then((res) => setRecent(res.success && res.data ? res.data.slice(0, 8) : []))
      .catch(() => {});
  }

  useEffect(() => {
    refreshSuppliers();
    refreshRecent();
  }, []);

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

  function addLine(product: Product) {
    setLines((prev) => {
      if (prev.some((l) => l.product.id === product.id)) return prev;
      return [
        ...prev,
        {
          product,
          quantity: '1',
          unitCost: String(product.purchase_price ?? ''),
          expirationDate: '',
          lotCode: '',
        },
      ];
    });
    setQuery('');
    setResults([]);
  }

  function updateLine(productId: string, patch: Partial<ReceiveLine>) {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, ...patch } : l)));
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0);

  async function handleConfirm() {
    setError(null);
    if (!supplierId) {
      setError('Selecciona un proveedor');
      return;
    }
    if (lines.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }
    for (const l of lines) {
      if (!Number(l.quantity) || Number(l.quantity) <= 0) {
        setError(`Cantidad inválida para "${l.product.name}"`);
        return;
      }
      if (l.product.has_expiration && !l.expirationDate) {
        setError(`"${l.product.name}" tiene vencimiento — indica la fecha`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const created = await createPurchase({
        supplier_id: supplierId,
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: Number(l.quantity),
          unit_cost: Number(l.unitCost) || 0,
        })),
      });
      if (!created.success || !created.data) {
        setError(created.message || 'No se pudo crear la orden de compra');
        return;
      }

      const received = await receivePurchase({
        purchase_id: created.data.id,
        items: lines.map((l) => ({
          product_id: l.product.id,
          quantity: Number(l.quantity),
          expiration_date: l.expirationDate || null,
          lot_code: l.lotCode || null,
        })),
      });
      if (!received.success) {
        setError(
          `La orden ${created.data.purchase_number} se creó pero la recepción falló: ${received.message}. Complétala manualmente.`,
        );
        return;
      }

      setSuccess(`Recepción registrada — orden ${created.data.purchase_number}, ${money(total)}`);
      setLines([]);
      refreshRecent();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold">Recibir compra</h1>
        <p className="text-sm text-muted-foreground">
          Escanea los productos que llegan, uno tras otro, y confirma al final.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="supplier">Proveedor</Label>
              <Select id="supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Selecciona un proveedor…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={() => setSupplierModalOpen(true)}>
              <Plus className="size-4" />
              Nuevo
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Escanea un código de barras o busca por nombre…"
              className="h-11 pl-9 text-base"
            />
          </div>

          {query.trim() !== '' && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
              {results.length === 0 && <div className="px-4 py-3 text-sm text-muted-foreground">Sin resultados.</div>}
              {results.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addLine(p)}
                  className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-left text-sm last:border-0 hover:bg-secondary"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
                  </div>
                  <div className="flex gap-1">
                    {p.is_scale_item && <Badge variant="neutral">Granel</Badge>}
                    {p.has_expiration && <Badge variant="neutral">Vencimiento</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 overflow-x-auto rounded-lg border border-border bg-card">
            {lines.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Ningún producto escaneado todavía.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 font-medium">Cantidad</th>
                    <th className="px-4 py-2 font-medium">Costo unit.</th>
                    <th className="px-4 py-2 font-medium">Vencimiento</th>
                    <th className="px-4 py-2 font-medium">Lote</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l.product.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2 font-medium">{l.product.name}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step={l.product.unit_of_measure === 'units' ? '1' : '0.001'}
                          value={l.quantity}
                          onChange={(e) => updateLine(l.product.id, { quantity: e.target.value })}
                          className="h-8 w-20"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={l.unitCost}
                          onChange={(e) => updateLine(l.product.id, { unitCost: e.target.value })}
                          className="h-8 w-24"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {l.product.has_expiration ? (
                          <Input
                            type="date"
                            value={l.expirationDate}
                            onChange={(e) => updateLine(l.product.id, { expirationDate: e.target.value })}
                            className="h-8 w-36"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {l.product.has_expiration ? (
                          <Input
                            value={l.lotCode}
                            onChange={(e) => updateLine(l.product.id, { lotCode: e.target.value })}
                            placeholder="opcional"
                            className="h-8 w-24"
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(l.product.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-display text-lg font-bold">Confirmar</h2>
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>Total estimado</span>
              <span className="font-mono">{money(total)}</span>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            {success && <p className="mt-3 text-sm text-accent">{success}</p>}
            <Button className="mt-4 w-full" disabled={submitting || lines.length === 0} onClick={handleConfirm}>
              <PackageCheck className="size-4" />
              {submitting ? 'Registrando…' : 'Confirmar recepción'}
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Órdenes recientes</h2>
            <div className="space-y-2">
              {recent.length === 0 && <p className="text-sm text-muted-foreground">Sin órdenes todavía.</p>}
              {recent.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-mono text-xs">{p.purchase_number}</div>
                    <div className="text-xs text-muted-foreground">{p.supplier_name}</div>
                  </div>
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SupplierQuickAddModal
        open={supplierModalOpen}
        onOpenChange={setSupplierModalOpen}
        onCreated={(supplier) => {
          setSuppliers((prev) => [...prev, supplier]);
          setSupplierId(supplier.id);
        }}
      />
    </div>
  );
}

function SupplierQuickAddModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (supplier: Supplier) => void;
}) {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setRut('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !rut.trim()) {
      setError('Nombre y RUT son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const res = await createSupplier({ name: name.trim(), rut: rut.trim() });
      if (!res.success || !res.data) {
        setError(res.message || 'No se pudo crear el proveedor');
        return;
      }
      onCreated(res.data);
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nuevo proveedor">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="supplier_name">Nombre</Label>
            <Input id="supplier_name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="supplier_rut">RUT</Label>
            <Input id="supplier_rut" value={rut} onChange={(e) => setRut(e.target.value)} required />
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
