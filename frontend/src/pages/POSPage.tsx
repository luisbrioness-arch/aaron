import { useEffect, useRef, useState } from 'react';
import { Search, Trash2, Percent, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CashRegisterBanner } from '@/components/CashRegisterBanner';
import { QuantityPromptModal } from '@/components/QuantityPromptModal';
import { searchProducts } from '@/lib/products';
import { createSale } from '@/lib/sales';
import type { PaymentMethod, Product, SaleResult } from '@/types';

interface CartLine {
  product: Product;
  quantity: number;
  discountAmount: number;
}

const UNIT_SHORT: Record<Product['unit_of_measure'], string> = { units: 'un.', kilos: 'kg', liters: 'L' };
const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

function computeTotals(cart: CartLine[], saleDiscountInput: number, paymentMethod: PaymentMethod) {
  const grossSubtotal = cart.reduce((s, l) => s + l.product.selling_price * l.quantity, 0);
  const lineDiscountTotal = cart.reduce((s, l) => s + l.discountAmount, 0);
  const afterLineDiscounts = grossSubtotal - lineDiscountTotal;
  const saleDiscount = Math.round(Math.max(0, Math.min(saleDiscountInput, afterLineDiscounts)));
  const discountTotal = lineDiscountTotal + saleDiscount;
  const subtotal = grossSubtotal - discountTotal;
  const iva = Math.round(subtotal * 0.19);
  const totalBeforeRounding = subtotal + iva;
  let totalAmount = totalBeforeRounding;
  let roundingAdjustment = 0;
  if (paymentMethod === 'cash') {
    totalAmount = Math.round(totalBeforeRounding / 10) * 10;
    roundingAdjustment = totalAmount - totalBeforeRounding;
  }
  return { grossSubtotal, saleDiscount, discountTotal, subtotal, iva, totalAmount, roundingAdjustment };
}

