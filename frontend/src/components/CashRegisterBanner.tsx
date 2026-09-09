import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Wallet, Lock, TrendingDown, Calculator, Banknote, Coins, ArrowDownRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Input, Label } from '@/components/ui/Input';
import { closeRegister, createExpense, getCurrentRegister, openRegister } from '@/lib/cashRegister';
import type { CashRegisterState } from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export function CashRegisterBanner({ refreshKey }: { refreshKey: number }) {
  const [register, setRegister] = useState<CashRegisterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);

  function refresh() {
    setLoading(true);
    getCurrentRegister()
      .then((res) => setRegister(res.success ? (res.data ?? null) : null))
      .catch(() => setRegister(null))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, [refreshKey]);

  if (loading) {
    return <div className="mb-6 h-16 animate-pulse rounded-2xl border border-border/80 bg-card" />;
  }

  return (
    <div className="mb-6">
      {register ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative flex size-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-3 rounded-full bg-emerald-500"></span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-950 dark:text-emerald-200">Caja Operativa</span>
                <span className="rounded-md bg-emerald-200/70 dark:bg-emerald-900/60 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800 dark:text-emerald-300">
                  En Turno
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground font-medium">
                <span>Apertura: <strong className="font-mono text-foreground">{money(register.opening_amount)}</strong></span>
                <span>•</span>
                <span>Ventas efectivo: <strong className="font-mono text-foreground">{money(register.cash_sales)}</strong></span>
                {register.cash_expenses != null && register.cash_expenses > 0 && (
                  <>
                    <span>•</span>
                    <span>Gastos/Retiros: <strong className="font-mono text-rose-600 dark:text-rose-400 font-bold">-{money(register.cash_expenses)}</strong></span>
                  </>
                )}
                <span>•</span>
                <span>En caja: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{money(register.current_amount)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpenseModal(true)}
              className="border-rose-200/70 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              title="Registrar salida o gasto de caja chica"
            >
              <TrendingDown className="size-3.5 mr-1" />
              Gasto / Retiro
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseModal(true)}
              className="border-emerald-300/60 dark:border-emerald-800/60 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40"
            >
              <Lock className="size-3.5 mr-1" />
              Cuadrar y Cerrar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              <Wallet className="size-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-950 dark:text-amber-200">Sin caja abierta</div>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                Puedes registrar ventas normalmente, pero abre caja para controlar el efectivo al finalizar el turno.
              </p>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpenModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white shadow-xs">
            Abrir Caja Ahora
          </Button>
        </div>
      )}

      <OpenRegisterModal open={openModal} onOpenChange={setOpenModal} onOpened={refresh} />
      <ExpenseModal open={expenseModal} onOpenChange={setExpenseModal} onCreated={refresh} />
      {register && (
        <CloseRegisterModal
          open={closeModal}
          onOpenChange={setCloseModal}
          register={register}
          onClosed={refresh}
        />
      )}
    </div>
  );
}

