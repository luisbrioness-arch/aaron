# HANDOFF — Bitácora de sesiones

Plantilla para la próxima entrada (agregar siempre **arriba**, sin borrar
las anteriores):

```
## Sesión N — YYYY-MM-DD

### Qué se hizo
### Qué falló o quedó a medias
### Subido directo a main / vía PR
```

---

## Sesión 5 — 2026-08-25

### Qué se hizo
- Se implementó T-04 completo (Vencimientos y alertas):
  - `api/lots.php`: `expiring` (lotes dentro de
    `EXPIRATION_WARNING_DAYS`), `expired`, `adjust` (marca un lote como
    merma — crea `inventory_movements` tipo `loss`, descuenta
    `product_lots.quantity_remaining` y `products.stock_current`, todo en
    transacción con `FOR UPDATE`).
  - `frontend/src/lib/lots.ts` y `AlertasPage.tsx` — tres secciones
    (Vencidos, Por vencer, Stock bajo), esta última reutilizando
    `products.php?action=low-stock` que ya existía desde T-02. El botón
    "Marcar merma" solo aparece en Vencidos, nunca en Por vencer (D-25).
  - `DECISIONS.md`: D-25.
- **Verificación con el mismo patrón que ya funcionó en la sesión
  anterior** (mock de XHR instalado, remount vía clic en links de React
  Router para que el `useEffect` de carga se dispare de nuevo con el mock
  activo): las tres secciones mostraron datos falsos correctamente
  formateados — fechas en español (`24 ago 2026`), badge de días
  restantes para "por vencer". Se probó el flujo completo de "Marcar
  merma": se auto-confirmó el `window.confirm()` del navegador, se
  inspeccionó el payload real mandado a `lots.php?action=adjust`
  (`{ lot_id: "lot2" }`, sin `quantity` — confirmando que el default de
  "todo el lote" funciona como se diseñó) y se confirmó que la fila
  desaparece de la lista tras la respuesta exitosa.

### Qué falló o quedó a medias
- **Sigue sin haber PHP local** — no se reintentó la instalación esta
  vez (ya se intentó dos sesiones seguidas con el mismo error de winget,
  no vale la pena insistir sin una alternativa nueva). `lots.php` está
  revisado a mano, sin ejecutar contra MariaDB.
- La UI no expone mermar solo una parte de un lote (la API sí lo soporta
  vía `quantity` opcional) — decisión de alcance, no un olvido, ver D-25.
- No se agregó ninguna alerta a un Dashboard todavía porque `DashboardPage.tsx`
  sigue siendo un placeholder (T-05) — `AlertasPage.tsx` es autónoma.

### Subido directo a main / vía PR
Sin subir todavía — pendiente de que Luis revise antes del commit.

---

## Sesión 4 — 2026-08-25

### Qué se hizo
- Se implementó T-03 completo (Recepción de compras) y, como prerequisito
  suyo, se adelantó el backend de T-08 (Proveedores):
  - `api/suppliers.php`: `list`, `create` — a diferencia de FERRIMIX
    (admin-only), acá `admin` y `warehouse_staff` pueden ambas acciones
    porque bodega necesita dar de alta un proveedor nuevo al recibir
    mercadería sin frenar a esperar a un admin (D-22).
  - `api/purchases.php`: `list`, `get`, `create` (no toca stock, genera
    `purchase_number` secuencial tipo `OC-NNNNNN`), `receive` (recepción
    parcial, actualiza stock, inserta `inventory_movements`, y crea una
    fila en `product_lots` por cada recepción de un producto con
    vencimiento — D-23 explica por qué `purchases_details.expiration_date`
    es solo una referencia de "última recepción", no la fuente de verdad).
  - Frontend: `lib/suppliers.ts`, `lib/purchases.ts`, y
    `RecepcionPage.tsx` — selector de proveedor con alta rápida inline
    (`SupplierQuickAddModal`), búsqueda/escaneo de productos en cadena,
    tabla editable de líneas (cantidad, costo, vencimiento y lote cuando
    aplica), y un solo botón que crea la orden y la recibe en el mismo
    paso. Lista de "Órdenes recientes" de solo lectura.
  - `DECISIONS.md`: D-22 a D-24.
