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

---

## Backlog — construir sobre el scaffold

### T-01: Punto de venta + caja
- **Qué falta:** `sales.php` y `cash_register.php` reales (hoy responden
  `501`); `POSPage.tsx` funcional — escaneo de código de barras como flujo
  principal, carrito, venta por peso (`is_scale_item`), promociones
  automáticas aplicadas (depende de T-07), descuento manual, cobro
  (efectivo/tarjeta/transferencia/mixto), redondeo a $10, vuelto, apertura/
  cierre de caja, boleta (ver D-06 para PDF vs. `window.print()`).
- **Reglas de negocio a respetar:** IVA 19%, redondeo solo en efectivo,
  descuentos siempre en pesos y clampeados server-side, FEFO para
  productos con `has_expiration = true` (D-09).

### T-02: Bodega
- **Qué falta:** `products.php` (create/rename/deactivate) e
  `inventory.php` reales; `BodegaPage.tsx` — catálogo, alta/edición de
  productos (código de barras, granel, vencimiento, categoría), ajuste de
  stock manual (merma, corrección).

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
  2x1, 3x2, pack a precio fijo, asignar productos. Lógica de aplicación
  automática en `sales.php` (depende de T-01).

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
