<?php
/**
 * Endpoint: /api/promotions.php
 * Acciones: list, create, update, deactivate
 *
 * Nuevo respecto a FERRIMIX. Sin implementar todavía, ver NEXT_STEPS.md T-07.
 * 'list' (promociones activas) la necesita el POS para aplicar descuentos
 * automáticos — abierta a cualquier usuario autenticado. Gestión completa
 * es solo admin.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'list':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-07)", 501);
        break;

    case 'create':
    case 'update':
    case 'deactivate':
        requireRole($auth, ['admin']);
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-07)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
