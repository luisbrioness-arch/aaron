<?php
/**
 * Endpoint: /api/suppliers.php
 * Acciones: list, create
 *
 * Sin implementar todavía — ver NEXT_STEPS.md T-08. 'list' lo necesita
 * también bodega (selector en "recibir compra"); alta/edición es admin.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'list':
        requireRole($auth, ['admin', 'warehouse_staff']);
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-08)", 501);
        break;

    case 'create':
        requireRole($auth, ['admin']);
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-08)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
