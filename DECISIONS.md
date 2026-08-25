# Registro de decisiones

Decisiones tomadas a propósito, con su motivo. **Si vas a cambiar algo que
está aquí, lee primero por qué se decidió así.**

Si tomas una decisión nueva que afecte arquitectura, seguridad o el flujo de
trabajo, agrégala abajo con fecha. Si revocas una decisión existente, no
borres la entrada: márcala como `REVOCADA` y explica qué la reemplazó.

---

## D-01 · Backend en PHP plano, sin Node en el servidor
**2026-08-24** · Vigente

Mismo criterio que FERRIMIX y Parque San Pedro: hosting compartido, sin
proceso Node persistente garantizado. El frontend compila a estático; la
API es PHP + PDO nativo.

**No hagas:** introducir un backend Node/Express, SSR, o cualquier cosa que
necesite un proceso corriendo en el servidor.

## D-02 · Dominio y hosting: sin confirmar todavía
**2026-08-24** · Vigente

Al armar el scaffold no había dominio ni hosting decidido (ver la sección
de supuestos abiertos del documento de arquitectura). `vite.config.ts` usa
`base: '/'` y `public/.htaccess` usa `RewriteBase /` como placeholder.

**Cuando se confirme el dominio:** si termina en subcarpeta en vez de
subdominio propio, hay que cambiar juntos `base` en `vite.config.ts`,
`RewriteBase` en `public/.htaccess` y `server-dir` del workflow de deploy
que todavía no existe — mismo patrón de trampa que D-02/D-06 en FERRIMIX y
Parque San Pedro (cambiar uno sin los otros dos deja el sitio sirviendo
desde una carpeta fantasma).

## D-03 · Routing por archivo `.php` con `?action=`, no REST canónico
**2026-08-24** · Vigente

Igual que FERRIMIX y Parque San Pedro: `/api/sales.php?action=create` en
vez de rutas REST con verbos HTTP. Deliberado por las limitaciones del
hosting compartido (sin control de rewrite avanzado por endpoint).

## D-04 · Deploy: sin configurar todavía
**2026-08-24** · Vigente

No hay workflow de GitHub Actions ni credenciales FTP configuradas — el
hosting real todavía no está decidido (ver D-02). Cuando se confirme,
replicar el patrón de FERRIMIX/Parque San Pedro: build local o en Actions,
FTP a DirectAdmin, y **confirmar la ruta real del chroot con un
`workflow_dispatch` de prueba antes de confiar en que el workflow terminó
en verde** — el D-04 de FERRIMIX documenta una hora perdida por asumir la
ruta de otro proyecto del mismo hosting sin verificarla.

## D-05 · Sin tests automatizados por ahora
**2026-08-24** · Vigente

Mismo motivo que los otros dos proyectos: alcance chico, sin presupuesto de
CI para una suite de tests. "Verificar" = build limpio (`npm run
build:frontend`) + checklist manual. No hay `TESTING.md` aparte todavía —
esta sección de `CLAUDE.md` cumple ese rol mientras el proyecto es chico.

## D-06 · Boleta en PDF real (TCPDF/mPDF), condicionado a acceso Composer/SSH
**2026-08-24** · Vigente

El pedido original fue explícito: boletas numeradas + PDF vía TCPDF/mPDF.
Esto es distinto del precedente de FERRIMIX (D-12 de su historial), que
descartó TCPDF porque su hosting no tenía acceso SSH/Composer confirmado y
terminó usando HTML + `window.print()`.

**No implementado todavía** (depende de T-01). Antes de instalar
TCPDF/mPDF hay que confirmar que el hosting real de Aaron Provisiones
tiene acceso SSH/Composer. Si no lo tiene, el plan de respaldo es el mismo
que ya funciona en producción en FERRIMIX: HTML con CSS `@media print` +
`window.print()`, con "Guardar como PDF" desde el diálogo de impresión del
navegador.

## D-07 · `sales.cash_register_id` nullable, resuelto por el servidor
**2026-08-24** · Vigente

Mismo diseño que FERRIMIX (su D-07): el servidor busca la caja abierta del
usuario autenticado y la usa si existe; si no tiene caja abierta, la venta
se permite igual con `cash_register_id = NULL`. Nunca se acepta un
`cash_register_id` que mande el cliente — sería fácil de falsificar.

## D-08 · Se descartó la CLI real de shadcn/ui — rompe el alias `@` en este monorepo de workspaces
**2026-08-24** · Vigente

