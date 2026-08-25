<?php
/**
 * Endpoint: /api/lots.php
 * Acciones: expiring, expired, adjust
 *
 * Nuevo respecto a FERRIMIX — vencimientos por lote (product_lots). Sin
 * implementar todavía, ver NEXT_STEPS.md T-04.
 *
 * 'expiring': lotes con expiration_date dentro de EXPIRATION_WARNING_DAYS
 * (config.php) y quantity_remaining > 0.
 * 'expired': expiration_date < hoy y quantity_remaining > 0.
 * 'adjust': marcar un lote vencido como merma — crea un inventory_movements
 * tipo 'loss' y descuenta de product_lots.quantity_remaining y
 * products.stock_current. Acción explícita de bodega, nunca automática.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin', 'warehouse_staff']);
$pdo = getDB();

switch ($action) {
    case 'expiring':
    case 'expired':
    case 'adjust':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-04)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
