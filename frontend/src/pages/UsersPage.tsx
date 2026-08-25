import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, KeyRound, Ban, CheckCircle2, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { useAuthStore } from '@/store/authStore';
import {
  activateUser,
  createUser,
  deactivateUser,
  getWorkdays,
  listUsers,
  resetPassword,
  updateUser,
} from '@/lib/users';
import type { UserListItem, UserRole, WorkdayRow } from '@/types';

const ROLE_LABELS: Record<UserRole, string> = { admin: 'Administrador', cashier: 'Cajero', warehouse_staff: 'Bodega' };
const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export function UsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [resettingUser, setResettingUser] = useState<UserListItem | null>(null);
  const [workdaysUser, setWorkdaysUser] = useState<UserListItem | null>(null);

  function refresh() {
    setLoading(true);
    listUsers()
      .then((res) => {
        if (res.success && res.data) setUsers(res.data);
        else setError(res.message || 'No se pudieron cargar los usuarios');
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleToggleActive(u: UserListItem) {
    const action = u.is_active ? deactivateUser : activateUser;
    const res = await action(u.id);
    if (res.success) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_active: !x.is_active } : x)));
    } else {
      alert(res.message || 'No se pudo cambiar el estado');
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Cajeros, bodega y administradores.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nuevo usuario
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Usuario</th>
              <th className="px-4 py-2.5 font-medium">Rol</th>
              <th className="px-4 py-2.5 font-medium">Días trabajados</th>
              <th className="px-4 py-2.5 font-medium">Estado</th>
              <th className="px-4 py-2.5 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.username} · {u.email}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{ROLE_LABELS[u.role]}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setWorkdaysUser(u)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <CalendarDays className="size-3.5" />
                      {u.days_worked} {u.last_worked_on ? `· última: ${u.last_worked_on}` : ''}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={u.is_active ? 'ok' : 'neutral'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => {
                          setEditing(u);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Resetear contraseña" onClick={() => setResettingUser(u)}>
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={u.is_active ? 'Desactivar' : 'Activar'}
                        disabled={u.id === currentUserId}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.is_active ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <UserFormModal open={formOpen} onOpenChange={setFormOpen} user={editing} onSaved={refresh} />
      <ResetPasswordModal user={resettingUser} onOpenChange={(open) => !open && setResettingUser(null)} />
      <WorkdaysModal user={workdaysUser} onOpenChange={(open) => !open && setWorkdaysUser(null)} />
    </div>
  );
}

function UserFormModal({
  open,
  onOpenChange,
  user,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserListItem | null;
  onSaved: () => void;
}) {
  const isEditing = Boolean(user);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPassword('');
    if (user) {
      setUsername(user.username);
      setFullName(user.full_name);
      setEmail(user.email);
      setRole(user.role);
    } else {
      setUsername('');
      setFullName('');
      setEmail('');
      setRole('cashier');
    }
  }, [open, user]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const res = await updateUser(user!.id, { full_name: fullName.trim(), email: email.trim(), role });
        if (!res.success) {
          setError(res.message || 'No se pudo actualizar el usuario');
          return;
        }
      } else {
        if (!username.trim() || password.length < 6) {
          setError('Usuario y una contraseña de al menos 6 caracteres son obligatorios');
          return;
        }
        const res = await createUser({ username: username.trim(), email: email.trim(), full_name: fullName.trim(), role, password });
        if (!res.success) {
          setError(res.message || 'No se pudo crear el usuario');
          return;
        }
      }
      onSaved();
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEditing ? 'Editar usuario' : 'Nuevo usuario'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="user_username">Usuario</Label>
            <Input id="user_username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={isEditing} required />
          </div>
          <div>
            <Label htmlFor="user_fullname">Nombre completo</Label>
            <Input id="user_fullname" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="user_email">Email</Label>
            <Input id="user_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="user_role">Rol</Label>
            <Select id="user_role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="cashier">Cajero</option>
              <option value="warehouse_staff">Bodega</option>
              <option value="admin">Administrador</option>
            </Select>
          </div>
          {!isEditing && (
            <div>
              <Label htmlFor="user_password">Contraseña</Label>
              <Input id="user_password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordModal({
  user,
  onOpenChange,
}: {
  user: UserListItem | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setPassword('');
    setError(null);
    setDone(false);
  }, [user]);

  if (!user) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      const res = await resetPassword(user!.id, password);
      if (!res.success) {
        setError(res.message || 'No se pudo resetear la contraseña');
        return;
      }
      setDone(true);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent title={`Resetear contraseña — ${user.full_name}`}>
        {done ? (
          <div className="space-y-3">
            <p className="text-sm text-accent">Contraseña actualizada.</p>
            <div className="flex justify-end">
              <Button onClick={() => onOpenChange(false)}>Listo</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="new_password">Contraseña nueva</Label>
              <Input id="new_password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Resetear'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function WorkdaysModal({ user, onOpenChange }: { user: UserListItem | null; onOpenChange: (open: boolean) => void }) {
  const [days, setDays] = useState<WorkdayRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getWorkdays(user.id)
      .then((res) => setDays(res.success && res.data ? res.data.days : []))
      .catch(() => setDays([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  return (
    <Dialog open={Boolean(user)} onOpenChange={onOpenChange}>
      <DialogContent title={`Días trabajados — ${user.full_name}`} className="max-w-xl">
        {loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {!loading && days.length === 0 && <p className="text-sm text-muted-foreground">Sin actividad registrada.</p>}
        {!loading && days.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Fecha</th>
                  <th className="py-1.5 pr-3 font-medium">Ventas</th>
                  <th className="py-1.5 pr-3 font-medium">Total</th>
                  <th className="py-1.5 font-medium">Cajas abiertas</th>
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.work_date} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-3">{d.work_date}</td>
                    <td className="py-1.5 pr-3 font-mono">{d.sales_count}</td>
                    <td className="py-1.5 pr-3 font-mono">{money(d.sales_total)}</td>
                    <td className="py-1.5 font-mono">{d.registers_opened}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
