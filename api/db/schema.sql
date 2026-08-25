-- Aaron Provisiones — Database Schema
-- MariaDB 10.5+
-- Basado en el patrón de FERRIMIX, con 3 tablas nuevas (product_lots,
-- promotions, promotion_products) y ajustes puntuales para minimarket.
-- Ver el documento de arquitectura para el razonamiento completo.
--
-- Orden de creación: cada tabla va después de todo lo que referencia, para
-- no depender de que el motor tolere referencias hacia adelante.

-- ============================================================
-- Identidad y catálogo
-- ============================================================

CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150),
  role ENUM('admin', 'cashier', 'warehouse_staff') NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(username),
  INDEX(role)
);

CREATE TABLE categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(name)
);

CREATE TABLE suppliers (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  rut VARCHAR(12) UNIQUE NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(120),
  address TEXT,
  contact_person VARCHAR(150),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(rut),
  INDEX(name)
);

CREATE TABLE products (
  id CHAR(36) PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  barcode VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(255),
  category_id CHAR(36) REFERENCES categories(id),
  supplier_id CHAR(36) REFERENCES suppliers(id),
  unit_of_measure ENUM('units', 'kilos', 'liters') NOT NULL DEFAULT 'units',
  -- Fiambrería/quesos/frutas — puerta abierta a balanza más adelante, sin
  -- implementarla todavía (ver documento de arquitectura, sección 6).
  is_scale_item BOOLEAN NOT NULL DEFAULT false,
  -- Si es true, "recibir compra" exige fecha de vencimiento y crea una
  -- fila en product_lots en vez de solo sumar stock_current.
  has_expiration BOOLEAN NOT NULL DEFAULT false,
  purchase_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  stock_current DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_critical DECIMAL(10,3) NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(sku),
  INDEX(barcode),
  INDEX(name),
  INDEX(category_id),
  INDEX(stock_current)
);

-- ============================================================
-- Caja
-- ============================================================

CREATE TABLE cash_registers (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL REFERENCES users(id),
  -- Hoy no se usa (1 sola caja) — lista para el día que se sume una
  -- segunda sin necesitar una migración.
  register_label VARCHAR(50),
  opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP,
  opening_amount DECIMAL(10,2) NOT NULL,
  closing_amount DECIMAL(10,2),
  expected_amount DECIMAL(10,2),
  status ENUM('open', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(user_id),
  INDEX(status),
  INDEX(created_at)
);

-- ============================================================
-- Compras
-- ============================================================

CREATE TABLE purchases (
  id CHAR(36) PRIMARY KEY,
  supplier_id CHAR(36) NOT NULL REFERENCES suppliers(id),
  purchase_number VARCHAR(20) UNIQUE NOT NULL,
  purchase_date DATE NOT NULL,
  received_date DATE,
  total_amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'partial', 'received', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  user_id CHAR(36) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(supplier_id),
  INDEX(purchase_number),
  INDEX(status),
  INDEX(created_at)
);

CREATE TABLE purchases_details (
  id CHAR(36) PRIMARY KEY,
  purchase_id CHAR(36) NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  product_id CHAR(36) NOT NULL REFERENCES products(id),
  quantity DECIMAL(10,3) NOT NULL,
  received_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  -- Se capturan acá, en el momento de recibir — es el único punto donde
  -- alguien tiene el producto físico en la mano. Si vienen, "receive"
  -- crea la fila correspondiente en product_lots.
  expiration_date DATE,
  lot_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(purchase_id),
  INDEX(product_id)
);

-- ============================================================
-- Vencimientos por lote
-- ============================================================

-- Un mismo producto puede tener varios lotes en stock con distinta fecha
-- de vencimiento a la vez — products.stock_current sigue siendo el
-- agregado rápido de leer en el POS; esta tabla es el detalle.
CREATE TABLE product_lots (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL REFERENCES products(id),
  purchase_id CHAR(36) REFERENCES purchases(id),
  lot_code VARCHAR(50),
  expiration_date DATE,
  quantity_received DECIMAL(10,3) NOT NULL,
  quantity_remaining DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2),
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(product_id),
  INDEX(expiration_date),
  INDEX(quantity_remaining)
);

