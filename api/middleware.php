<?php
/**
 * Middlewares y funciones auxiliares
 * Mismo patrón que FERRIMIX (api/middleware.php) y Parque San Pedro.
 */

function setCORSHeaders() {
    header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Max-Age: 3600');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function jsonResponse($success, $data = null, $message = '', $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'data' => $data,
        'message' => $message,
    ]);
    exit;
}

function getDB() {
    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                // Sin esto, fetch()/fetchAll() devuelven cada columna dos
                // veces (por índice numérico Y por nombre).
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        jsonResponse(false, null, 'Error de conexión a base de datos', 500);
    }
}

function getJWT() {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        return $matches[1];
    }
    return null;
}

function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false;
    }

    list($header, $payload, $signature) = $parts;

    $expectedSignature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $expectedSignature = rtrim(strtr(base64_encode($expectedSignature), '+/', '-_'), '=');

    if (!hash_equals($signature, $expectedSignature)) {
        return false;
    }

    $decoded = json_decode(base64_decode($payload), true);
    if (isset($decoded['exp']) && $decoded['exp'] < time()) {
        return false;
    }

    return $decoded;
}

function createJWT($data) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode(array_merge($data, ['exp' => time() + JWT_EXPIRY])));

    $signature = hash_hmac('sha256', "$header.$payload", JWT_SECRET, true);
    $signature = rtrim(strtr(base64_encode($signature), '+/', '-_'), '=');

    return "$header.$payload.$signature";
}

function requireAuth() {
    $token = getJWT();
    if (!$token) {
        jsonResponse(false, null, 'Token requerido', 401);
    }

    $data = verifyJWT($token);
    if (!$data) {
        jsonResponse(false, null, 'Token inválido o expirado', 401);
    }

    return $data;
}

// Llamar después de requireAuth() cuando la acción debe quedar reservada
// a ciertos roles. Los tres roles son 'admin' | 'cashier' | 'warehouse_staff'
// — ver el documento de arquitectura para qué puede hacer cada uno.
function requireRole($auth, array $allowedRoles) {
    if (!in_array($auth['role'] ?? null, $allowedRoles, true)) {
        jsonResponse(false, null, 'No tienes permiso para esta acción', 403);
    }
}

function getJSONInput() {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
    $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
