<?php
/**
 * Endpoint: /api/products.php
 * Acciones: search, list, low-stock, categories, create, rename, deactivate
 *
 * Sin implementar todavía — ver NEXT_STEPS.md T-01/T-02. Este archivo solo
 * fija el contrato de acciones y quién puede llamar cada una, siguiendo el
 * patrón de FERRIMIX (routing por ?action=, JWT + requireRole).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'search':
    case 'list':
    case 'low-stock':
    case 'categories':
        // Cualquier usuario autenticado — el cajero necesita leerlo desde
        // el POS, bodega desde Bodega/Recepción.
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-01/T-02)", 501);
        break;

    case 'create':
    case 'rename':
    case 'deactivate':
        requireRole($auth, ['admin', 'warehouse_staff']);
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-02)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
