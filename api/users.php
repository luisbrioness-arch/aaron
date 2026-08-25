<?php
/**
 * Endpoint: /api/users.php
 * Acciones: list, workdays, create, update, activate, deactivate,
 * reset-password
 *
 * Todo este archivo es admin-only. Sin implementar todavía — ver
 * NEXT_STEPS.md T-09.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin']);
$pdo = getDB();

switch ($action) {
    case 'list':
    case 'workdays':
    case 'create':
    case 'update':
    case 'activate':
    case 'deactivate':
    case 'reset-password':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-09)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
