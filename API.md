# API — Endpoints Aaron Provisiones

Todos los endpoints retornan JSON con la forma
`{ "success": bool, "data": ..., "message": "..." }`. Patrón:
`/api/archivo.php?action=operacion` — ver D-03 en `DECISIONS.md`.

**Estado de este documento:** la mayoría de las acciones de abajo están
**sin implementar todavía** — cada archivo en `api/` ya tiene el routing y
el control de rol correctos, pero responde `501` con el mensaje
`"no implementada todavía (T-xx)"`. Este documento fija el contrato para
que el frontend se pueda construir contra una forma estable, y se va
actualizando a la forma real (requests/responses de ejemplo) a medida que
cada `T-xx` de `NEXT_STEPS.md` se implementa — igual que en FERRIMIX.

## Autenticación

**POST** `/api/auth.php?action=login` — **implementado**.

Request:
```json
{ "username": "admin", "password": "demo123" }
```

Response (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": { "id": "UUID", "username": "admin", "full_name": "Administrador", "role": "admin" }
  },
  "message": "Login exitoso"
}
```

Error (401), mismo mensaje sin importar si falló el usuario o la
contraseña:
```json
{ "success": false, "data": null, "message": "Credenciales inválidas" }
```

**POST** `/api/auth.php?action=logout` — implementado (no invalida el JWT
del lado del servidor, solo confirma; el frontend descarta el token).

**POST** `/api/auth.php?action=refresh` — implementado. Requiere
`Authorization: Bearer` con un token todavía válido, devuelve uno nuevo.

## Roles y permisos

`users.role` es `admin` | `cashier` | `warehouse_staff`. Cada endpoint
llama `middleware.php::requireRole($auth, [...])` después de
`requireAuth()` — si el rol no califica, responde `403`.

| Acción | Roles permitidos |
|---|---|
| `products.php?action=search/list/low-stock/categories` | cualquier usuario autenticado |
| `products.php?action=create/rename/deactivate` | `admin`, `warehouse_staff` |
| `sales.php` (todo el archivo) | cualquier usuario autenticado |
| `cash_register.php` (todo el archivo) | cualquier usuario autenticado |
| `inventory.php` (todo el archivo) | `admin`, `warehouse_staff` |
| `lots.php` (todo el archivo) | `admin`, `warehouse_staff` |
| `promotions.php?action=list` | cualquier usuario autenticado (el POS necesita leerlas) |
| `promotions.php?action=create/update/deactivate` | `admin` |
| `purchases.php` (todo el archivo) | `admin`, `warehouse_staff` |
| `suppliers.php?action=list` | `admin`, `warehouse_staff` |
| `suppliers.php?action=create` | `admin` |
| `users.php` (todo el archivo) | `admin` |
| `reports.php` (todo el archivo) | `admin` |

El frontend además esconde rutas/botones según el rol
(`RequireRole.tsx`, `Layout.tsx`), pero es el backend el que realmente lo
hace cumplir.

## Productos — `products.php` — **implementado** (T-02)

Todas las acciones requieren JWT. `create`/`update`/`deactivate` exigen
además rol `admin` o `warehouse_staff` (ver D-14 en `DECISIONS.md` sobre
por qué hay `update` completo y no solo `rename` como en FERRIMIX).

**GET** `?action=search&q=...&category=...` — por SKU, código de barras o
nombre (`LIKE %q%`), hasta 50 resultados. Pensado para el flujo de
escaneo del POS (T-01).

**GET** `?action=list&page=N&q=...&category=...` — catálogo paginado, 30
por página (ver D-15). `q`/`category` son opcionales, filtran igual que
`search`.
```json
{
  "success": true,
  "data": {
    "products": [ /* forma de producto, ver abajo */ ],
    "page": 1, "per_page": 30, "total": 214, "total_pages": 8
  },
  "message": "Productos listados"
}
```

**GET** `?action=low-stock` — `stock_current <= stock_critical`, hasta 100.

**GET** `?action=categories` — `{ id, name, icon }[]`.

Forma de producto (las 4 acciones de lectura devuelven esto):
```json
{
  "id": "UUID", "sku": "ARR-01", "barcode": "7801234500001",
  "name": "Arroz grado 1 1kg", "description": null, "image_url": null,
  "unit_of_measure": "units", "is_scale_item": false, "has_expiration": false,
  "purchase_price": 890, "selling_price": 1290,
  "stock_current": 42, "stock_critical": 10, "is_low_stock": false,
  "is_active": true,
  "category": { "id": "UUID", "name": "Almacén" },
  "supplier": { "id": "UUID", "name": "Distribuidora XYZ" }
}
```

**POST** `?action=create`

Request:
```json
{
  "sku": "ARR-01", "barcode": "7801234500001", "name": "Arroz grado 1 1kg",
  "category_id": "UUID o null", "supplier_id": "UUID o null",
  "unit_of_measure": "units", "is_scale_item": false, "has_expiration": false,
  "purchase_price": 890, "selling_price": 1290,
  "stock_critical": 10, "stock_current": 50
}
```
`sku`, `name`, `purchase_price`, `selling_price` son obligatorios.
`unit_of_measure` debe ser `units`/`kilos`/`liters`. `409` si el SKU o
código de barras ya existe. Si `stock_current` viene > 0, se registra
también como `inventory_movements` tipo `in` ("Carga inicial de stock")
— nunca se toca `stock_current` sin dejar rastro.

**POST** `?action=update` — actualización parcial, solo los campos que
vengan en el body (excepto `stock_current`, que no es editable acá — usa
`inventory.php?action=movement`, ver D-14).

Request:
```json
{ "id": "UUID", "selling_price": 1350, "stock_critical": 15 }
```
`404` si no existe o está desactivado. `409` si el código de barras nuevo
ya lo usa otro producto.

**POST** `?action=deactivate` — soft-delete (`is_active = 0`), mismo
patrón que FERRIMIX: nunca se borra la fila porque `sales_details` e
`inventory_movements` la referencian.

Request: `{ "id": "UUID" }`. `404` si no existe o ya estaba desactivado.

## Ventas — `sales.php` — **implementado** (T-01)

Todo el archivo exige JWT (`get` incluido — a diferencia de FERRIMIX, ver
D-18 en `DECISIONS.md`, no hay link público de boleta todavía).

**POST** `?action=create`

Request:
```json
{
  "items": [
    { "product_id": "UUID", "quantity": 2, "discount_amount": 100 },
    { "product_id": "UUID-granel", "quantity": 0.485 }
  ],
  "payment_method": "cash",
  "invoice_type": "boleta",
  "discount_amount": 0,
  "amount_received": 6000,
  "customer_name": null,
  "customer_rut": null
}
```

El precio de cada línea se recalcula del lado del servidor a partir de
`products.selling_price` — el precio que mande el cliente se ignora.
`cash_register_id` lo determina el servidor buscando la caja abierta del
usuario autenticado (D-07); si no tiene caja abierta, la venta se permite
igual con `cash_register_id = NULL`. Todo corre en una transacción con
`SELECT ... FOR UPDATE` por producto.

`items[].discount_amount` (por línea) y el `discount_amount` de nivel
raíz (sobre la boleta completa) son opcionales, siempre en pesos, nunca
porcentaje — el servidor los clampea contra el subtotal real (un
descuento no puede superar el subtotal de su línea, ni dejar la venta en
negativo), y los redondea a peso entero. El de línea se aplica primero;
el de boleta se calcula sobre lo que queda.

**Redondeo (Chile, D-19 style — mismo criterio que FERRIMIX D-29):** si
`payment_method` es `"cash"`, `total_amount` se redondea al múltiplo de
$10 más cercano. `card`/`transfer`/`mixed` cobran el monto exacto.

**FEFO para productos con `has_expiration = true`** (D-09): se descuenta
primero del lote que vence antes. Si el producto no tiene lotes cargados
todavía, se descuenta el agregado igual (ver D-17).

`amount_received` (opcional, solo con `payment_method: "cash"`): si viene,
el servidor calcula `change_amount` contra su propio total (nunca contra
uno mandado por el cliente) y responde `400` si el efectivo no alcanza.
Mandarlo con otro método de pago responde `400`.

Response (201):
```json
{
  "success": true,
  "data": {
    "sale_id": "UUID",
    "invoice_number": "000001",
    "invoice_type": "boleta",
    "gross_subtotal": 30000,
    "discount_total": 1500,
    "subtotal": 28500,
    "iva": 5415,
    "rounding_adjustment": 0,
    "total_amount": 33920,
    "amount_received": 40000,
    "change_amount": 6080,
    "items": [
      { "product_id": "UUID", "product_name": "Arroz grado 1 1kg", "quantity": 2, "unit_price": 1290, "discount_amount": 0, "subtotal": 2580 }
    ]
  },
  "message": "Venta completada"
}
```

Error (400) — stock insuficiente, carrito vacío, efectivo insuficiente o
método/tipo inválido:
```json
{ "success": false, "data": null, "message": "Stock insuficiente de \"Queso Gouda al corte\" (disponible: 4.2)" }
```

**GET** `?action=list` — tres modos, sin mezclarlos:
- Sin parámetros: últimas 20 ventas.
- `?date=YYYY-MM-DD`: ventas de un día, hasta 100.
- `?page=N`: paginado, 15 por página —
  `{ sales: [...], page, per_page, total, total_pages }`.

**GET** `?action=get&id=UUID` — detalle completo con líneas, para el
resumen en pantalla del POS (todavía sin PDF/impresión, ver D-20).

## Caja — `cash_register.php` — **implementado** (T-01)

Todas requieren JWT. La caja siempre es la del usuario autenticado,
resuelta server-side (D-07) — no se puede abrir/cerrar la caja de otra
persona ni mandar un `cash_register_id` desde el cliente.

**POST** `?action=open` — `{ "opening_amount": 100000 }`. `400` si el
usuario ya tiene una caja abierta.

**POST** `?action=close` — `{ "closing_amount": 250000 }`. La cuadratura
solo considera ventas en efectivo (`payment_method = 'cash'`).
```json
{
  "success": true,
  "data": {
    "cash_register_id": "UUID", "opening_amount": 100000, "cash_sales": 135700,
    "expected_amount": 235700, "closing_amount": 250000, "difference": 14300, "status": "closed"
  },
  "message": "Caja cerrada"
}
```

**GET** `?action=current` — caja abierta del usuario actual, o
`data: null` si no tiene ninguna.
```json
{
  "success": true,
  "data": {
    "cash_register_id": "UUID", "opening_amount": 50000, "cash_sales": 187400,
    "current_amount": 237400, "opened_at": "2026-08-25 08:55:12", "status": "open"
  },
  "message": "Caja actual"
}
```

## Bodega — `inventory.php` — **implementado** (T-02)

Todo el archivo exige rol `admin` o `warehouse_staff`.

**POST** `?action=movement`

Request:
```json
{ "product_id": "UUID", "movement_type": "in", "quantity": 10, "reason": "Reposición", "unit_cost": 890 }
```
`movement_type`: `in` (siempre suma) | `out`/`loss` (siempre restan,
`quantity` debe ser positivo) | `adjustment` (`quantity` puede ser
negativo). Rechaza con `400` si el movimiento dejaría `stock_current`
negativo. `unit_cost` solo es válido con `in` — si viene, además de
guardarse en el movimiento actualiza `products.purchase_price` (igual
patrón que FERRIMIX). Usa `SELECT ... FOR UPDATE` dentro de una
transacción para que dos ajustes simultáneos no se pisen.

Response:
```json
{ "success": true, "data": { "product_id": "UUID", "stock_before": 32, "stock_after": 42 }, "message": "Movimiento registrado" }
```

**GET** `?action=list` — últimos 50 movimientos, con nombre/SKU del
producto.

**GET** `?action=reorder-suggestions` — **sin implementar todavía**
(responde `501`), se queda en este archivo a propósito (ver D-16 en
`DECISIONS.md`): depende de tener ventas reales (T-01) para calcular el
promedio diario. Se implementa junto con T-05.

**Nota (D-17):** los ajustes de este endpoint operan sobre
`products.stock_current` en agregado, no bajan a nivel de `product_lots`
todavía — eso es trabajo de T-04.

## Vencimientos — `lots.php` (T-04, pendiente)

Nuevo respecto a FERRIMIX.

- `GET ?action=expiring` — lotes con `expiration_date` dentro de
  `EXPIRATION_WARNING_DAYS` (config.php, default 7 días) y
  `quantity_remaining > 0`.
- `GET ?action=expired` — `expiration_date < hoy` y `quantity_remaining > 0`.
- `POST ?action=adjust` — marca un lote vencido como merma (crea
  `inventory_movements` tipo `loss`), acción explícita de bodega, nunca
  automática.

## Promociones — `promotions.php` (T-07, pendiente)

Nuevo respecto a FERRIMIX.

- `GET ?action=list` — promociones activas, con sus productos.
- `POST ?action=create` / `?action=update` / `?action=deactivate`

Forma esperada:
```json
{
  "id": "UUID", "name": "2x1 Bebidas 1.5L",
  "type": "nxm | pack_price",
  "buy_quantity": 2, "pay_quantity": 1, "pack_price": null,
  "product_ids": ["UUID", "UUID"]
}
```

## Compras — `purchases.php` — **implementado** (T-03)

Todo el archivo exige rol `admin` o `warehouse_staff`.

**GET** `?action=list` — todas las órdenes, más recientes primero:
```json
{
  "success": true,
  "data": [
    { "id": "UUID", "purchase_number": "OC-000001", "purchase_date": "2026-08-25", "received_date": "2026-08-25", "total_amount": 2090, "status": "received", "supplier_name": "Distribuidora Central" }
  ],
  "message": "Órdenes de compra listadas"
}
```
`status`: `pending` (nada recibido) | `partial` | `received` (todo
recibido, `received_date` se llena solo) | `cancelled` (sin endpoint para
cancelar todavía, no se pidió).

**GET** `?action=get&id=UUID` — detalle con líneas (incluye
`received_quantity`, `expiration_date`, `lot_code` de la última
recepción de cada línea — ver D-23 en `DECISIONS.md`).

**POST** `?action=create` — no toca stock, crea la orden en `pending`.

Request:
```json
{
  "supplier_id": "UUID",
  "notes": "opcional",
  "items": [{ "product_id": "UUID", "quantity": 50, "unit_cost": 3000 }]
}
```
`purchase_number` se genera solo (`OC-NNNNNN`, secuencial, mismo riesgo
de condición de carrera aceptado que `invoice_number` — ver D-19).
`total_amount` se calcula del lado del servidor.

**POST** `?action=receive` — recepción parcial admitida, `quantity` es lo
que llega **en esta recepción** (incremental, no acumulado).

Request:
```json
{
  "purchase_id": "UUID",
  "items": [
    { "product_id": "UUID", "quantity": 20 },
    { "product_id": "UUID-perecible", "quantity": 10, "expiration_date": "2026-09-15", "lot_code": "L-0847" }
  ]
}
```
`400` si la cantidad supera lo pendiente de esa línea, si la orden está
cancelada, o si ya estaba completamente recibida. Por cada línea: suma
`products.stock_current`, inserta un `inventory_movements` tipo `in`
(`reference_id` = la orden), y si el producto tiene
`has_expiration = true`, crea una fila nueva en `product_lots` con el
`expiration_date`/`lot_code` de *esa* recepción (ver D-23 — cada
recepción parcial puede traer un lote distinto). Recalcula el `status`
de la orden completa según cuánto se haya recibido en total. Todo en una
transacción.

Response:
```json
{ "success": true, "data": { "purchase_id": "UUID", "status": "received" }, "message": "Recepción registrada" }
```

## Proveedores — `suppliers.php` — **implementado** (`list`/`create`, T-08 backend adelantado por T-03, ver D-22/D-24)

`?action=list` y `?action=create` exigen rol `admin` o `warehouse_staff`
— a diferencia de FERRIMIX (admin-only), bodega necesita poder cargar un
proveedor nuevo al recibir mercadería (D-22).

**GET** `?action=list` — `{ id, name, rut, phone, email }[]`.

**POST** `?action=create` — `name` y `rut` obligatorios, resto opcional.
`409` si el RUT ya existe.

**Pendiente de T-08:** `?action=update`/`?action=deactivate` y la pantalla
dedicada de gestión — ver D-24.

## Usuarios — `users.php` (T-09, pendiente)

- `GET ?action=list` / `?action=workdays&user_id=UUID`
- `POST ?action=create` / `?action=update` / `?action=activate` /
  `?action=deactivate` / `?action=reset-password`

## Informes — `reports.php` (T-05/T-06, pendiente)

- `GET ?action=daily-sales` / `?action=weekly-sales` / `?action=top-products`
  / `?action=stagnant-products` / `?action=cash-summary` / `?action=margin`
  / `?action=category-breakdown` / `?action=money-type-breakdown`
- `GET ?action=expiring-summary` — nuevo respecto a FERRIMIX, cuenta de
  productos por vencer/vencidos para el Dashboard.

## Códigos de error

| Código | Significado |
|---|---|
| 200 | OK |
| 400 | Bad Request |
| 401 | Unauthorized (token inválido/expirado/ausente) |
| 403 | Forbidden (rol sin permiso) |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 501 | No implementado todavía (placeholder de este scaffold) |
| 500 | Server Error |

## Headers requeridos

Todas las rutas protegidas:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```
