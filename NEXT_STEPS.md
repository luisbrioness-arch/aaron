# NEXT_STEPS — Backlog

## 🔴 Bloqueantes — decisiones del negocio, no de código

Ninguna bloquea seguir construyendo, pero conviene cerrarlas pronto (ver el
documento de arquitectura, sección "Supuestos abiertos"):

- **Dominio y hosting** — todavía no confirmado (ver D-02/D-04 en
  `DECISIONS.md` y `DEPLOY.md`). El workflow de deploy y los 3 secrets FTP
  que necesita quedan listos pero inactivos hasta que esto se resuelva.
- **Acceso Composer/SSH del hosting** — decide si T-01 usa TCPDF/mPDF real
  o el respaldo HTML + `window.print()` (ver D-06).
- **Umbral de días para "por vencer"** — 7 días por defecto
  (`EXPIRATION_WARNING_DAYS` en `config.php`), confirmar si el negocio
  quiere otro número.
- **Factura (no boleta)** — el campo existe (`invoice_type`) pero no se
  pidió nada especial; avisar si Aaron Provisiones le vende seguido a
  otros negocios.

## ✅ Completado — Scaffold inicial del proyecto

### Monorepo, documentación y esquema
- **Descripción:** primera sesión del proyecto. Se armó la arquitectura
  completa (revisada y aprobada), luego el scaffold: monorepo npm
  workspaces, frontend Vite + React 19 + Tailwind 4, esquema de base de
  datos completo (15 tablas), login funcional de punta a punta
  (`auth.php` ↔ `LoginPage.tsx`), y los 6 documentos obligatorios.
- **Status:** ✅ `npm run build:frontend` compila limpio. Login sin
  probar en vivo todavía (no hay servidor PHP corriendo, ver `TESTING`
  más abajo en `CLAUDE.md`).
- Sin reporte de origen — pedido directo en el chat.

## ✅ Completado — T-01: Punto de venta + caja

- **Descripción:** `sales.php` (`create`/`list`/`get`) y
  `cash_register.php` (`open`/`close`/`current`) implementados de punta a
  punta; `POSPage.tsx` con búsqueda tipo-mientras-escribes como flujo
  principal (dobla como "grid de respaldo" — no se construyó una grilla de
  categorías separada, ver limitación abajo), prompt de cantidad para
  productos a granel, descuento por línea y por boleta, selector de medio
  de pago, cálculo de vuelto, y una pantalla de resumen de venta al
  cobrar. `CashRegisterBanner.tsx` con apertura/cierre de caja. Reglas de
  negocio: IVA 19%, redondeo a $10 en efectivo, descuentos clampeados
  server-side, FEFO para productos con `has_expiration = true` (con
  fallback documentado si todavía no hay lotes — D-17/D-20 en
  `DECISIONS.md`). Decisiones nuevas D-18 a D-21.
- **Status:** ✅ Build limpio. Verificado en el navegador de forma más
  profunda que T-02: se interceptaron las respuestas de
  `products.php?action=search` a nivel de XHR para poder ejercitar el
  flujo completo del carrito sin backend real — se agregó un producto
  normal y uno a granel, se aplicó un descuento de línea, y se confirmó a
  mano que el subtotal/IVA/total mostrados coinciden exactamente con el
  cálculo que hace `sales.php` (IVA redondeado, total redondeado a $10).
  El envío final (`?action=create`) sí pega contra el backend real
  (inexistente en este entorno) y se confirmó que el error se maneja con
  gracia sin perder el carrito.
- **Qué NO se probó:** el flujo completo contra una base de datos real
  (crear la venta, ver que el stock baje, que la caja cuadre) — sigue sin
  haber PHP local. Tampoco se construyó una grilla de productos por
  categoría separada de la búsqueda (simplificación de alcance, ver
  HANDOFF.md). Boleta en PDF/impresión queda pendiente de D-06.
- Sin reporte de origen — pedido directo en el chat.

## ✅ Completado — T-02: Bodega (catálogo de productos)

- **Descripción:** `products.php` (search/list paginado/low-stock/
  categories/create/update/deactivate) e `inventory.php`
  (movement/list) implementados de punta a punta; `BodegaPage.tsx` con
  búsqueda, filtro por categoría, paginación, alta/edición de producto
  (`ProductFormModal`) y ajuste de stock (`StockAdjustModal`), todo
  reactivo al rol (cajero ve la tabla en solo lectura). Decisiones
  registradas en D-14 a D-17 de `DECISIONS.md`.
