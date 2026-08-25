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

## Productos — `products.php` (T-01/T-02, pendiente)

- `GET ?action=search&q=...&category=...` — por SKU, código de barras o nombre.
- `GET ?action=list` — todos los productos activos.
- `GET ?action=low-stock` — `stock_current <= stock_critical`.
- `GET ?action=categories`
- `POST ?action=create` / `?action=rename` / `?action=deactivate`

Forma de producto esperada (igual base que FERRIMIX + los campos nuevos):
```json
{
  "id": "UUID",
  "sku": "...", "barcode": "...", "name": "...",
  "unit_of_measure": "units | kilos | liters",
  "is_scale_item": false,
  "has_expiration": false,
  "price": 0, "stock": 0, "stock_critical": 0, "is_low_stock": false,
  "category": { "id": "UUID", "name": "..." }
}
```

## Ventas — `sales.php` (T-01, pendiente)

- `POST ?action=create` — IVA 19%, redondeo a $10 en efectivo, descuentos
  y promociones resueltos en servidor (nunca confiar en montos del
  cliente), FEFO para productos con `has_expiration = true` — ver D-09/D-10
  en `DECISIONS.md`.
- `GET ?action=list`
- `GET ?action=get&id=UUID`

## Caja — `cash_register.php` (T-01, pendiente)

- `POST ?action=open` — `{ "opening_amount": 100000 }`
- `POST ?action=close` — `{ "closing_amount": 250000 }`
- `GET ?action=current`

La caja siempre es la del usuario autenticado, resuelta server-side — ver
D-07 en `DECISIONS.md`.

## Bodega — `inventory.php` (T-02, pendiente)

- `POST ?action=movement` — `{ "product_id", "movement_type": "in|out|adjustment|loss", "quantity", "reason", "unit_cost"? }`
- `GET ?action=list`
- `GET ?action=reorder-suggestions`

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

## Compras — `purchases.php` (T-03, pendiente)

- `GET ?action=list` / `?action=get&id=UUID`
- `POST ?action=create` — no toca stock, crea la orden en `pending`.
- `POST ?action=receive` — recepción parcial admitida. Si la línea trae
  `expiration_date`/`lot_code`, crea la fila correspondiente en
  `product_lots` además de sumar stock e insertar `inventory_movements`.

## Proveedores — `suppliers.php` (T-08, pendiente)

- `GET ?action=list`
- `POST ?action=create`

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
