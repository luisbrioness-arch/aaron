import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Search,
  DollarSign,
  Receipt,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  BookOpen,
  Printer,
  MessageCircle,
  Download,
  RotateCw,
  Eye,
  Loader2,
  Clock,
  User,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { getSalesByDate, getSaleDetail } from '@/lib/sales';
import { openWhatsAppCreditReceipt } from '@/lib/whatsapp';
import type { DailySalesSummary, SaleDetailData, SaleSummary } from '@/lib/sales';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const PAYMENT_CONFIG: Record<
  string,
  { label: string; icon: typeof Banknote; badgeClass: string }
> = {
  cash: {
    label: 'Efectivo',
    icon: Banknote,
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/50',
  },
  card: {
    label: 'Tarjeta',
    icon: CreditCard,
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200/50',
  },
  transfer: {
    label: 'Transferencia',
    icon: ArrowRightLeft,
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/50',
  },
  credit: {
    label: 'Fiado / Cta.',
    icon: BookOpen,
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/50',
  },
  mixed: {
    label: 'Mixto',
    icon: DollarSign,
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/50',
  },
};

export function DailySalesPage() {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [sales, setSales] = useState<SaleSummary[]>([]);
  const [summary, setSummary] = useState<DailySalesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  // Modal Detalle de Venta
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  function loadSales(dateToFetch: string) {
    setLoading(true);
    setError(null);
    getSalesByDate(dateToFetch)
      .then((res) => {
        if (res.success && res.data) {
          setSales(res.data.sales || []);
          setSummary(res.data.summary || null);
        } else {
          setSales([]);
          setSummary(null);
        }
      })
      .catch(() => {
        setError('No se pudo cargar las ventas para la fecha seleccionada.');
        setSales([]);
        setSummary(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSales(selectedDate);
  }, [selectedDate]);

  // Filtrado reactivo en memoria
  const filteredSales = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const matchesMethod = selectedMethod === 'all' || s.payment_method === selectedMethod;
      if (!matchesMethod) return false;

      if (!q) return true;
      const invoice = String(s.invoice_number || '').toLowerCase();
      const cashier = (s.cashier_name || '').toLowerCase();
      const customer = (s.customer_name || '').toLowerCase();
      const rut = (s.customer_rut || '').toLowerCase();
      return invoice.includes(q) || cashier.includes(q) || customer.includes(q) || rut.includes(q);
    });
  }, [sales, search, selectedMethod]);

  const isToday = selectedDate === getTodayString();
  const isYesterday = selectedDate === getYesterdayString();

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['N° Boleta/Factura', 'Tipo', 'Fecha y Hora', 'Cajero', 'Cliente', 'RUT', 'Medio de Pago', 'Total ($)'],
      ...filteredSales.map((s) => [
        `#${s.invoice_number}`,
        s.invoice_type.toUpperCase(),
        new Date(s.created_at).toLocaleString('es-CL'),
        s.cashier_name || '—',
        s.customer_name || 'Público General',
        s.customer_rut || '—',
        PAYMENT_CONFIG[s.payment_method]?.label || s.payment_method,
        s.total_amount,
      ]),
    ];

    const body = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas_${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y Selector de Fecha */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Detalle de Ventas del Día
            </h1>
            {isToday && (
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                En vivo (Hoy)
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Auditoría de boletas, medios de pago y consulta de productos vendidos.
          </p>
        </div>

        {/* Barra de Fechas Rápida */}
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card p-1.5 shadow-xs">
          <button
            type="button"
            onClick={() => setSelectedDate(getTodayString())}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              isToday
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(getYesterdayString())}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              isYesterday
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            Ayer
          </button>

          <div className="flex items-center gap-1.5 pl-1 border-l border-border/60">
            <Calendar className="size-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="h-8 text-xs font-mono rounded-lg border-0 bg-transparent px-1 focus:bg-background"
            />
          </div>

          <button
            type="button"
            onClick={() => loadSales(selectedDate)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            title="Recargar datos"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>
      </div>

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      {/* Tarjetas KPI de la Fecha */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Ventas</span>
            <DollarSign className="size-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {money(summary?.total_revenue ?? 0)}
          </div>
          <p className="mt-0.5 text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
            {summary?.count ?? 0} ventas registradas
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Ticket Promedio</span>
            <Receipt className="size-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-foreground">
            {money(summary?.average_ticket ?? 0)}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Por compra</p>
        </div>

        <div className="rounded-2xl border border-emerald-200/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Efectivo</span>
            <Banknote className="size-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-foreground">
            {money(summary?.by_method?.cash ?? 0)}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Caja física</p>
        </div>

        <div className="rounded-2xl border border-sky-200/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tarjetas</span>
            <CreditCard className="size-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-foreground">
            {money(summary?.by_method?.card ?? 0)}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Débito / Crédito</p>
        </div>

        <div className="rounded-2xl border border-indigo-200/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Transf.</span>
            <ArrowRightLeft className="size-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-foreground">
            {money(summary?.by_method?.transfer ?? 0)}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">Cuenta bancaria</p>
        </div>

        <div className="rounded-2xl border border-amber-200/50 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Fiados</span>
            <BookOpen className="size-4" />
          </div>
          <div className="mt-2 font-mono text-xl font-extrabold text-foreground">
            {money(summary?.by_method?.credit ?? 0)}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">A cobrar en libreta</p>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros por Medio de Pago */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
          <Input
            type="text"
            placeholder="Buscar por N° boleta, cajero o cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'cash', label: 'Efectivo' },
            { id: 'card', label: 'Tarjeta' },
            { id: 'transfer', label: 'Transferencia' },
            { id: 'credit', label: 'Fiado' },
          ].map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMethod(m.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedMethod === m.id
                  ? 'bg-foreground text-background shadow-xs'
                  : 'border border-border/80 bg-card text-muted-foreground hover:bg-secondary'
              }`}
            >
              {m.label}
            </button>
          ))}

          {filteredSales.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportCsv}
              className="h-8 text-xs ml-2 rounded-xl"
              title="Descargar archivo Excel / CSV"
            >
              <Download className="size-3.5 mr-1" />
              Exportar
            </Button>
          )}
        </div>
      </div>

      {/* Tabla de Ventas */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Cargando ventas de la fecha…</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Receipt className="mx-auto size-12 text-muted-foreground/40" />
            <h3 className="mt-3 font-display font-semibold text-foreground">
              No hay ventas registradas
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search || selectedMethod !== 'all'
                ? 'No coinciden ventas con los filtros aplicados.'
                : `No se realizaron ventas el día ${selectedDate}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold">Comprobante</th>
                  <th className="px-4 py-3.5 font-semibold">Hora</th>
                  <th className="px-4 py-3.5 font-semibold">Cajero</th>
                  <th className="px-4 py-3.5 font-semibold">Cliente</th>
                  <th className="px-4 py-3.5 font-semibold">Medio de Pago</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Total</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredSales.map((sale) => {
                  const methodCfg = PAYMENT_CONFIG[sale.payment_method] || {
                    label: sale.payment_method,
                    badgeClass: 'bg-secondary text-foreground',
                  };
                  const timeStr = new Date(sale.created_at).toLocaleTimeString('es-CL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });

                  return (
                    <tr key={sale.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">
                            #{sale.invoice_number}
                          </span>
                          <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                            {sale.invoice_type}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                        <div className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>{timeStr}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-foreground">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-muted-foreground" />
                          <span className="truncate max-w-[120px]">{sale.cashier_name || 'Cajero'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        {sale.customer_name ? (
                          <div className="font-medium text-foreground truncate max-w-[150px]">
                            {sale.customer_name}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 italic">Público General</span>
                        )}
                        {sale.customer_rut && (
                          <div className="text-[10px] font-mono text-muted-foreground">{sale.customer_rut}</div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${methodCfg.badgeClass}`}
                        >
                          {methodCfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono font-bold text-foreground text-sm">
                        {money(sale.total_amount)}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSaleId(sale.id);
                              setDetailModalOpen(true);
                            }}
                            className="h-8 text-xs px-2.5 shadow-2xs gap-1"
                            title="Ver desglose de productos y reimprimir ticket"
                          >
                            <Eye className="size-3.5" />
                            Detalle
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Desglose Completo de la Venta */}
      {selectedSaleId && (
        <SaleDetailModal
          saleId={selectedSaleId}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-componente Modal Detalle de Venta
// -------------------------------------------------------------

function SaleDetailModal({
  saleId,
  open,
  onOpenChange,
}: {
  saleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<SaleDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  useEffect(() => {
    if (open && saleId) {
      setLoading(true);
      getSaleDetail(saleId)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
            setWhatsappPhone(res.data.sale.customer_phone || '');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, saleId]);

  if (!open) return null;

  const sale = data?.sale;
  const items = data?.items || [];
  const isCredit = sale?.payment_method === 'credit';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={sale ? `Boleta Electrónica #${sale.invoice_number}` : 'Cargando venta…'}
        description={sale ? `Emitida el ${new Date(sale.created_at).toLocaleString('es-CL')}` : ''}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {loading || !data || !sale ? (
          <div className="py-12 text-center">
            <Loader2 className="mx-auto size-6 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Obteniendo detalle de la venta…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumen Cabecera */}
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl border border-border/80 bg-secondary/30 text-xs">
              <div>
                <span className="text-muted-foreground">Cajero:</span>
                <strong className="ml-1 text-foreground">{sale.cashier_name || '—'}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Medio de Pago:</span>
                <strong className="ml-1 text-foreground uppercase">
                  {PAYMENT_CONFIG[sale.payment_method]?.label || sale.payment_method}
                </strong>
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <strong className="ml-1 text-foreground">
                  {sale.customer_name || 'Público General'}
                </strong>
              </div>
              {sale.customer_rut && (
                <div>
                  <span className="text-muted-foreground">RUT:</span>
                  <span className="ml-1 font-mono text-foreground">{sale.customer_rut}</span>
                </div>
              )}
            </div>

            {/* Lista de Productos */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ShoppingBag className="size-3.5" />
                <span>Productos Vendidos ({items.length})</span>
              </div>
              <div className="rounded-xl border border-border/80 overflow-hidden divide-y divide-border/50 text-xs bg-card">
                {items.map((it, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-secondary/20">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-foreground truncate">{it.product_name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {it.quantity} x {money(it.unit_price)}
                        {it.discount_amount > 0 && (
                          <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                            (Desc. -{money(it.discount_amount)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-foreground text-right shrink-0">
                      {money(it.subtotal - (it.discount_amount || 0))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales Fiscales */}
            <div className="rounded-xl border border-border/80 p-3 space-y-1.5 bg-secondary/20 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal Neto:</span>
                <span>{money(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IVA (19%):</span>
                <span>{money(data.iva)}</span>
              </div>
              {data.discount_total > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Descuentos Totales:</span>
                  <span>-{money(data.discount_total)}</span>
                </div>
              )}
              {data.rounding_adjustment !== 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Ajuste Ley Redondeo:</span>
                  <span>{money(data.rounding_adjustment)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t border-border/60">
                <span>TOTAL PAGADO:</span>
                <span className="text-base text-emerald-600 dark:text-emerald-400">
                  {money(sale.total_amount)}
                </span>
              </div>
            </div>

            {/* Si fue fiado, opción WhatsApp */}
            {isCredit && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-200">
                  <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Reenviar Comprobante al WhatsApp</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="Ej: 912345678"
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    className="h-8 text-xs bg-card"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      openWhatsAppCreditReceipt(
                        {
                          customerName: sale.customer_name || 'Vecino',
                          phone: whatsappPhone,
                          invoiceNumber: sale.invoice_number,
                          date: new Date(sale.created_at).toLocaleString('es-CL'),
                          totalAmount: sale.total_amount,
                          items: items.map((it) => ({
                            product_name: it.product_name,
                            quantity: it.quantity,
                            unit_price: it.unit_price,
                            subtotal: it.subtotal,
                            discount_amount: it.discount_amount,
                          })),
                        },
                        whatsappPhone,
                      );
                    }}
                    className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-medium"
                  >
                    Enviar
                  </Button>
                </div>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="flex items-center justify-between pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
              >
                <Printer className="size-3.5" />
                Reimprimir Ticket
              </Button>

              <Button type="button" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>

            {/* Ticket Térmico Oculto en Pantalla, Activo para window.print() */}
            <div id="thermal-receipt" className="hidden print:block font-mono text-[11px] leading-tight text-black">
              <div className="text-center pb-2 mb-2 border-b border-dashed border-black">
                <div className="text-xs font-bold tracking-wider uppercase">AARON PROVISIONES</div>
                <div className="text-[10px]">RUT: 76.123.456-7</div>
                <div className="text-[10px]">GIRO: ALMACÉN Y PROVISIONES</div>
                <div className="text-[10px]">DIRECCIÓN: AV. PRINCIPAL #1234</div>
                <div className="text-[10px] mt-1 font-bold">
                  BOLETA ELECTRÓNICA N° #{sale.invoice_number}
                </div>
                <div className="text-[9px]">FECHA: {new Date(sale.created_at).toLocaleString('es-CL')}</div>
                <div className="text-[9px]">CAJERO: {sale.cashier_name || 'Aaron'}</div>
              </div>

              <div className="space-y-1 mb-2">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[10px]">
                    <div className="truncate pr-1">
                      {it.quantity} x {it.product_name}
                    </div>
                    <div className="font-bold text-right shrink-0">
                      {money(it.subtotal - (it.discount_amount || 0))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-black space-y-0.5 text-[10px]">
                <div className="flex justify-between">
                  <span>Neto:</span>
                  <span>{money(data.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>IVA (19%):</span>
                  <span>{money(data.iva)}</span>
                </div>
                {data.discount_total > 0 && (
                  <div className="flex justify-between">
                    <span>Descuentos:</span>
                    <span>-{money(data.discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-black">
                  <span>TOTAL A PAGAR:</span>
                  <span>{money(sale.total_amount)}</span>
                </div>
                <div className="flex justify-between text-[9px] pt-1">
                  <span>FORMA DE PAGO:</span>
                  <span className="uppercase">{PAYMENT_CONFIG[sale.payment_method]?.label || sale.payment_method}</span>
                </div>
              </div>

              <div className="text-center pt-3 mt-2 border-t border-dashed border-black text-[9px]">
                <div>¡GRACIAS POR SU COMPRA!</div>
                <div>AARON PROVISIONES SIEMPRE CONTIGO</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
