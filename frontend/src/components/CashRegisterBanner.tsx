import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Wallet, Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Input, Label } from '@/components/ui/Input';
import { closeRegister, getCurrentRegister, openRegister } from '@/lib/cashRegister';
import type { CashRegisterState } from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export function CashRegisterBanner({ refreshKey }: { refreshKey: number }) {
  const [register, setRegister] = useState<CashRegisterState | null>(null);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);

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
                <span>•</span>
                <span>En caja: <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{money(register.current_amount)}</strong></span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCloseModal(true)} className="border-emerald-300/60 dark:border-emerald-800/60 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40">
            <Lock className="size-3.5 mr-1" />
            Cuadrar y Cerrar
          </Button>
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
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ difference: number } | null>(null);

  useEffect(() => {
    if (open) {
      setAmount('');
      setError(null);
      setResult(null);
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
      <DialogContent title="Cerrar caja" description={`Esperado en caja: ${money(register.current_amount)}`}>
        {result ? (
          <div className="space-y-3">
            <p className={`text-sm font-medium ${result.difference === 0 ? 'text-accent' : 'text-warning'}`}>
              {result.difference === 0
                ? 'La caja cuadró exacto.'
                : result.difference > 0
                  ? `Sobran ${money(result.difference)} respecto a lo esperado.`
                  : `Faltan ${money(Math.abs(result.difference))} respecto a lo esperado.`}
            </p>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="closing_amount">Efectivo contado físicamente</Label>
              <Input
                id="closing_amount"
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
                {saving ? 'Cerrando…' : 'Cerrar caja'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
