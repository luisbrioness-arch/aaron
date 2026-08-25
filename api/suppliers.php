<?php
/**
 * Endpoint: /api/suppliers.php
 * Acciones: list, create, update, deactivate
 *
 * 'list'/'create'/'update' los necesita también bodega (selector y alta
 * rápida en "recibir compra"); alta y edición son admin y warehouse_staff
 * (a diferencia del D-16 de FERRIMIX, que dejaba suppliers.php entero
 * admin-only — acá bodega recibe mercadería seguido y necesita poder
 * cargar/corregir un proveedor sin frenar a esperar a un admin, ver D-22
 * en DECISIONS.md). 'deactivate' sí es admin-only — es una acción de
 * limpieza administrativa, no algo que bodega necesite en el momento.
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
    case 'update':
        handleUpdate($pdo);
        break;
    case 'deactivate':
        requireRole($auth, ['admin']);
        handleDeactivate($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function handleList($pdo) {
    $stmt = $pdo->query(
        'SELECT id, name, rut, phone, email, address, contact_person
         FROM suppliers WHERE is_active = 1 ORDER BY name'
    );
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

function handleUpdate($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $id = $input['id'] ?? null;
    if (!$id) {
        jsonResponse(false, null, 'id requerido', 400);
    }

    $check = $pdo->prepare('SELECT id FROM suppliers WHERE id = :id AND is_active = 1');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) {
        jsonResponse(false, null, 'Proveedor no encontrado', 404);
    }

    $fields = ['name', 'rut', 'phone', 'email', 'address', 'contact_person'];
    $set = [];
    $params = [':id' => $id];
    foreach ($fields as $field) {
        if (array_key_exists($field, $input)) {
            $value = is_string($input[$field]) ? trim($input[$field]) : $input[$field];
            $set[] = "$field = :$field";
            $params[":$field"] = $value !== '' ? $value : null;
        }
    }

    if (empty($set)) {
        jsonResponse(false, null, 'Nada para actualizar', 400);
    }
    if (isset($params[':name']) && $params[':name'] === null) {
        jsonResponse(false, null, 'name no puede quedar vacío', 400);
    }
    if (isset($params[':rut']) && $params[':rut'] === null) {
        jsonResponse(false, null, 'rut no puede quedar vacío', 400);
    }

    try {
        $sql = 'UPDATE suppliers SET ' . implode(', ', $set) . ' WHERE id = :id';
        $pdo->prepare($sql)->execute($params);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            jsonResponse(false, null, 'El RUT ya existe en otro proveedor', 409);
        }
        jsonResponse(false, null, 'Error al actualizar el proveedor', 500);
    }

    jsonResponse(true, null, 'Proveedor actualizado');
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

    $stmt = $pdo->prepare('UPDATE suppliers SET is_active = 0 WHERE id = :id AND is_active = 1');
    $stmt->execute([':id' => $id]);
    if ($stmt->rowCount() === 0) {
        jsonResponse(false, null, 'Proveedor no encontrado o ya estaba desactivado', 404);
    }

    jsonResponse(true, null, 'Proveedor desactivado');
}
