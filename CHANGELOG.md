# Changelog

Qué cambió en el producto, en lenguaje de usuario final. Todavía no hay
una versión utilizable — este archivo empieza a llenarse de verdad desde
T-01.

## 2026-08-25 — Dashboard, Informes, Promociones, Proveedores y Usuarios

Con esto queda construido todo lo que se había planeado para el
lanzamiento:

- **Dashboard**: ventas de hoy, ticket promedio, alertas de stock y
  vencimiento, gráfico de los últimos 30 días y productos más vendidos.
- **Informes**: margen, ventas por categoría, por medio de pago,
  productos sin movimiento y cuadratura de caja del día — con
  exportación a Excel.
- **Promociones**: crear "2x1", "3x2" o packs a precio fijo, y que se
  apliquen solas al vender los productos correspondientes.
- **Proveedores**: pantalla completa de gestión (antes solo se podían
  agregar al recibir mercadería).
- **Usuarios**: gestión completa de cajeros, bodega y administradores,
  con historial de días trabajados.

Todavía no está desplegado en ningún servidor real, y nada de esto se
probó contra una base de datos de verdad — sigue sin ser usable por el
negocio.

## 2026-08-25 — Alertas de stock y vencimientos

Nueva pantalla de Alertas: productos con stock bajo, productos por vencer
en los próximos días, y productos ya vencidos con un botón para
descartarlos como merma en un clic. Todavía no está desplegado en ningún
servidor real.

## 2026-08-25 — Recepción de compras

Bodega ya puede recibir mercadería: elegir el proveedor (o darlo de alta
en el momento si es nuevo), escanear los productos que van llegando uno
tras otro con su cantidad y costo, indicar vencimiento y lote cuando
corresponde, y confirmar todo de una vez. Todavía no está desplegado en
ningún servidor real.

## 2026-08-25 — Punto de venta y caja

El POS ya permite cobrar: buscar productos por nombre o código de barras,
vender por peso los productos a granel, aplicar descuentos, cobrar en
efectivo (con vuelto y redondeo a $10) o con otros medios de pago, y
abrir/cerrar la caja del turno. Todavía no está desplegado en ningún
servidor real ni imprime boleta — sigue sin ser usable por el negocio.

## 2026-08-25 — Bodega (catálogo de productos)

La pantalla de Bodega ya permite agregar productos, editarlos y ajustar
su stock (entradas, salidas, mermas, correcciones), con búsqueda y
filtro por categoría. Todavía no está desplegado en ningún servidor real
— sigue sin ser usable por el negocio.

## 2026-08-24 — Arranca el proyecto

Se definió la arquitectura completa del sistema (base de datos, reglas de
negocio, diseño visual, pantallas) y se armó el esqueleto técnico:
proyecto compilable, pantalla de inicio de sesión funcionando, y el resto
de las pantallas visibles como "próximamente" mientras se construyen.
Nada de esto es usable por el negocio todavía.
