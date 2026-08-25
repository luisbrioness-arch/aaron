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
