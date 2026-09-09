# Reportes del modo debug

Esta carpeta guarda los reportes de problemas enviados desde el sitio en
**modo debug** (`?Debug=1`). Mismo mecanismo que FERRIMIX — ver
`DECISIONS.md` D-31 de este repo si necesitas el porqué de las decisiones
de diseño (FERRIMIX a su vez lo copió de Parque San Pedro).

## Cómo se crean los reportes

1. Abre cualquier página con `?Debug=1` (y `&key=…` en producción si hay
   `DEBUG_REPORT_KEY` configurada en `api/config.php` del servidor).
2. Click en **"Reportar problema"** (esquina inferior derecha), selecciona
   el elemento con el problema, describe qué pasa, envía.
3. La API escribe un archivo markdown por reporte.

## Dónde caen los archivos

| Entorno | Ruta |
|---|---|
| **Local (dev)** | `upgrade/fixes/` (raíz del repo, junto a `api/`) |
| **Producción** | `<dominio>/public_html/upgrade/fixes/` en el servidor (sibling de `api/`, no dentro del build del frontend) — dominio real todavía sin confirmar, ver D-02 |

El pipeline de deploy **no sobreescribe esta carpeta** — vive fuera del
build estático del frontend (ver exclusión `fixes/**` en
`.github/workflows/deploy.yml`).

## Sincronizar los reportes del servidor a git

**Automático** vía
[`.github/workflows/sync-debug-reports.yml`](../../.github/workflows/sync-debug-reports.yml):
corre cada 6 horas (o manual desde la pestaña Actions → "Sync debug-mode
reports" → **Run workflow**). Cuatro pasos en orden:

1. **Podar:** cualquier archivo en `.synced-manifest.txt` que ya no esté
   en esta carpeta del repo (= un humano lo borró tras arreglar el bug) se
   borra también del servidor, por nombre exacto.
2. **Bajar:** trae del servidor cualquier `.md` que el repo todavía no
   tenga (`--only-newer`, nunca pisa uno local más nuevo).
3. **Actualizar el manifiesto:** cada `.md` presente localmente que no
   esté en `.synced-manifest.txt` se agrega ahí.
4. **Commit** siempre (`if: always()`), aunque algún paso anterior haya
   fallado parcialmente — así el log de la poda no se pierde.

**Por qué podar corre ANTES de bajar, usando el estado ya commiteado del
repo:** si corriera al revés, bajar resucitaría un archivo justo antes de
que podar pudiera notar que "debería estar ausente". Este orden es
copiado literal de FERRIMIX/Parque San Pedro, donde ya costó dos intentos
fallidos descubrirlo — no hace falta repetir ese proceso de descubrimiento
acá, ya está resuelto.

**Nota para Aaron Provisiones:** este workflow todavía no puede correr de
verdad — depende de los mismos secrets FTP que `deploy.yml`, y el
hosting/dominio real siguen sin confirmar (ver D-02/D-04). Queda listo
para activarse en cuanto exista un servidor real.

## Cerrar un reporte

Cuando arregles el bug que describe: anótalo en `CHANGELOG.md`/`HANDOFF.md`
como de costumbre, luego borra el `.md` de esta carpeta (`git rm`) y
commitea. Que el archivo ya no esté en el próximo checkout es la única
señal que usa el paso de poda para borrarlo también del servidor.

## Seguridad

- `DEBUG_REPORT_KEY` en `api/config.php` (nunca en git) es **opcional**.
  Si está vacía o no definida, el endpoint queda abierto a cualquiera en
  internet — déjala siempre con un valor real en producción.
- El honeypot (`website`) y la validación de la clave (`hash_equals`,
  timing-safe) están en `api/debug_report.php`.
- La clave nunca queda guardada dentro de un reporte — `debug_report.php`
  la redacta de `page_url`/`page_path` antes de escribir el archivo.
