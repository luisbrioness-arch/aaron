import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Trash2,
  Percent,
  Receipt,
  Plus,
  Minus,
  Barcode,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Coins,
  CheckCircle2,
  ShoppingBag,
  RotateCcw,
  Printer,
  BookOpen,
  Users,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { CashRegisterBanner } from '@/components/CashRegisterBanner';
import { QuantityPromptModal } from '@/components/QuantityPromptModal';
import { searchProducts } from '@/lib/products';
import { createSale } from '@/lib/sales';
import { listCustomers } from '@/lib/customers';
import { openWhatsAppCreditReceipt } from '@/lib/whatsapp';
import type { Customer, PaymentMethod, Product, SaleResult } from '@/types';

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

  // Los precios de los productos ya incluyen IVA (precio a público).
  // No se suma IVA al final; el total a pagar es el subtotal bruto menos descuentos.
  const totalBeforeRounding = Math.max(0, grossSubtotal - discountTotal);
  const subtotal = Math.round(totalBeforeRounding / 1.19); // Subtotal Neto
  const iva = totalBeforeRounding - subtotal;              // IVA 19% desglosado

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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [receiptCustomer, setReceiptCustomer] = useState<Customer | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function parseScaleBarcode(code: string): { skuOrBarcode: string; weightKg: number } | null {
    if (/^(20|21)\d{11}$/.test(code)) {
      const plu = code.slice(2, 7);
      const weightGrams = parseInt(code.slice(7, 12), 10);
      return {
        skuOrBarcode: plu,
        weightKg: weightGrams / 1000,
      };
    }
    return null;
  }

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
    }, 200);
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

    // Detectar código de balanza (prefijo 20 o 21 con 13 dígitos)
    const scaleData = parseScaleBarcode(trimmed);
    if (scaleData) {
      const match = results.find(
        (p) =>
          p.sku === scaleData.skuOrBarcode ||
          p.barcode === scaleData.skuOrBarcode ||
          (p.barcode && p.barcode.endsWith(scaleData.skuOrBarcode)),
      );
      if (match) {
        addToCart(match, scaleData.weightKg);
        return;
      }
    }

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

    if (paymentMethod === 'credit' && !selectedCustomer) {
      setCustomerPickerOpen(true);
      setError('Debes seleccionar a qué vecino o cliente se le anota el fiado');
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
        customer_id: selectedCustomer?.id,
        customer_name: selectedCustomer?.name,
        discount_amount: Number(saleDiscountInput) || undefined,
        amount_received: paymentMethod === 'cash' && amountReceived ? receivedNumber : undefined,
      });
      if (!res.success || !res.data) {
        setError(res.message || 'No se pudo registrar la venta');
        return;
      }
      setReceipt({ ...res.data, payment_method: res.data.payment_method || paymentMethod });
      setReceiptCustomer(selectedCustomer);
      setWhatsappPhone(selectedCustomer?.phone || '');
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

  // Vista de comprobante / Ticket completado
  if (receipt) {
    const paymentLabels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta Débito/Crédito',
      transfer: 'Transferencia Bancaria',
      mixed: 'Pago Mixto',
      credit: 'Fiado / Cta. Corriente',
    };

    return (
      <div className="mx-auto max-w-md py-6 animate-in fade-in zoom-in-95">
        {/* Ticket Térmico Oculto en pantalla, visible solo al imprimir vía @media print */}
        <div id="thermal-receipt" className="hidden print:block font-mono text-[11px] leading-tight text-black">
          <div className="text-center pb-2 border-b border-dashed border-black">
            <div className="font-bold text-sm tracking-wider">AARON PROVISIONES</div>
            <div>Minimarket & Abarrotes</div>
            <div>RUT: 77.123.456-7</div>
            <div>Casa Matriz - Provisiones</div>
            <div className="text-[10px] mt-1">--------------------------------</div>
            <div className="font-bold">BOLETA ELECTRÓNICA N° {receipt.invoice_number}</div>
            <div className="text-[10px]">{new Date().toLocaleString('es-CL')}</div>
          </div>

          <div className="py-2 border-b border-dashed border-black">
            <div className="flex justify-between font-bold pb-1 text-[10px]">
              <span>CANT PRODUCTO</span>
              <span>TOTAL</span>
            </div>
            {receipt.items.map((item) => (
              <div key={item.product_id} className="flex justify-between py-0.5">
                <span className="truncate max-w-[170px]">
                  {item.quantity}× {item.product_name}
                </span>
                <span className="shrink-0">{money(item.subtotal - item.discount_amount)}</span>
              </div>
            ))}
          </div>

          <div className="py-2 space-y-1 border-b border-dashed border-black text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal Neto:</span>
              <span>{money(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>IVA (19% incluido):</span>
              <span>{money(receipt.iva)}</span>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1 border-t border-dotted border-black">
              <span>TOTAL A PAGAR:</span>
              <span>{money(receipt.total_amount)}</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-black space-y-0.5 text-[10px]">
            <div className="flex justify-between">
              <span>Medio de Pago:</span>
              <span>{paymentLabels[receipt.payment_method] || receipt.payment_method}</span>
            </div>
            {receipt.amount_received != null && (
              <>
                <div className="flex justify-between">
                  <span>Efectivo Recibido:</span>
                  <span>{money(receipt.amount_received)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Vuelto:</span>
                  <span>{money(receipt.change_amount ?? 0)}</span>
                </div>
              </>
            )}
          </div>

          <div className="pt-3 text-center text-[10px] space-y-0.5">
            <div>¡Gracias por su preferencia!</div>
            <div>Conserve este comprobante</div>
          </div>
        </div>

        {/* Tarjeta Visual en Pantalla */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">¡Venta Exitosa!</h1>
            <p className="text-sm font-medium text-muted-foreground">Boleta Electrónica N° {receipt.invoice_number}</p>
          </div>

          <div className="mt-6 space-y-2 border-t border-dashed border-border py-4 text-sm">
            {receipt.items.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between text-foreground">
                <span className="font-medium">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold mr-1.5">{item.quantity}×</span>
                  {item.product_name}
                </span>
                <span className="font-mono font-medium">{money(item.subtotal - item.discount_amount)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-dashed border-border pt-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-mono">{money(receipt.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA (19%)</span>
              <span className="font-mono">{money(receipt.iva)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="font-display text-base font-bold text-foreground">Total Pagado</span>
              <span className="font-mono text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {money(receipt.total_amount)}
              </span>
            </div>
            {receipt.amount_received != null && (
              <div className="mt-2 space-y-1 rounded-xl bg-secondary/50 p-3 text-xs">
                <div className="flex justify-between text-muted-foreground font-medium">
                  <span>Efectivo entregado</span>
                  <span className="font-mono font-bold text-foreground">{money(receipt.amount_received)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-semibold text-sm">
                  <span>Vuelto</span>
                  <span className="font-mono font-bold">{money(receipt.change_amount ?? 0)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Envío de comprobante por WhatsApp (Especialmente para Fiados) */}
          {(receipt.payment_method === 'credit' || receiptCustomer) && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-1.5">
                  <MessageCircle className="size-4 text-[#25D366]" />
                  <span>Comprobante de Fiado por WhatsApp</span>
                </div>
                {receiptCustomer && (
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate max-w-[140px]">
                    {receiptCustomer.name}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Input
                  type="tel"
                  placeholder="Teléfono (ej: 912345678)"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="h-9 bg-card text-xs font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs shrink-0 h-9 px-3 shadow-xs active:scale-95"
                  onClick={() => {
                    openWhatsAppCreditReceipt(
                      {
                        phone: whatsappPhone || receiptCustomer?.phone,
                        customerName: receiptCustomer?.name || 'Vecino/a',
                        invoiceNumber: receipt.invoice_number,
                        date: new Date().toLocaleString('es-CL'),
                        totalAmount: receipt.total_amount,
                        items: receipt.items,
                        currentBalance: receiptCustomer
                          ? receiptCustomer.current_balance + receipt.total_amount
                          : undefined,
                        creditLimit: receiptCustomer?.credit_limit,
                      },
                      whatsappPhone,
                    );
                  }}
                >
                  <MessageCircle className="size-3.5 mr-1" />
                  Enviar al WhatsApp
                </Button>
              </div>
              <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80">
                Abre WhatsApp con el mensaje listo para enviar el detalle de los productos y el saldo adeudado.
              </p>
            </div>
          )}

          {/* Botones de acción */}
          <div className="mt-6 flex flex-col gap-2.5">
            <Button
              size="lg"
              variant="outline"
              className="w-full text-base font-bold shadow-xs hover:bg-secondary"
              onClick={() => window.print()}
            >
              <Printer className="size-5 mr-2 text-emerald-600 dark:text-emerald-400" />
              Imprimir Ticket (58mm / 80mm)
            </Button>
            <Button
              size="lg"
              className="w-full text-base font-bold"
              onClick={() => {
                setReceipt(null);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
            >
              <Plus className="size-5 mr-1" />
              Nueva Venta
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <CashRegisterBanner refreshKey={registerRefreshKey} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_390px]">
        {/* Columna Izquierda: Búsqueda y Carrito */}
        <div className="space-y-4">
          {/* Barra de búsqueda de productos estilo Spotlight */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
              <Search className="size-5" />
            </div>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleQueryKeyDown}
              placeholder="Escanea el código de barras o busca por nombre del producto…"
              className="h-12 w-full rounded-2xl border border-border/90 bg-card pl-11 pr-24 text-base font-medium shadow-sm transition-all placeholder:text-muted-foreground/60 focus:border-primary focus:ring-3 focus:ring-primary/20 outline-none"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5 pointer-events-none">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                <Barcode className="size-3.5" />
                Lector activo
              </span>
            </div>
          </div>

          {/* Menú desplegable de resultados */}
          {query.trim() !== '' && (
            <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-lg animate-in fade-in-50">
              {searching && <div className="px-4 py-3 text-sm text-muted-foreground">Buscando productos…</div>}
              {!searching && results.length === 0 && (
                <div className="px-4 py-4 text-center text-sm text-muted-foreground">
                  No se encontraron productos con ese código o nombre.
                </div>
              )}
              {!searching &&
                results.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePick(p)}
                    className="flex w-full items-center justify-between gap-4 border-b border-border/60 px-4 py-3 text-left text-sm last:border-0 hover:bg-secondary/70 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-foreground truncate">{p.name}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-mono">{p.sku}</span>
                        {p.barcode && <span>• {p.barcode}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-foreground text-base">
                        {money(p.selling_price)}
                        {p.unit_of_measure !== 'units' && (
                          <span className="text-xs font-normal text-muted-foreground">/{UNIT_SHORT[p.unit_of_measure]}</span>
                        )}
                      </div>
                      {p.is_low_stock && <Badge variant="warning" className="mt-0.5">Stock bajo</Badge>}
                    </div>
                  </button>
                ))}
            </div>
          )}

          {/* Tabla de Productos en el Carrito */}
          <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-secondary/20">
              <div className="flex items-center gap-2">
                <ShoppingBag className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                <h2 className="font-display font-bold text-foreground">Productos en la Venta</h2>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  {cart.length}
                </span>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive">
                  <RotateCcw className="size-3.5 mr-1" />
                  Vaciar carrito
                </Button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary/80 text-muted-foreground/60">
                  <ShoppingBag className="size-7" />
                </div>
                <h3 className="mt-3 font-display font-semibold text-foreground text-base">El carrito está listo</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
                  Escanea con tu lector de códigos de barra o escribe arriba el nombre del producto para agregarlo.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground bg-secondary/30">
                      <th className="px-5 py-3 font-semibold">Producto</th>
                      <th className="px-3 py-3 font-semibold text-center">Cantidad</th>
                      <th className="px-3 py-3 font-semibold text-center">Descuento</th>
                      <th className="px-5 py-3 text-right font-semibold">Subtotal</th>
                      <th className="px-3 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {cart.map((line) => {
                      const lineTotal = line.product.selling_price * line.quantity - line.discountAmount;
                      return (
                        <tr key={line.product.id} className="hover:bg-secondary/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-foreground">{line.product.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {money(line.product.selling_price)}
                              {line.product.unit_of_measure !== 'units' && ` / ${UNIT_SHORT[line.product.unit_of_measure]}`}
                            </div>
                          </td>

                          {/* Control táctil de cantidad */}
                          <td className="px-3 py-3.5 text-center">
                            <div className="inline-flex items-center rounded-xl border border-border bg-background p-0.5 shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.product.id, line.quantity - (line.product.unit_of_measure === 'units' ? 1 : 0.5))}
                                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                step={line.product.unit_of_measure === 'units' ? '1' : '0.001'}
                                value={line.quantity}
                                onChange={(e) => updateQuantity(line.product.id, Number(e.target.value) || 0)}
                                className="h-7 w-12 text-center font-bold text-foreground text-sm outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(line.product.id, line.quantity + (line.product.unit_of_measure === 'units' ? 1 : 0.5))}
                                className="flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 transition-all"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Descuento por ítem */}
                          <td className="px-3 py-3.5 text-center">
                            <div className="relative mx-auto w-24">
                              <Percent className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/70" />
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                value={line.discountAmount || ''}
                                placeholder="0"
                                onChange={(e) => updateDiscount(line.product.id, Number(e.target.value) || 0)}
                                className="h-8 pl-7 text-xs font-mono text-center rounded-lg"
                              />
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right font-mono font-bold text-foreground text-base">
                            {money(lineTotal)}
                          </td>

                          <td className="px-3 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(line.product.id)}
                              className="rounded-lg p-1.5 text-muted-foreground/60 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600"
                              title="Eliminar producto"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Columna Derecha: Panel de Cobro */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sticky top-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="font-display text-lg font-bold text-foreground">Resumen de Cobro</h2>
              <Receipt className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>

            {/* Desglose de totales */}
            <div className="space-y-2 text-sm font-medium">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal bruto</span>
                <span className="font-mono text-foreground">{money(totals.grossSubtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-muted-foreground">
                <span>Descuento boleta</span>
                <div className="relative w-28">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={saleDiscountInput}
                    onChange={(e) => setSaleDiscountInput(e.target.value)}
                    className="h-8 pl-6 text-right font-mono text-xs rounded-lg"
                  />
                </div>
              </div>

              {totals.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 text-xs">
                  <span>Ahorro total</span>
                  <span className="font-mono font-bold">-{money(totals.discountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-muted-foreground text-xs">
                <span>Neto (sin IVA)</span>
                <span className="font-mono text-foreground">{money(totals.subtotal)}</span>
              </div>

              <div className="flex justify-between text-muted-foreground text-xs">
                <span>IVA 19% (incluido)</span>
                <span className="font-mono text-foreground">{money(totals.iva)}</span>
              </div>

              {totals.roundingAdjustment !== 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Redondeo ley (efectivo)</span>
                  <span className="font-mono">{money(totals.roundingAdjustment)}</span>
                </div>
              )}

              {/* Total Gigante */}
              <div className="mt-4 rounded-xl bg-secondary/60 p-4 border border-border/80 text-center">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total a Cobrar</div>
                <div className="mt-1 font-mono text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                  {money(totals.totalAmount)}
                </div>
              </div>
            </div>

            {/* Asignación de Cliente / Libreta de Fiados */}
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-muted-foreground">Cliente / Cuenta</span>
                <button
                  type="button"
                  onClick={() => setCustomerPickerOpen(true)}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                >
                  {selectedCustomer ? 'Cambiar' : 'Asignar Vecino'}
                </button>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-card border border-border/80 font-bold text-xs">
                    {selectedCustomer ? selectedCustomer.name.charAt(0).toUpperCase() : 'O'}
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="font-bold text-foreground truncate max-w-[170px]">
                      {selectedCustomer ? selectedCustomer.name : 'Cliente Ocasional'}
                    </div>
                    {selectedCustomer && (
                      <div className="text-[11px] text-muted-foreground">
                        Cupo disponible:{' '}
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {money(Math.max(0, selectedCustomer.credit_limit - selectedCustomer.current_balance))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {selectedCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null);
                      if (paymentMethod === 'credit') setPaymentMethod('cash');
                    }}
                    className="text-[11px] text-muted-foreground hover:text-destructive"
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>

            {/* Selector visual de medio de pago */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Medio de Pago
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'cash', label: 'Efectivo', icon: Banknote },
                  { id: 'card', label: 'Tarjeta', icon: CreditCard },
                  { id: 'transfer', label: 'Transfer.', icon: ArrowRightLeft },
                  { id: 'credit', label: 'Fiado / Cta.', icon: BookOpen },
                  { id: 'mixed', label: 'Mixto', icon: Coins },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPaymentMethod(item.id as PaymentMethod);
                        if (item.id === 'credit' && !selectedCustomer) {
                          setCustomerPickerOpen(true);
                        }
                      }}
                      className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all active:scale-95 ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-xs'
                          : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alerta si es Fiado */}
            {paymentMethod === 'credit' && (
              <div className="space-y-2 rounded-xl border border-border/80 bg-secondary/30 p-3 text-xs animate-in fade-in">
                <div className="flex justify-between items-center font-semibold text-foreground">
                  <span>Anotar a la cuenta de:</span>
                  <strong className="text-primary">{selectedCustomer ? selectedCustomer.name : 'Sin cliente'}</strong>
                </div>
                {selectedCustomer ? (
                  <div className="space-y-1 text-muted-foreground pt-1 border-t border-border/60">
                    <div className="flex justify-between">
                      <span>Deuda acumulada previa:</span>
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {money(selectedCustomer.current_balance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nuevo saldo con esta compra:</span>
                      <span className="font-mono font-bold text-foreground">
                        {money(selectedCustomer.current_balance + totals.totalAmount)}
                      </span>
                    </div>
                    {totals.totalAmount > selectedCustomer.credit_limit - selectedCustomer.current_balance && (
                      <p className="mt-1 font-bold text-amber-600 dark:text-amber-400">
                        ⚠️ Supera el cupo sugerido de {money(selectedCustomer.credit_limit)}.
                      </p>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-1"
                    onClick={() => setCustomerPickerOpen(true)}
                  >
                    <Users className="size-3.5 mr-1" /> Seleccionar Cliente
                  </Button>
                )}
              </div>
            )}

            {/* Efectivo y Billetes Rápidos */}
            {paymentMethod === 'cash' && (
              <div className="space-y-2.5 rounded-xl border border-border/80 bg-secondary/30 p-3 animate-in fade-in">
                <label className="block text-xs font-semibold text-foreground">
                  Efectivo Entregado por Cliente
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Monto entregado"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    className="h-10 pl-7 font-mono text-base font-bold"
                  />
                </div>

                {/* Billetes chilenos sugeridos */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setAmountReceived(String(totals.totalAmount))}
                    className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-bold hover:bg-secondary"
                  >
                    Exacto
                  </button>
                  {[1000, 2000, 5000, 10000, 20000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountReceived(String(val))}
                      className="rounded-lg border border-border bg-card px-2 py-1 text-[11px] font-mono font-medium hover:bg-secondary text-muted-foreground hover:text-foreground"
                    >
                      ${val.toLocaleString('es-CL')}
                    </button>
                  ))}
                </div>

                {changePreview !== null && (
                  <div className={`mt-2 rounded-lg p-2 text-center text-xs font-bold ${
                    changePreview >= 0
                      ? 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100/70 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                  }`}>
                    {changePreview >= 0
                      ? `Vuelto: ${money(changePreview)}`
                      : `Faltan: ${money(Math.abs(changePreview))}`}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Botón de Cobro Principal */}
            <Button
              size="lg"
              className="w-full text-base font-bold shadow-md shadow-emerald-600/25 h-12"
              disabled={submitting || cart.length === 0}
              onClick={handleCharge}
            >
              <CheckCircle2 className="size-5 mr-1" />
              {submitting ? 'Procesando Venta…' : `Cobrar ${money(totals.totalAmount)}`}
            </Button>
          </div>
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

      <CustomerPickerModal
        open={customerPickerOpen}
        onOpenChange={setCustomerPickerOpen}
        onSelect={(c) => {
          setSelectedCustomer(c);
          setPaymentMethod('credit');
        }}
      />
    </div>
  );
}

function CustomerPickerModal({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (customer: Customer) => void;
}) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    listCustomers({ search: query.trim() || undefined })
      .then((res) => {
        if (res.success && res.data) setCustomers(res.data.customers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Seleccionar Cliente / Libreta de Fiados"
        description="Elige al vecino para asociar la venta a su cuenta corriente."
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, RUT o teléfono…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border/60 rounded-xl border border-border/80 bg-card">
            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Buscando clientes…</div>
            ) : customers.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No se encontraron clientes registrados.
              </div>
            ) : (
              customers.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-center justify-between p-3 text-left hover:bg-secondary/40 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-xs text-foreground">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.phone || c.rut || 'Sin teléfono'}</div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                      Debe: {money(c.current_balance)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Cupo disponible: {money(Math.max(0, c.credit_limit - c.current_balance))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

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

