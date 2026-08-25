<?php
/**
 * Endpoint: /api/purchases.php
 * Acciones: list, get, create, receive
 *
 * Sin implementar todavía — ver NEXT_STEPS.md T-03. 'receive' admite
 * recepción parcial y, si la línea trae expiration_date/lot_code, crea la
 * fila correspondiente en product_lots — igual patrón que FERRIMIX más la
 * parte de lotes.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin', 'warehouse_staff']);
$pdo = getDB();

switch ($action) {
    case 'list':
    case 'get':
    case 'create':
    case 'receive':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-03)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
