<?php
/**
 * Configuración Aaron Provisiones — Copia este archivo a config.php y
 * personaliza.
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