- **Verificación end-to-end completa, la más rigurosa hasta ahora:** se
  interceptaron a nivel de XHR `suppliers.php?action=list`,
  `products.php?action=search`, y `purchases.php?action=create/list/
  receive`. Se ejecutó el flujo real: elegir proveedor mockeado, agregar
  un producto sin vencimiento y uno con vencimiento, confirmar sin fecha
  (se verificó que el cliente lo rechaza con el mensaje correcto),
  completar la fecha, confirmar de nuevo, e **inspeccionar los payloads
  JSON exactos** que `RecepcionPage.tsx` mandó a `create` y a `receive`
  para confirmar que cada campo (`product_id`, `quantity`, `unit_cost`,
  `expiration_date`, `lot_code`, `purchase_id` encadenado del resultado de
  `create`) viaja como se esperaba. La orden terminó mostrándose como
  "Recibida" en la lista de recientes.
- Descubrí durante la primera pasada de este mismo test que el truco de
  "instalar el mock de XHR y después navegar" no sirve cuando los datos
  se cargan en un `useEffect` al montar (a diferencia de una búsqueda
  disparada por escribir, que sí es un evento posterior al mock) — hay
  que instalar el mock y **luego forzar un remount por navegación del
  lado del cliente** (clic en un link de React Router, no un reload real
  del navegador) para que el efecto se dispare de nuevo con el mock ya
  activo. Vale la pena recordarlo para la próxima vez que haya que probar
  una pantalla con carga de datos al montar sin backend real.

### Qué falló o quedó a medias
- **Sigue sin haber PHP local.** Se volvió a intentar instalar PHP vía
  `winget install PHP.PHP.8.3` — mismo error 404 en la descarga que la
  sesión anterior, el paquete de winget sigue roto. `purchases.php` y
  `suppliers.php` están revisados a mano, sin ejecutar contra MariaDB de
  verdad.
- No se construyó la continuación de una recepción parcial ya existente
  (recibir el saldo pendiente de una orden que quedó en estado
  `partial`) — el flujo de `RecepcionPage.tsx` siempre crea una orden
  nueva. Si se necesita recepción parcial de verdad (llega la mitad hoy,
  el resto la próxima semana), falta esa pantalla/flujo.
- `suppliers.php` solo tiene `list`/`create` — no hay `update` ni
  `deactivate` todavía, esos quedan como el resto pendiente de T-08.

### Subido directo a main / vía PR
Sin subir todavía — pendiente de que Luis revise antes del commit.

---

## Sesión 3 — 2026-08-25

### Qué se hizo
- Se implementó T-01 completo (Punto de venta + caja):
  - `api/cash_register.php`: `open`, `close`, `current` — caja siempre
    resuelta server-side a partir del usuario autenticado (D-07), cuadratura
    solo considera ventas en efectivo.
  - `api/sales.php`: `create` (IVA 19%, redondeo a $10 en efectivo,
    descuentos por línea/boleta clampeados y redondeados a peso entero,
    FEFO para productos con vencimiento con fallback si no hay lotes
    todavía — D-17/D-20), `list` (3 modos: últimas 20, por día, paginado),
    `get` (requiere JWT, a diferencia del patrón público de FERRIMIX —
    D-18). Nueva excepción `SaleValidationException` para separar errores
    de validación (400, con mensaje específico) de errores inesperados
    (500 genérico).
  - Frontend: `lib/sales.ts`, `lib/cashRegister.ts`,
    `components/CashRegisterBanner.tsx` (con sus modales de apertura/
    cierre), `components/QuantityPromptModal.tsx` (cantidad para
    productos a granel), y `POSPage.tsx` — búsqueda tipo-mientras-escribes
    como flujo principal, carrito editable, descuento por línea y por
    boleta, selector de medio de pago, vuelto, resumen de venta al cobrar.
  - `DECISIONS.md`: D-18 a D-21 (por qué `get` no es público, por qué el
    número de boleta usa MAX+1 sin tabla de contador, por qué la boleta
    todavía no es PDF, por qué `mixed` no tiene desglose propio).