function OpenRegisterModal({
  open,
  onOpenChange,
  onOpened,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (Number.isNaN(value) || value < 0) {
      setError('Ingresa un monto válido');
      return;
    }
    setSaving(true);
    try {
      const res = await openRegister(value);
      if (!res.success) {
        setError(res.message || 'No se pudo abrir la caja');
        return;
      }
      onOpened();
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Abrir caja" description="Cuenta el efectivo físico antes de empezar el turno.">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="opening_amount">Monto inicial en caja</Label>
            <Input
              id="opening_amount"
              type="number"
              min="0"
              step="1"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Abriendo…' : 'Abrir caja'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ExpenseModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Proveedores');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount('');
      setCategory('Proveedores');
      setDescription('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError('Ingresa un monto válido mayor a cero');
      return;
    }
    if (!description.trim()) {
      setError('Debes ingresar el motivo o descripción del gasto');
      return;
    }

    setSaving(true);
    try {
      const res = await createExpense(value, category, description.trim());
      if (!res.success) {
        setError(res.message || 'No se pudo registrar el gasto');
        return;
      }
      onCreated();
      onOpenChange(false);
    } catch {
      setError('Error al comunicar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Registrar Gasto o Retiro de Caja" description="Salida de efectivo justificada de la caja activa.">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="expense_amount">Monto del retiro ($)</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
              <Input
                id="expense_amount"
                type="number"
                min="10"
                step="10"
                autoFocus
                placeholder="5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 font-mono font-bold text-base"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="expense_category">Categoría</Label>
            <div className="mt-1">
              <select
                id="expense_category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:border-primary outline-none"
              >
                <option value="Proveedores">Pago Proveedores (Pan, cecinas, lácteos, etc.)</option>
                <option value="Fletes">Flete / Transporte mercadería</option>
                <option value="Insumos">Insumos y Aseo (Bolsas, papel térmico, etc.)</option>
                <option value="Retiro">Retiro del Dueño / Remesa caja fuerte</option>
                <option value="Personal">Adelanto / Pago a personal</option>
                <option value="Varios">Varios / Otros gastos menores</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="expense_desc">Motivo / Detalle del Gasto</Label>
            <Input
              id="expense_desc"
              type="text"
              placeholder="Ej: Pago repartidor de pan Marraqueta 10kg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
              <ArrowDownRight className="size-4 mr-1" />
              {saving ? 'Registrando…' : 'Registrar Salida de Dinero'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const BILLS = [20000, 10000, 5000, 2000, 1000];
const COINS = [500, 100, 50, 10];

function CloseRegisterModal({
  open,
  onOpenChange,
  register,
  onClosed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register: CashRegisterState;
  onClosed: () => void;
}) {
  const [mode, setMode] = useState<'quick' | 'audit'>('quick');
  const [amount, setAmount] = useState('');
  const [denominations, setDenominations] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ difference: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMode('quick');
      setAmount('');
      setDenominations({});
      setError(null);
      setResult(null);
    }
  }, [open]);

  function handleCountChange(denom: number, countStr: string) {
    const newDenoms = { ...denominations, [denom]: countStr };
    setDenominations(newDenoms);

    let sum = 0;
    for (const [d, c] of Object.entries(newDenoms)) {
      const count = parseInt(c, 10);
      if (!Number.isNaN(count) && count > 0) {
        sum += Number(d) * count;
      }
    }
    setAmount(sum > 0 ? String(sum) : '');
  }

  const currentNumericAmount = Number(amount) || 0;
  const liveDiff = currentNumericAmount - register.current_amount;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = Number(amount);
    if (Number.isNaN(value) || value < 0) {
      setError('Ingresa un monto válido');
      return;
    }
    setSaving(true);
    try {
      const res = await closeRegister(value);
      if (!res.success || !res.data) {
        setError(res.message || 'No se pudo cerrar la caja');
        return;
      }
      setResult({ difference: res.data.difference });
      onClosed();
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Cuadratura y Cierre de Caja"
        description={`Monto esperado en efectivo: ${money(register.current_amount)}`}
        className="max-w-md max-h-[90vh] overflow-y-auto"
      >
        {result ? (
          <div className="space-y-4 py-2">
            <div className={`p-4 rounded-xl border ${
              result.difference === 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                : result.difference > 0
                  ? 'bg-sky-50 border-sky-200 text-sky-900 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-200'
                  : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
            }`}>
              <div className="flex items-center gap-2 font-bold text-base">
                <CheckCircle2 className="size-5" />
                <span>Caja Cerrada con Éxito</span>
              </div>
              <p className="mt-2 text-sm font-medium">
                {result.difference === 0
                  ? '¡Excelente! La caja cuadró exactamente sin diferencias.'
                  : result.difference > 0
                    ? `Hay un sobrante en caja de ${money(result.difference)} respecto a lo esperado.`
                    : `Hay un faltante en caja de ${money(Math.abs(result.difference))} respecto a lo esperado.`}
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Entendido</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tabs selector */}
            <div className="flex rounded-xl bg-secondary/60 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMode('quick')}
                className={`flex-1 rounded-lg py-1.5 transition-all ${
                  mode === 'quick' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monto Directo
              </button>
              <button
                type="button"
                onClick={() => setMode('audit')}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                  mode === 'audit' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calculator className="size-3.5" />
                <span>Arqueo Billetes / Monedas</span>
              </button>
            </div>

            {mode === 'quick' ? (
              <div>
                <Label htmlFor="closing_amount">Total Efectivo Físico Contado ($)</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">$</span>
                  <Input
                    id="closing_amount"
                    type="number"
                    min="0"
                    step="1"
                    autoFocus
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Monto total contado en la gaveta"
                    className="pl-7 font-mono text-base font-bold"
                    required
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/20 p-3">
                {/* Billetes */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Banknote className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Billetes Chilenos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {BILLS.map((denom) => (
                      <div key={denom} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 text-xs">
                        <span className="w-16 font-mono font-bold text-foreground">
                          ${denom >= 1000 ? `${denom / 1000}k` : denom}
                        </span>
                        <span className="text-muted-foreground">×</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={denominations[denom] || ''}
                          onChange={(e) => handleCountChange(denom, e.target.value)}
                          className="w-full rounded border border-input bg-background/50 px-2 py-1 text-right font-mono text-xs font-bold outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monedas */}
                <div className="pt-2 border-t border-border/60">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Coins className="size-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Monedas Chilenas</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {COINS.map((denom) => (
                      <div key={denom} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2 text-xs">
                        <span className="w-16 font-mono font-bold text-foreground">${denom}</span>
                        <span className="text-muted-foreground">×</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={denominations[denom] || ''}
                          onChange={(e) => handleCountChange(denom, e.target.value)}
                          className="w-full rounded border border-input bg-background/50 px-2 py-1 text-right font-mono text-xs font-bold outline-none focus:border-primary"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Cuadro de Comparación en Vivo */}
            {amount !== '' && (
              <div className="rounded-xl border border-border/70 bg-card p-3 space-y-1.5 text-xs shadow-2xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Esperado en caja:</span>
                  <span className="font-mono font-bold text-foreground">{money(register.current_amount)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Físico ingresado:</span>
                  <span className="font-mono font-bold text-foreground">{money(currentNumericAmount)}</span>
                </div>
                <div className={`flex justify-between pt-1 border-t border-border/60 font-bold ${
                  liveDiff === 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : liveDiff > 0
                      ? 'text-sky-600 dark:text-sky-400'
                      : 'text-rose-600 dark:text-rose-400'
                }`}>
                  <span>Diferencia:</span>
                  <span className="font-mono">
                    {liveDiff === 0 ? 'Exacto ($0)' : liveDiff > 0 ? `+${money(liveDiff)} (Sobrante)` : `-${money(Math.abs(liveDiff))} (Faltante)`}
                  </span>
                </div>
              </div>
            )}

            {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !amount}>
                {saving ? 'Cerrando…' : 'Confirmar Cierre de Caja'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

