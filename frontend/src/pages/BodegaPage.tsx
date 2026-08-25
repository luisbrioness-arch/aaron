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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Bodega</h1>
          <p className="text-sm text-muted-foreground">Catálogo de productos y stock</p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Agregar producto
          </Button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por nombre, SKU o código de barras…"
            className="pl-8"
          />
        </div>
        <Select
          value={categoryId}
          onChange={(e) => {
            setPage(1);
            setCategoryId(e.target.value);
          }}
          className="w-56"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Producto</th>
              <th className="px-4 py-2.5 font-medium">Categoría</th>
              <th className="px-4 py-2.5 font-medium">Precio</th>
              <th className="px-4 py-2.5 font-medium">Stock</th>
              {canManage && <th className="px-4 py-2.5 font-medium">Acciones</th>}
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
            {!loading && !hasResults && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay productos que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {!loading &&
              products.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {p.sku}
                      {p.barcode ? ` · ${p.barcode}` : ''}
                    </div>
                    <div className="mt-1 flex gap-1">
                      {p.is_scale_item && <Badge variant="neutral">Granel</Badge>}
                      {p.has_expiration && <Badge variant="neutral">Vencimiento</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-2.5 font-mono">
                    ${p.selling_price.toLocaleString('es-CL')}
                    {p.unit_of_measure !== 'units' && (
                      <span className="text-muted-foreground">/{UNIT_LABELS[p.unit_of_measure]}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 font-mono">
                      {p.stock_current} {UNIT_LABELS[p.unit_of_measure]}
                      {p.is_low_stock && <Badge variant="warning">Stock bajo</Badge>}
                    </div>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ajustar stock"
                          onClick={() => setAdjustingProduct(p)}
                        >
                          <PackagePlus className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Desactivar"
                          onClick={() => handleDeactivate(p)}
                        >
                          <Ban className="size-4" />
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
