<?php
/**
 * Endpoint: /api/suppliers.php
 * Acciones: list, create
 *
 * 'list' lo necesita también bodega (selector en "recibir compra");
 * alta es admin y warehouse_staff (a diferencia del D-16 de FERRIMIX,
 * que dejaba suppliers.php entero admin-only — acá bodega recibe
 * mercadería seguido y necesita poder cargar un proveedor nuevo sin
 * frenar a esperar a un admin, ver D-22 en DECISIONS.md).
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
    case 'create':
        handleCreate($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function handleList($pdo) {
    $stmt = $pdo->query('SELECT id, name, rut, phone, email FROM suppliers ORDER BY name');
    jsonResponse(true, $stmt->fetchAll(), 'Proveedores listados');
}

function handleCreate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $name = trim($input['name'] ?? '');
    $rut = trim($input['rut'] ?? '');

    if ($name === '' || $rut === '') {
        jsonResponse(false, null, 'name y rut son obligatorios', 400);
    }

    $id = generateUuid();
    try {
        $stmt = $pdo->prepare(
            'INSERT INTO suppliers (id, name, rut, phone, email, address, contact_person)
             VALUES (:id, :name, :rut, :phone, :email, :address, :contact_person)'
        );
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':rut' => $rut,
            ':phone' => $input['phone'] ?? null,
            ':email' => $input['email'] ?? null,
            ':address' => $input['address'] ?? null,
            ':contact_person' => $input['contact_person'] ?? null,
        ]);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            jsonResponse(false, null, 'El RUT ya existe', 409);
        }
        jsonResponse(false, null, 'Error al crear el proveedor', 500);
    }

    jsonResponse(true, ['id' => $id, 'name' => $name, 'rut' => $rut], 'Proveedor creado', 201);
}