El documento de arquitectura proponía usar shadcn/ui de verdad vía su CLI
(a diferencia de FERRIMIX, que usa primitivas a mano por D-24 de su propio
historial). Se probó en este proyecto antes de descartarlo, no se asumió
el riesgo de memoria: `npx shadcn@latest init -d` escribió `components.json`
pero falló al resolver el workspace ("Could not load the workspace config"),
y `npx shadcn@latest add button` sí corrió pero **ignoró el alias `@` de
`tsconfig.app.json`/`vite.config.ts` y creó un directorio literal `./@/`**
en la raíz de `frontend/` en vez de escribir en `src/components/ui/` — la
CLI no maneja bien el layout de un monorepo con `npm workspaces` donde
`frontend/` no es la raíz del repo.

**Qué se hizo en su lugar:** el mismo patrón que ya funciona en producción
en FERRIMIX y en el CRM de Parque San Pedro — primitivas hechas a mano en
`src/components/ui/` con Radix UI + `class-variance-authority` + `clsx` +
`tailwind-merge` (`cn()` en `src/lib/utils.ts`), mismo lenguaje visual que
shadcn/ui sin depender de su CLI. Las dependencias de Radix ya están en
`package.json`; los componentes se van armando a mano a medida que cada
pantalla los necesita (T-01 en adelante), no todos de una vez.

**No hagas:** volver a intentar la CLI de shadcn/ui en este repo sin
mover `frontend/` a la raíz de su propio repositorio primero — el
problema es estructural (workspaces), no una versión vieja de la CLI.

## D-09 · `product_lots` para vencimientos, no una columna en `products`
**2026-08-24** · Vigente

Un mismo producto perecible puede tener varios lotes en stock a la vez con
fechas de vencimiento distintas (dos quesos del mismo tipo, comprados en
fechas distintas). Una sola columna `expiration_date` en `products` no
puede representar eso. `products.stock_current` sigue siendo el agregado
rápido de leer en el POS; `product_lots` es el detalle.

**Regla FEFO (first-expired, first-out):** al vender un producto con
`has_expiration = true`, descontar primero del lote con
`expiration_date` más próxima que aún tenga `quantity_remaining > 0`.
Todavía no implementado (T-01/T-04) — queda anotado acá para que quien
construya `sales.php` no lo pase por alto.

## D-10 · Promociones resueltas en servidor, mismo criterio que los descuentos manuales
**2026-08-24** · Vigente

`promotions` (2x1, 3x2, pack a precio fijo) se resuelve a un
`discount_amount` en pesos al momento de la venta, igual que el patrón de
descuentos manuales de FERRIMIX (su D-32): nunca se guarda "tipo + regla"
para reinterpretar después, se congela el monto ya calculado más
`sales_details.promotion_id` para poder reportarlo aparte. Pendiente de
implementar en T-01/T-07.

## D-11 · Alcohol y tabaco: fuera de alcance, confirmado
**2026-08-24** · Vigente

El negocio no vende alcohol ni tabaco (confirmado en el chat). No hay
columna `requires_age_check` ni paso de confirmación de edad en el POS.

**Si esto cambia:** agregar un booleano en `products` más un modal de
confirmación explícita antes de sumar la línea al carrito — no toca el
resto del esquema.

## D-12 · Esquema ordenado por dependencias, sin referencias hacia adelante
**2026-08-24** · Vigente

`schema.sql` está ordenado para que cada `CREATE TABLE` aparezca después
de todo lo que referencia (`product_lots` va después de `purchases`
porque tiene `purchase_id REFERENCES purchases(id)`, por ejemplo). MariaDB
no exige este orden con la sintaxis de `REFERENCES` a nivel de columna que
usa este archivo (no crea una constraint real de todos modos, es
documentación), pero mantener el orden topológico hace el archivo más
fácil de leer de arriba hacia abajo y evita confusión si en algún momento
se migra a `FOREIGN KEY` real.

## D-13 · Usuario admin sembrado con un hash bcrypt real, no un placeholder inválido
**2026-08-24** · Vigente

FERRIMIX tuvo que sembrar su primer usuario admin con un hash placeholder
inválido (su D-09) porque el login estaba hardcodeado y no leía la tabla
`users` todavía. Acá `auth.php` implementa login real contra la tabla
`users` desde el primer commit, así que `db/seed_admin.sql` trae un hash
bcrypt real (generado con `bcryptjs`, formato `$2b$` — PHP `password_verify()`
verifica hashes `$2a$`/`$2b$` igual que los `$2y$` que produce su propio
`password_hash()`, así que funciona sin pasos extra).

Usuario `admin`, contraseña `demo123` — **cambiar antes de usar esto en
producción de verdad.**

