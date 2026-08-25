<?php
/**
 * Endpoint: /api/products.php
 * Acciones: search, list, low-stock, categories, create, update, deactivate
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
$pdo = getDB();

const VALID_UNITS = ['units', 'kilos', 'liters'];

switch ($action) {
    case 'search':
        handleSearch($pdo);
        break;
    case 'list':
        handleList($pdo);
        break;
    case 'low-stock':
        handleLowStock($pdo);
        break;
    case 'categories':
        handleCategories($pdo);
        break;
    case 'create':
        requireRole($auth, ['admin', 'warehouse_staff']);
        handleCreate($pdo, $auth);
        break;
    case 'update':
        requireRole($auth, ['admin', 'warehouse_staff']);
        handleUpdate($pdo);
        break;
    case 'deactivate':
        requireRole($auth, ['admin', 'warehouse_staff']);
        handleDeactivate($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

function productSelectSql() {
    return "SELECT p.*, c.id AS cat_id, c.name AS cat_name, s.id AS sup_id, s.name AS sup_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id";
}

function mapProductRow($row) {
    return [
        'id' => $row['id'],
        'sku' => $row['sku'],
        'barcode' => $row['barcode'],
        'name' => $row['name'],
        'description' => $row['description'],
        'image_url' => $row['image_url'],
        'unit_of_measure' => $row['unit_of_measure'],
        'is_scale_item' => (bool) $row['is_scale_item'],
        'has_expiration' => (bool) $row['has_expiration'],
        'purchase_price' => (float) $row['purchase_price'],
        'selling_price' => (float) $row['selling_price'],
        'stock_current' => (float) $row['stock_current'],
        'stock_critical' => (float) $row['stock_critical'],
        'is_low_stock' => (float) $row['stock_current'] <= (float) $row['stock_critical'],
        'is_active' => (bool) $row['is_active'],
        'category' => $row['cat_id'] ? ['id' => $row['cat_id'], 'name' => $row['cat_name']] : null,
        'supplier' => $row['sup_id'] ? ['id' => $row['sup_id'], 'name' => $row['sup_name']] : null,
    ];
}

function handleSearch($pdo) {
    $q = trim($_GET['q'] ?? '');
    $categoryId = $_GET['category'] ?? null;

    $sql = productSelectSql() . ' WHERE p.is_active = 1';
    $params = [];

    if ($q !== '') {
        $sql .= ' AND (p.sku LIKE :q OR p.barcode LIKE :q OR p.name LIKE :q)';
        $params[':q'] = "%$q%";
    }
    if ($categoryId) {
        $sql .= ' AND p.category_id = :category';
        $params[':category'] = $categoryId;
    }
    $sql .= ' ORDER BY p.name LIMIT 50';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = array_map('mapProductRow', $stmt->fetchAll());

    jsonResponse(true, $rows, 'Búsqueda completada');
}

// Paginado — a diferencia de FERRIMIX, acá el catálogo puede tener
// cientos o miles de SKUs (ver el documento de arquitectura), así que
// 'list' no puede devolver todo de una vez sin paginar.
function handleList($pdo) {
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $perPage = 30;
    $offset = ($page - 1) * $perPage;
    $q = trim($_GET['q'] ?? '');
    $categoryId = $_GET['category'] ?? null;

    $where = 'WHERE p.is_active = 1';
    $params = [];
    if ($q !== '') {
        $where .= ' AND (p.sku LIKE :q OR p.barcode LIKE :q OR p.name LIKE :q)';
        $params[':q'] = "%$q%";
    }
    if ($categoryId) {
        $where .= ' AND p.category_id = :category';
        $params[':category'] = $categoryId;
    }

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p $where");
    $countStmt->execute($params);
    $total = (int) $countStmt->fetchColumn();

    $sql = productSelectSql() . " $where ORDER BY p.name LIMIT $perPage OFFSET $offset";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = array_map('mapProductRow', $stmt->fetchAll());

    jsonResponse(true, [
        'products' => $rows,
        'page' => $page,
        'per_page' => $perPage,
        'total' => $total,
        'total_pages' => (int) ceil($total / $perPage),
    ], 'Productos listados');
}

function handleLowStock($pdo) {
    $sql = productSelectSql() . ' WHERE p.is_active = 1 AND p.stock_current <= p.stock_critical
           ORDER BY (p.stock_current - p.stock_critical) ASC LIMIT 100';
    $stmt = $pdo->query($sql);
    $rows = array_map('mapProductRow', $stmt->fetchAll());

    jsonResponse(true, $rows, 'Productos con stock bajo');
}

function handleCategories($pdo) {
    $stmt = $pdo->query('SELECT id, name, icon FROM categories ORDER BY name');
    jsonResponse(true, $stmt->fetchAll(), 'Categorías listadas');
}

function handleCreate($pdo, $auth) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, null, 'Método no permitido', 405);
    }

    $input = getJSONInput();
    $sku = trim($input['sku'] ?? '');
    $name = trim($input['name'] ?? '');
    $unit = $input['unit_of_measure'] ?? 'units';
    $purchasePrice = $input['purchase_price'] ?? null;
    $sellingPrice = $input['selling_price'] ?? null;

    if ($sku === '' || $name === '') {
        jsonResponse(false, null, 'SKU y nombre son obligatorios', 400);
    }
    if (!in_array($unit, VALID_UNITS, true)) {
        jsonResponse(false, null, 'unit_of_measure inválido', 400);
    }
    if (!is_numeric($purchasePrice) || !is_numeric($sellingPrice)) {
        jsonResponse(false, null, 'purchase_price y selling_price son obligatorios y numéricos', 400);
    }

    $id = generateUuid();
    $initialStock = is_numeric($input['stock_current'] ?? null) ? (float) $input['stock_current'] : 0;
    $stockCritical = is_numeric($input['stock_critical'] ?? null) ? (float) $input['stock_critical'] : 10;

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare(
            'INSERT INTO products
             (id, sku, barcode, name, description, image_url, category_id, supplier_id,
              unit_of_measure, is_scale_item, has_expiration, purchase_price, selling_price,
              stock_current, stock_critical, is_active)
             VALUES
             (:id, :sku, :barcode, :name, :description, :image_url, :category_id, :supplier_id,
              :unit, :is_scale_item, :has_expiration, :purchase_price, :selling_price,
              :stock_current, :stock_critical, 1)'
        );
        $stmt->execute([
            ':id' => $id,
            ':sku' => $sku,
            ':barcode' => $input['barcode'] ?: null,
            ':name' => $name,
            ':description' => $input['description'] ?? null,
            ':image_url' => $input['image_url'] ?? null,
            ':category_id' => $input['category_id'] ?: null,
            ':supplier_id' => $input['supplier_id'] ?: null,
            ':unit' => $unit,
            ':is_scale_item' => !empty($input['is_scale_item']) ? 1 : 0,
            ':has_expiration' => !empty($input['has_expiration']) ? 1 : 0,
            ':purchase_price' => $purchasePrice,
            ':selling_price' => $sellingPrice,
            ':stock_current' => $initialStock,
            ':stock_critical' => $stockCritical,
        ]);

        // El stock inicial también queda como movimiento, para que
        // inventory_movements sea la fuente de verdad completa del
        // historial — nunca se toca stock_current sin dejar rastro.
        if ($initialStock > 0) {
            $mv = $pdo->prepare(
                'INSERT INTO inventory_movements
                 (id, product_id, movement_type, quantity, unit_cost, reason, user_id)
                 VALUES (:id, :product_id, "in", :quantity, :unit_cost, "Carga inicial de stock", :user_id)'
            );
            $mv->execute([
                ':id' => generateUuid(),
                ':product_id' => $id,
                ':quantity' => $initialStock,
                ':unit_cost' => $purchasePrice,
                ':user_id' => $auth['user_id'],
            ]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        if ($e->getCode() === '23000') {
            jsonResponse(false, null, 'El SKU o código de barras ya existe', 409);
        }
        jsonResponse(false, null, 'Error al crear el producto', 500);
    }

    $stmt = $pdo->prepare(productSelectSql() . ' WHERE p.id = :id');
    $stmt->execute([':id' => $id]);
    jsonResponse(true, mapProductRow($stmt->fetch()), 'Producto creado', 201);
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

    $check = $pdo->prepare('SELECT id FROM products WHERE id = :id AND is_active = 1');
    $check->execute([':id' => $id]);
    if (!$check->fetch()) {
        jsonResponse(false, null, 'Producto no encontrado', 404);
    }

    if (isset($input['unit_of_measure']) && !in_array($input['unit_of_measure'], VALID_UNITS, true)) {
        jsonResponse(false, null, 'unit_of_measure inválido', 400);
    }

    // Actualización parcial: solo se tocan los campos que vienen en el
    // body. stock_current a propósito no es editable acá — todo cambio de
    // stock pasa por inventory.php?action=movement para dejar rastro.
    $fields = [
        'barcode', 'name', 'description', 'image_url', 'category_id', 'supplier_id',
        'unit_of_measure', 'is_scale_item', 'has_expiration', 'purchase_price',
        'selling_price', 'stock_critical',
    ];
    $set = [];
    $params = [':id' => $id];
    foreach ($fields as $field) {
        if (array_key_exists($field, $input)) {
            $value = $input[$field];
            if (in_array($field, ['is_scale_item', 'has_expiration'], true)) {
                $value = !empty($value) ? 1 : 0;
            }
            if (in_array($field, ['category_id', 'supplier_id', 'barcode'], true) && $value === '') {
                $value = null;
            }
            $set[] = "$field = :$field";
            $params[":$field"] = $value;
        }
    }

    if (empty($set)) {
        jsonResponse(false, null, 'Nada para actualizar', 400);
    }

    try {
        $sql = 'UPDATE products SET ' . implode(', ', $set) . ' WHERE id = :id';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') {
            jsonResponse(false, null, 'El código de barras ya existe en otro producto', 409);
        }
        jsonResponse(false, null, 'Error al actualizar el producto', 500);
    }

    $stmt = $pdo->prepare(productSelectSql() . ' WHERE p.id = :id');
    $stmt->execute([':id' => $id]);
    jsonResponse(true, mapProductRow($stmt->fetch()), 'Producto actualizado');
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

    $stmt = $pdo->prepare('UPDATE products SET is_active = 0 WHERE id = :id AND is_active = 1');
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(false, null, 'Producto no encontrado o ya estaba desactivado', 404);
    }

    jsonResponse(true, null, 'Producto desactivado');
}
