<?php
/**
 * Endpoint: /api/auth.php
 * Acciones: login, logout, refresh
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$pdo = getDB();

switch ($action) {
    case 'login':
        handleLogin($pdo);
        break;

    case 'logout':
        handleLogout();
        break;

    case 'refresh':
        handleRefresh();
        break;

    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function handleLogin($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $username = $input['username'] ?? null;
    $password = $input['password'] ?? null;

    if (!$username || !$password) {
        jsonResponse(false, null, 'Usuario y contraseña requeridos', 400);
    }

    $stmt = $pdo->prepare(
        'SELECT id, username, password_hash, full_name, role
         FROM users WHERE username = :username AND is_active = 1'
    );
    $stmt->execute([':username' => $username]);
    $row = $stmt->fetch();

    // Mismo mensaje de error sin importar si falla el usuario o la
    // contraseña — no darle a un atacante pistas de cuál usuario existe.
    if (!$row || !password_verify($password, $row['password_hash'])) {
        jsonResponse(false, null, 'Credenciales inválidas', 401);
    }

    $user = [
        'id' => $row['id'],
        'username' => $row['username'],
        'full_name' => $row['full_name'],
        'role' => $row['role'],
    ];

    $token = createJWT(['user_id' => $user['id'], 'role' => $user['role']]);

    jsonResponse(true, ['token' => $token, 'user' => $user], 'Login exitoso', 200);
}

function handleLogout() {
    jsonResponse(true, null, 'Sesión cerrada', 200);
}

function handleRefresh() {
    $token = getJWT();
    if (!$token) {
        jsonResponse(false, null, 'Token requerido', 401);
    }

    $data = verifyJWT($token);
    if (!$data) {
        jsonResponse(false, null, 'Token inválido', 401);
    }

    $newData = $data;
    unset($newData['exp']);
    $newToken = createJWT($newData);

    jsonResponse(true, ['token' => $newToken], 'Token renovado', 200);
}
