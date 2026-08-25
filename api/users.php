<?php
/**
 * Endpoint: /api/users.php
 * Acciones: list, workdays, create, update, activate, deactivate,
 * reset-password
 *
 * Todo este archivo es admin-only. Las contraseñas nunca se guardan ni
 * se devuelven en texto plano — se hashean del lado del servidor con
 * password_hash() nativo de PHP.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

const VALID_ROLES = ['admin', 'cashier', 'warehouse_staff'];

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin']);
$pdo = getDB();

switch ($action) {
    case 'list':
        handleList($pdo);
        break;
    case 'workdays':
        handleWorkdays($pdo);
        break;
    case 'create':
        handleCreate($pdo);
        break;
    case 'update':
        handleUpdate($pdo, $auth);
        break;
    case 'activate':
        handleActivate($pdo);
        break;
    case 'deactivate':
        handleDeactivate($pdo, $auth);
        break;
    case 'reset-password':
        handleResetPassword($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

// "Día trabajado" es derivado, no registrado: cuenta si la persona abrió
// caja o vendió algo ese día. No mide horas ni asistencia real — mismo
// criterio y misma limitación documentada que FERRIMIX (D-17 de su
// historial).
function handleList($pdo) {
    $sql = "SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at,
                   COUNT(DISTINCT wd.work_date) AS days_worked,
                   MAX(wd.work_date) AS last_worked_on
            FROM users u
            LEFT JOIN (
              SELECT DATE(opened_at) AS work_date, user_id FROM cash_registers
              UNION
              SELECT invoice_date AS work_date, user_id FROM sales WHERE status = 'completed'
            ) wd ON wd.user_id = u.id
            GROUP BY u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at
            ORDER BY u.full_name";
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Usuarios listados');
}

function handleWorkdays($pdo) {
    $userId = $_GET['user_id'] ?? null;
    if (!$userId) {
        jsonResponse(false, null, 'user_id requerido', 400);
    }

    $userStmt = $pdo->prepare('SELECT id, username, full_name, role FROM users WHERE id = :id');
    $userStmt->execute([':id' => $userId]);
    $user = $userStmt->fetch();
    if (!$user) {
        jsonResponse(false, null, 'Usuario no encontrado', 404);
    }

    $sql = "SELECT wd.work_date,
                   COALESCE(sales_agg.sales_count, 0) AS sales_count,
                   COALESCE(sales_agg.sales_total, 0) AS sales_total,
                   COALESCE(cr_agg.registers_opened, 0) AS registers_opened,
                   cr_agg.first_opened_at, cr_agg.last_closed_at
            FROM (
              SELECT DATE(opened_at) AS work_date FROM cash_registers WHERE user_id = :uid1
              UNION
              SELECT invoice_date AS work_date FROM sales WHERE user_id = :uid2 AND status = 'completed'
            ) wd
            LEFT JOIN (
              SELECT invoice_date, COUNT(*) AS sales_count, SUM(total_amount) AS sales_total
              FROM sales WHERE user_id = :uid3 AND status = 'completed' GROUP BY invoice_date
            ) sales_agg ON sales_agg.invoice_date = wd.work_date
            LEFT JOIN (
              SELECT DATE(opened_at) AS work_date, COUNT(*) AS registers_opened,
                     MIN(opened_at) AS first_opened_at, MAX(closed_at) AS last_closed_at
              FROM cash_registers WHERE user_id = :uid4 GROUP BY DATE(opened_at)
            ) cr_agg ON cr_agg.work_date = wd.work_date
            ORDER BY wd.work_date DESC
            LIMIT 90";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':uid1' => $userId, ':uid2' => $userId, ':uid3' => $userId, ':uid4' => $userId]);

    jsonResponse(true, ['user' => $user, 'days' => $stmt->fetchAll()], 'Días trabajados');
}

function handleCreate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $username = trim($input['username'] ?? '');
    $email = trim($input['email'] ?? '');
    $fullName = trim($input['full_name'] ?? '');
    $role = $input['role'] ?? null;
    $password = $input['password'] ?? '';

    if ($username === '' || $email === '' || $fullName === '') {
        jsonResponse(false, null, 'username, email y full_name son obligatorios', 400);
    }
    if (!in_array($role, VALID_ROLES, true)) {
        jsonResponse(false, null, 'role inválido', 400);
    }
    if (strlen($password) < 6) {
        jsonResponse(false, null, 'La contraseña debe tener al menos 6 caracteres', 400);
    }

    $id = generateUuid();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO users (id, username, email, password_hash, full_name, role, is_active)
             VALUES (:id, :username, :email, :password_hash, :full_name, :role, 1)'
        );
        $stmt->execute([
            ':id' => $id,
            ':username' => $username,
            ':email' => $email,
            ':password_hash' => password_hash($password, PASSWORD_BCRYPT),
            ':full_name' => $fullName,
            ':role' => $role,
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            jsonResponse(false, null, 'El usuario o el email ya existen', 409);
        }
        jsonResponse(false, null, 'Error al crear el usuario', 500);
    }

    jsonResponse(true, ['id' => $id, 'username' => $username, 'full_name' => $fullName, 'role' => $role], 'Usuario creado', 201);
}

function handleUpdate($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $fullName = trim($input['full_name'] ?? '');
    $email = trim($input['email'] ?? '');
    $role = $input['role'] ?? null;
    if ($fullName === '' || $email === '' || !in_array($role, VALID_ROLES, true)) {
        jsonResponse(false, null, 'full_name, email y role (válido) son obligatorios', 400);
    }
    if ($id === $auth['user_id'] && $role !== 'admin') {
        jsonResponse(false, null, 'No puedes quitarte tu propio rol de admin', 400);
    }

    try {
        $stmt = $pdo->prepare(
            'UPDATE users SET full_name = :full_name, email = :email, role = :role WHERE id = :id'
        );
        $stmt->execute([':full_name' => $fullName, ':email' => $email, ':role' => $role, ':id' => $id]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            jsonResponse(false, null, 'Ese email ya lo usa otro usuario', 409);
        }
        jsonResponse(false, null, 'Error al actualizar el usuario', 500);
    }

    if ($stmt->rowCount() === 0) {
        $exists = $pdo->prepare('SELECT id FROM users WHERE id = :id');
        $exists->execute([':id' => $id]);
        if (!$exists->fetch()) {
            jsonResponse(false, null, 'Usuario no encontrado', 404);
        }
    }

    jsonResponse(true, null, 'Usuario actualizado');
}

function handleActivate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET is_active = 1 WHERE id = :id AND is_active = 0');
    $stmt->execute([':id' => $id]);
    if ($stmt->rowCount() === 0) {
        jsonResponse(false, null, 'Usuario no encontrado o ya estaba activo', 404);
    }

    jsonResponse(true, null, 'Usuario activado');
}

function handleDeactivate($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }
    if ($id === $auth['user_id']) {
        jsonResponse(false, null, 'No puedes desactivar tu propia cuenta', 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET is_active = 0 WHERE id = :id AND is_active = 1');
    $stmt->execute([':id' => $id]);
    if ($stmt->rowCount() === 0) {
        jsonResponse(false, null, 'Usuario no encontrado o ya estaba desactivado', 404);
    }

    jsonResponse(true, null, 'Usuario desactivado');
}

function handleResetPassword($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    $password = $input['password'] ?? '';
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }
    if (strlen($password) < 6) {
        jsonResponse(false, null, 'La contraseña debe tener al menos 6 caracteres', 400);
    }

    $stmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
    $stmt->execute([':hash' => password_hash($password, PASSWORD_BCRYPT), ':id' => $id]);
    if ($stmt->rowCount() === 0) {
        jsonResponse(false, null, 'Usuario no encontrado', 404);
    }

    jsonResponse(true, null, 'Contraseña actualizada');
}
