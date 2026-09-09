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

## Sesión 7 — 2026-08-28

Luis pidió "hagamos el procesamiento tal cual FERRIMIX". Aclaré primero
qué significaba exactamente (di una descripción equivocada de
`debug_report.php` en la primera pregunta — lo corregí en el chat antes
de tocar código) y confirmó dos cosas concretas: modo debug (`?Debug=1`)
y deploy automático vía GitHub Actions. Detalle completo en D-31 de
`DECISIONS.md`.

### Qué se hizo
- **Modo debug:** `api/debug_report.php` (público, sin JWT, honeypot +
  `DEBUG_REPORT_KEY` opcional) copiado literal de FERRIMIX.
  `frontend/src/lib/debug-mode.ts` + `submit-debug-report.ts` (FAB
  "Reportar problema", selección de elemento con highlight, diálogo de
  descripción) — mismo mecanismo, con la paleta de colores cambiada a los
  tokens de Aaron (dorado/rojo teja en vez del azul/rojo de FERRIMIX).
  `initDebugMode()` llamado a nivel de módulo en `main.tsx`. Nuevo
  `upgrade/fixes/README.md` + `upgrade/.htaccess`.
- **Deploy automático (scaffold, sin activar):**
  `.github/workflows/deploy.yml` y `sync-debug-reports.yml`, mismo patrón
  FTPS por pasos que FERRIMIX, con un dominio placeholder
  (`aaronprovisiones.hogartv.cl`) marcado como TBD en comentarios.
  `DEPLOY.md` nuevo, documentando todo el proceso pendiente en vez de un
  sistema activo (a diferencia del de FERRIMIX, que sí está en
  producción).
- Documentación: `CLAUDE.md` (mapa de documentos, estructura de carpetas,
  nueva sección "Modo debug"), `API.md` (nueva sección
  `debug_report.php`), `NEXT_STEPS.md`, `CHANGELOG.md`.

### Cómo se verificó
Esta vez **sí se pudo probar de punta a punta en local** (no depende de
PHP/MariaDB): `npm run dev` + `?Debug=1` en el navegador. Confirmé que el
FAB aparece, que el modo "seleccionar elemento" intercepta el click real
(probé clickeando el botón "Ingresar" del login — el formulario NO se
envió, se abrió el diálogo de reporte con el selector/texto del elemento
correctos), que un fallo real de red (no hay backend PHP corriendo) se
maneja con gracia ("No se pudo enviar el reporte", sin perder el diálogo
ni el texto tipeado), y que con `window.fetch` mockeado el flujo completo
funciona: el payload que se manda coincide exactamente con lo que espera
`debug_report.php`, y el toast de éxito muestra el nombre de archivo
devuelto. `npm run build:frontend` compila limpio.

### Qué falló o quedó a medias
- El deploy automático **no se pudo probar de ninguna forma** — no hay
  hosting real, no hay secrets FTP, y aunque los hubiera no hay forma de
  correr GitHub Actions desde este entorno. Queda solo revisado a mano
  contra el `.yml` de FERRIMIX que sí funciona en producción.
- `api/debug_report.php` tampoco se probó contra un servidor PHP real —
  mismo límite de siempre (sin PHP local instalable en este entorno).
- No se agregó ningún hint visible en la UI (tipo el `HelpModal` de
  FERRIMIX) que le diga a un usuario nuevo que `?Debug=1` existe — Aaron
  no tiene un componente de ayuda equivalente todavía y agregar uno no se
  pidió. Documentado solo en `CLAUDE.md`/`DEPLOY.md` para quien administre
  el sitio.

### Subido directo a main / vía PR
Pendiente — no se hizo commit todavía en esta sesión.

---

## Sesión 6 — 2026-08-25

Luis pidió "avanza con todo lo que falte" — se implementó el resto del
backlog completo en una sola sesión: T-05, T-06, T-07, T-08 (resto) y
T-09. Con esto **T-01 a T-09 quedan todos completos**.

### Qué se hizo
- **T-05/T-06 (Dashboard + Informes):** `reports.php` con las 9 acciones
  (`daily-sales`, `weekly-sales`, `top-products`, `stagnant-products`,
  `cash-summary`, `margin`, `category-breakdown`, `money-type-breakdown`,
  `expiring-summary`). Aplicué proactivamente la lección de FERRIMIX D-14
  (alias de agregación en `ORDER BY`) en `stagnant-products`, repitiendo
  `MAX(s.created_at)` en vez de usar el alias. `DashboardPage.tsx` y
  `ReportsPage.tsx` (5 pestañas + selector de rango + exportar a Excel,
  CSV client-side). El gráfico de ventas es CSS puro, sin librería
  (D-30).
