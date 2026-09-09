<?php
/**
 * Configuración Aaron Provisiones — Copia este archivo a config.php y
 * personaliza.
 *
 * Requiere PHP 8.1+. Compatible con PHP 8.1, 8.2, 8.3, 8.4 y 8.5.
 * No usa ninguna feature de 8.2+ — se puede desplegar en hosting compartido
 * con PHP 8.1 sin modificar nada.
 *
 * config.php NUNCA se sube a git (está en .gitignore) ni lo despliega el
 * pipeline automático — cada entorno (tu máquina local, el servidor)
 * mantiene su propia copia con sus propios valores. Mismo patrón que
 * FERRIMIX y Parque San Pedro.
 *
 * En LOCAL (dev con `php -S` + Vite): deja CORS_ORIGIN en localhost:5173.
 * En PRODUCCIÓN: cambia CORS_ORIGIN al dominio real una vez que esté
 * confirmado (ver DECISIONS.md — todavía TBD al momento de escribir esto).
 */

define('DB_HOST', 'localhost');
define('DB_USER', 'aaron');
define('DB_PASS', 'tu_contraseña_segura');
define('DB_NAME', 'aaron_provisiones');

define('JWT_SECRET', 'tu_clave_jwt_muy_secreta_aqui');
define('JWT_EXPIRY', 86400 * 7); // 7 días

define('CORS_ORIGIN', 'http://localhost:5173'); // producción: dominio real, sin "/" al final
define('API_URL', 'http://localhost:8000');

// Umbral por defecto para la alerta "por vencer" (días). Configurable acá
// hasta que exista una pantalla de configuración real.
define('EXPIRATION_WARNING_DAYS', 7);

// Flag genérico de debug (no confundir con DEBUG_REPORT_KEY abajo, son
// cosas distintas — este solo controla mensajes de error verbosos de PHP).
define('DEBUG', false);

// Clave del modo debug del sitio (?Debug=1&key=…) — reportes de bugs que
// cualquiera puede mandar desde el sitio en vivo sin herramientas técnicas
// (ver api/debug_report.php y DECISIONS.md D-31). Opcional a propósito: si
// queda vacía, el endpoint sigue funcionando pero abierto a cualquiera en
// internet. Déjala con un valor real en producción.
define('DEBUG_REPORT_KEY', '');