- **Verificación más profunda que en sesiones anteriores:** sin PHP local
  para probar el backend real, se interceptaron las respuestas de
  `products.php?action=search` a nivel de XHR en el navegador para poder
  ejercitar el carrito completo con datos falsos controlados. Se agregó un
  producto normal (Arroz, unidad) y uno a granel (Queso, kilos con prompt
  de cantidad), se aplicó un descuento de línea de $100, y **se verificó a
  mano que cada número mostrado en pantalla coincide exactamente con lo
  que calcularía `sales.php`** (IVA redondeado, total redondeado al
  múltiplo de $10 más cercano en efectivo) — no fue una revisión visual
  superficial, se recalculó la aritmética esperada y se comparó contra lo
  que renderizó React en cada paso.

### Qué falló o quedó a medias
- **Sigue sin haber PHP local.** `sales.php` y `cash_register.php` están
  escritos y revisados línea por línea a mano (sin poder correr `php -l`
  ni un test real), pero nunca se ejecutaron contra una base de datos.
  Antes de confiar en esto en producción: instalar PHP local o probarlo
  directo en el hosting real, crear una venta de verdad, y confirmar que
  `stock_current` baja, que `cash_registers.expected_amount` cuadra al
  cerrar, y que dos ventas seguidas no pisan el mismo `invoice_number`
  (ver el riesgo aceptado en D-19).
- Se intentó instalar PHP local vía `winget install PHP.PHP.8.3` para
  poder probar de verdad — el paquete de winget está roto (404 al
  descargar desde `downloads.php.net`). No se insistió con otras rutas
  (Chocolatey, descarga manual) por tiempo; queda como posible mejora de
  entorno para la próxima sesión si se quiere probar en vivo.
- **No se construyó una grilla de productos por categoría separada** de
  la búsqueda tipo-mientras-escribes — la lista de resultados de la
  búsqueda cumple el rol de "respaldo" que pedía el documento de
  arquitectura, pero no es una grilla visual navegable por categoría.
  Simplificación de alcance, no un olvido — anotar si se necesita de
  verdad.
- La lógica de promociones automáticas (T-07) todavía no está conectada a
  `sales.php` — el punto de integración queda anotado en `NEXT_STEPS.md`.
- Boleta sigue siendo solo un resumen en pantalla, sin PDF ni impresión
  (bloqueado por D-06, que a su vez espera confirmar si el hosting real
  tiene Composer/SSH).

### Subido directo a main / vía PR
Sin subir todavía — pendiente de que Luis revise antes del commit.

---

## Sesión 2 — 2026-08-25

### Qué se hizo
- Se implementó T-02 completo (Bodega/catálogo de productos):
  - `api/products.php`: `search`, `list` (paginado, 30/página — ver D-15),
    `low-stock`, `categories`, `create`, `update` (parcial, sin tocar
    `stock_current` — ver D-14), `deactivate`. `create` con stock inicial
    también deja un `inventory_movements` de entrada.
  - `api/inventory.php`: `movement` (con `SELECT ... FOR UPDATE` dentro de
    una transacción, valida que el stock no quede negativo, actualiza
    `purchase_price` si viene `unit_cost` en una entrada) y `list`.
    `reorder-suggestions` queda pendiente (501) — ver D-16.
  - Frontend: `components/ui/{Button,Input,Badge,Dialog}.tsx` (primitivas
    a mano, Radix + cva — ver D-08), `ProductFormModal.tsx`,
    `StockAdjustModal.tsx`, y `BodegaPage.tsx` real (búsqueda, filtro por
    categoría, paginación, tabla con chips de stock bajo/granel/
    vencimiento, acciones solo visibles para admin/bodega).
  - `API.md` y `DECISIONS.md` actualizados con el contrato real (D-14 a
    D-17).
- Se verificó en el navegador simulando una sesión de admin (localStorage
  con el store de Zustand persistido a mano, porque no hay backend PHP
  real para loguearse de verdad): la página carga, el filtro de
  categorías no revienta la consola cuando el backend no responde (se
  encontró y arregló una promesa sin `.catch()` que generaba un error no
  capturado), y el modal "Agregar producto" abre con los 11 campos
  esperados.

### Qué falló o quedó a medias
- **Sigue sin haber PHP local en esta máquina.** Todo lo de `api/` está
  escrito y revisado a ojo, pero ni `products.php` ni `inventory.php` se
  ejecutaron contra una base de datos real — la próxima sesión (o Luis)
  debería instalar PHP local y correr el flujo completo (crear producto,
  editarlo, ajustar stock, ver que `stock_current` cuadre) antes de
  confiar en que el SQL está bien.
