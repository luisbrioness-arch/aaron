<?php
/**
 * Endpoint: /api/customers.php
 * Acciones: list, get, create, update, payment, history
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'list':
        handleList($pdo);
        break;
    case 'get':
        handleGet($pdo);
        break;
    case 'create':
        handleCreate($pdo);
        break;
    case 'update':
        handleUpdate($pdo);
        break;
    case 'payment':
        handlePayment($pdo, $auth);
        break;
    case 'history':
        handleHistory($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function handleList($pdo) {
    $search = trim($_GET['search'] ?? '');
    $onlyWithDebt = isset($_GET['with_debt']) && $_GET['with_debt'] === '1';

    $sql = 'SELECT id, name, rut, phone, address, notes, credit_limit, current_balance, is_active, created_at, updated_at
            FROM customers WHERE is_active = 1';
    $params = [];

    if ($search !== '') {
        $sql .= ' AND (name LIKE :search OR rut LIKE :search OR phone LIKE :search)';
        $params[':search'] = "%{$search}%";
    }

    if ($onlyWithDebt) {
        $sql .= ' AND current_balance > 0';
    }

    $sql .= ' ORDER BY current_balance DESC, name ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $customers = $stmt->fetchAll();

    $totalDebt = 0.0;
    foreach ($customers as &$c) {
        $c['credit_limit'] = (float) $c['credit_limit'];
        $c['current_balance'] = (float) $c['current_balance'];
        $c['is_active'] = (bool) $c['is_active'];
        $totalDebt += $c['current_balance'];
    }

    jsonResponse(true, [
        'customers' => $customers,
        'total_debt' => $totalDebt,
        'count' => count($customers),
    ], 'Lista de clientes');
}

function handleGet($pdo) {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id es obligatorio', 400);
    }

    $stmt = $pdo->prepare('SELECT * FROM customers WHERE id = :id');
    $stmt->execute([':id' => $id]);
    $customer = $stmt->fetch();

    if (!$customer) {
        jsonResponse(false, null, 'Cliente no encontrado', 404);
    }

    $customer['credit_limit'] = (float) $customer['credit_limit'];
    $customer['current_balance'] = (float) $customer['current_balance'];

    // Obtener últimas 10 ventas fiadas
    $salesStmt = $pdo->prepare(
        "SELECT id, invoice_number, total_amount, created_at, 'credit_sale' AS type
         FROM sales WHERE customer_id = :id AND payment_method = 'credit'
         ORDER BY created_at DESC LIMIT 10"
    );
    $salesStmt->execute([':id' => $id]);
    $sales = $salesStmt->fetchAll();

    // Obtener últimos 10 pagos / abonos
    $payStmt = $pdo->prepare(
        "SELECT p.*, u.full_name, u.username, 'payment' AS type
         FROM customer_payments p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.customer_id = :id
         ORDER BY p.created_at DESC LIMIT 10"
    );
    $payStmt->execute([':id' => $id]);
    $payments = $payStmt->fetchAll();

    $customer['recent_sales'] = $sales;
    $customer['recent_payments'] = $payments;

    jsonResponse(true, $customer, 'Detalle de cliente');
}

function handleCreate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $name = trim($input['name'] ?? '');
    $rut = trim($input['rut'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $address = trim($input['address'] ?? '');
    $notes = trim($input['notes'] ?? '');
    $creditLimit = isset($input['credit_limit']) ? (float) $input['credit_limit'] : 50000.0;

    if (empty($name)) {
        jsonResponse(false, null, 'El nombre del cliente es obligatorio', 400);
    }

    $id = generateUuid();
    $stmt = $pdo->prepare(
        'INSERT INTO customers (id, name, rut, phone, address, notes, credit_limit, current_balance, is_active)
         VALUES (:id, :name, :rut, :phone, :address, :notes, :credit_limit, 0, 1)'
    );

    try {
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':rut' => !empty($rut) ? $rut : null,
            ':phone' => !empty($phone) ? $phone : null,
            ':address' => !empty($address) ? $address : null,
            ':notes' => !empty($notes) ? $notes : null,
            ':credit_limit' => max(0, $creditLimit),
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate entry') || str_contains($e->getMessage(), 'UNIQUE')) {
            jsonResponse(false, null, 'Ya existe un cliente con ese RUT', 400);
        }
        jsonResponse(false, null, 'Error al crear el cliente', 500);
    }

    jsonResponse(true, [
        'id' => $id,
        'name' => $name,
        'credit_limit' => $creditLimit,
        'current_balance' => 0.0,
    ], 'Cliente creado exitosamente', 201);
}

function handleUpdate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    $name = trim($input['name'] ?? '');
    $rut = trim($input['rut'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $address = trim($input['address'] ?? '');
    $notes = trim($input['notes'] ?? '');
    $creditLimit = isset($input['credit_limit']) ? (float) $input['credit_limit'] : null;

    if (!$id || empty($name)) {
        jsonResponse(false, null, 'ID y nombre son obligatorios', 400);
    }

    $stmt = $pdo->prepare(
        'UPDATE customers
         SET name = :name, rut = :rut, phone = :phone, address = :address,
             notes = :notes, credit_limit = COALESCE(:credit_limit, credit_limit)
         WHERE id = :id'
    );

    try {
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':rut' => !empty($rut) ? $rut : null,
            ':phone' => !empty($phone) ? $phone : null,
            ':address' => !empty($address) ? $address : null,
            ':notes' => !empty($notes) ? $notes : null,
            ':credit_limit' => $creditLimit !== null ? max(0, $creditLimit) : null,
        ]);
    } catch (PDOException $e) {
        if (str_contains($e->getMessage(), 'Duplicate entry')) {
            jsonResponse(false, null, 'Ya existe un cliente con ese RUT', 400);
        }
        jsonResponse(false, null, 'Error al actualizar el cliente', 500);
    }

    jsonResponse(true, ['id' => $id], 'Cliente actualizado');
}

function handlePayment($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $customerId = $input['customer_id'] ?? null;
    $amount = isset($input['amount']) ? (float) $input['amount'] : null;
    $paymentMethod = $input['payment_method'] ?? 'cash';
    $notes = trim($input['notes'] ?? '');

    if (!$customerId || !$amount || $amount <= 0) {
        jsonResponse(false, null, 'Cliente y monto mayor a cero son obligatorios', 400);
    }

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare('SELECT id, name, current_balance FROM customers WHERE id = :id FOR UPDATE');
        $stmt->execute([':id' => $customerId]);
        $customer = $stmt->fetch();

        if (!$customer) {
            $pdo->rollBack();
            jsonResponse(false, null, 'Cliente no encontrado', 404);
        }

        $currentBalance = (float) $customer['current_balance'];
        $newBalance = max(0, $currentBalance - $amount);

        // Actualizar saldo del cliente
        $upd = $pdo->prepare('UPDATE customers SET current_balance = :balance WHERE id = :id');
        $upd->execute([':balance' => $newBalance, ':id' => $customerId]);

        // Registrar pago
        $paymentId = generateUuid();
        $cashRegisterId = null;

        // Si el pago es en efectivo y hay caja abierta, vincular a la caja
        if ($paymentMethod === 'cash') {
            $regStmt = $pdo->prepare("SELECT id FROM cash_registers WHERE user_id = :uid AND status = 'open'");
            $regStmt->execute([':uid' => $auth['user_id']]);
            $cashRegisterId = $regStmt->fetchColumn() ?: null;
        }

        $ins = $pdo->prepare(
            'INSERT INTO customer_payments (id, customer_id, cash_register_id, user_id, amount, payment_method, notes)
             VALUES (:id, :customer_id, :cash_register_id, :user_id, :amount, :payment_method, :notes)'
        );
        $ins->execute([
            ':id' => $paymentId,
            ':customer_id' => $customerId,
            ':cash_register_id' => $cashRegisterId,
            ':user_id' => $auth['user_id'],
            ':amount' => $amount,
            ':payment_method' => $paymentMethod,
            ':notes' => !empty($notes) ? $notes : null,
        ]);

        $pdo->commit();

        jsonResponse(true, [
            'payment_id' => $paymentId,
            'customer_id' => $customerId,
            'amount' => $amount,
            'previous_balance' => $currentBalance,
            'new_balance' => $newBalance,
        ], 'Abono registrado exitosamente');
    } catch (Throwable $e) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Error al registrar el abono: ' . $e->getMessage(), 500);
    }
}

function handleHistory($pdo) {
    $customerId = $_GET['customer_id'] ?? null;
    if (!$customerId) {
        jsonResponse(false, null, 'customer_id es obligatorio', 400);
    }

    // Ventas al fiado
    $salesStmt = $pdo->prepare(
        "SELECT id, invoice_number, total_amount, created_at, 'sale' AS type, notes
         FROM sales
         WHERE customer_id = :id AND payment_method = 'credit'
         ORDER BY created_at DESC"
    );
    $salesStmt->execute([':id' => $customerId]);
    $sales = $salesStmt->fetchAll();

    // Abonos
    $payStmt = $pdo->prepare(
        "SELECT p.id, p.amount, p.payment_method, p.notes, p.created_at, 'payment' AS type, u.full_name AS cashier_name
         FROM customer_payments p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.customer_id = :id
         ORDER BY p.created_at DESC"
    );
    $payStmt->execute([':id' => $customerId]);
    $payments = $payStmt->fetchAll();

    // Combinar cronológicamente
    $combined = array_merge($sales, $payments);
    usort($combined, fn ($a, $b) => strcmp($b['created_at'], $a['created_at']));

    jsonResponse(true, $combined, 'Historial de cuenta');
}
