<?php
/**
 * Endpoint: /api/inventory.php
 * Acciones: movement, list (implementadas), reorder-suggestions (pendiente)
 *
 * 'reorder-suggestions' se queda acá a propósito, no en reports.php — lo
 * usa bodega, no solo admin (ver D-16 en DECISIONS.md). Sin implementar
 * todavía: depende de tener ventas reales (T-01) para calcular el
 * promedio diario, así que implementarlo ahora sería código sin forma de
 * probarse.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

const VALID_MOVEMENT_TYPES = ['in', 'out', 'adjustment', 'loss'];

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin', 'warehouse_staff']);
$pdo = getDB();

switch ($action) {
    case 'movement':
        handleMovement($pdo, $auth);
        break;
    case 'list':
        handleList($pdo);
        break;
    case 'reorder-suggestions':
        jsonResponse(false, null, "Acción '$action' no implementada todavía (T-05)", 501);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function handleMovement($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $productId = $input['product_id'] ?? null;
    $type = $input['movement_type'] ?? null;
    $quantity = $input['quantity'] ?? null;
    $reason = trim($input['reason'] ?? '');
    $unitCost = $input['unit_cost'] ?? null;

    if (!$productId || !in_array($type, VALID_MOVEMENT_TYPES, true) || !is_numeric($quantity)) {
        jsonResponse(false, null, 'product_id, movement_type y quantity son obligatorios', 400);
    }
    if ($unitCost !== null && $type !== 'in') {
        jsonResponse(false, null, 'unit_cost solo es válido con movement_type "in"', 400);
    }

    $quantity = (float) $quantity;
    if ($type !== 'adjustment' && $quantity <= 0) {
        jsonResponse(false, null, 'quantity debe ser positivo para in/out/loss', 400);
    }
    if ($type === 'adjustment' && $quantity == 0) {
        jsonResponse(false, null, 'quantity no puede ser 0 en un ajuste', 400);
    }

    $pdo->beginTransaction();

    // SELECT ... FOR UPDATE evita que dos ajustes simultáneos sobre el
    // mismo producto se pisen — mismo patrón que sales.php usará en T-01.
    $stmt = $pdo->prepare(
        'SELECT id, stock_current FROM products WHERE id = :id AND is_active = 1 FOR UPDATE'
    );
    $stmt->execute([':id' => $productId]);
    $product = $stmt->fetch();

    if (!$product) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Producto no encontrado', 404);
    }

    $stockBefore = (float) $product['stock_current'];
    $delta = match ($type) {
        'in' => $quantity,
        'out', 'loss' => -$quantity,
        'adjustment' => $quantity,
    };
    $stockAfter = $stockBefore + $delta;

    if ($stockAfter < 0) {
        $pdo->rollBack();
        jsonResponse(false, null, 'El movimiento dejaría el stock en negativo', 400);
    }

    $update = $pdo->prepare('UPDATE products SET stock_current = :stock WHERE id = :id');
    $update->execute([':stock' => $stockAfter, ':id' => $productId]);

    if ($unitCost !== null) {
        $pdo->prepare('UPDATE products SET purchase_price = :cost WHERE id = :id')
            ->execute([':cost' => $unitCost, ':id' => $productId]);
    }

    $mv = $pdo->prepare(
        'INSERT INTO inventory_movements
         (id, product_id, movement_type, quantity, unit_cost, reason, user_id)
         VALUES (:id, :product_id, :type, :quantity, :unit_cost, :reason, :user_id)'
    );
    $mv->execute([
        ':id' => generateUuid(),
        ':product_id' => $productId,
        ':type' => $type,
        ':quantity' => $quantity,
        ':unit_cost' => $unitCost,
        ':reason' => $reason ?: null,
        ':user_id' => $auth['user_id'],
    ]);

    $pdo->commit();

    jsonResponse(true, [
        'product_id' => $productId,
        'stock_before' => $stockBefore,
        'stock_after' => $stockAfter,
    ], 'Movimiento registrado');
}

function handleList($pdo) {
    $sql = 'SELECT m.id, m.movement_type, m.quantity, m.unit_cost, m.reason, m.created_at,
                   p.id AS product_id, p.name AS product_name, p.sku AS product_sku
            FROM inventory_movements m
            JOIN products p ON p.id = m.product_id
            ORDER BY m.created_at DESC
            LIMIT 50';
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Movimientos listados');
}