## D-14 · `products.php` tiene `update` completo, no solo `rename`
**2026-08-25** · Vigente

FERRIMIX solo tiene `?action=rename` (edita únicamente el nombre) como
decisión deliberada de alcance mínimo. Acá se implementó `?action=update`
completo (nombre, código de barras, categoría, proveedor, unidad de
medida, granel, vencimiento, precios, stock crítico) porque el catálogo de
un minimarket es mucho más grande y cambia más seguido — limitar a solo
renombrar habría sido insuficiente desde el primer día. `stock_current`
sigue **fuera** de `update` a propósito: todo cambio de stock pasa por
`inventory.php?action=movement` para dejar rastro en `inventory_movements`
— nunca se edita el número directamente.

## D-15 · `products.php?action=list` paginado (30 por página)
**2026-08-25** · Vigente

FERRIMIX devuelve el catálogo completo sin paginar en `list` — funciona
porque una ferretería tiene decenas o pocos cientos de SKU. El documento
de arquitectura señaló explícitamente que un minimarket puede tener miles;
devolver todo de una vez en cada carga de Bodega no escala. `list` pagina
igual que `sales.php?action=list&page=N` en FERRIMIX (mismo patrón,
aplicado a productos en vez de ventas).

## D-16 · `reorder-suggestions` sigue en `inventory.php`, pero su implementación se pospuso
**2026-08-25** · Vigente

`API.md` original (T-02) incluía `inventory.php?action=reorder-suggestions`
en el mismo lote que `movement`/`list`. Al implementar T-02 se decidió
posponer solo esa acción (queda respondiendo `501`): el cálculo depende de
`avg_daily_sales` sobre los últimos 30 días de `sales`, que todavía no
existe como tabla con datos reales (T-01 sigue sin implementar).
Escribirlo ahora habría sido código imposible de probar o verificar.

**Se queda en `inventory.php` a propósito, no se mueve a `reports.php`:**
es bodega/admin quien reordena stock, no solo admin — moverlo a
`reports.php` (admin-only) le habría quitado acceso a `warehouse_staff`
sin motivo. Se implementa quando haya datos reales de venta (en paralelo
a T-01/T-05), quedando donde el rol correcto ya lo protege.

## D-17 · Los ajustes de stock de T-02 no tocan `product_lots` todavía
**2026-08-25** · Vigente

`inventory.php?action=movement` (T-02) opera sobre `products.stock_current`
en agregado, sin bajar a nivel de lote — incluso para productos con
`has_expiration = true`. Bajar a nivel de lote (elegir de qué lote
concreto se resta una merma, o aplicar FEFO) es responsabilidad de T-04,
que todavía no está implementado. Por ahora, ajustar stock de un producto
perecible mueve el agregado correctamente pero no actualiza
`product_lots.quantity_remaining` de ningún lote específico — **no usar
todavía para mermas de productos con lotes activos si se necesita
trazabilidad exacta por lote**, eso llega con T-04.

## D-18 · `sales.php?action=get` exige JWT, a diferencia del patrón público de FERRIMIX
**2026-08-25** · Vigente

FERRIMIX deja `sales.php?action=get&id=UUID` **sin autenticación a
propósito** (su T-57): es el link que el vendedor manda por WhatsApp para
que el cliente vea su boleta sin cuenta. Acá no se implementó ese patrón
— no se pidió, y no había forma de decidir el criterio de seguridad
correcto (UUID v4 impredecible, mismo argumento que D-11 de FERRIMIX) sin
que alguien lo pidiera explícitamente. Por ahora `get` exige JWT igual que
el resto del archivo.

**Si más adelante se quiere un link de boleta compartible:** replicar el
criterio de FERRIMIX (D-11 de su historial) — mover `requireAuth()` para
que corra después de comprobar la acción, dejando solo `get` afuera.

## D-19 · `invoice_number` se genera con `MAX + 1`, sin tabla de contador dedicada
**2026-08-25** · Vigente

Mismo patrón que `purchase_number` en FERRIMIX
(`api/purchases.php?action=create`, según su propio `API.md`):
`SELECT invoice_number ... ORDER BY CAST(invoice_number AS UNSIGNED) DESC
LIMIT 1 FOR UPDATE`, dentro de la misma transacción de la venta. No
previene una condición de carrera perfecta si dos ventas concurrentes
llegan exactamente a la vez y la tabla está vacía (el `FOR UPDATE` no
tiene fila que bloquear todavía) — riesgo aceptado, igual que en
FERRIMIX, porque el proyecto confirmó **1 sola caja** para el
lanzamiento (ver la sección de decisiones confirmadas del documento de
arquitectura). Si algún día hay varias cajas emitiendo boletas en
paralelo, esto necesita una tabla de contador con su propio lock
dedicado.

