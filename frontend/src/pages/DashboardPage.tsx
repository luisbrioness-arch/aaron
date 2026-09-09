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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Panel de Control</h1>
        <p className="text-sm text-muted-foreground font-medium">Métricas clave, ventas y alertas del negocio en tiempo real.</p>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-border/80 bg-card" />
          ))}
        </div>
      )}

      {!loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              icon={<DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />}
              iconBg="bg-emerald-50 dark:bg-emerald-950/50"
              label="Ventas de Hoy"
              value={money(daily?.today_sales ?? 0)}
              href="/ventas-hoy"
              badge="Ver detalle del día →"
            />
            <StatTile
              icon={<Receipt className="size-5 text-sky-600 dark:text-sky-400" />}
              iconBg="bg-sky-50 dark:bg-sky-950/50"
              label="Ticket Promedio"
              value={money(daily?.average_ticket ?? 0)}
              href="/ventas-hoy"
            />
            <StatTile
              icon={<AlertTriangle className="size-5 text-amber-600 dark:text-amber-400" />}
              iconBg="bg-amber-50 dark:bg-amber-950/50"
              label="Stock Bajo"
              value={`${daily?.low_stock_count ?? 0} ítems`}
              href="/alertas"
              badge="Requiere compra"
            />
            <StatTile
              icon={<Clock className="size-5 text-rose-600 dark:text-rose-400" />}
              iconBg="bg-rose-50 dark:bg-rose-950/50"
              label="Por Vencer / Vencidos"
              value={`${expiring?.expiring_count ?? 0} / ${expiring?.expired_count ?? 0}`}
              href="/alertas"
              badge="Lotes FEFO"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Gráfico de Ventas 30 días */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                    <TrendingUp className="size-5 text-emerald-600 dark:text-emerald-400" />
                    Ventas — Últimos 30 días
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">Comportamiento diario de ingresos</p>
                </div>
              </div>

              {weekly.length === 0 ? (
                <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">
                  No hay registro de ventas en este período.
                </div>
              ) : (
                <div className="flex h-44 items-end gap-1.5 pt-4">
                  {weekly.map((p) => {
                    const heightPct = Math.max(4, (p.total / maxWeekly) * 100);
                    return (
                      <div
                        key={p.date}
                        className="group relative flex-1 flex flex-col items-center justify-end h-full"
                      >
                        <div
                          className="w-full rounded-t-md bg-emerald-500/80 transition-all group-hover:bg-emerald-600 group-hover:scale-y-105"
                          style={{ height: `${heightPct}%` }}
                        />
                        <div className="pointer-events-none absolute -top-8 hidden rounded-md bg-slate-900 px-2 py-1 text-[10px] font-mono text-white shadow-md group-hover:block z-20 whitespace-nowrap">
                          {p.date}: {money(p.total)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top productos */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs">
              <h2 className="font-display text-lg font-bold text-foreground">Más Vendidos</h2>
              <p className="text-xs text-muted-foreground font-medium mb-4">Productos con mayor salida</p>

              {top.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Sin ventas registradas aún.</p>
              ) : (
                <div className="space-y-3">
                  {top.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground truncate">{p.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-foreground">{money(p.total_amount)}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{p.total_quantity} un.</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  iconBg = 'bg-secondary',
  label,
  value,
  href,
  badge,
}: {
  icon: React.ReactNode;
  iconBg?: string;
  label: string;
  value: string;
  href?: string;
  badge?: string;
}) {
  const content = (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs transition-all duration-150 hover:shadow-md hover:border-border">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`flex size-9 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      </div>
      <div className="mt-2 font-mono text-2xl font-extrabold tracking-tight text-foreground">{value}</div>
      {badge && (
        <div className="mt-2 inline-flex rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
          {badge}
        </div>
      )}
    </div>
  );

  return href ? (
    <Link to={href} className="block transition-transform active:scale-[0.99]">
      {content}
    </Link>
  ) : (
    content
  );
}
