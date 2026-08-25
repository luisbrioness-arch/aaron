<?php
/**
 * Endpoint: /api/inventory.php
 * Acciones: movement, list, reorder-suggestions
 *
 * Sin implementar todavía — ver NEXT_STEPS.md T-02. Solo bodega/admin —
 * el cajero ve stock en modo lectura vía products.php, no acá.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin', 'warehouse_staff']);
$pdo = getDB();

switch ($action) {
    case 'movement':
    case 'list':
    case 'reorder-suggestions':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-02)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
