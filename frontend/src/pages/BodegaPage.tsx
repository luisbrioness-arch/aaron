import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, PackagePlus, Ban } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { ProductFormModal } from '@/components/ProductFormModal';
import { StockAdjustModal } from '@/components/StockAdjustModal';
import { useAuthStore } from '@/store/authStore';
import { deactivateProduct, listCategories, listProducts } from '@/lib/products';
import type { Category, Product } from '@/types';

const UNIT_LABELS: Record<Product['unit_of_measure'], string> = {
  units: 'un.',
  kilos: 'kg',
  liters: 'L',
};

export function BodegaPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canManage = role === 'admin' || role === 'warehouse_staff';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  useEffect(() => {
    listCategories()
      .then((res) => {
        if (res.success && res.data) setCategories(res.data);
      })
      .catch(() => {
        // Silencioso a propósito: el filtro de categoría es una mejora,
        // no algo bloqueante — el error real de conexión ya se muestra
        // cuando falla la carga de productos, más abajo.
      });
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      listProducts({ page, q: q || undefined, category: categoryId || undefined })
        .then((res) => {
          if (!res.success || !res.data) {
            setError(res.message || 'No se pudieron cargar los productos');
            return;
          }
          setProducts(res.data.products);
          setTotalPages(res.data.total_pages || 1);
        })
        .catch(() => setError('No se pudo conectar con el servidor'))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [q, categoryId, page]);

  const hasResults = useMemo(() => products.length > 0, [products]);

  function openCreate() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleSaved(saved: Product) {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === saved.id);
      return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
    });
  }

  function handleAdjusted(productId: string, newStock: number) {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, stock_current: newStock, is_low_stock: newStock <= p.stock_critical }
          : p,
      ),
    );
  }

  async function handleDeactivate(product: Product) {
    if (!confirm(`¿Desactivar "${product.name}"? No aparecerá más en el POS ni en Bodega.`)) return;
    const res = await deactivateProduct(product.id);
    if (res.success) {
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
    } else {
      alert(res.message || 'No se pudo desactivar el producto');
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Bodega & Inventario</h1>
          <p className="text-sm text-muted-foreground font-medium">Catálogo completo de productos, precios y existencias</p>
        </div>
        {canManage && (
          <Button onClick={openCreate} className="shadow-sm shadow-emerald-500/20">
            <Plus className="size-4 mr-1" />
            Nuevo Producto
          </Button>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por nombre, código de barras o SKU…"
            className="pl-10 h-11 rounded-xl"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="w-64 h-11 rounded-xl"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mb-4 text-sm text-destructive font-medium">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-semibold">
              <th className="px-5 py-3.5">Producto</th>
              <th className="px-4 py-3.5">Categoría</th>
              <th className="px-4 py-3.5">Precio Venta</th>
              <th className="px-4 py-3.5">Stock Disponible</th>
              {canManage && <th className="px-4 py-3.5 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  Cargando catálogo…
                </td>
              </tr>
            )}
            {!loading && !hasResults && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No se encontraron productos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {!loading &&
              products.map((p) => (
                <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-foreground">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      SKU: {p.sku}
                      {p.barcode ? ` · Barras: ${p.barcode}` : ''}
                    </div>
                    <div className="mt-1 flex gap-1.5">
                      {p.is_scale_item && <Badge variant="neutral">Balanza / Granel</Badge>}
                      {p.has_expiration && <Badge variant="warning">Control Vencimiento</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-muted-foreground">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-foreground text-base">
                    ${p.selling_price.toLocaleString('es-CL')}
                    {p.unit_of_measure !== 'units' && (
                      <span className="text-xs font-normal text-muted-foreground">/{UNIT_LABELS[p.unit_of_measure]}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 font-mono">
                      <span className={`text-base font-bold ${p.is_low_stock ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                        {p.stock_current.toLocaleString('es-CL')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {UNIT_LABELS[p.unit_of_measure]}
                      </span>
                      {p.is_low_stock && <Badge variant="warning">Stock bajo</Badge>}
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdjustingProduct(p)}
                          title="Ajustar stock"
                          className="h-8 px-2 text-xs"
                        >
                          <PackagePlus className="size-3.5 mr-1" />
                          Stock
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(p)}
                          title="Editar producto"
                          className="h-8 px-2 text-xs"
                        >
                          <Pencil className="size-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeactivate(p)}
                          title="Desactivar producto"
                          className="size-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Ban className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>


      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}

      {canManage && (
        <>
          <ProductFormModal
            open={formOpen}
            onOpenChange={setFormOpen}
            product={editingProduct}
            categories={categories}
            onSaved={handleSaved}
          />
          <StockAdjustModal
            open={adjustingProduct !== null}
            onOpenChange={(open) => !open && setAdjustingProduct(null)}
            product={adjustingProduct}
            onAdjusted={handleAdjusted}
          />
        </>
      )}
    </div>
  );
}
