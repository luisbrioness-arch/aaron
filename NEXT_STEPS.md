# NEXT_STEPS — Backlog

## 🔴 Bloqueantes — decisiones del negocio, no de código

Ninguna bloquea seguir construyendo, pero conviene cerrarlas pronto (ver el
documento de arquitectura, sección "Supuestos abiertos"):

- **Dominio y hosting** — todavía no confirmado (ver D-02/D-04 en `DECISIONS.md`).
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

---

## Backlog — construir sobre el scaffold

### T-03: Recepción de compras
- **Qué falta:** `purchases.php` real; `RecepcionPage.tsx` — pensada para
  una cadena de escaneos, no un formulario lento. Al recibir, si la línea
  trae vencimiento, crea la fila en `product_lots`.

### T-04: Vencimientos y alertas
- **Qué falta:** `lots.php` real; `AlertasPage.tsx` — stock bajo (ya
  existía el patrón) + por vencer/vencido (nuevo), con acción rápida
  "marcar como merma".

### T-05: Dashboard
- **Qué falta:** `reports.php?action=daily-sales/weekly-sales/top-products/
  expiring-summary`; `DashboardPage.tsx`.

### T-06: Informes
- **Qué falta:** `reports.php?action=margin/category-breakdown/
  money-type-breakdown/stagnant-products/cash-summary`; `ReportsPage.tsx`,
  exportar a Excel (mismo patrón que FERRIMIX: CSV armado en el navegador,
  no una librería nueva).

### T-07: Promociones
- **Qué falta:** `promotions.php` real; `PromotionsPage.tsx` — crear/editar
  2x1, 3x2, pack a precio fijo, asignar productos. `sales.php` ya existe
  (T-01) pero todavía no consulta `promotions`/`promotion_products` — hay
  que agregar esa detección dentro de `handleCreate()` (mismo lugar donde
  hoy se procesa `discount_amount` por línea) y setear
  `sales_details.promotion_id` cuando aplique.

### T-08: Proveedores
- **Qué falta:** `suppliers.php` real; `SuppliersPage.tsx` — CRUD completo
  para admin, lectura para bodega (selector en Recepción).

### T-09: Usuarios
- **Qué falta:** `users.php` real; `UsersPage.tsx` — crear/editar/activar/
  desactivar/resetear contraseña, 3 roles.

---

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