-- ============================================================
-- Promociones
-- ============================================================

-- Dos mecanismos alcanzan para lo pedido: "compra N, paga M" (2x1, 3x2)
-- y "pack a precio fijo". Sin motor de reglas genérico — no se pidió.
CREATE TABLE promotions (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type ENUM('nxm', 'pack_price') NOT NULL,
  buy_quantity INT,
  pay_quantity INT,
  pack_price DECIMAL(10,2),
  starts_at DATE,
  ends_at DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(is_active)
);

CREATE TABLE promotion_products (
  id CHAR(36) PRIMARY KEY,
  promotion_id CHAR(36) NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
  product_id CHAR(36) NOT NULL REFERENCES products(id),
  UNIQUE KEY uq_promotion_product (promotion_id, product_id),
  INDEX(product_id)
);

-- ============================================================
-- Ventas
-- ============================================================

-- cash_register_id es NULLABLE a propósito, igual que en FERRIMIX (D-07):
-- el servidor resuelve la caja abierta del usuario autenticado, nunca
-- confía en un ID que mande el cliente. Si el cajero no tiene caja
-- abierta, la venta se permite igual con cash_register_id = NULL.
CREATE TABLE sales (
  id CHAR(36) PRIMARY KEY,
  cash_register_id CHAR(36) REFERENCES cash_registers(id),
  user_id CHAR(36) NOT NULL REFERENCES users(id),
  total_amount DECIMAL(10,2) NOT NULL,
  -- Descuento sobre la boleta completa, en pesos, aparte del de línea en
  -- sales_details.discount_amount. Nunca porcentaje en la API.
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL,
  amount_received DECIMAL(10,2),
  change_amount DECIMAL(10,2),
  invoice_type ENUM('boleta', 'factura') NOT NULL DEFAULT 'boleta',
  invoice_number VARCHAR(20),
  invoice_date DATE NOT NULL,
  customer_rut VARCHAR(12),
  customer_name VARCHAR(150),
  status ENUM('completed', 'cancelled') DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(cash_register_id),
  INDEX(user_id),
  INDEX(invoice_number),
  INDEX(created_at),
  INDEX(status)
);

CREATE TABLE sales_details (
  id CHAR(36) PRIMARY KEY,
  sale_id CHAR(36) NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id CHAR(36) NOT NULL REFERENCES products(id),
  -- De qué lote salió — trazabilidad si hay que rastrear un retiro.
  lot_id CHAR(36) REFERENCES product_lots(id),
  -- NULL si el descuento de esta línea fue manual, no una promoción.
  promotion_id CHAR(36) REFERENCES promotions(id),
  quantity DECIMAL(10,3) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(sale_id),
  INDEX(product_id),
  INDEX(lot_id)
);

-- ============================================================
-- Inventario
-- ============================================================

CREATE TABLE inventory_movements (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL REFERENCES products(id),
  -- Qué lote se movió — las mermas de perecibles casi siempre son por lote.
  lot_id CHAR(36) REFERENCES product_lots(id),
  movement_type ENUM('in', 'out', 'adjustment', 'loss') NOT NULL,
  quantity DECIMAL(10,3) NOT NULL,
  unit_cost DECIMAL(10,2),
  reason VARCHAR(255),
  reference_id CHAR(36),
  user_id CHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(product_id),
  INDEX(lot_id),
  INDEX(movement_type),
  INDEX(created_at)
);

-- ============================================================
-- Egresos y auditoría
-- ============================================================

CREATE TABLE expenses (
  id CHAR(36) PRIMARY KEY,
  cash_register_id CHAR(36) NOT NULL REFERENCES cash_registers(id),
  amount DECIMAL(10,2) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  user_id CHAR(36) NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(cash_register_id),
  INDEX(created_at)
);

CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) REFERENCES users(id),
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100),
  entity_id CHAR(36),
  old_value LONGTEXT,
  new_value LONGTEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX(user_id),
  INDEX(entity_type),
  INDEX(created_at)
);
