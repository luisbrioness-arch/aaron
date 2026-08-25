<?php
/**
 * Endpoint: /api/reports.php
 * Acciones: daily-sales, weekly-sales, top-products, stagnant-products,
 * cash-summary, margin, category-breakdown, money-type-breakdown,
 * expiring-summary
 *
 * Todo este archivo es admin-only. Sin implementar todavía — ver
 * NEXT_STEPS.md T-05/T-06. 'expiring-summary' es nuevo respecto a
 * FERRIMIX (cuenta de productos por vencer/vencidos para el Dashboard).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin']);
$pdo = getDB();

switch ($action) {
    case 'daily-sales':
    case 'weekly-sales':
    case 'top-products':
    case 'stagnant-products':
    case 'cash-summary':
    case 'margin':
    case 'category-breakdown':
    case 'money-type-breakdown':
    case 'expiring-summary':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-05/T-06)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
