<?php
/**
 * Endpoint: /api/promotions.php
 * Acciones: list, create, update, deactivate
 *
 * Nuevo respecto a FERRIMIX. 'list' (promociones activas y vigentes) la
 * necesita el POS para aplicar descuentos automáticos — abierta a
 * cualquier usuario autenticado. Gestión completa es solo admin.
 *
 * Convención para type = 'pack_price' (sin columna propia para "tamaño
 * del pack"): buy_quantity se reutiliza como cuántas unidades forman el
 * pack, y pack_price es el precio total de ese pack. Ver DECISIONS.md.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

const VALID_PROMOTION_TYPES = ['nxm', 'pack_price'];

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'list':
        handleList($pdo);
        break;
    case 'create':
        requireRole($auth, ['admin']);
        handleCreate($pdo);
        break;
    case 'update':
        requireRole($auth, ['admin']);
        handleUpdate($pdo);
        break;
    case 'deactivate':
        requireRole($auth, ['admin']);
        handleDeactivate($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function mapPromotionRow($row) {
    return [
        'id' => $row['id'],
        'name' => $row['name'],
        'type' => $row['type'],
        'buy_quantity' => $row['buy_quantity'] !== null ? (int) $row['buy_quantity'] : null,
        'pay_quantity' => $row['pay_quantity'] !== null ? (int) $row['pay_quantity'] : null,
        'pack_price' => $row['pack_price'] !== null ? (float) $row['pack_price'] : null,
        'starts_at' => $row['starts_at'],
        'ends_at' => $row['ends_at'],
        'is_active' => (bool) $row['is_active'],
        'product_ids' => $row['product_ids'] ? explode(',', $row['product_ids']) : [],
    ];
}

// 'list' devuelve solo promociones activas Y vigentes (dentro de
// starts_at/ends_at si están definidos) — es lo que el POS necesita para
// decidir si aplica un descuento, no un CRUD de auditoría.
function handleList($pdo) {
    $sql = "SELECT pr.id, pr.name, pr.type, pr.buy_quantity, pr.pay_quantity, pr.pack_price,
                   pr.starts_at, pr.ends_at, pr.is_active,
                   GROUP_CONCAT(pp.product_id) AS product_ids
            FROM promotions pr
            LEFT JOIN promotion_products pp ON pp.promotion_id = pr.id
            WHERE pr.is_active = 1
              AND (pr.starts_at IS NULL OR pr.starts_at <= CURDATE())
              AND (pr.ends_at IS NULL OR pr.ends_at >= CURDATE())
            GROUP BY pr.id, pr.name, pr.type, pr.buy_quantity, pr.pay_quantity, pr.pack_price,
                     pr.starts_at, pr.ends_at, pr.is_active
            ORDER BY pr.name";
    $stmt = $pdo->query($sql);
    jsonResponse(true, array_map('mapPromotionRow', $stmt->fetchAll()), 'Promociones activas');
}

function validatePromotionFields($input) {
    $type = $input['type'] ?? null;
    if (!in_array($type, VALID_PROMOTION_TYPES, true)) {
        jsonResponse(false, null, 'type debe ser "nxm" o "pack_price"', 400);
    }

    if ($type === 'nxm') {
        $buy = $input['buy_quantity'] ?? null;
        $pay = $input['pay_quantity'] ?? null;
        if (!is_numeric($buy) || !is_numeric($pay) || $buy <= 0 || $pay <= 0 || $pay >= $buy) {
            jsonResponse(false, null, 'Para "nxm", buy_quantity y pay_quantity deben ser positivos y pay_quantity < buy_quantity', 400);
        }
        return [(int) $buy, (int) $pay, null];
    }

    // pack_price: buy_quantity = unidades del pack, pack_price = precio del pack.
    $packSize = $input['buy_quantity'] ?? null;
    $packPrice = $input['pack_price'] ?? null;
    if (!is_numeric($packSize) || $packSize <= 0 || !is_numeric($packPrice) || $packPrice < 0) {
        jsonResponse(false, null, 'Para "pack_price", buy_quantity (tamaño del pack) y pack_price son obligatorios', 400);
    }
    return [(int) $packSize, null, (float) $packPrice];
}

function handleCreate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $name = trim($input['name'] ?? '');
    $productIds = $input['product_ids'] ?? [];

    if ($name === '') {
        jsonResponse(false, null, 'name es obligatorio', 400);
    }
    if (empty($productIds) || !is_array($productIds)) {
        jsonResponse(false, null, 'Selecciona al menos un producto', 400);
    }

    [$buyQuantity, $payQuantity, $packPrice] = validatePromotionFields($input);

    $id = generateUuid();
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO promotions (id, name, type, buy_quantity, pay_quantity, pack_price, starts_at, ends_at, is_active)
             VALUES (:id, :name, :type, :buy_quantity, :pay_quantity, :pack_price, :starts_at, :ends_at, 1)'
        );
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':type' => $input['type'],
            ':buy_quantity' => $buyQuantity,
            ':pay_quantity' => $payQuantity,
            ':pack_price' => $packPrice,
            ':starts_at' => $input['starts_at'] ?: null,
            ':ends_at' => $input['ends_at'] ?: null,
        ]);

        $ppStmt = $pdo->prepare(
            'INSERT INTO promotion_products (id, promotion_id, product_id) VALUES (:id, :promotion_id, :product_id)'
        );
        foreach (array_unique($productIds) as $productId) {
            $ppStmt->execute([':id' => generateUuid(), ':promotion_id' => $id, ':product_id' => $productId]);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al crear la promoción', 500);
    }

    jsonResponse(true, ['id' => $id], 'Promoción creada', 201);
}

function handleUpdate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $check = $pdo->prepare('SELECT id FROM promotions WHERE id = :id');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) {
        jsonResponse(false, null, 'Promoción no encontrada', 404);
    }

    $name = trim($input['name'] ?? '');
    if ($name === '') {
        jsonResponse(false, null, 'name es obligatorio', 400);
    }
    [$buyQuantity, $payQuantity, $packPrice] = validatePromotionFields($input);

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare(
            'UPDATE promotions
             SET name = :name, type = :type, buy_quantity = :buy_quantity, pay_quantity = :pay_quantity,
                 pack_price = :pack_price, starts_at = :starts_at, ends_at = :ends_at
             WHERE id = :id'
        );
        $stmt->execute([
            ':name' => $name,
            ':type' => $input['type'],
            ':buy_quantity' => $buyQuantity,
            ':pay_quantity' => $payQuantity,
            ':pack_price' => $packPrice,
            ':starts_at' => $input['starts_at'] ?: null,
            ':ends_at' => $input['ends_at'] ?: null,
            ':id' => $id,
        ]);

        if (isset($input['product_ids']) && is_array($input['product_ids'])) {
            $pdo->prepare('DELETE FROM promotion_products WHERE promotion_id = :id')->execute([':id' => $id]);
            $ppStmt = $pdo->prepare(
                'INSERT INTO promotion_products (id, promotion_id, product_id) VALUES (:id, :promotion_id, :product_id)'
            );
            foreach (array_unique($input['product_ids']) as $productId) {
                $ppStmt->execute([':id' => generateUuid(), ':promotion_id' => $id, ':product_id' => $productId]);
            }
        }

        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al actualizar la promoción', 500);
    }

    jsonResponse(true, ['id' => $id], 'Promoción actualizada');
}

function handleDeactivate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $stmt = $pdo->prepare('UPDATE promotions SET is_active = 0 WHERE id = :id AND is_active = 1');
    $stmt->execute([':id' => $id]);
    if ($stmt->rowCount() === 0) {
        jsonResponse(false, null, 'Promoción no encontrada o ya estaba desactivada', 404);
    }

    jsonResponse(true, null, 'Promoción desactivada');
}