- **Status:** ✅ Build limpio. Verificado en navegador simulando sesión de
  admin (sin backend PHP real disponible): la página carga, el error de
  conexión se maneja con gracia, el modal "Agregar producto" abre con los
  11 campos esperados. **No probado contra una base de datos real** — no
  hay PHP local instalado en este entorno (mismo límite que T-anterior).
- `reorder-suggestions` de `inventory.php` queda pendiente a propósito
  (responde `501`) — depende de ventas reales de T-01, ver D-16.
- Sin reporte de origen — pedido directo en el chat.

## ✅ Completado — T-03: Recepción de compras

- **Descripción:** `purchases.php` (`list`/`get`/`create`/`receive`)
  implementado de punta a punta; se adelantó también el backend de T-08
  (`suppliers.php?action=list/create`, ver D-22/D-24) porque T-03 lo
  necesitaba para el selector de proveedor. `RecepcionPage.tsx`: elegir
  proveedor (con alta rápida inline, `SupplierQuickAddModal`), escanear/
  buscar productos en cadena, cantidad + costo + vencimiento/lote por
  línea, y un solo botón "Confirmar recepción" que crea la orden y la
  recibe en el mismo paso (dos llamadas a la API, una sola acción para
  quien usa la pantalla). Lista de "Órdenes recientes" de solo lectura
  para visibilidad. Decisiones nuevas D-22 a D-24.
- **Status:** ✅ Build limpio. **Esta fue la verificación más completa de
  las tres tareas hechas hasta ahora:** se interceptaron
  `suppliers.php?action=list`, `purchases.php?action=list/create/receive`
  y `products.php?action=search` a nivel de XHR, y se ejercitó el flujo
  real completo — seleccionar proveedor, agregar un producto normal y uno
  con vencimiento, confirmar sin fecha de vencimiento (correctamente
  rechazado por la validación del cliente), completar la fecha, confirmar
  de nuevo, e inspeccionar el payload exacto de las dos llamadas
  (`create` y `receive`) para confirmar que `product_id`/`quantity`/
  `unit_cost`/`expiration_date`/`lot_code` viajan como se esperaba. La
  orden apareció como "Recibida" en la lista de recientes al final.
- **Qué NO se probó:** contra una base de datos real (que
  `product_lots`/`inventory_movements` se escriban de verdad, que el
  `status` de la orden se recalcule bien con MariaDB) — sigue sin haber
  PHP local. Se intentó instalar PHP vía winget para esta sesión también;
  sigue roto (ver HANDOFF.md sesión anterior). No se construyó la
  continuación de una recepción parcial existente (recibir el saldo
  pendiente de una orden `partial` ya creada) — el flujo actual siempre
  crea una orden nueva por recepción.
- Sin reporte de origen — pedido directo en el chat.

---

## ✅ Completado — T-04: Vencimientos y alertas

- **Descripción:** `lots.php` (`expiring`/`expired`/`adjust`)
  implementado; `AlertasPage.tsx` con tres secciones (Vencidos, Por
  vencer, Stock bajo — esta última reutiliza
  `products.php?action=low-stock` de T-02) y el botón "Marcar merma" solo
  en la sección Vencidos (D-25: no tiene sentido descartar algo que
  todavía no venció). Decisión nueva D-25.
- **Status:** ✅ Build limpio. Verificado con el mismo patrón de mock +
  remount de la sesión anterior: las tres secciones cargan datos falsos
  correctamente formateados (fechas en español, badge de "X días" para
  por vencer), y se probó el flujo completo de "Marcar merma" — se
  confirmó que el payload enviado es solo `{ lot_id }` (sin `quantity`,
  como corresponde al comportamiento "todo el lote" por defecto) y que la
  fila desaparece de la lista de Vencidos tras la respuesta exitosa.
- **Qué NO se probó:** contra base de datos real — sigue sin haber PHP
  local (mismo límite que las tareas anteriores). No se expuso en la UI
  la opción de mermar solo una parte de un lote (la API sí la soporta vía
  `quantity`, ver D-25).
- Sin reporte de origen — pedido directo en el chat.

---

## ✅ Completado — T-05/T-06: Dashboard e Informes

