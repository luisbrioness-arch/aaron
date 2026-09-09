# Aaron Provisiones — guía para agentes de IA (Claude Code, Cursor, etc.)

Punto de entrada para cualquier herramienta de IA o persona nueva en este
repo. El protocolo de abajo es obligatorio, no una sugerencia — es lo
único que conecta una sesión con la siguiente.

## Qué es esto

Sistema de Punto de Venta + gestión de inventario para Aaron Provisiones
(minimarket/abarrotes, Chile). Mismo patrón de stack y flujo de trabajo
que **FERRIMIX** (POS de ferretería del mismo autor, ya en producción) y
**Parque San Pedro**, adaptado a lo que un minimarket necesita y una
ferretería no: volumen alto de SKU con código de barras como flujo
principal, venta a granel, vencimientos por lote, y promociones tipo
2x1/3x2. El documento de arquitectura original (revisado antes de escribir
código) tiene el razonamiento completo — pídeselo a Luis si no lo tienes
a mano.

Monorepo npm workspaces:

| Carpeta | Stack | Qué es |
|---|---|---|
| `frontend/` | React 19 + Vite + Tailwind 4, salida estática | SPA de POS, Bodega e Informes |
| `api/` | PHP **8.1+** + PDO/MariaDB, sin framework | Backend real (probado en 8.1 y 8.5) |

**No hay Node.js corriendo en el servidor.** `frontend/` compila a
archivos estáticos; `api/` es PHP plano pensado para hosting compartido
(hosting real todavía sin confirmar — ver D-02 en `DECISIONS.md`). Node
solo se usa para compilar: en tu máquina o en GitHub Actions (todavía sin
configurar, ver D-04).

## Comandos

```bash
npm install                # una vez, en la raíz
npm run dev -w frontend    # frontend en localhost:5173
npm run build:frontend     # build de producción (corre tsc primero)
php -S localhost:8000 -t api   # backend PHP local (requiere copiar config.example.php)
```

Primer setup del backend local:
```bash
cd api
cp config.example.php config.php
# edita config.php con tus credenciales de MariaDB local
mysql -u root -p -e "CREATE DATABASE aaron_provisiones CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p aaron_provisiones < db/schema.sql
mysql -u root -p aaron_provisiones < db/seed.sql
mysql -u root -p aaron_provisiones < db/seed_admin.sql
```
Usuario demo: `admin` / `demo123` (cambiar antes de producción real — ver
D-13 en `DECISIONS.md`).

---

## 🔴 Protocolo de documentación (obligatorio)

### Al EMPEZAR una sesión

1. Lee las **2 o 3 entradas más recientes** de [`HANDOFF.md`](HANDOFF.md) —
   ahí está en qué quedó todo, incluido lo que falló o quedó a medias.
2. Revisa [`NEXT_STEPS.md`](NEXT_STEPS.md) para ver si tu tarea ya tiene un
   ID (`T-xx` / `U-xx`) y qué bloqueantes siguen abiertos arriba del todo.
3. Si vas a tocar arquitectura, seguridad, la API o el esquema de base de
   datos, lee [`DECISIONS.md`](DECISIONS.md) primero. **Varias cosas que
   parecen simplificaciones son decisiones deliberadas documentadas ahí**
   (ej. por qué se descartó la CLI de shadcn/ui, D-08).
4. `git pull` antes de empezar, si ya hay más de una persona/sesión
   trabajando en esto.

### Al TERMINAR una sesión

1. **Verifica** `npm run build:frontend`. No hay tests automatizados
   (D-05) — "verificar" es build limpio + probar a mano lo que tocaste.
   Si tocaste `api/`, no hay forma de correrlo en este entorno sin PHP
   local instalado; dilo explícitamente en `HANDOFF.md` si no pudiste
   probarlo en vivo, no asumas que compila solo porque el PHP "se ve bien".
2. **`HANDOFF.md`** — agrega una entrada nueva **arriba**, con la plantilla
   que está al inicio del archivo. Incluye lo que falló o quedó incompleto,
   no solo los logros.
3. **`CHANGELOG.md`** — si el cambio se nota en el producto (una vez que
   haya producto que notar).
4. **`NEXT_STEPS.md`** — marca lo cerrado, agrega lo nuevo que descubriste.
5. **`DECISIONS.md`** — si tomaste una decisión de arquitectura, seguridad
   o flujo de trabajo, regístrala con su motivo.
6. **`API.md`** — si implementaste o cambiaste un endpoint, actualiza su
   sección de "pendiente" a la forma real con ejemplos.

## Mapa de documentos

| Documento | Cuándo usarlo |
|---|---|
| **`CLAUDE.md`** (este) | Arquitectura, comandos, protocolo, trampas conocidas |
| [`HANDOFF.md`](HANDOFF.md) | **Empieza aquí cada sesión.** Bitácora: qué se hizo, qué falló, qué quedó pendiente |
| [`NEXT_STEPS.md`](NEXT_STEPS.md) | Backlog con IDs (`T-xx` tareas, `U-xx` mejoras futuras) y los bloqueantes de negocio abiertos |
| [`DECISIONS.md`](DECISIONS.md) | Por qué las cosas son así. Lee antes de "arreglar" algo raro |
| [`API.md`](API.md) | Contrato real (o planeado) de la API: endpoints, parámetros, forma del JSON |
| [`CHANGELOG.md`](CHANGELOG.md) | Qué cambió en el producto y cuándo |
| [`DEPLOY.md`](DEPLOY.md) | Cómo se despliega (todavía pendiente — sin dominio/hosting confirmado) y el runbook de fallas |

