<?php
/**
 * Endpoint: /api/cash_register.php
 * Acciones: open, close, current
 *
 * Sin implementar todavía — ver NEXT_STEPS.md T-01. La caja siempre es la
 * del usuario autenticado, resuelta server-side — nunca se acepta un
 * cash_register_id que mande el cliente.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'open':
    case 'close':
    case 'current':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-01)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