- **Descripción:** `reports.php` completo (`daily-sales`, `weekly-sales`,
  `top-products`, `stagnant-products`, `cash-summary`, `margin`,
  `category-breakdown`, `money-type-breakdown`, `expiring-summary`).
  `DashboardPage.tsx`: 4 tarjetas de estado, gráfico de barras de los
  últimos 30 días (CSS a mano, sin librería — D-30), top 10 productos.
  `ReportsPage.tsx`: selector de rango de fechas + 5 pestañas (Margen,
  Categorías, Medios de pago, Estancados, Caja del día) y "Exportar a
  Excel" (CSV client-side, `;` + BOM, mismo patrón que FERRIMIX).
  Decisiones D-29 y D-30.
- **Status:** ✅ Build limpio. Verificado con mock + remount: las 4
  tarjetas y el gráfico de 30 barras cargan con datos falsos, las 5
  pestañas de Informes muestran sus tablas correctamente (incluida la
  traducción de `payment_method` a español), y el botón "Exportar a
  Excel" genera el blob/descarga sin errores (`margen.csv`).
- **Qué NO se probó:** contra base de datos real — sigue sin haber PHP
  local. Tampoco se descargó/inspeccionó el contenido real del CSV
  generado, solo que la llamada no lanza excepciones.
- Sin reporte de origen — pedido directo en el chat.

## ✅ Completado — T-07: Promociones

- **Descripción:** `promotions.php` (`list`/`create`/`update`/
  `deactivate`) implementado, incluida la convención de `pack_price`
  reutilizando `buy_quantity` como tamaño del pack (D-26).
  `sales.php::handleCreate()` ahora detecta promociones activas por
  producto y suma su descuento al manual de la línea (D-27).
  `PromotionsPage.tsx`: tarjetas con descripción legible de la regla
  ("Compra 2 y paga 1" / "Pack de 6 a $5.000"), modal de alta/edición con
  buscador de productos tipo chips. Decisiones D-26/D-27.
- **Status:** ✅ Build limpio. Verificado end-to-end con mock: se creó una
  promoción nueva desde cero (nombre, tipo nxm, buscar y agregar un
  producto, guardar) y se confirmó que el payload mandado a
  `?action=create` es exactamente el esperado
  (`{name, type, buy_quantity, pay_quantity, ends_at, product_ids}`), que
  la promoción aparece en la lista con la descripción correcta, y que el
  formulario prellena bien al editar.
- **Nota de proceso:** durante esta verificación se persiguió una falsa
  alarma (la búsqueda de productos "no encontraba resultados") que
  resultó ser un problema de cómo se estaba probando, no del código — ver
  el detalle en HANDOFF.md, vale la pena leerlo antes de la próxima
  sesión de pruebas con mocks.
- **Qué NO se probó:** el cálculo real del descuento de promoción dentro
  de una venta contra una base de datos real (la lógica en
  `computePromotionDiscount()` se revisó a mano, con ejemplos calculados
  a mano, pero no se ejecutó contra MariaDB).
- Sin reporte de origen — pedido directo en el chat.

## ✅ Completado — T-08: Proveedores (resto)

- **Descripción:** se completó lo que quedaba pendiente desde T-03:
  `suppliers.php?action=update`/`?action=deactivate`, más la columna
  `is_active` que faltaba en el esquema (D-28). `SuppliersPage.tsx`:
  tabla con editar/desactivar y modal de alta/edición.
- **Status:** ✅ Build limpio. Verificado con mock: la tabla carga, el
  modal de edición prellena los datos del proveedor existente, y se
  confirmó que el payload de `?action=update` refleja el cambio hecho
  (teléfono editado) preservando el resto de los campos.
- Sin reporte de origen — pedido directo en el chat.

## ✅ Completado — T-09: Usuarios

- **Descripción:** `users.php` completo (`list` con días trabajados
  derivados — mismo criterio D-17 de FERRIMIX —, `workdays`, `create`,
  `update`, `activate`, `deactivate`, `reset-password`), con las mismas
  salvaguardas de FERRIMIX: un admin no puede quitarse su propio rol ni
  desactivar su propia cuenta. `UsersPage.tsx`: tabla con las 3 acciones
  por fila más un botón de "días trabajados" que abre el detalle.
- **Status:** ✅ Build limpio. Verificado con mock: la tabla carga con
  ambos roles mostrados en español, se confirmó que el botón "Desactivar"
  está deshabilitado para el propio usuario logueado pero habilitado para
  otros (protección D-visible en la UI, no solo en el backend), y que el
  modal de días trabajados muestra el detalle correcto.