## D-20 · La boleta del POS es un resumen en pantalla, todavía sin PDF
**2026-08-25** · Vigente

T-01 implementó `sales.php?action=create` completo (IVA, redondeo,
descuentos, FEFO) y `POSPage.tsx` muestra un resumen de la venta al
cobrar, pero no genera PDF ni imprime — ver D-06, que sigue bloqueado
hasta confirmar si el hosting real tiene Composer/SSH. Implementar la
boleta de verdad (TCPDF/mPDF o el respaldo HTML + `window.print()`) queda
pendiente, anotado en `NEXT_STEPS.md`.

## D-21 · `payment_method: "mixed"` no tiene desglose propio
**2026-08-25** · Vigente

El schema trae `mixed` como opción válida de `payment_method` desde el
diseño original (mismo ENUM que FERRIMIX), pero ni `sales.php` ni
`POSPage.tsx` le dan tratamiento especial — se comporta igual que
`card`/`transfer` (sin redondeo a $10, sin `amount_received`/vuelto). No
se pidió una forma de registrar cuánto se pagó en efectivo vs. tarjeta
dentro de una misma venta mixta, y el schema no tiene columnas para eso
todavía. **Si se necesita de verdad:** agregar una tabla
`sale_payments` (una venta, N pagos) sería el cambio correcto — no forzar
más columnas sueltas en `sales`.

## D-22 · `suppliers.php` no es admin-only — bodega también puede crear proveedores
**2026-08-25** · Vigente

FERRIMIX deja `suppliers.php` entero admin-only (su D-16). Acá
`?action=list` y `?action=create` aceptan `admin` **y** `warehouse_staff`
— la pantalla de recepción de compras (T-03) necesita poder cargar un
proveedor nuevo en el momento, sin frenar a esperar a que un admin lo
haga. El documento de arquitectura ya preveía esto ("bodega también
puede ver/gestionar proveedores para 'recibir compra' fluido"). Un CRUD
completo (editar, desactivar) sigue pendiente de T-08 y ese sí puede
quedar admin-only si hace falta — hoy solo existen `list`/`create`.

## D-23 · `purchases_details.expiration_date`/`lot_code` son una referencia, no la fuente de verdad
**2026-08-25** · Vigente

Un producto puede recibirse en varias recepciones parciales con
vencimientos distintos cada vez (ej. la mitad del pedido llega con una
fecha, el resto después con otra). `purchases_details` tiene una sola
fila por producto por orden, así que sus columnas `expiration_date`/
`lot_code` solo guardan **la última recepción** como referencia rápida —
se sobrescriben en cada llamada a `?action=receive`. La fuente de verdad
real para vencimientos es `product_lots`: cada llamada a `receive` crea
una fila nueva ahí con el vencimiento/lote de *esa* recepción específica,
así que el historial completo no se pierde aunque `purchases_details` solo
recuerde el último.

## D-24 · T-08 (Proveedores) parcialmente adelantado por T-03
**2026-08-25** · Vigente

Al implementar T-03 se necesitaba un selector de proveedores funcional, así
que se adelantó parte del backend de T-08 (`suppliers.php?action=list` y
`?action=create`, ver D-22) más un modal liviano de alta rápida dentro
de `RecepcionPage.tsx` (`SupplierQuickAddModal`). Lo que falta de T-08 es
`?action=update`/`?action=deactivate` en `suppliers.php` y la pantalla
dedicada (`SuppliersPage.tsx`, listado completo con edición/
desactivación) — `NEXT_STEPS.md` se actualizó para reflejar que ya no es
el CRUD completo desde cero, solo la mitad que faltaba.

## D-25 · "Marcar como merma" solo aparece para lotes vencidos, y siempre descarta el lote completo
**2026-08-25** · Vigente

`AlertasPage.tsx` (T-04) solo ofrece el botón "Marcar merma" en la
sección Vencidos, no en Por vencer — no tiene sentido descartar stock que
todavía no venció, la alerta de "por vencer" es para que alguien lo
priorice en la góndola o en una promoción, no para tirarlo. `lots.php?
action=adjust` sí acepta un `quantity` parcial (por si en el futuro hace
falta mermar solo una parte de un lote), pero la UI actual siempre omite
ese campo — el botón marca **todo** lo que quede del lote de una vez,
que es el caso de uso real más común (un lote vencido se descarta
completo). Si se necesita merma parcial desde la UI, es un input extra
en el mismo modal/botón, no un cambio de API.
