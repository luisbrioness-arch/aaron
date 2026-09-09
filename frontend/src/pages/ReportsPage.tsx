import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getCashSummary,
  getCategoryBreakdown,
  getMargin,
  getMoneyTypeBreakdown,
  getStagnantProducts,
} from '@/lib/reports';
import type {
  CashSummaryRow,
  CategoryBreakdownRow,
  MarginReport,
  MoneyTypeBreakdownRow,
  StagnantProduct,
} from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  mixed: 'Mixto',
};

function toCsv(rows: (string | number)[][]) {
  const body = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  return '﻿' + body;
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const TABS = ['Margen', 'Categorías', 'Medios de pago', 'Estancados', 'Caja del día'] as const;
type Tab = (typeof TABS)[number];

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('Margen');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const [margin, setMargin] = useState<MarginReport | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownRow[]>([]);
  const [moneyTypes, setMoneyTypes] = useState<MoneyTypeBreakdownRow[]>([]);
  const [stagnant, setStagnant] = useState<StagnantProduct[]>([]);
  const [cashSummary, setCashSummary] = useState<CashSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const range = { from, to };
    Promise.all([
      getMargin(range),
      getCategoryBreakdown(range),
      getMoneyTypeBreakdown(range),
      getStagnantProducts(),
      getCashSummary(),
    ])
      .then(([m, c, mt, s, cs]) => {
        if (m.success && m.data) setMargin(m.data);
        if (c.success && c.data) setCategories(c.data);
        if (mt.success && mt.data) setMoneyTypes(mt.data);
        if (s.success && s.data) setStagnant(s.data);
        if (cs.success && cs.data) setCashSummary(cs.data);
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Informes & Finanzas</h1>
          <p className="text-sm text-muted-foreground font-medium">Márgenes, rentabilidad por producto y arqueos de caja</p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-xs">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Desde</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 text-xs font-mono rounded-lg" />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hasta</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 text-xs font-mono rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tabs estilo píldora moderna */}
      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl border border-border/80 bg-secondary/40 p-1.5 shadow-2xs">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all duration-150 active:scale-95 ${
              tab === t
                ? 'bg-card text-foreground shadow-xs border border-border/60'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm font-medium text-destructive">{error}</p>}
      {loading && <p className="text-sm font-medium text-muted-foreground">Calculando informes…</p>}

      {!loading && tab === 'Margen' && margin && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryTile label="Ingresos Totales" value={money(margin.summary.revenue)} />
            <SummaryTile label="Costo de Mercadería" value={money(margin.summary.cost)} />
            <SummaryTile label="Margen Bruto" value={`${money(margin.summary.margin)} (${margin.summary.margin_pct}%)`} highlight />
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl shadow-2xs"
              onClick={() =>
                downloadCsv('margen.csv', [
                  ['Producto', 'SKU', 'Cantidad', 'Ingresos', 'Costo', 'Margen', 'Margen %'],
                  ...margin.products.map((p) => [p.name, p.sku, p.total_quantity, p.revenue, p.cost, p.margin, p.margin_pct]),
                ])
              }
            >
              <Download className="size-3.5 mr-1" />
              Exportar CSV / Excel
            </Button>
          </div>
          <Table
            headers={['Producto', 'Cantidad', 'Ingresos', 'Costo', 'Margen']}
            rows={margin.products.map((p) => [
              p.name,
              String(p.total_quantity),
              money(p.revenue),
              money(p.cost),
              `${money(p.margin)} (${p.margin_pct}%)`,
            ])}
            empty="Sin ventas en este rango."
          />
        </div>
      )}

      {!loading && tab === 'Categorías' && (
        <Table
          headers={['Categoría', 'Ingresos', 'Costo', 'Margen']}
          rows={categories.map((c) => [c.category_name, money(c.revenue), money(c.cost), `${money(c.margin)} (${c.margin_pct}%)`])}
          empty="Sin ventas en este rango."
        />
      )}

      {!loading && tab === 'Medios de pago' && (
        <Table
          headers={['Medio de pago', 'Ventas', 'Ingresos']}
          rows={moneyTypes.map((m) => [PAYMENT_LABELS[m.payment_method] ?? m.payment_method, String(m.sale_count), money(m.revenue)])}
          empty="Sin ventas en este rango."
        />
      )}

      {!loading && tab === 'Estancados' && (
        <Table
          headers={['Producto', 'Stock', 'Última venta']}
          rows={stagnant.map((p) => [p.name, String(p.stock_current), p.last_sale_at ? new Date(p.last_sale_at).toLocaleDateString('es-CL') : 'Nunca'])}
          empty="Todos los productos activos se vendieron en los últimos 7 días."
        />
      )}

      {!loading && tab === 'Caja del día' && (
        <Table
          headers={['Cajero', 'Apertura', 'Cierre', 'Esperado', 'Estado']}
          rows={cashSummary.map((c) => [
            c.cashier_name,
            money(c.opening_amount),
            c.closing_amount != null ? money(c.closing_amount) : '—',
            c.expected_amount != null ? money(c.expected_amount) : '—',
            c.status === 'open' ? 'Abierta' : 'Cerrada',
          ])}
          empty="Ninguna caja se abrió hoy."
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-xs transition-all ${
      highlight
        ? 'border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/50 dark:bg-emerald-950/20'
        : 'border-border/80 bg-card'
    }`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-extrabold tracking-tight ${
        highlight ? 'text-emerald-700 dark:text-emerald-300' : 'text-foreground'
      }`}>
        {value}
      </div>
    </div>
  );
}

function Table({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-semibold">
            {headers.map((h, idx) => (
              <th key={h} className={idx === 0 ? 'px-5 py-3.5' : 'px-4 py-3.5 text-right'}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-12 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="hover:bg-secondary/40 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className={j === 0 ? 'px-5 py-3 font-semibold text-foreground' : 'px-4 py-3 font-mono text-right'}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
