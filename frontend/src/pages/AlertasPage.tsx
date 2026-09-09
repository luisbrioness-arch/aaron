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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Alertas & Vencimientos</h1>
        <p className="text-sm text-muted-foreground font-medium">Control de stock crítico y seguimiento de lotes FEFO.</p>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl border border-border/80 bg-card" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <AlertSection
            icon={<Ban className="size-5 text-rose-600 dark:text-rose-400" />}
            iconBg="bg-rose-50 dark:bg-rose-950/50"
            title="Lotes Vencidos"
            badgeVariant="danger"
            count={expired.length}
            emptyText="Excelente: no hay ningún producto vencido en las estanterías."
          >
            {expired.map((lot) => (
              <div key={lot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200/60 bg-rose-50/40 dark:border-rose-900/40 dark:bg-rose-950/20 p-3.5 text-sm transition-colors">
                <div>
                  <div className="font-semibold text-foreground">{lot.product_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    SKU: {lot.sku} · Venció el <strong className="text-rose-600 dark:text-rose-400">{formatDate(lot.expiration_date)}</strong>
                    {lot.lot_code && ` · Lote: ${lot.lot_code}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-foreground">
                    {lot.quantity_remaining} {UNIT_LABELS[lot.unit_of_measure]}
                  </span>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={adjustingId === lot.id}
                    onClick={() => handleMarkAsLoss(lot)}
                  >
                    <Trash2 className="size-3.5 mr-1" />
                    Marcar merma
                  </Button>
                </div>
              </div>
            ))}
          </AlertSection>

          <AlertSection
            icon={<Clock className="size-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            title="Próximos a Vencer (7 días)"
            badgeVariant="warning"
            count={expiring.length}
            emptyText="No hay productos próximos a vencer en los siguientes días."
          >
            {expiring.map((lot) => (
              <div key={lot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 text-sm transition-colors hover:bg-secondary/40">
                <div>
                  <div className="font-semibold text-foreground">{lot.product_name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    SKU: {lot.sku} · Vence el <strong>{formatDate(lot.expiration_date)}</strong>
                    {lot.lot_code && ` · Lote: ${lot.lot_code}`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-foreground">
                    {lot.quantity_remaining} {UNIT_LABELS[lot.unit_of_measure]}
                  </span>
                  <Badge variant="warning">
                    {lot.days_until_expiration === 0 ? 'Vence hoy' : `${lot.days_until_expiration} días restantes`}
                  </Badge>
                </div>
              </div>
            ))}
          </AlertSection>

          <AlertSection
            icon={<AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />}
            iconBg="bg-amber-50 dark:bg-amber-950/50"
            title="Stock Bajo (Crítico)"
            badgeVariant="warning"
            count={lowStock.length}
            emptyText="Inventario saludable: ningún producto por debajo de su stock crítico."
          >
            {lowStock.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card p-3.5 text-sm transition-colors hover:bg-secondary/40">
                <div>
                  <div className="font-semibold text-foreground">{p.name}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    SKU: {p.sku} {p.category?.name ? `· Categoría: ${p.category.name}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    Actual: <strong className="text-amber-600 dark:text-amber-400 font-bold">{p.stock_current}</strong> / Mínimo: {p.stock_critical} {UNIT_LABELS[p.unit_of_measure]}
                  </span>
                  <Badge variant="danger">Reabastecer</Badge>
                </div>
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
  iconBg = 'bg-secondary',
  title,
  count,
  badgeVariant = 'neutral',
  emptyText,
  children,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  title: string;
  count: number;
  badgeVariant?: 'neutral' | 'ok' | 'warning' | 'danger';
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg}`}>
            {icon}
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
        </div>
        <Badge variant={count > 0 ? badgeVariant : 'neutral'}>
          {count} {count === 1 ? 'ítem' : 'ítems'}
        </Badge>
      </div>

      {count === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}
