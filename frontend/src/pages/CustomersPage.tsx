import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Users,
  Search,
  Plus,
  DollarSign,
  Phone,
  CheckCircle2,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Edit2,
  Wallet,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Input';
import {
  createCustomer,
  getCustomerHistory,
  listCustomers,
  registerCustomerPayment,
  updateCustomer,
} from '@/lib/customers';
import {
  openWhatsAppCreditReceipt,
  openWhatsAppPaymentReceipt,
  openWhatsAppAccountStatus,
} from '@/lib/whatsapp';
import type { Customer } from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyWithDebt, setOnlyWithDebt] = useState(false);

  // Modales
  const [customerModal, setCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [paymentModal, setPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<Customer | null>(null);

  const [historyModal, setHistoryModal] = useState(false);
  const [selectedForHistory, setSelectedForHistory] = useState<Customer | null>(null);

  function fetchCustomers() {
    setLoading(true);
    listCustomers({ search: search.trim() || undefined, with_debt: onlyWithDebt })
      .then((res) => {
        if (res.success && res.data) {
          setCustomers(res.data.customers);
          setTotalDebt(res.data.total_debt);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const handle = setTimeout(fetchCustomers, 250);
    return () => clearTimeout(handle);
  }, [search, onlyWithDebt]);

  const debtCount = customers.filter((c) => c.current_balance > 0).length;

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Clientes y Libreta de Fiados
          </h1>
          <p className="text-sm text-muted-foreground">
            Control de cuentas corrientes, fiados a vecinos y abonos de clientes frecuentes.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCustomer(null);
            setCustomerModal(true);
          }}
          className="shadow-xs"
        >
          <Plus className="size-4 mr-1.5" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
              Total Deuda en la Calle
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-rose-700 dark:text-rose-300">
            {money(totalDebt)}
          </div>
          <p className="mt-1 text-xs text-rose-600/80 dark:text-rose-400/80">
            Monto pendiente de cobro en fiados
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Clientes con Saldo Deudor
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-amber-700 dark:text-amber-300">
            {debtCount}
          </div>
          <p className="mt-1 text-xs text-amber-600/80 dark:text-amber-400/80">
            Vecinos con compras pendientes de pago
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Total Clientes Registrados
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-2 font-mono text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {customers.length}
          </div>
          <p className="mt-1 text-xs text-emerald-600/80 dark:text-emerald-400/80">
            Clientes en la base de datos
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/80 bg-card p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
          <Input
            type="text"
            placeholder="Buscar por nombre, RUT o teléfono…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOnlyWithDebt(false)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              !onlyWithDebt
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary'
            }`}
          >
            Todos ({customers.length})
          </button>
          <button
            type="button"
            onClick={() => setOnlyWithDebt(true)}
            className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
              onlyWithDebt
                ? 'bg-rose-600 text-white shadow-xs'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary'
            }`}
          >
            Solo con Deuda ({debtCount})
          </button>
        </div>
      </div>

      {/* Tabla de Clientes */}
      <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="mx-auto size-8 animate-spin text-primary" />
            <p className="mt-2 text-xs text-muted-foreground">Cargando libreta de clientes…</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 text-center px-4">
            <Users className="mx-auto size-12 text-muted-foreground/40" />
            <h3 className="mt-3 font-display font-semibold text-foreground">No se encontraron clientes</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
              {search || onlyWithDebt
                ? 'Intenta cambiando los términos de búsqueda o filtros.'
                : 'Registra a tus vecinos y clientes frecuentes para habilitar las ventas al fiado.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold">Cliente</th>
                  <th className="px-4 py-3.5 font-semibold">Contacto</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Límite Crédito</th>
                  <th className="px-4 py-3.5 font-semibold text-right">Saldo Deudor</th>
                  <th className="px-5 py-3.5 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {customers.map((c) => {
                  const hasDebt = c.current_balance > 0;
                  const percentUsed = c.credit_limit > 0 ? Math.min(100, (c.current_balance / c.credit_limit) * 100) : 0;

                  return (
                    <tr key={c.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{c.name}</div>
                            {c.rut && <div className="text-xs font-mono text-muted-foreground">{c.rut}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {c.phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-foreground">
                            <Phone className="size-3 text-muted-foreground" />
                            <span>{c.phone}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">Sin teléfono</span>
                        )}
                        {c.address && <div className="truncate max-w-[180px] text-[11px] text-muted-foreground">{c.address}</div>}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono text-xs">
                        <span className="text-foreground">{money(c.credit_limit)}</span>
                        {hasDebt && (
                          <div className="w-20 ml-auto mt-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                percentUsed > 90 ? 'bg-rose-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percentUsed}%` }}
                            />
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right font-mono">
                        {hasDebt ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            {money(c.current_balance)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                            Al día ($0)
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasDebt && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedForPayment(c);
                                setPaymentModal(true);
                              }}
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 shadow-2xs"
                              title="Registrar abono de dinero"
                            >
                              <Wallet className="size-3.5 mr-1" />
                              Abonar
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedForHistory(c);
                              setHistoryModal(true);
                            }}
                            className="h-8 text-xs px-2.5"
                            title="Ver cartola / historial de compras y pagos"
                          >
                            <FileText className="size-3.5 mr-1" />
                            Cartola
                          </Button>

                          {hasDebt && (
                            <button
                              type="button"
                              onClick={() =>
                                openWhatsAppAccountStatus({
                                  customerName: c.name,
                                  phone: c.phone,
                                  currentBalance: c.current_balance,
                                  creditLimit: c.credit_limit,
                                })
                              }
                              className="rounded-lg p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              title="Enviar estado de cuenta / recordatorio por WhatsApp"
                            >
                              <MessageCircle className="size-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingCustomer(c);
                              setCustomerModal(true);
                            }}
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                            title="Editar datos del cliente"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
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

      {/* Modal Crear / Editar Cliente */}
      <CustomerFormModal
        open={customerModal}
        onOpenChange={setCustomerModal}
        customer={editingCustomer}
        onSaved={fetchCustomers}
      />

      {/* Modal Registrar Abono */}
      {selectedForPayment && (
        <PaymentModal
          open={paymentModal}
          onOpenChange={setPaymentModal}
          customer={selectedForPayment}
          onSaved={fetchCustomers}
        />
      )}

      {/* Modal Cartola / Historial */}
      {selectedForHistory && (
        <HistoryModal
          open={historyModal}
          onOpenChange={setHistoryModal}
          customer={selectedForHistory}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Sub-modales
// -------------------------------------------------------------

function CustomerFormModal({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [rut, setRut] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [creditLimit, setCreditLimit] = useState('50000');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (customer) {
        setName(customer.name);
        setRut(customer.rut || '');
        setPhone(customer.phone || '');
        setAddress(customer.address || '');
        setNotes(customer.notes || '');
        setCreditLimit(String(customer.credit_limit));
      } else {
        setName('');
        setRut('');
        setPhone('');
        setAddress('');
        setNotes('');
        setCreditLimit('50000');
      }
      setError(null);
    }
  }, [open, customer]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('El nombre del cliente es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (customer) {
        const res = await updateCustomer({
          id: customer.id,
          name: name.trim(),
          rut: rut.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          credit_limit: Number(creditLimit) || 0,
        });
        if (!res.success) {
          setError(res.message || 'Error al actualizar');
          return;
        }
      } else {
        const res = await createCustomer({
          name: name.trim(),
          rut: rut.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
          credit_limit: Number(creditLimit) || 0,
        });
        if (!res.success) {
          setError(res.message || 'Error al crear');
          return;
        }
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setError('Error al comunicar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={customer ? 'Editar Ficha de Cliente' : 'Nuevo Cliente / Libreta'}
        description="Datos personales y cupo de crédito para fiados en el almacén."
      >
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <Label htmlFor="cust_name">Nombre Completo *</Label>
            <Input
              id="cust_name"
              type="text"
              placeholder="Ej: Don Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cust_rut">RUT (Opcional)</Label>
              <Input
                id="cust_rut"
                type="text"
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="mt-1 font-mono text-xs"
              />
            </div>
            <div>
              <Label htmlFor="cust_phone">Teléfono / WhatsApp</Label>
              <Input
                id="cust_phone"
                type="tel"
                placeholder="+56 9 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cust_address">Dirección / Pasaje</Label>
            <Input
              id="cust_address"
              type="text"
              placeholder="Ej: Pasaje Los Alerces #120"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label htmlFor="cust_limit">Límite de Crédito / Cupo Máximo ($)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
              <Input
                id="cust_limit"
                type="number"
                min="0"
                step="1000"
                placeholder="50000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="pl-7 font-mono font-bold text-sm"
              />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Tope máximo que puede acumular fiado en el mostrador.
            </p>
          </div>

          <div>
            <Label htmlFor="cust_notes">Observaciones / Referencia</Label>
            <Input
              id="cust_notes"
              type="text"
              placeholder="Ej: Vecino de la esquina casa amarilla"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-xs"
            />
          </div>

          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : customer ? 'Actualizar Ficha' : 'Crear Cliente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PaymentModal({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paidReceipt, setPaidReceipt] = useState<{
    amount: number;
    paymentMethod: 'cash' | 'transfer';
    notes?: string;
    newBalance: number;
  } | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(String(customer.current_balance));
      setPaymentMethod('cash');
      setNotes('');
      setError(null);
      setPaidReceipt(null);
      setWhatsappPhone(customer.phone || '');
    }
  }, [open, customer]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    setSaving(true);
    try {
      const res = await registerCustomerPayment({
        customer_id: customer.id,
        amount: value,
        payment_method: paymentMethod,
        notes: notes.trim() || undefined,
      });
      if (!res.success || !res.data) {
        setError(res.message || 'Error al registrar abono');
        return;
      }
      setPaidReceipt({
        amount: value,
        paymentMethod,
        notes: notes.trim() || undefined,
        newBalance: res.data.new_balance,
      });
      onSaved();
    } catch {
      setError('Error al conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={paidReceipt ? 'Comprobante de Abono' : `Abonar a la Cuenta de ${customer.name}`}
        description={paidReceipt ? 'Abono registrado con éxito' : `Deuda pendiente actual: ${money(customer.current_balance)}`}
      >
        {paidReceipt ? (
          <div className="space-y-4 py-1">
            <div className="flex flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>
              <h3 className="mt-3 text-base font-bold text-foreground">¡Abono registrado con éxito!</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Se abonaron <strong className="text-foreground">{money(paidReceipt.amount)}</strong> vía{' '}
                {paidReceipt.paymentMethod === 'cash' ? 'efectivo' : 'transferencia'}.
              </p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-secondary/50 px-4 py-2 text-xs">
                <span className="text-muted-foreground">Nuevo saldo pendiente:</span>
                <strong className="font-mono text-sm text-foreground">{money(paidReceipt.newBalance)}</strong>
              </div>
            </div>

            {/* Caja de Envío por WhatsApp */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                <span>Enviar comprobante al WhatsApp del cliente</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Envía al vecino el resumen de su pago y su nuevo saldo adeudado para que ambos tengan respaldo.
              </p>
              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="Ej: 912345678"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="h-9 text-xs bg-card"
                />
                <Button
                  type="button"
                  onClick={() => {
                    openWhatsAppPaymentReceipt(
                      {
                        customerName: customer.name,
                        phone: whatsappPhone,
                        amount: paidReceipt.amount,
                        paymentMethod: paidReceipt.paymentMethod,
                        newBalance: paidReceipt.newBalance,
                        notes: paidReceipt.notes,
                      },
                      whatsappPhone,
                    );
                  }}
                  className="h-9 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 font-semibold shadow-xs"
                >
                  <MessageCircle className="size-3.5 mr-1" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>

            <div className="pt-2 border-t border-border/60">
              <Button type="button" onClick={() => onOpenChange(false)} className="w-full">
                Listo / Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 p-3 text-xs">
              <div className="flex justify-between font-medium text-rose-900 dark:text-rose-200">
                <span>Saldo adeudado total:</span>
                <span className="font-mono font-bold text-sm">{money(customer.current_balance)}</span>
              </div>
            </div>

            <div>
              <Label htmlFor="pay_amount">Monto del Abono o Pago ($)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                <Input
                  id="pay_amount"
                  type="number"
                  min="10"
                  step="10"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7 font-mono font-bold text-base"
                  required
                />
              </div>
              {customer.current_balance > 0 && (
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setAmount(String(customer.current_balance))}
                    className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
                  >
                    Pagar Total ({money(customer.current_balance)})
                  </button>
                  {customer.current_balance > 5000 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.round(customer.current_balance / 2)))}
                      className="rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-secondary"
                    >
                      Abonar 50%
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="pay_method">Medio de Pago</Label>
              <select
                id="pay_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary outline-none"
              >
                <option value="cash">Efectivo (Ingresa a la caja del día)</option>
                <option value="transfer">Transferencia Bancaria</option>
              </select>
            </div>

            <div>
              <Label htmlFor="pay_notes">Nota o Comentario (Opcional)</Label>
              <Input
                id="pay_notes"
                type="text"
                placeholder="Ej: Dejó pagada la compra de ayer"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {saving ? 'Registrando…' : 'Confirmar Abono'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HistoryModal({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getCustomerHistory(customer.id)
        .then((res) => setHistory(res.success && res.data ? res.data : []))
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [open, customer]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={`Cartola de ${customer.name}`}
        description={`Saldo actual pendiente: ${money(customer.current_balance)}`}
        className="max-w-lg max-h-[85vh] overflow-y-auto"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-secondary/30 text-xs">
            <div className="space-y-1">
              <div>
                <span className="text-muted-foreground">Límite asignado:</span>
                <strong className="ml-1 text-foreground font-mono">{money(customer.credit_limit)}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo deudor:</span>
                <strong className="ml-1 text-rose-600 dark:text-rose-400 font-mono text-sm font-extrabold">
                  {money(customer.current_balance)}
                </strong>
              </div>
            </div>

            {customer.current_balance > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  openWhatsAppAccountStatus({
                    customerName: customer.name,
                    phone: customer.phone,
                    currentBalance: customer.current_balance,
                    creditLimit: customer.credit_limit,
                  })
                }
                className="h-8 gap-1.5 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shrink-0"
              >
                <MessageCircle className="size-3.5 text-emerald-600" />
                Estado por WhatsApp
              </Button>
            )}
          </div>

          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto size-6 animate-spin text-primary" />
              <p className="mt-2 text-xs text-muted-foreground">Cargando movimientos…</p>
            </div>
          ) : history.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Sin movimientos registrados aún para este cliente.
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Movimientos Recientes (Fiados y Abonos)
              </h4>
              <div className="divide-y divide-border/60 rounded-xl border border-border/80 overflow-hidden bg-card text-xs">
                {history.map((m, idx) => {
                  const isSale = m.type === 'sale';
                  return (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                            isSale
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}
                        >
                          {isSale ? <ArrowUpRight className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {isSale ? `Compra Fiada Boleta #${m.invoice_number}` : `Abono (${m.payment_method === 'cash' ? 'Efectivo' : 'Transf.'})`}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                            <Clock className="size-3 shrink-0" />
                            <span>{new Date(m.created_at).toLocaleString('es-CL')}</span>
                            {m.notes && <span>• {m.notes}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right font-mono">
                          <div className={`font-bold text-sm ${isSale ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {isSale ? `+${money(m.total_amount)}` : `-${money(m.amount)}`}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">{isSale ? 'Deuda' : 'Pago'}</div>
                        </div>

                        {/* Botón WhatsApp individual */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isSale) {
                              openWhatsAppCreditReceipt({
                                customerName: customer.name,
                                phone: customer.phone,
                                invoiceNumber: m.invoice_number,
                                date: new Date(m.created_at).toLocaleString('es-CL'),
                                totalAmount: Number(m.total_amount),
                                items: [
                                  {
                                    product_name: `Compra registrada (#${m.invoice_number})`,
                                    quantity: 1,
                                    unit_price: Number(m.total_amount),
                                    subtotal: Number(m.total_amount),
                                  },
                                ],
                                currentBalance: customer.current_balance,
                                creditLimit: customer.credit_limit,
                              });
                            } else {
                              openWhatsAppPaymentReceipt({
                                customerName: customer.name,
                                phone: customer.phone,
                                amount: Number(m.amount),
                                paymentMethod: m.payment_method,
                                newBalance: customer.current_balance,
                                notes: m.notes,
                              });
                            }
                          }}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-colors"
                          title="Enviar o reenviar comprobante por WhatsApp"
                        >
                          <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border/60">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