- No se probó el caso de "producto con `has_expiration = true`" en la UI
  más allá del checkbox — la lógica real de lotes es T-04, a propósito
  (ver D-17).
- `BodegaPage.tsx` en modo cajero (solo lectura) no se verificó
  visualmente, solo por lectura de código — debería confirmarse que la
  columna "Acciones" y los modales realmente no aparecen con ese rol.

### Subido directo a main / vía PR
Sin subir todavía — pendiente de que Luis revise antes del commit.

---

## Sesión 1 — 2026-08-24

### Qué se hizo
- Se revisó y aprobó el documento de arquitectura completo (esquema de
  base de datos, reglas de negocio, guía visual, pantallas por rol) antes
  de escribir código, como pidió Luis.
- Se armó el scaffold del monorepo desde cero:
  - `git init`, `.gitignore`, `package.json` raíz con npm workspaces
    (`frontend`).
  - `frontend/`: Vite + React 19.2 + TypeScript, Tailwind 4 vía
    `@tailwindcss/vite`, alias `@` → `src/`, React Router 8, Zustand
    (auth + tema persistidos), Axios con interceptor de JWT.
  - Paleta y tipografía del documento de arquitectura aplicadas en
    `src/index.css` (`@theme` de Tailwind 4, con variante `.dark`).
  - Rutas armadas con guardas de rol (`RequireRole.tsx`) para las 9
    pantallas del plan por rol; todas menos Login son placeholders
    `ComingSoon` con su `T-xx` correspondiente — ver `NEXT_STEPS.md`.
  - `LoginPage.tsx` funcional de punta a punta contra `auth.php`.
  - `api/`: `config.example.php`, `middleware.php` (JWT, CORS, roles,
    UUID), `auth.php` (login/logout/refresh, real, no hardcodeado),
    `db/schema.sql` (15 tablas), `db/seed.sql` (categorías de ejemplo),
    `db/seed_admin.sql` (usuario `admin`/`demo123`, hash bcrypt real).
  - Los otros 9 endpoints (`products.php`, `sales.php`,
    `cash_register.php`, `inventory.php`, `lots.php`, `promotions.php`,
    `purchases.php`, `suppliers.php`, `users.php`, `reports.php`) están
    creados con el routing y el control de rol correctos, pero cada
    acción responde `501` — el contrato completo está en `API.md`.
  - Los 6 documentos obligatorios: este archivo, `CLAUDE.md`,
    `NEXT_STEPS.md`, `DECISIONS.md`, `API.md`, `CHANGELOG.md`.
- Se probó la CLI real de shadcn/ui (el documento de arquitectura la
  proponía) y **se descartó tras reproducir una falla concreta**, no por
  precaución teórica: rompe el alias `@` en este monorepo de npm
  workspaces. Se volvió al patrón a mano de FERRIMIX/CRM (Radix + cva +
  `cn()`). Detalle completo en D-08 de `DECISIONS.md`.

### Qué falló o quedó a medias
- **No hay PHP local en esta máquina** (`php` no está en el PATH), así
  que `auth.php` y el resto de la API están escritos y revisados a ojo
  contra el patrón ya probado de FERRIMIX, pero **sin ejecutar ni un solo
  request real**. Antes de dar por bueno el login hay que instalar PHP
  local (o correrlo en el hosting real) y probarlo con `admin`/`demo123`.
- `npm run build:frontend` corre limpio, pero el flujo completo (login →
  navegación por rol) no se probó en el navegador en esta sesión.
- Los 5 puntos abiertos del documento de arquitectura (dominio/hosting,
  acceso Composer/SSH, umbral de vencimiento, factura, si bodega también
  vende) siguen sin resolver — están listados al principio de
  `NEXT_STEPS.md`.
- Ningún endpoint más allá de `auth.php` tiene lógica real todavía — son
  9 tareas (`T-01` a `T-09`) en `NEXT_STEPS.md`.

### Subido directo a main / vía PR
Nada se subió todavía — el repo está inicializado (`git init`) pero sin
ningún commit. Pendiente de que Luis revise el scaffold y pida el primer
commit.
