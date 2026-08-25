<?php
/**
 * Endpoint: /api/reports.php
 * Acciones: daily-sales, weekly-sales, top-products, stagnant-products,
 * cash-summary, margin, category-breakdown, money-type-breakdown,
 * expiring-summary
 *
 * Todo este archivo es admin-only. 'expiring-summary' es nuevo respecto
 * a FERRIMIX (cuenta de productos por vencer/vencidos para el Dashboard).
 * El costo de margen/categoría usa products.purchase_price ACTUAL, no el
 * vigente el día de la venta — no hay costo histórico por línea guardado,
 * es una aproximación (mismo criterio documentado en el propio FERRIMIX).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/middleware.php';

setCORSHeaders();

$action = $_GET['action'] ?? null;
$auth = requireAuth();
requireRole($auth, ['admin']);
$pdo = getDB();

switch ($action) {
    case 'daily-sales':
        handleDailySales($pdo);
        break;
    case 'weekly-sales':
        handleWeeklySales($pdo);
        break;
    case 'top-products':
        handleTopProducts($pdo);
        break;
    case 'stagnant-products':
        handleStagnantProducts($pdo);
        break;
    case 'cash-summary':
        handleCashSummary($pdo);
        break;
    case 'margin':
        handleMargin($pdo);
        break;
    case 'category-breakdown':
        handleCategoryBreakdown($pdo);
        break;
    case 'money-type-breakdown':
        handleMoneyTypeBreakdown($pdo);
        break;
    case 'expiring-summary':
        handleExpiringSummary($pdo);
        break;
    default:
        jsonResponse(false, null, 'Acción no válida', 400);
}

// Rango de fechas para margin/category-breakdown/money-type-breakdown/
// weekly-sales: ?from&?to opcionales, hasta 366 días. Sin parámetros,
// últimos 30 días — mismo criterio que FERRIMIX.
function resolveDateRange() {
    $from = $_GET['from'] ?? null;
    $to = $_GET['to'] ?? null;

    if ($from && $to) {
        $fromDate = DateTime::createFromFormat('Y-m-d', $from);
        $toDate = DateTime::createFromFormat('Y-m-d', $to);
        if (!$fromDate || !$toDate) {
            jsonResponse(false, null, 'Fechas inválidas', 400);
        }
        if ($fromDate > $toDate) {
            jsonResponse(false, null, 'from no puede ser posterior a to', 400);
        }
        if ($fromDate->diff($toDate)->days > 366) {
            jsonResponse(false, null, 'El rango máximo es de 366 días', 400);
        }
        return [$from, $to];
    }

    return [date('Y-m-d', strtotime('-29 days')), date('Y-m-d')];
}

function handleDailySales($pdo) {
    $stmt = $pdo->query(
        "SELECT COALESCE(SUM(total_amount), 0) AS today_sales, COUNT(*) AS cnt
         FROM sales WHERE invoice_date = CURDATE() AND status = 'completed'"
    );
    $row = $stmt->fetch();
    $todaySales = (float) $row['today_sales'];
    $count = (int) $row['cnt'];

    $lowStockStmt = $pdo->query(
        'SELECT COUNT(*) FROM products WHERE is_active = 1 AND stock_current <= stock_critical'
    );

    jsonResponse(true, [
        'today_sales' => $todaySales,
        'average_ticket' => $count > 0 ? round($todaySales / $count) : 0,
        'low_stock_count' => (int) $lowStockStmt->fetchColumn(),
    ], 'Reporte de ventas diarias');
}

function handleWeeklySales($pdo) {
    [$from, $to] = resolveDateRange();

    $stmt = $pdo->prepare(
        "SELECT invoice_date, SUM(total_amount) AS total FROM sales
         WHERE invoice_date BETWEEN :from AND :to AND status = 'completed'
         GROUP BY invoice_date"
    );
    $stmt->execute([':from' => $from, ':to' => $to]);
    $byDate = [];
    foreach ($stmt->fetchAll() as $row) {
        $byDate[$row['invoice_date']] = (float) $row['total'];
    }

    $result = [];
    $cursor = new DateTime($from);
    $end = new DateTime($to);
    while ($cursor <= $end) {
        $d = $cursor->format('Y-m-d');
        $result[] = ['date' => $d, 'total' => $byDate[$d] ?? 0];
        $cursor->modify('+1 day');
    }

    jsonResponse(true, $result, 'Ventas del rango');
}

function handleTopProducts($pdo) {
    $sql = "SELECT p.id, p.name, p.sku, SUM(sd.quantity) AS total_quantity,
                   SUM(sd.subtotal - sd.discount_amount) AS total_amount
            FROM sales_details sd
            JOIN sales s ON s.id = sd.sale_id
            JOIN products p ON p.id = sd.product_id
            WHERE s.status = 'completed'
            GROUP BY p.id, p.name, p.sku
            ORDER BY total_quantity DESC
            LIMIT 10";
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Productos más vendidos');
}

function handleStagnantProducts($pdo) {
    // MariaDB no deja usar el alias de una función de agregación dentro
    // de una expresión en ORDER BY — se repite MAX(s.created_at) en vez
    // de usar el alias last_sale_at (lección de FERRIMIX, D-14 de su
    // historial).
    $sql = "SELECT p.id, p.name, p.sku, p.stock_current, MAX(s.created_at) AS last_sale_at
            FROM products p
            LEFT JOIN sales_details sd ON sd.product_id = p.id
            LEFT JOIN sales s ON s.id = sd.sale_id AND s.status = 'completed'
            WHERE p.is_active = 1
            GROUP BY p.id, p.name, p.sku, p.stock_current
            HAVING MAX(s.created_at) IS NULL OR MAX(s.created_at) < DATE_SUB(NOW(), INTERVAL 7 DAY)
            ORDER BY MAX(s.created_at) IS NULL DESC, MAX(s.created_at) ASC
            LIMIT 10";
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Productos estancados');
}

function handleCashSummary($pdo) {
    $sql = "SELECT cr.id, u.full_name AS cashier_name, cr.opening_amount, cr.closing_amount,
                   cr.expected_amount, cr.status, cr.opened_at, cr.closed_at
            FROM cash_registers cr JOIN users u ON u.id = cr.user_id
            WHERE DATE(cr.opened_at) = CURDATE()
            ORDER BY cr.opened_at DESC";
    $stmt = $pdo->query($sql);
    jsonResponse(true, $stmt->fetchAll(), 'Resumen de caja del día');
}

function handleMargin($pdo) {
    [$from, $to] = resolveDateRange();

    $sql = "SELECT p.id, p.name, p.sku, SUM(sd.quantity) AS total_quantity,
                   SUM(sd.subtotal - sd.discount_amount) AS revenue,
                   SUM(sd.quantity * p.purchase_price) AS cost
            FROM sales_details sd
            JOIN sales s ON s.id = sd.sale_id
            JOIN products p ON p.id = sd.product_id
            WHERE s.status = 'completed' AND s.invoice_date BETWEEN :from AND :to
            GROUP BY p.id, p.name, p.sku";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':from' => $from, ':to' => $to]);

    $products = [];
    $totalRevenue = 0.0;
    $totalCost = 0.0;
    foreach ($stmt->fetchAll() as $row) {
        $revenue = (float) $row['revenue'];
        $cost = (float) $row['cost'];
        $margin = $revenue - $cost;
        $products[] = [
            'id' => $row['id'],
            'name' => $row['name'],
            'sku' => $row['sku'],
            'total_quantity' => (float) $row['total_quantity'],
            'revenue' => $revenue,
            'cost' => $cost,
            'margin' => $margin,
            'margin_pct' => $revenue > 0 ? round($margin / $revenue * 100, 1) : 0,
        ];
        $totalRevenue += $revenue;
        $totalCost += $cost;
    }

    usort($products, fn ($a, $b) => $b['margin'] <=> $a['margin']);
    $topProducts = array_slice($products, 0, 15);
    $totalMargin = $totalRevenue - $totalCost;

    jsonResponse(true, [
        'summary' => [
            'revenue' => $totalRevenue,
            'cost' => $totalCost,
            'margin' => $totalMargin,
            'margin_pct' => $totalRevenue > 0 ? round($totalMargin / $totalRevenue * 100, 1) : 0,
        ],
        'products' => $topProducts,
    ], 'Margen del rango');
}

function handleCategoryBreakdown($pdo) {
    [$from, $to] = resolveDateRange();

    $sql = "SELECT p.category_id, COALESCE(c.name, 'Sin categoría') AS category_name,
                   SUM(sd.subtotal - sd.discount_amount) AS revenue,
                   SUM(sd.quantity * p.purchase_price) AS cost
            FROM sales_details sd
            JOIN sales s ON s.id = sd.sale_id
            JOIN products p ON p.id = sd.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE s.status = 'completed' AND s.invoice_date BETWEEN :from AND :to
            GROUP BY p.category_id, category_name
            ORDER BY revenue DESC";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':from' => $from, ':to' => $to]);

    $result = array_map(function ($row) {
        $revenue = (float) $row['revenue'];
        $cost = (float) $row['cost'];
        $margin = $revenue - $cost;
        return [
            'category_id' => $row['category_id'],
            'category_name' => $row['category_name'],
            'revenue' => $revenue,
            'cost' => $cost,
            'margin' => $margin,
            'margin_pct' => $revenue > 0 ? round($margin / $revenue * 100, 1) : 0,
        ];
    }, $stmt->fetchAll());

    jsonResponse(true, $result, 'Desglose por categoría');
}

function handleMoneyTypeBreakdown($pdo) {
    [$from, $to] = resolveDateRange();

    $sql = "SELECT payment_method, SUM(total_amount) AS revenue, COUNT(*) AS sale_count
            FROM sales WHERE status = 'completed' AND invoice_date BETWEEN :from AND :to
            GROUP BY payment_method";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':from' => $from, ':to' => $to]);

    $result = array_map(fn ($row) => [
        'payment_method' => $row['payment_method'],
        'revenue' => (float) $row['revenue'],
        'sale_count' => (int) $row['sale_count'],
    ], $stmt->fetchAll());

    jsonResponse(true, $result, 'Desglose por medio de pago');
}

function handleExpiringSummary($pdo) {
    $days = (int) EXPIRATION_WARNING_DAYS;
    $stmt = $pdo->query(
        "SELECT
            (SELECT COUNT(*) FROM product_lots
             WHERE expiration_date IS NOT NULL AND quantity_remaining > 0
               AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL $days DAY)) AS expiring_count,
            (SELECT COUNT(*) FROM product_lots
             WHERE expiration_date IS NOT NULL AND quantity_remaining > 0
               AND expiration_date < CURDATE()) AS expired_count"
    );
    $row = $stmt->fetch();
    jsonResponse(true, [
        'expiring_count' => (int) $row['expiring_count'],
        'expired_count' => (int) $row['expired_count'],
    ], 'Resumen de vencimientos');
}
