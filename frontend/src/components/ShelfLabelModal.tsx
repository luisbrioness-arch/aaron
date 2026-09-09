import { useState } from 'react';
import { Printer, CheckSquare, Square } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import type { Product } from '@/types';

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

// Generador de código de barras visual en SVG (patrón de barras de contraste alto)
function BarcodeSvg({ code }: { code: string }) {
  // Generar un patrón determinista basado en los caracteres del código
  const clean = code.replace(/[^0-9a-zA-Z]/g, '') || '12345678';
  const bars: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const charCode = clean.charCodeAt(i);
    bars.push((charCode % 3) + 1);
    bars.push(((charCode >> 1) % 2) + 1);
    bars.push(((charCode >> 2) % 3) + 1);
  }

  let currentX = 0;
  return (
    <div className="flex flex-col items-center">
      <svg className="h-9 w-full max-w-[140px]" viewBox={`0 0 ${bars.reduce((a, b) => a + b * 2, 0)} 40`}>
        {bars.map((b, idx) => {
          const x = currentX;
          currentX += b * 2;
          if (idx % 2 === 0) {
            return <rect key={idx} x={x} y={0} width={b * 1.5} height={40} fill="#000000" />;
          }
          return null;
        })}
      </svg>
      <span className="font-mono text-[10px] tracking-widest text-black font-semibold">{code}</span>
    </div>
  );
}

export function ShelfLabelModal({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(products.map((p) => p.id));
  const [copies, setCopies] = useState<number>(1);

  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));

  function toggleAll() {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map((p) => p.id));
    }
  }

  function toggleOne(id: string) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  return (
    <>
      {/* Contenedor de Impresión Oculto en Pantalla, Activo en Impresión */}
      <div id="shelf-labels-print" className="hidden print:grid print:grid-cols-3 print:gap-3 print:p-2 bg-white text-black">
        {selectedProducts.map((p) =>
          Array.from({ length: copies }).map((_, copyIdx) => (
            <div
              key={`${p.id}-${copyIdx}`}
              className="border-2 border-dashed border-black p-2.5 rounded-lg flex flex-col justify-between items-center text-center break-inside-avoid min-h-[140px] bg-white text-black"
            >
              <div className="w-full">
                <div className="text-[10px] uppercase font-bold tracking-wider text-black border-b border-black pb-0.5">
                  Aaron Provisiones
                </div>
                <div className="font-extrabold text-xs uppercase leading-tight line-clamp-2 mt-1 text-black">
                  {p.name}
                </div>
              </div>

              <div className="my-1.5">
                <div className="font-mono font-black text-2xl tracking-tight text-black">
                  {money(p.selling_price)}
                </div>
                <div className="text-[9px] uppercase font-bold text-black">
                  Precio final {p.unit_of_measure !== 'units' ? `por ${p.unit_of_measure}` : 'c/u'} (IVA incl.)
                </div>
              </div>

              <div className="w-full pt-1 border-t border-dotted border-black">
                <BarcodeSvg code={p.barcode || p.sku} />
              </div>
            </div>
          )),
        )}
      </div>

      {/* Modal Interactivo en Pantalla */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          title="Impresión de Etiquetas de Góndola"
          description="Genera etiquetas con precio gigante y código de barras para pegar en estantes o productos."
          className="max-w-2xl max-h-[85vh] overflow-y-auto"
        >
          <div className="space-y-4">
            {/* Opciones superiores */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border/70 bg-secondary/30 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {selectedIds.length === products.length ? (
                    <CheckSquare className="size-4 text-primary" />
                  ) : (
                    <Square className="size-4 text-muted-foreground" />
                  )}
                  <span>
                    {selectedIds.length === products.length
                      ? 'Deseleccionar todos'
                      : `Seleccionar todos (${products.length})`}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Copias por producto:</span>
                <select
                  value={copies}
                  onChange={(e) => setCopies(Number(e.target.value))}
                  className="rounded-lg border border-input bg-card px-2 py-1 font-bold text-xs outline-none"
                >
                  <option value={1}>1 etiqueta</option>
                  <option value={2}>2 etiquetas</option>
                  <option value={4}>4 etiquetas</option>
                  <option value={6}>6 etiquetas</option>
                </select>
              </div>
            </div>

            {/* Vista Previa de Etiquetas en Cuadrícula */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Vista Previa ({selectedProducts.length * copies} etiquetas en total)
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-72 overflow-y-auto p-1">
                {products.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleOne(p.id)}
                      className={`cursor-pointer rounded-xl border-2 p-3 transition-all flex flex-col justify-between items-center text-center ${
                        isSelected
                          ? 'border-emerald-500 bg-card shadow-xs'
                          : 'border-dashed border-border bg-secondary/20 opacity-40 hover:opacity-80'
                      }`}
                    >
                      <div className="w-full">
                        <div className="text-[9px] uppercase font-bold text-muted-foreground">Aaron Provisiones</div>
                        <div className="font-bold text-xs text-foreground truncate mt-0.5">{p.name}</div>
                      </div>

                      <div className="my-2">
                        <div className="font-mono font-black text-xl text-emerald-600 dark:text-emerald-400">
                          {money(p.selling_price)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {p.unit_of_measure !== 'units' ? `por ${p.unit_of_measure}` : 'c/u'}
                        </div>
                      </div>

                      <div className="w-full pt-1 border-t border-border/60">
                        <BarcodeSvg code={p.barcode || p.sku} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer de Botones */}
            <div className="flex justify-between items-center pt-3 border-t border-border/60">
              <span className="text-xs text-muted-foreground font-medium">
                {selectedProducts.length} productos seleccionados ({selectedProducts.length * copies} etiquetas)
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => window.print()}
                  disabled={selectedProducts.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Printer className="size-4 mr-1.5" />
                  Imprimir Etiquetas
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
