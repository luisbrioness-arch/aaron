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