- **T-07 (Promociones):** `promotions.php` completo, más la pieza más
  delicada de la sesión: conectar la aplicación automática dentro de
  `sales.php::handleCreate()` — `getActivePromotionsByProduct()` +
  `computePromotionDiscount()`, sumando el descuento de promo al manual
  de cada línea (D-27) y reutilizando `buy_quantity` como tamaño del
  pack para `type: "pack_price"` (D-26, documentado porque no es obvio
  a simple vista). `PromotionsPage.tsx` con buscador de productos tipo
  chips.
- **T-08 (resto):** `suppliers.php?action=update/deactivate` +
  `SuppliersPage.tsx`. Encontré que `suppliers` nunca tuvo columna
  `is_active` en el esquema original — se agregó ahí mismo, directo en
  `schema.sql` (D-28), no como migración aparte (no hay datos reales
  desplegados todavía).
- **T-09 (Usuarios):** `users.php` completo con las mismas salvaguardas
  que FERRIMIX (un admin no puede quitarse su propio rol ni desactivarse
  a sí mismo) y `days_worked` derivado con el mismo criterio D-17 de
  FERRIMIX. `UsersPage.tsx` con modal de días trabajados.
- Se borró `components/ComingSoon.tsx` — quedó sin ningún uso una vez
  que las 9 pantallas que lo usaban como placeholder ya tienen
  implementación real.
- `CLAUDE.md` actualizado: la estructura de carpetas ya no dice que los
  endpoints devuelven `501` (mentía desde hace rato).

### Cómo se verificó (y un hallazgo de proceso, no de producto)
Se repitió el patrón de mock XHR + remount por navegación de las
sesiones anteriores, esta vez cubriendo los 5 endpoints nuevos de una
sola vez. Se verificó en el navegador: Dashboard (4 tarjetas + gráfico
de 30 barras + top productos), Informes (las 5 pestañas con datos
mockeados, incluida la traducción de medios de pago, y que "Exportar a
Excel" genera el blob sin lanzar excepciones), Promociones (**flujo
completo de creación**: nombre, tipo, buscar y agregar un producto,
guardar, y confirmar que el payload real coincide exactamente con lo
esperado), Proveedores (edición con prellenado + payload de update
correcto) y Usuarios (protección de auto-desactivación visible en la UI,
modal de días trabajados).

**Hallazgo de proceso:** al probar la búsqueda de productos dentro del
modal de Promociones, la búsqueda pareció "no funcionar" varias veces
seguidas — se investigó a fondo (interceptando `XMLHttpRequest.open`
para loggear cada URL, luego cada respuesta) antes de concluir que era
un falso positivo: combinar `dispatchEvent` + `await new Promise(setTimeout)`
+ una re-consulta del DOM **dentro de un solo script** pasado a
`javascript_exec` da resultados inconsistentes con inputs debounced —
separar "disparar el evento" y "esperar y verificar" en **dos llamadas
distintas** a la herramienta lo resolvió de inmediato y de forma
reproducible. No era un bug de `PromotionsPage.tsx`. Vale la pena
recordar esto la próxima vez que se pruebe un input con debounce vía
mock — evita perseguir fantasmas.

### Qué falló o quedó a medias
- **Sigue sin haber PHP local en este entorno** — los 5 endpoints nuevos
  de esta sesión (igual que los de las 5 sesiones anteriores) están
  escritos y revisados a mano, nunca ejecutados contra MariaDB real. Este
  es el ítem más importante para la próxima sesión o para Luis: instalar
  PHP local (o probar directo en el hosting una vez que exista) y correr
  el flujo completo de punta a punta al menos una vez.
- No se probó el cálculo real de `computePromotionDiscount()` contra una
  venta real con datos de una base de datos — solo se revisó la fórmula
  a mano con ejemplos (2x1 con cantidad 5 → 2 unidades gratis, etc.).
- Quedaron anotadas 4 ideas nuevas en `NEXT_STEPS.md` (U-06 a U-09):
  continuar una recepción parcial existente, merma parcial desde la UI,
  prioridad explícita entre promociones superpuestas, y la boleta en PDF
  (sigue bloqueada por D-06).

### Subido directo a main / vía PR
Sin subir todavía — pendiente de que Luis revise antes del commit.

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
