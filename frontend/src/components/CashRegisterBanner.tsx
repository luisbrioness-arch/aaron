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
    return <div className="mb-4 h-14 animate-pulse rounded-lg border border-border bg-card" />;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
      {register ? (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="size-4 text-accent" />
            <span className="font-medium">Caja abierta</span>
            <span className="text-muted-foreground">
              · apertura {money(register.opening_amount)} · ventas efectivo {money(register.cash_sales)} ·{' '}
              <span className="font-mono font-semibold text-foreground">{money(register.current_amount)}</span> en
              caja
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setCloseModal(true)}>
            <Lock className="size-3.5" />
            Cerrar caja
          </Button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="size-4" />
            Sin caja abierta — igual puedes vender, pero no vas a poder cuadrar el efectivo al final del turno.
          </div>
          <Button size="sm" onClick={() => setOpenModal(true)}>
            Abrir caja
          </Button>
        </>
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
