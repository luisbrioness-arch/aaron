import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Pencil, Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { createSupplier, deactivateSupplier, listSuppliers, updateSupplier } from '@/lib/suppliers';
import type { Supplier } from '@/types';
import type { SupplierInput } from '@/lib/suppliers';

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  function refresh() {
    setLoading(true);
    listSuppliers()
      .then((res) => {
        if (res.success && res.data) setSuppliers(res.data);
        else setError(res.message || 'No se pudieron cargar los proveedores');
      })
      .catch(() => setError('No se pudo conectar con el servidor'))
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleDeactivate(s: Supplier) {
    if (!confirm(`¿Desactivar "${s.name}"?`)) return;
    const res = await deactivateSupplier(s.id);
    if (res.success) {
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
    } else {
      alert(res.message || 'No se pudo desactivar');
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-muted-foreground">Alta, edición y baja de proveedores.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" />
          Nuevo proveedor
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Nombre</th>
              <th className="px-4 py-2.5 font-medium">RUT</th>
              <th className="px-4 py-2.5 font-medium">Teléfono</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
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
            {!loading && suppliers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Sin proveedores todavía.
                </td>
              </tr>
            )}
            {!loading &&
              suppliers.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{s.name}</td>
                  <td className="px-4 py-2.5 font-mono text-muted-foreground">{s.rut}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.phone || '—'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.email || '—'}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(s);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeactivate(s)}>
                        <Ban className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <SupplierFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        supplier={editing}
        onSaved={(saved) => {
          setSuppliers((prev) => {
            const exists = prev.some((s) => s.id === saved.id);
            return exists ? prev.map((s) => (s.id === saved.id ? saved : s)) : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name));
          });
        }}
      />
    </div>
  );
}

function SupplierFormModal({
  open,
  onOpenChange,
  supplier,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
  onSaved: (supplier: Supplier) => void;
}) {
  const isEditing = Boolean(supplier);
  const [form, setForm] = useState<SupplierInput>({ name: '', rut: '', phone: '', email: '', address: '', contact_person: '' });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (supplier) {
      setForm({
        name: supplier.name,
        rut: supplier.rut ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: '',
        contact_person: '',
      });
    } else {
      setForm({ name: '', rut: '', phone: '', email: '', address: '', contact_person: '' });
    }
  }, [open, supplier]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.rut.trim()) {
      setError('Nombre y RUT son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const res = await updateSupplier(supplier!.id, form);
        if (!res.success) {
          setError(res.message || 'No se pudo actualizar el proveedor');
          return;
        }
        onSaved({ ...supplier!, ...form });
      } else {
        const res = await createSupplier(form);
        if (!res.success || !res.data) {
          setError(res.message || 'No se pudo crear el proveedor');
          return;
        }
        onSaved(res.data);
      }
      onOpenChange(false);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEditing ? 'Editar proveedor' : 'Nuevo proveedor'}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="sup_name">Nombre</Label>
            <Input id="sup_name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <Label htmlFor="sup_rut">RUT</Label>
            <Input id="sup_rut" value={form.rut} onChange={(e) => setForm((f) => ({ ...f, rut: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sup_phone">Teléfono</Label>
              <Input id="sup_phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="sup_email">Email</Label>
              <Input id="sup_email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
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