export function POSPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [promptProduct, setPromptProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saleDiscountInput, setSaleDiscountInput] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SaleResult | null>(null);
  const [registerRefreshKey, setRegisterRefreshKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      searchProducts(query.trim())
        .then((res) => setResults(res.success && res.data ? res.data : []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  function addToCart(product: Product, quantity = 1) {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + quantity } : l,
        );
      }
      return [...prev, { product, quantity, discountAmount: 0 }];
    });
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  }

  function handlePick(product: Product) {
    if (product.is_scale_item) {
      setPromptProduct(product);
    } else {
      addToCart(product, 1);
    }
  }

  function handleQueryKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    const exact = results.find((p) => p.barcode === trimmed);
    if (exact) {
      handlePick(exact);
    } else if (results.length === 1) {
      handlePick(results[0]);
    }
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== productId));
      return;
    }
    setCart((prev) => prev.map((l) => (l.product.id === productId ? { ...l, quantity } : l)));
  }

  function updateDiscount(productId: string, discountAmount: number) {
    setCart((prev) =>
      prev.map((l) =>
        l.product.id === productId
          ? { ...l, discountAmount: Math.max(0, Math.min(discountAmount, l.product.selling_price * l.quantity)) }
          : l,
      ),
    );
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId));
  }

  const totals = computeTotals(cart, Number(saleDiscountInput) || 0, paymentMethod);
  const receivedNumber = Number(amountReceived) || 0;
  const changePreview = paymentMethod === 'cash' && amountReceived ? receivedNumber - totals.totalAmount : null;

  async function handleCharge() {
    setError(null);
    if (cart.length === 0) {
      setError('El carrito está vacío');
      return;
    }
    if (paymentMethod === 'cash' && amountReceived && receivedNumber < totals.totalAmount) {
      setError('El efectivo ingresado no alcanza para cubrir el total');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createSale({
        items: cart.map((l) => ({
          product_id: l.product.id,
          quantity: l.quantity,
          discount_amount: l.discountAmount || undefined,
        })),
        payment_method: paymentMethod,
        discount_amount: Number(saleDiscountInput) || undefined,
        amount_received: paymentMethod === 'cash' && amountReceived ? receivedNumber : undefined,
      });
      if (!res.success || !res.data) {
        setError(res.message || 'No se pudo registrar la venta');
        return;
      }
      setReceipt(res.data);
      setCart([]);
      setSaleDiscountInput('0');
      setAmountReceived('');
      setRegisterRefreshKey((k) => k + 1);
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Receipt className="mx-auto size-8 text-accent" />
          <h1 className="mt-2 font-display text-xl font-bold">Venta completada</h1>
          <p className="text-sm text-muted-foreground">Boleta N° {receipt.invoice_number}</p>

          <div className="mt-4 space-y-1 border-t border-border pt-4 text-left text-sm">
            {receipt.items.map((item) => (
              <div key={item.product_id} className="flex justify-between">
                <span>
                  {item.quantity} × {item.product_name}
                </span>
                <span className="font-mono">{money(item.subtotal - item.discount_amount)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{money(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA (19%)</span>
              <span className="font-mono">{money(receipt.iva)}</span>
            </div>
            <div className="flex justify-between font-display text-lg font-bold">
              <span>Total</span>
              <span className="font-mono">{money(receipt.total_amount)}</span>
            </div>
            {receipt.amount_received != null && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>Recibido</span>
                  <span className="font-mono">{money(receipt.amount_received)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Vuelto</span>
                  <span className="font-mono">{money(receipt.change_amount ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <Button className="mt-5 w-full" onClick={() => setReceipt(null)}>
            Nueva venta
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <CashRegisterBanner refreshKey={registerRefreshKey} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleQueryKeyDown}
              placeholder="Escanea un código de barras o busca por nombre…"
              className="h-11 pl-9 text-base"
            />
          </div>

          {query.trim() !== '' && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card">
              {searching && <div className="px-4 py-3 text-sm text-muted-foreground">Buscando…</div>}
              {!searching && results.length === 0 && (
                <div className="px-4 py-3 text-sm text-muted-foreground">Sin resultados.</div>
              )}
              {!searching &&
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePick(p)}
                    className="flex w-full items-center justify-between gap-3 border-b border-border px-4 py-2.5 text-left text-sm last:border-0 hover:bg-secondary"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono">
                        {money(p.selling_price)}
                        {p.unit_of_measure !== 'units' && `/${UNIT_SHORT[p.unit_of_measure]}`}
                      </div>
                      {p.is_low_stock && <Badge variant="warning">Stock bajo</Badge>}
                    </div>
                  </button>
                ))}
            </div>
          )}

          <div className="mt-5 overflow-hidden rounded-lg border border-border bg-card">
            {cart.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Escanea o busca un producto para empezar la venta.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2 font-medium">Producto</th>
                    <th className="px-4 py-2 font-medium">Cant.</th>
                    <th className="px-4 py-2 font-medium">Desc.</th>
                    <th className="px-4 py-2 text-right font-medium">Subtotal</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.product.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">
                        <div className="font-medium">{line.product.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {money(line.product.selling_price)}
                          {line.product.unit_of_measure !== 'units' && `/${UNIT_SHORT[line.product.unit_of_measure]}`}
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min="0"
                          step={line.product.unit_of_measure === 'units' ? '1' : '0.001'}
                          value={line.quantity}
                          onChange={(e) => updateQuantity(line.product.id, Number(e.target.value) || 0)}
                          className="h-8 w-20"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <div className="relative w-24">
                          <Percent className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            step="1"
                            value={line.discountAmount || ''}
                            placeholder="0"
                            onChange={(e) => updateDiscount(line.product.id, Number(e.target.value) || 0)}
                            className="h-8 pl-6"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {money(line.product.selling_price * line.quantity - line.discountAmount)}
                      </td>
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon" onClick={() => removeLine(line.product.id)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="font-display text-lg font-bold">Cobro</h2>

          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal bruto</span>
              <span className="font-mono">{money(totals.grossSubtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Descuento boleta</span>
              <Input
                type="number"
                min="0"
                step="1"
                value={saleDiscountInput}
                onChange={(e) => setSaleDiscountInput(e.target.value)}
                className="h-7 w-24 text-right"
              />
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Neto</span>
              <span className="font-mono">{money(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA (19%)</span>
              <span className="font-mono">{money(totals.iva)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-display text-xl font-bold">
              <span>Total</span>
              <span className="font-mono">{money(totals.totalAmount)}</span>
            </div>
          </div>

          <div className="mt-4">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
              <option value="mixed">Mixto</option>
            </Select>
          </div>

          {paymentMethod === 'cash' && (
            <div className="mt-3">
              <Input
                type="number"
                min="0"
                step="1"
                placeholder="Efectivo recibido (opcional)"
                value={amountReceived}
                onChange={(e) => setAmountReceived(e.target.value)}
              />
              {changePreview !== null && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Vuelto: <span className="font-mono font-semibold text-foreground">{money(Math.max(0, changePreview))}</span>
                </p>
              )}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <Button className="mt-4 w-full" size="default" disabled={submitting || cart.length === 0} onClick={handleCharge}>
            {submitting ? 'Cobrando…' : `Cobrar ${money(totals.totalAmount)}`}
          </Button>
        </div>
      </div>

      <QuantityPromptModal
        product={promptProduct}
        onCancel={() => setPromptProduct(null)}
        onConfirm={(qty) => {
          if (promptProduct) addToCart(promptProduct, qty);
          setPromptProduct(null);
        }}
      />
    </div>
  );
}
