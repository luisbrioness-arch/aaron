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
