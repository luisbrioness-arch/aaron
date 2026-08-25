<?php
/**
 * Endpoint: /api/lots.php
 * Acciones: expiring, expired, adjust
 *
 * Nuevo respecto a FERRIMIX — vencimientos por lote (product_lots).
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
        handleExpiring($pdo);
        break;
    case 'expired':
        handleExpired($pdo);
        break;
    case 'adjust':
        handleAdjust($pdo, $auth);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function lotSelectSql($whereDate) {
    return "SELECT pl.id, pl.product_id, pl.lot_code, pl.expiration_date, pl.quantity_remaining,
                   p.name AS product_name, p.sku, p.unit_of_measure,
                   DATEDIFF(pl.expiration_date, CURDATE()) AS days_until_expiration
            FROM product_lots pl JOIN products p ON p.id = pl.product_id
            WHERE pl.expiration_date IS NOT NULL AND pl.quantity_remaining > 0 AND $whereDate
            ORDER BY pl.expiration_date ASC";
}

function handleExpiring($pdo) {
    $days = (int) EXPIRATION_WARNING_DAYS;
    $sql = lotSelectSql("pl.expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL $days DAY)");
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Lotes por vencer');
}

function handleExpired($pdo) {
    $sql = lotSelectSql('pl.expiration_date < CURDATE()');
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Lotes vencidos');
}

function handleAdjust($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $lotId = $input['lot_id'] ?? null;
    if (!$lotId) {
        jsonResponse(false, null, 'lot_id requerido', 400);
    }
    if (isset($input['quantity']) && !is_numeric($input['quantity'])) {
        jsonResponse(false, null, 'quantity debe ser numérico', 400);
    }

    $pdo->beginTransaction();
    try {
        $lotStmt = $pdo->prepare('SELECT * FROM product_lots WHERE id = :id FOR UPDATE');
        $lotStmt->execute([':id' => $lotId]);
        $lot = $lotStmt->fetch();
        if (!$lot) {
            throw new LotValidationException('Lote no encontrado', 404);
        }

        // Sin quantity, se marca como merma todo lo que queda del lote —
        // es el caso más común (un lote vencido se descarta completo).
        $quantity = isset($input['quantity']) ? (float) $input['quantity'] : (float) $lot['quantity_remaining'];
        if ($quantity <= 0 || $quantity > (float) $lot['quantity_remaining']) {
            throw new LotValidationException('quantity inválida para este lote', 400);
        }

        $pdo->prepare('UPDATE product_lots SET quantity_remaining = quantity_remaining - :qty WHERE id = :id')
            ->execute([':qty' => $quantity, ':id' => $lotId]);

        $pdo->prepare('UPDATE products SET stock_current = stock_current - :qty WHERE id = :id')
            ->execute([':qty' => $quantity, ':id' => $lot['product_id']]);

        $mv = $pdo->prepare(
            'INSERT INTO inventory_movements (id, product_id, lot_id, movement_type, quantity, reason, user_id)
             VALUES (:id, :product_id, :lot_id, "loss", :qty, :reason, :user_id)'
        );
        $mv->execute([
            ':id' => generateUuid(),
            ':product_id' => $lot['product_id'],
            ':lot_id' => $lotId,
            ':qty' => $quantity,
            ':reason' => trim($input['reason'] ?? '') ?: 'Producto vencido',
            ':user_id' => $auth['user_id'],
        ]);

        $pdo->commit();
    } catch (LotValidationException $e) {
        $pdo->rollBack();
        jsonResponse(false, null, $e->getMessage(), $e->getCode());
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al registrar la merma', 500);
    }

    jsonResponse(true, [
        'lot_id' => $lotId,
        'quantity_adjusted' => $quantity,
        'quantity_remaining' => (float) $lot['quantity_remaining'] - $quantity,
    ], 'Merma registrada');
}

class LotValidationException extends Exception {}
