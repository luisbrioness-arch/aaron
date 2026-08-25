<?php
/**
 * Endpoint: /api/sales.php
 * Acciones: create, list, get
 *
 * Sin implementar todavía — ver NEXT_STEPS.md T-01. Cuando se implemente:
 * IVA 19%, redondeo a $10 en efectivo, descuentos y promociones resueltos
 * en servidor, FEFO para productos con vencimiento — ver el documento de
 * arquitectura, sección "Reglas de negocio clave".
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'create':
    case 'list':
    case 'get':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-01)", 501);
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}
