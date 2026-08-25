import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { DollarSign, Receipt, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { getDailySales, getExpiringSummary, getTopProducts, getWeeklySales } from '@/lib/reports';
import type { DailySalesReport, ExpiringSummary, TopProduct, WeeklySalesPoint } from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export function DashboardPage() {
  const [daily, setDaily] = useState<DailySalesReport | null>(null);
  const [weekly, setWeekly] = useState<WeeklySalesPoint[]>([]);
  const [top, setTop] = useState<TopProduct[]>([]);
  const [expiring, setExpiring] = useState<ExpiringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([getDailySales(), getWeeklySales(), getTopProducts(), getExpiringSummary()])
      .then(([d, w, t, e]) => {
        if (d.success && d.data) setDaily(d.data);
        if (w.success && w.data) setWeekly(w.data);
        if (t.success && t.data) setTop(t.data);
        if (e.success && e.data) setExpiring(e.data);
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }, []);

  const maxWeekly = Math.max(1, ...weekly.map((p) => p.total));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Cómo va el negocio hoy.</p>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={<DollarSign className="size-4" />} label="Ventas de hoy" value={money(daily?.today_sales ?? 0)} />
            <StatTile icon={<Receipt className="size-4" />} label="Ticket promedio" value={money(daily?.average_ticket ?? 0)} />
            <StatTile
              icon={<AlertTriangle className="size-4 text-warning" />}
              label="Stock bajo"
              value={String(daily?.low_stock_count ?? 0)}
              href="/alertas"
            />
            <StatTile
              icon={<Clock className="size-4 text-warning" />}
              label="Por vencer / vencidos"
              value={`${expiring?.expiring_count ?? 0} / ${expiring?.expired_count ?? 0}`}
              href="/alertas"
            />
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <TrendingUp className="size-4" />
              Ventas — últimos 30 días
            </h2>
            {weekly.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas todavía.</p>
            ) : (
              <div className="flex h-32 items-end gap-1">
                {weekly.map((p) => (
                  <div
                    key={p.date}
                    className="group relative flex-1 rounded-t bg-primary/70 transition-colors hover:bg-primary"
                    style={{ height: `${Math.max(2, (p.total / maxWeekly) * 100)}%` }}
                    title={`${p.date}: ${money(p.total)}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 font-display text-lg font-bold">Productos más vendidos</h2>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ventas todavía.</p>
            ) : (
              <div className="space-y-1.5">
                {top.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span>
                      <span className="mr-2 font-mono text-muted-foreground">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {p.total_quantity} un. · {money(p.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold">{value}</div>
    </div>
  );
  return href ? (
    <Link to={href} className="block hover:opacity-80">
      {content}
    </Link>
  ) : (
    content
  );
}
