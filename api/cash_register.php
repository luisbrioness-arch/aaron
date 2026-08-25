<?php
/**
 * Endpoint: /api/cash_register.php
 * Acciones: open, close, current
 *
 * La caja siempre es la del usuario autenticado, resuelta server-side —
 * nunca se acepta un cash_register_id que mande el cliente (D-07).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

switch ($action) {
    case 'open':
        handleOpen($pdo, $auth);
        break;
    case 'close':
        handleClose($pdo, $auth);
        break;
    case 'current':
        handleCurrent($pdo, $auth);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function findOpenRegister($pdo, $userId, $forUpdate = false) {
    $sql = 'SELECT * FROM cash_registers WHERE user_id = :user_id AND status = "open"';
    if ($forUpdate) {
        $sql .= ' FOR UPDATE';
    }
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':user_id' => $userId]);
    return $stmt->fetch();
}

function cashSalesTotal($pdo, $registerId) {
    $stmt = $pdo->prepare(
        "SELECT COALESCE(SUM(total_amount), 0) FROM sales
         WHERE cash_register_id = :id AND payment_method = 'cash' AND status = 'completed'"
    );
    $stmt->execute([':id' => $registerId]);
    return (float) $stmt->fetchColumn();
}

function handleOpen($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $openingAmount = $input['opening_amount'] ?? null;
    if (!is_numeric($openingAmount) || $openingAmount < 0) {
        jsonResponse(false, null, 'opening_amount es obligatorio y no puede ser negativo', 400);
    }

    $pdo->beginTransaction();
    $existing = findOpenRegister($pdo, $auth['user_id'], true);
    if ($existing) {
        $pdo->rollBack();
        jsonResponse(false, null, 'Ya tienes una caja abierta', 400);
    }

    $id = generateUuid();
    $stmt = $pdo->prepare(
        'INSERT INTO cash_registers (id, user_id, opening_amount, status)
         VALUES (:id, :user_id, :opening_amount, "open")'
    );
    $stmt->execute([':id' => $id, ':user_id' => $auth['user_id'], ':opening_amount' => $openingAmount]);
    $pdo->commit();

    jsonResponse(true, [
        'cash_register_id' => $id,
        'opening_amount' => (float) $openingAmount,
        'status' => 'open',
    ], 'Caja abierta');
}

function handleClose($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $closingAmount = $input['closing_amount'] ?? null;
    if (!is_numeric($closingAmount) || $closingAmount < 0) {
        jsonResponse(false, null, 'closing_amount es obligatorio y no puede ser negativo', 400);
    }

    $pdo->beginTransaction();
    $register = findOpenRegister($pdo, $auth['user_id'], true);
    if (!$register) {
        $pdo->rollBack();
        jsonResponse(false, null, 'No tienes una caja abierta', 400);
    }

    $cashSales = cashSalesTotal($pdo, $register['id']);
    $expectedAmount = (float) $register['opening_amount'] + $cashSales;
    $difference = $closingAmount - $expectedAmount;

    $stmt = $pdo->prepare(
        'UPDATE cash_registers
         SET closed_at = CURRENT_TIMESTAMP, closing_amount = :closing_amount,
             expected_amount = :expected_amount, status = "closed"
         WHERE id = :id'
    );
    $stmt->execute([
        ':closing_amount' => $closingAmount,
        ':expected_amount' => $expectedAmount,
        ':id' => $register['id'],
    ]);
    $pdo->commit();

    jsonResponse(true, [
        'cash_register_id' => $register['id'],
        'opening_amount' => (float) $register['opening_amount'],
        'cash_sales' => $cashSales,
        'expected_amount' => $expectedAmount,
        'closing_amount' => (float) $closingAmount,
        'difference' => $difference,
        'status' => 'closed',
    ], 'Caja cerrada');
}

function handleCurrent($pdo, $auth) {
    $register = findOpenRegister($pdo, $auth['user_id']);
    if (!$register) {
        jsonResponse(true, null, 'Sin caja abierta');
    }

    $cashSales = cashSalesTotal($pdo, $register['id']);

    jsonResponse(true, [
        'cash_register_id' => $register['id'],
        'opening_amount' => (float) $register['opening_amount'],
        'cash_sales' => $cashSales,
        'current_amount' => (float) $register['opening_amount'] + $cashSales,
        'opened_at' => $register['opened_at'],
        'status' => 'open',
    ], 'Caja actual');
}
