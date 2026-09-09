# Despliegue y operación

**Estado: ⚠️ pendiente.** Nada de esto está activo todavía — ni el
dominio, ni el hosting, ni los secrets de GitHub existen (ver D-02/D-04 en
[`DECISIONS.md`](DECISIONS.md)). Este documento describe cómo va a
funcionar el despliegue una vez que esas dos cosas se confirmen, copiado
del patrón ya probado en producción de FERRIMIX y Parque San Pedro (mismo
autor, mismo tipo de hosting compartido DirectAdmin).

Entorno esperado: DirectAdmin + Apache + MariaDB + PHP 8, igual que los
otros dos proyectos. **No va a haber Node.js corriendo en el servidor** —
el frontend se compila antes y se sube el resultado estático; `api/` es
PHP que corre nativo.

- **Producción:** Confirmado: `aaron.hogartv.cl` (subdominio bajo `hogartv.cl`).
- **Base de datos:** MariaDB vía DirectAdmin → MySQL Management.
- **Staging:** no existe, igual que en los otros dos proyectos.

---

## Cómo se va a desplegar: automático (una vez activo)

**No subas archivos a mano.** Todo lo que llegue a `main` se compilará y
subirá solo, vía
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. Alguien hace push/merge a `main` (commits solo de `.md` no disparan el deploy).
2. GitHub Actions instala dependencias y corre `build:frontend`. Si el build
   falla, **no despliega nada** — a propósito.
3. Sube por FTPS en 3 pasos: frontend → `public_html/`, API →
   `public_html/api/`, `upgrade/.htaccess` → `public_html/upgrade/`.
4. Progreso y errores: pestaña **Actions** del repositorio.

Se puede lanzar a mano sin commit: Actions → "Deploy to hosting" → **Run workflow**.

### Lo que el despliegue nunca va a tocar

| En el servidor | Por qué está a salvo |
|---|---|
| `api/config.php` | No existe en el repo (`.gitignore`) — el paso de deploy no tiene con qué sobrescribirlo |
| `api/db/schema.sql` y `seed*.sql` | Excluidos explícitamente del paso de deploy del API |
| `api/*.example.php` | Excluido explícitamente |
| `upgrade/fixes/` | Excluido del deploy — lo sincroniza `sync-debug-reports.yml`, no este workflow |

### Credenciales (todavía sin configurar)

Los datos FTP van a vivir **solo** como secretos del repositorio en GitHub
(Settings → Secrets and variables → Actions): `FTP_SERVER`,
`FTP_USERNAME`, `FTP_PASSWORD`. La contraseña de la base de datos vive
**solo** en `api/config.php` del servidor. Nada de eso va en git ni se
pega en el chat.

**Estado:** ❌ Ningún secret configurado todavía — el workflow existe pero
no puede correr.

> ⚠️ **Antes de confiar en el primer deploy en verde:** confirmar la ruta
> real del chroot FTP con un `workflow_dispatch` de prueba. FERRIMIX perdió
> una hora completa asumiendo que su cuenta FTP estaba chroot-eada igual
> que otro proyecto del mismo hosting sin verificarlo primero — no repetir
> ese error acá (ver D-04 de FERRIMIX y de este repo).

---

## Primer setup de un servidor nuevo (cuando exista)

1. Confirmar dominio/subdominio con Luis y reemplazar el placeholder
   `aaronprovisiones.hogartv.cl` en `deploy.yml`, `sync-debug-reports.yml`,
   `vite.config.ts` (`base`) y `frontend/public/.htaccess`
   (`RewriteBase`) — los cuatro juntos, nunca uno solo (ver D-02).
2. Crear el subdominio en DirectAdmin.
3. Crear la base de datos y usuario en MySQL Management.
4. Importar `api/db/schema.sql` vía phpMyAdmin, luego `seed.sql` y
   `seed_admin.sql`.
5. Subir manualmente `api/config.php` (copiado de `config.example.php`,
   con las credenciales reales, incluida una `DEBUG_REPORT_KEY` real) a
   `public_html/api/` del servidor — **nunca por git**.
6. En `config.php` de producción, `CORS_ORIGIN` debe ser el dominio real
   (no `localhost`).
7. Configurar los 3 secrets de GitHub (ver arriba).
8. Push a `main` → el resto es automático.

---

## Runbook: fallas reales (mismo que FERRIMIX — no se ha probado acá todavía)

### El deploy corrió (✅ verde) pero el sitio no cambió
1. Revisa si la cuenta FTP está chroot-eada de forma inesperada (causa #1
   conocida en los otros dos proyectos).
2. Verifica en DirectAdmin → Administrador de Archivos que los archivos
   nuevos realmente llegaron a `public_html/`.

### La API responde 500
1. Revisa que `api/config.php` exista en el servidor con las 4 constantes
   (`DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`) y `JWT_SECRET`.
2. Revisa el log de errores de PHP en DirectAdmin.
3. Confirma que la tabla que consultas existe (`schema.sql` importado).

### Recargar una ruta del SPA da 404 (ej. `/pos` directo)
1. Confirma que `.htaccess` llegó a `public_html/` (a veces FTP no sube
   archivos que empiezan con punto si el cliente no está configurado para
   mostrarlos).
2. Confirma `mod_rewrite` habilitado en el hosting.

### CORS bloqueando requests desde el frontend
1. Si frontend y API viven en el mismo subdominio, en producción no
   debería haber problema de CORS real — si aparece, revisa que
   `CORS_ORIGIN` en `config.php` del servidor coincida exactamente con el
   dominio (con `https://`, sin `/` final).

---

## Modo debug — reportar bugs desde el sitio en vivo

Ver la sección dedicada en [`CLAUDE.md`](CLAUDE.md) y
[`upgrade/fixes/README.md`](upgrade/fixes/README.md). Depende del mismo
hosting/secrets que el deploy — tampoco funciona todavía en producción,
pero sí se puede probar en local (`?Debug=1` contra `npm run dev`).