- **Qué NO se probó:** creación/edición real de usuarios contra base de
  datos, ni que un segundo intento de "quitarse el rol admin" sea
  rechazado en el backend real (la validación se revisó a mano en
  `users.php`, no se ejecutó).
- Sin reporte de origen — pedido directo en el chat.

---

**Con esto, T-01 a T-09 están completos.** El backlog nombrado en el
documento de arquitectura original ya no tiene tareas pendientes — lo
que queda son los bloqueantes de negocio de arriba (dominio/hosting,
Composer/SSH, etc.), las ideas U-xx de abajo, y **verificar todo contra
una base de datos real**, que ninguna sesión hasta ahora pudo hacer por
falta de PHP local en este entorno — ver HANDOFF.md para el detalle
completo de qué se verificó y qué no en cada tarea.

## Ideas para más adelante (U-xx)

- **U-01:** Integración SII (facturación electrónica real) — fase futura,
  confirmado desde el pedido original.
- **U-02:** Balanza conectada — puerta abierta en el esquema
  (`is_scale_item`), sin implementar. Requiere parsear el prefijo de
  código de barras de peso variable (formato EAN-13 tipo `2XXXXX...`) en
  el handler de escaneo del POS.
- **U-03:** Multi-sucursal — el esquema no tiene `branch_id` en ningún
  lado porque se confirmó tienda única. Si esto cambia, agregar
  `branch_id` nullable a `products`/`sales`/`cash_registers`/`purchases`.
- **U-04:** Promociones por categoría completa (hoy son por producto
  individual vía `promotion_products`).
- **U-05:** Alcohol/tabaco — si el negocio empieza a vender esto, ver D-11
  en `DECISIONS.md` para el cambio mínimo necesario.
- **U-06:** Continuar una recepción parcial existente — hoy
  `RecepcionPage.tsx` siempre crea una orden nueva; recibir el saldo
  pendiente de una orden que quedó `partial` necesita una pantalla/flujo
  aparte.
- **U-07:** Merma parcial de un lote desde la UI — `lots.php?action=adjust`
  ya soporta un `quantity` parcial, pero `AlertasPage.tsx` solo ofrece
  mermar el lote completo (D-25).
- **U-08:** Prioridad explícita cuando un producto tiene más de una
  promoción activa a la vez (hoy gana la primera que encuentre la
  consulta SQL, ver D-27).
- **U-09:** Boleta en PDF real o al menos HTML + `window.print()` — sigue
  bloqueada por D-06 (confirmar acceso Composer/SSH del hosting real).

---

## ✅ Completado (parcial) — Modo debug y deploy automático, tal cual FERRIMIX

- **Descripción:** se portaron dos mecanismos de FERRIMIX que no
  formaban parte del backlog original T-01/T-09: el modo debug
  (`api/debug_report.php`, `frontend/src/lib/debug-mode.ts`, FAB
  "Reportar problema", reportes `.md` en `upgrade/fixes/`) y el scaffold
  de deploy automático (`.github/workflows/deploy.yml` y
  `sync-debug-reports.yml`, más `DEPLOY.md` nuevo). Detalle completo en
  D-31 de `DECISIONS.md`.
- **Status:** ✅ El modo debug funciona ya en local (`npm run dev` +
  `?Debug=1`) — no depende de hosting. ⚠️ El deploy automático **no está
  activo**: sigue bloqueado por los mismos pendientes de siempre (dominio/
  hosting sin confirmar — D-02/D-04, cero secrets FTP configurados en
  GitHub). Los workflows quedan listos con un dominio placeholder
  (`aaronprovisiones.hogartv.cl`) marcado como TBD.
- **Qué falta para activar el deploy:** confirmar dominio real con Luis,
  reemplazar el placeholder en los 4 lugares que tienen que cambiar juntos
  (los dos `.yml`, `vite.config.ts`, `public/.htaccess` — ver D-02),
  configurar `FTP_SERVER`/`FTP_USERNAME`/`FTP_PASSWORD` como secrets del
  repo, y verificar la ruta real del chroot FTP con un
  `workflow_dispatch` de prueba antes de confiar en un run verde.
- Pedido directo en el chat ("hagamos el procesamiento tal cual FERRIMIX").
