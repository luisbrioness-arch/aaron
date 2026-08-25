import { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Ban, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { lowStockProducts } from '@/lib/products';
import { adjustLot, listExpired, listExpiring } from '@/lib/lots';
import type { ExpiringLot } from '@/lib/lots';
import type { Product } from '@/types';

const UNIT_LABELS: Record<Product['unit_of_measure'], string> = { units: 'un.', kilos: 'kg', liters: 'L' };

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function AlertasPage() {
  const [lowStock, setLowStock] = useState<Product[]>([]);
  const [expiring, setExpiring] = useState<ExpiringLot[]>([]);
  const [expired, setExpired] = useState<ExpiringLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  function refresh() {
    setLoading(true);
    setError(null);
    Promise.all([lowStockProducts(), listExpiring(), listExpired()])
      .then(([lowRes, expiringRes, expiredRes]) => {
        if (lowRes.success && lowRes.data) setLowStock(lowRes.data);
        if (expiringRes.success && expiringRes.data) setExpiring(expiringRes.data);
        if (expiredRes.success && expiredRes.data) setExpired(expiredRes.data);
        if (!lowRes.success || !expiringRes.success || !expiredRes.success) {
          setError('Algunas alertas no se pudieron cargar');
        }
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleMarkAsLoss(lot: ExpiringLot) {
    if (!confirm(`¿Marcar "${lot.product_name}" (${lot.quantity_remaining} ${UNIT_LABELS[lot.unit_of_measure]}) como merma?`)) {
      return;
    }
    setAdjustingId(lot.id);
    try {
      const res = await adjustLot(lot.id);
      if (res.success) {
        setExpired((prev) => prev.filter((l) => l.id !== lot.id));
        setExpiring((prev) => prev.filter((l) => l.id !== lot.id));
      } else {
        alert(res.message || 'No se pudo registrar la merma');
      }
    } catch {
      alert('No se pudo conectar con el servidor');
    } finally {
      setAdjustingId(null);
    }
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold">Alertas</h1>
        <p className="text-sm text-muted-foreground">Stock bajo y vencimientos que necesitan atención.</p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!loading && (
        <div className="space-y-6">
          <AlertSection
            icon={<Ban className="size-4 text-destructive" />}
            title="Vencidos"
            count={expired.length}
            emptyText="Ningún producto vencido en stock."
          >
            {expired.map((lot) => (
              <div key={lot.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{lot.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {lot.sku} · venció el {formatDate(lot.expiration_date)}
                    {lot.lot_code && ` · lote ${lot.lot_code}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {lot.quantity_remaining} {UNIT_LABELS[lot.unit_of_measure]}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={adjustingId === lot.id}
                    onClick={() => handleMarkAsLoss(lot)}
                  >
                    <Trash2 className="size-3.5" />
                    Marcar merma
                  </Button>
                </div>
              </div>
            ))}
          </AlertSection>

          <AlertSection
            icon={<Clock className="size-4 text-warning" />}
            title="Por vencer"
            count={expiring.length}
            emptyText="Nada por vencer en los próximos días."
          >
            {expiring.map((lot) => (
              <div key={lot.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{lot.product_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {lot.sku} · vence el {formatDate(lot.expiration_date)}
                    {lot.lot_code && ` · lote ${lot.lot_code}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">
                    {lot.quantity_remaining} {UNIT_LABELS[lot.unit_of_measure]}
                  </span>
                  <Badge variant="warning">
                    {lot.days_until_expiration === 0 ? 'Vence hoy' : `${lot.days_until_expiration} días`}
                  </Badge>
                </div>
              </div>
            ))}
          </AlertSection>

          <AlertSection
            icon={<AlertTriangle className="size-4 text-warning" />}
            title="Stock bajo"
            count={lowStock.length}
            emptyText="Ningún producto por debajo de su stock crítico."
          >
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-md bg-secondary px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                </div>
                <span className="font-mono text-sm">
                  {p.stock_current} / {p.stock_critical} {UNIT_LABELS[p.unit_of_measure]}
                </span>
              </div>
            ))}
          </AlertSection>
        </div>
      )}
    </div>
  );
}

function AlertSection({
  icon,
  title,
  count,
  emptyText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <Badge variant="neutral">{count}</Badge>
      </div>
      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">{children}</div>
      )}
    </div>
  );
}