---

## Estructura de carpetas

```
frontend/src/
├── pages/         # POS, Bodega, Recepción, Alertas, Dashboard, Informes,
│                  # Promociones, Proveedores, Usuarios, Login — las 10
│                  # están implementadas (T-01 a T-09 completos)
├── components/    # Layout, RequireRole, CashRegisterBanner,
│                  # QuantityPromptModal, ProductFormModal, StockAdjustModal
├── components/ui/ # Primitivas hechas a mano (Radix + cva + cn(), D-08):
│                  # Button, Input, Label, Select, Checkbox, Badge, Dialog
├── store/         # Zustand: authStore (JWT + user), themeStore (claro/oscuro)
├── lib/           # api.ts (axios + interceptor JWT), utils.ts (cn()), y un
│                  # wrapper por endpoint (products.ts, sales.ts, lots.ts, etc.)
├── types/         # tipos compartidos (AuthUser, ApiResponse, Product, Sale, etc.)
├── App.tsx        # rutas + guardas de rol
└── main.tsx        # entry point

api/
├── auth.php, products.php, sales.php, cash_register.php, inventory.php,
│   lots.php, promotions.php, purchases.php, suppliers.php, users.php,
│   reports.php        # los 11 endpoints de negocio están implementados
│                       # de punta a punta (T-01 a T-09) — ninguno 501 ya
├── debug_report.php    # público, sin JWT — recibe reportes del modo
│                       # debug (?Debug=1), ver D-31
├── middleware.php      # JWT, CORS, requireAuth/requireRole, helpers
├── config.example.php  # plantilla — config.php real NUNCA va a git
└── db/
    ├── schema.sql       # 15 tablas (+ is_active en suppliers, D-28)
    ├── seed.sql         # categorías de ejemplo
    └── seed_admin.sql   # usuario admin/demo123

upgrade/
├── .htaccess     # deniega acceso web directo a toda la carpeta
└── fixes/        # .md generados por el modo debug — ver su README.md

.github/workflows/
├── deploy.yml               # ⚠️ sin activar — falta dominio/hosting (D-04)
└── sync-debug-reports.yml   # ⚠️ sin activar — misma dependencia
```

**Ninguno de estos 11 endpoints se probó contra una base de datos real
todavía** — este entorno de desarrollo no tiene PHP local instalado (se
intentó vía winget más de una vez, el paquete está roto). Todo el
backend está escrito y revisado a mano, con la lógica cruzada contra el
patrón ya probado de FERRIMIX, pero antes de confiar en esto en
producción hay que instalar PHP local o probarlo directo contra el
hosting real. Ver `HANDOFF.md` para el detalle de qué se verificó en el
navegador (con datos mockeados) en cada tarea.

---

## Trampas conocidas

- **`api/config.php` NO está en git** (D-08 en el patrón de los otros dos
  proyectos). Su plantilla es `api/config.example.php`. La config real se
  edita en el servidor una vez que exista hosting.
- **Dominio y hosting sin confirmar todavía** (D-02/D-04) — `vite.config.ts`
  usa `base: '/'` y `public/.htaccess` usa `RewriteBase /` como
  placeholders. Si el sitio termina en subcarpeta en vez de subdominio,
  hay que cambiar los dos juntos (y el workflow de deploy, cuando exista).
- **No intentes la CLI de shadcn/ui en este repo** sin leer D-08 primero
  — se probó y rompe el alias `@` por el layout de npm workspaces. Usa el
  patrón a mano en `components/ui/`.
- **`sales_details`/`inventory_movements` tienen `lot_id` nullable** — solo
  se llena para productos con `has_expiration = true`. No asumas que
  siempre hay un lote.
- **No hay tests automatizados** (D-05). "Verificar" = build limpio +
  checklist manual. No hay PHP local en el entorno de desarrollo por
  defecto — instálalo aparte o prueba directo contra el hosting una vez
  que exista.
- **La API no es REST canónico** (D-03): routing por archivo `.php` con
  `?action=`, y actualizar es `POST`, no `PATCH`/`PUT`. Deliberado por el
  hosting compartido.
- **`sales.cash_register_id` es nullable a propósito** (D-07) — no asumas
  que toda venta tiene caja asociada.

---

## Modo debug — reportar bugs desde el sitio en vivo

Copiado de FERRIMIX (ver D-31 en [`DECISIONS.md`](DECISIONS.md), que a su
vez lo copió de Parque San Pedro). Cualquiera con el link puede reportar
un problema de UI sin herramientas técnicas:

```
http://localhost:5173/?Debug=1&key=LA_CLAVE
```

(en producción sería `https://<dominio-real>/?Debug=1&key=LA_CLAVE` — la
clave real vive en `DEBUG_REPORT_KEY` de `api/config.php` del servidor,
nunca en el repo). Sin `&key=...` funciona igual si `DEBUG_REPORT_KEY`
está vacía — pero en producción siempre debería tener un valor real.

Aparece un botón "Reportar problema" abajo a la derecha. Click, selecciona
el elemento con el problema, describe qué pasa, envía. Queda guardado como
`.md` en `upgrade/fixes/` — se sincroniza a este repo automáticamente cada
6 horas una vez que haya hosting real (ver
[`upgrade/fixes/README.md`](upgrade/fixes/README.md) para el ciclo de
vida completo). **Funciona ya en local** (`npm run dev` + `?Debug=1`)
aunque el deploy/sync todavía no estén activos — solo requiere que
`api/debug_report.php` responda, no depende de FTP ni de GitHub Actions.
