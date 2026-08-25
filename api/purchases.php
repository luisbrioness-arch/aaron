<?php
/**
 * Endpoint: /api/purchases.php
 * Acciones: list, get, create, receive
 *
 * 'create' no toca stock — crea la orden en 'pending'. 'receive' admite
 * recepción parcial (quantity es lo que llega EN ESA recepción, no
 * acumulado) y, si la línea trae expiration_date, crea una fila en
 * product_lots — mismo patrón que FERRIMIX más la parte de lotes.
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
        handleList($pdo);
        break;
    case 'get':
        handleGet($pdo);
        break;
    case 'create':
        handleCreate($pdo, $auth);
        break;
    case 'receive':
        handleReceive($pdo, $auth);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function nextPurchaseNumber($pdo) {
    $stmt = $pdo->query(
        'SELECT purchase_number FROM purchases
         ORDER BY CAST(SUBSTRING(purchase_number, 4) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE'
    );
    $last = $stmt->fetchColumn();
    $next = $last ? ((int) substr($last, 3) + 1) : 1;
    return 'OC-' . str_pad((string) $next, 6, '0', STR_PAD_LEFT);
}

function handleList($pdo) {
    $sql = 'SELECT p.id, p.purchase_number, p.purchase_date, p.received_date, p.total_amount,
                   p.status, s.name AS supplier_name
            FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
            ORDER BY p.created_at DESC';
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Órdenes de compra listadas');
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $stmt = $pdo->prepare(
        'SELECT p.*, s.name AS supplier_name, s.rut AS supplier_rut
         FROM purchases p JOIN suppliers s ON s.id = p.supplier_id
         WHERE p.id = :id'
    );
    $stmt->execute([':id' => $id]);
    $purchase = $stmt->fetch();
    if (!$purchase) {
        jsonResponse(false, null, 'Orden de compra no encontrada', 404);
    }

    $itemsStmt = $pdo->prepare(
        'SELECT pd.product_id, pd.quantity, pd.received_quantity, pd.unit_cost, pd.subtotal,
                pd.expiration_date, pd.lot_code, p.name AS product_name, p.sku, p.unit_of_measure
         FROM purchases_details pd JOIN products p ON p.id = pd.product_id
         WHERE pd.purchase_id = :id'
    );
    $itemsStmt->execute([':id' => $id]);

    jsonResponse(true, ['purchase' => $purchase, 'items' => $itemsStmt->fetchAll()], 'Detalle de la orden');
}

function handleCreate($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $supplierId = $input['supplier_id'] ?? null;
    $items = $input['items'] ?? [];

    if (!$supplierId || empty($items) || !is_array($items)) {
        jsonResponse(false, null, 'supplier_id y al menos un producto son obligatorios', 400);
    }

    $pdo->beginTransaction();
    try {
        foreach ($items as $item) {
            if (!($item['product_id'] ?? null) || !is_numeric($item['quantity'] ?? null) || !is_numeric($item['unit_cost'] ?? null)) {
                throw new PurchaseValidationException('Cada línea necesita product_id, quantity y unit_cost', 400);
            }
            if ((float) $item['quantity'] <= 0) {
                throw new PurchaseValidationException('La cantidad de cada línea debe ser positiva', 400);
            }
        }

        $purchaseId = generateUuid();
        $purchaseNumber = nextPurchaseNumber($pdo);
        $totalAmount = 0.0;
        $rows = [];
        foreach ($items as $item) {
            $quantity = (float) $item['quantity'];
            $unitCost = (float) $item['unit_cost'];
            $subtotal = round($quantity * $unitCost, 2);
            $totalAmount += $subtotal;
            $rows[] = [
                'product_id' => $item['product_id'],
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'subtotal' => $subtotal,
            ];
        }

        $stmt = $pdo->prepare(
            'INSERT INTO purchases (id, supplier_id, purchase_number, purchase_date, total_amount, notes, user_id)
             VALUES (:id, :supplier_id, :purchase_number, CURDATE(), :total_amount, :notes, :user_id)'
        );
        $stmt->execute([
            ':id' => $purchaseId,
            ':supplier_id' => $supplierId,
            ':purchase_number' => $purchaseNumber,
            ':total_amount' => $totalAmount,
            ':notes' => $input['notes'] ?? null,
            ':user_id' => $auth['user_id'],
        ]);

        $detailStmt = $pdo->prepare(
            'INSERT INTO purchases_details (id, purchase_id, product_id, quantity, unit_cost, subtotal)
             VALUES (:id, :purchase_id, :product_id, :quantity, :unit_cost, :subtotal)'
        );
        foreach ($rows as $row) {
            $detailStmt->execute([
                ':id' => generateUuid(),
                ':purchase_id' => $purchaseId,
                ':product_id' => $row['product_id'],
                ':quantity' => $row['quantity'],
                ':unit_cost' => $row['unit_cost'],
                ':subtotal' => $row['subtotal'],
            ]);
        }

        $pdo->commit();
    } catch (PurchaseValidationException $e) {
        $pdo->rollBack();
        jsonResponse(false, null, $e->getMessage(), $e->getCode());
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al crear la orden de compra', 500);
    }

    jsonResponse(true, [
        'id' => $purchaseId,
        'purchase_number' => $purchaseNumber,
        'total_amount' => $totalAmount,
        'status' => 'pending',
    ], 'Orden de compra creada', 201);
}

function handleReceive($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $purchaseId = $input['purchase_id'] ?? null;
    $items = $input['items'] ?? [];

    if (!$purchaseId || empty($items) || !is_array($items)) {
        jsonResponse(false, null, 'purchase_id y al menos un producto son obligatorios', 400);
    }

    $pdo->beginTransaction();
    try {
        $purchaseStmt = $pdo->prepare('SELECT * FROM purchases WHERE id = :id FOR UPDATE');
        $purchaseStmt->execute([':id' => $purchaseId]);
        $purchase = $purchaseStmt->fetch();
        if (!$purchase) {
            throw new PurchaseValidationException('Orden de compra no encontrada', 404);
        }
        if ($purchase['status'] === 'cancelled') {
            throw new PurchaseValidationException('La orden está cancelada', 400);
        }
        if ($purchase['status'] === 'received') {
            throw new PurchaseValidationException('La orden ya fue recibida por completo', 400);
        }

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? null;
            $quantity = $item['quantity'] ?? null;
            if (!$productId || !is_numeric($quantity) || $quantity <= 0) {
                throw new PurchaseValidationException('Cada línea necesita product_id y quantity positivo', 400);
            }
            $quantity = (float) $quantity;

            $lineStmt = $pdo->prepare(
                'SELECT * FROM purchases_details WHERE purchase_id = :purchase_id AND product_id = :product_id FOR UPDATE'
            );
            $lineStmt->execute([':purchase_id' => $purchaseId, ':product_id' => $productId]);
            $line = $lineStmt->fetch();
            if (!$line) {
                throw new PurchaseValidationException('Ese producto no forma parte de esta orden', 400);
            }

            $pending = (float) $line['quantity'] - (float) $line['received_quantity'];
            if ($quantity > $pending) {
                throw new PurchaseValidationException(
                    "La cantidad recibida supera lo pendiente (pendiente: $pending)",
                    400
                );
            }

            $expirationDate = $item['expiration_date'] ?? null;
            $lotCode = $item['lot_code'] ?? null;

            $pdo->prepare(
                'UPDATE purchases_details
                 SET received_quantity = received_quantity + :qty, expiration_date = :expiration_date, lot_code = :lot_code
                 WHERE id = :id'
            )->execute([
                ':qty' => $quantity,
                ':expiration_date' => $expirationDate,
                ':lot_code' => $lotCode,
                ':id' => $line['id'],
            ]);

            $pdo->prepare('UPDATE products SET stock_current = stock_current + :qty WHERE id = :id')
                ->execute([':qty' => $quantity, ':id' => $productId]);

            $mv = $pdo->prepare(
                'INSERT INTO inventory_movements
                 (id, product_id, movement_type, quantity, unit_cost, reason, reference_id, user_id)
                 VALUES (:id, :product_id, "in", :qty, :unit_cost, "Recepción de compra", :reference_id, :user_id)'
            );
            $mv->execute([
                ':id' => generateUuid(),
                ':product_id' => $productId,
                ':qty' => $quantity,
                ':unit_cost' => $line['unit_cost'],
                ':reference_id' => $purchaseId,
                ':user_id' => $auth['user_id'],
            ]);

            $productStmt = $pdo->prepare('SELECT has_expiration FROM products WHERE id = :id');
            $productStmt->execute([':id' => $productId]);
            $hasExpiration = (bool) $productStmt->fetchColumn();

            if ($hasExpiration) {
                $lot = $pdo->prepare(
                    'INSERT INTO product_lots
                     (id, product_id, purchase_id, lot_code, expiration_date, quantity_received, quantity_remaining, unit_cost)
                     VALUES (:id, :product_id, :purchase_id, :lot_code, :expiration_date, :qty, :qty, :unit_cost)'
                );
                $lot->execute([
                    ':id' => generateUuid(),
                    ':product_id' => $productId,
                    ':purchase_id' => $purchaseId,
                    ':lot_code' => $lotCode,
                    ':expiration_date' => $expirationDate,
                    ':qty' => $quantity,
                    ':unit_cost' => $line['unit_cost'],
                ]);
            }
        }

        // Recalcula el status de la orden completa según cuánto se haya
        // recibido en total, no solo de las líneas de esta llamada.
        $totalsStmt = $pdo->prepare(
            'SELECT SUM(quantity) AS total_qty, SUM(received_quantity) AS received_qty
             FROM purchases_details WHERE purchase_id = :id'
        );
        $totalsStmt->execute([':id' => $purchaseId]);
        $totals = $totalsStmt->fetch();

        if ((float) $totals['received_qty'] >= (float) $totals['total_qty']) {
            $newStatus = 'received';
            $pdo->prepare('UPDATE purchases SET status = :status, received_date = COALESCE(received_date, CURDATE()) WHERE id = :id')
                ->execute([':status' => $newStatus, ':id' => $purchaseId]);
        } else {
            $newStatus = 'partial';
            $pdo->prepare('UPDATE purchases SET status = :status WHERE id = :id')
                ->execute([':status' => $newStatus, ':id' => $purchaseId]);
        }

        $pdo->commit();
    } catch (PurchaseValidationException $e) {
        $pdo->rollBack();
        jsonResponse(false, null, $e->getMessage(), $e->getCode());
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al recibir la orden de compra', 500);
    }

    jsonResponse(true, ['purchase_id' => $purchaseId, 'status' => $newStatus], 'Recepción registrada');
}

class PurchaseValidationException extends Exception {}
