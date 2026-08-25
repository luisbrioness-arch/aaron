<?php
/**
 * Endpoint: /api/sales.php
 * Acciones: create, list, get
 *
 * IVA 19%, redondeo a $10 en pagos en efectivo, descuentos siempre en
 * pesos y clampeados server-side, FEFO para productos con
 * has_expiration = true. Ver DECISIONS.md (D-07, D-09, D-18/D-19/D-20
 * de esta sesión) para el razonamiento completo.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

const VALID_PAYMENT_METHODS = ['cash', 'card', 'transfer', 'mixed'];
const VALID_INVOICE_TYPES = ['boleta', 'factura'];
const IVA_RATE = 0.19;

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'create':
        handleCreate($pdo, $auth);
        break;
    case 'list':
        handleList($pdo);
        break;
    case 'get':
        handleGet($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function findOpenRegisterId($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT id FROM cash_registers WHERE user_id = :user_id AND status = "open"');
    $stmt->execute([':user_id' => $userId]);
    $row = $stmt->fetch();
    return $row ? $row['id'] : null;
}

function nextInvoiceNumber($pdo) {
    $stmt = $pdo->query('SELECT invoice_number FROM sales ORDER BY CAST(invoice_number AS UNSIGNED) DESC LIMIT 1 FOR UPDATE');
    $last = $stmt->fetchColumn();
    $next = $last ? ((int) $last + 1) : 1;
    return str_pad((string) $next, 6, '0', STR_PAD_LEFT);
}

// Descuenta stock de un producto para una línea de venta. Para productos
// con vencimiento, consume primero del lote que vence antes (FEFO) y deja
// un inventory_movements por cada lote tocado, para trazabilidad. Si el
// producto tiene has_expiration = true pero no tiene lotes cargados
// todavía (T-02 no crea lotes al dar stock inicial — ver D-17), se
// descuenta el agregado igual, sin lote asociado, para no bloquear la
// venta — se vuelve preciso por lote en cuanto T-03 empiece a crear lotes
// reales.
function consumeStockForSale($pdo, array $product, float $quantity, array $auth, string $saleId) {
    $productId = $product['id'];

    if (!$product['has_expiration']) {
        $pdo->prepare('UPDATE products SET stock_current = stock_current - :qty WHERE id = :id')
            ->execute([':qty' => $quantity, ':id' => $productId]);
        return null;
    }

    $lotsStmt = $pdo->prepare(
        'SELECT id, quantity_remaining FROM product_lots
         WHERE product_id = :id AND quantity_remaining > 0
         ORDER BY (expiration_date IS NULL) ASC, expiration_date ASC
         FOR UPDATE'
    );
    $lotsStmt->execute([':id' => $productId]);
    $lots = $lotsStmt->fetchAll();

    $remaining = $quantity;
    $firstLotId = null;
    foreach ($lots as $lot) {
        if ($remaining <= 0) {
            break;
        }
        $take = min($remaining, (float) $lot['quantity_remaining']);
        if ($take <= 0) {
            continue;
        }

        $pdo->prepare('UPDATE product_lots SET quantity_remaining = quantity_remaining - :take WHERE id = :id')
            ->execute([':take' => $take, ':id' => $lot['id']]);

        $mv = $pdo->prepare(
            'INSERT INTO inventory_movements
             (id, product_id, lot_id, movement_type, quantity, reason, reference_id, user_id)
             VALUES (:id, :product_id, :lot_id, "out", :qty, "Venta", :sale_id, :user_id)'
        );
        $mv->execute([
            ':id' => generateUuid(),
            ':product_id' => $productId,
            ':lot_id' => $lot['id'],
            ':qty' => $take,
            ':sale_id' => $saleId,
            ':user_id' => $auth['user_id'],
        ]);

        $firstLotId ??= $lot['id'];
        $remaining -= $take;
    }

    $pdo->prepare('UPDATE products SET stock_current = stock_current - :qty WHERE id = :id')
        ->execute([':qty' => $quantity, ':id' => $productId]);

    return $firstLotId;
}

function handleCreate($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $items = $input['items'] ?? [];
    $paymentMethod = $input['payment_method'] ?? null;
    $invoiceType = $input['invoice_type'] ?? 'boleta';
    $amountReceived = $input['amount_received'] ?? null;
    $saleDiscountInput = is_numeric($input['discount_amount'] ?? null) ? (float) $input['discount_amount'] : 0;

    if (empty($items) || !is_array($items)) {
        jsonResponse(false, null, 'El carrito está vacío', 400);
    }
    if (!in_array($paymentMethod, VALID_PAYMENT_METHODS, true)) {
        jsonResponse(false, null, 'payment_method inválido', 400);
    }
    if (!in_array($invoiceType, VALID_INVOICE_TYPES, true)) {
        jsonResponse(false, null, 'invoice_type inválido', 400);
    }
    if ($amountReceived !== null && !is_numeric($amountReceived)) {
        jsonResponse(false, null, 'amount_received debe ser numérico', 400);
    }
    if ($amountReceived !== null && $paymentMethod !== 'cash') {
        jsonResponse(false, null, 'amount_received solo es válido con payment_method "cash"', 400);
    }

    $pdo->beginTransaction();

    try {
        $cashRegisterId = findOpenRegisterId($pdo, $auth['user_id']);
        $saleId = generateUuid();

        $lines = [];
        $grossSubtotal = 0.0;
        $lineDiscountTotal = 0.0;

        foreach ($items as $item) {
            $productId = $item['product_id'] ?? null;
            $quantity = $item['quantity'] ?? null;
            if (!$productId || !is_numeric($quantity) || $quantity <= 0) {
                throw new SaleValidationException('Cada línea necesita product_id y quantity positivo', 400);
            }
            $quantity = (float) $quantity;

            $stmt = $pdo->prepare(
                'SELECT id, name, selling_price, stock_current, has_expiration
                 FROM products WHERE id = :id AND is_active = 1 FOR UPDATE'
            );
            $stmt->execute([':id' => $productId]);
            $product = $stmt->fetch();

            if (!$product) {
                throw new SaleValidationException('Uno de los productos ya no existe o fue desactivado', 400);
            }
            if ((float) $product['stock_current'] < $quantity) {
                throw new SaleValidationException(
                    "Stock insuficiente de \"{$product['name']}\" (disponible: {$product['stock_current']})",
                    400
                );
            }

            $unitPrice = (float) $product['selling_price'];
            $subtotal = round($unitPrice * $quantity, 2);
            $lineDiscount = is_numeric($item['discount_amount'] ?? null) ? (float) $item['discount_amount'] : 0;
            $lineDiscount = round(max(0, min($lineDiscount, $subtotal)));

            $lotId = consumeStockForSale($pdo, $product, $quantity, $auth, $saleId);

            $lines[] = [
                'product_id' => $productId,
                'product_name' => $product['name'],
                'lot_id' => $lotId,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'discount_amount' => $lineDiscount,
                'subtotal' => $subtotal,
            ];

            $grossSubtotal += $subtotal;
            $lineDiscountTotal += $lineDiscount;
        }

        $afterLineDiscounts = $grossSubtotal - $lineDiscountTotal;
        $saleDiscount = round(max(0, min($saleDiscountInput, $afterLineDiscounts)));
        $discountTotal = $lineDiscountTotal + $saleDiscount;
        $subtotal = $grossSubtotal - $discountTotal;
        $iva = round($subtotal * IVA_RATE);
        $totalBeforeRounding = $subtotal + $iva;

        if ($paymentMethod === 'cash') {
            $totalAmount = round($totalBeforeRounding / 10) * 10;
            $roundingAdjustment = $totalAmount - $totalBeforeRounding;
        } else {
            $totalAmount = $totalBeforeRounding;
            $roundingAdjustment = 0;
        }

        $changeAmount = null;
        if ($amountReceived !== null) {
            $amountReceived = (float) $amountReceived;
            if ($amountReceived < $totalAmount) {
                throw new SaleValidationException('El efectivo no alcanza para cubrir el total', 400);
            }
            $changeAmount = $amountReceived - $totalAmount;
        }

        $invoiceNumber = nextInvoiceNumber($pdo);

        $stmt = $pdo->prepare(
            'INSERT INTO sales
             (id, cash_register_id, user_id, total_amount, discount_amount, payment_method,
              amount_received, change_amount, invoice_type, invoice_number, invoice_date,
              customer_rut, customer_name, status)
             VALUES
             (:id, :cash_register_id, :user_id, :total_amount, :discount_amount, :payment_method,
              :amount_received, :change_amount, :invoice_type, :invoice_number, CURDATE(),
              :customer_rut, :customer_name, "completed")'
        );
        $stmt->execute([
            ':id' => $saleId,
            ':cash_register_id' => $cashRegisterId,
            ':user_id' => $auth['user_id'],
            ':total_amount' => $totalAmount,
            ':discount_amount' => $saleDiscount,
            ':payment_method' => $paymentMethod,
            ':amount_received' => $amountReceived,
            ':change_amount' => $changeAmount,
            ':invoice_type' => $invoiceType,
            ':invoice_number' => $invoiceNumber,
            ':customer_rut' => $input['customer_rut'] ?? null,
            ':customer_name' => $input['customer_name'] ?? null,
        ]);

        $detailStmt = $pdo->prepare(
            'INSERT INTO sales_details
             (id, sale_id, product_id, lot_id, quantity, unit_price, discount_amount, subtotal)
             VALUES (:id, :sale_id, :product_id, :lot_id, :quantity, :unit_price, :discount_amount, :subtotal)'
        );
        foreach ($lines as $line) {
            $detailStmt->execute([
                ':id' => generateUuid(),
                ':sale_id' => $saleId,
                ':product_id' => $line['product_id'],
                ':lot_id' => $line['lot_id'],
                ':quantity' => $line['quantity'],
                ':unit_price' => $line['unit_price'],
                ':discount_amount' => $line['discount_amount'],
                ':subtotal' => $line['subtotal'],
            ]);
        }

        $pdo->commit();
    } catch (SaleValidationException $e) {
        $pdo->rollBack();
        jsonResponse(false, null, $e->getMessage(), $e->getCode());
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al registrar la venta', 500);
    }

    jsonResponse(true, [
        'sale_id' => $saleId,
        'invoice_number' => $invoiceNumber,
        'invoice_type' => $invoiceType,
        'gross_subtotal' => $grossSubtotal,
        'discount_total' => $discountTotal,
        'subtotal' => $subtotal,
        'iva' => $iva,
        'rounding_adjustment' => $roundingAdjustment,
        'total_amount' => $totalAmount,
        'amount_received' => $amountReceived,
        'change_amount' => $changeAmount,
        'items' => array_map(fn ($l) => [
            'product_id' => $l['product_id'],
            'product_name' => $l['product_name'],
            'quantity' => $l['quantity'],
            'unit_price' => $l['unit_price'],
            'discount_amount' => $l['discount_amount'],
            'subtotal' => $l['subtotal'],
        ], $lines),
    ], 'Venta completada', 201);
}

function saleSummarySql() {
    return 'SELECT s.id, s.invoice_number, s.invoice_type, s.total_amount, s.discount_amount,
                    s.payment_method, s.status, s.created_at, u.full_name AS cashier_name
             FROM sales s JOIN users u ON u.id = s.user_id';
}

function handleList($pdo) {
    if (isset($_GET['page'])) {
        $page = max(1, (int) $_GET['page']);
        $perPage = 15;
        $offset = ($page - 1) * $perPage;

        $total = (int) $pdo->query('SELECT COUNT(*) FROM sales')->fetchColumn();
        $stmt = $pdo->query(saleSummarySql() . " ORDER BY s.created_at DESC LIMIT $perPage OFFSET $offset");

        jsonResponse(true, [
            'sales' => $stmt->fetchAll(),
            'page' => $page,
            'per_page' => $perPage,
            'total' => $total,
            'total_pages' => (int) ceil($total / $perPage),
        ], 'Ventas listadas');
    }

    if (isset($_GET['date'])) {
        $stmt = $pdo->prepare(saleSummarySql() . ' WHERE s.invoice_date = :date ORDER BY s.created_at DESC LIMIT 100');
        $stmt->execute([':date' => $_GET['date']]);
        jsonResponse(true, $stmt->fetchAll(), 'Ventas del día');
    }

    $stmt = $pdo->query(saleSummarySql() . ' ORDER BY s.created_at DESC LIMIT 20');
    jsonResponse(true, $stmt->fetchAll(), 'Últimas ventas');
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $stmt = $pdo->prepare(
        'SELECT s.*, u.full_name AS cashier_name FROM sales s JOIN users u ON u.id = s.user_id WHERE s.id = :id'
    );
    $stmt->execute([':id' => $id]);
    $sale = $stmt->fetch();
    if (!$sale) {
        jsonResponse(false, null, 'Venta no encontrada', 404);
    }

    $itemsStmt = $pdo->prepare(
        'SELECT sd.quantity, sd.unit_price, sd.discount_amount, sd.subtotal,
                p.name AS product_name, p.unit_of_measure
         FROM sales_details sd JOIN products p ON p.id = sd.product_id
         WHERE sd.sale_id = :id'
    );
    $itemsStmt->execute([':id' => $id]);

    $grossSubtotal = 0.0;
    $discountTotal = (float) $sale['discount_amount'];
    $items = $itemsStmt->fetchAll();
    foreach ($items as $item) {
        $grossSubtotal += (float) $item['subtotal'];
        $discountTotal += (float) $item['discount_amount'];
    }
    $subtotal = $grossSubtotal - $discountTotal;
    $iva = round($subtotal * IVA_RATE);
    $roundingAdjustment = (float) $sale['total_amount'] - $subtotal - $iva;

    jsonResponse(true, [
        'sale' => [
            'invoice_number' => $sale['invoice_number'],
            'invoice_type' => $sale['invoice_type'],
            'total_amount' => (float) $sale['total_amount'],
            'discount_amount' => (float) $sale['discount_amount'],
            'payment_method' => $sale['payment_method'],
            'customer_name' => $sale['customer_name'],
            'customer_rut' => $sale['customer_rut'],
            'invoice_date' => $sale['invoice_date'],
            'created_at' => $sale['created_at'],
            'cashier_name' => $sale['cashier_name'],
        ],
        'items' => $items,
        'gross_subtotal' => $grossSubtotal,
        'discount_total' => $discountTotal,
        'subtotal' => $subtotal,
        'iva' => $iva,
        'rounding_adjustment' => $roundingAdjustment,
    ], 'Detalle de venta');
}

class SaleValidationException extends Exception {}
