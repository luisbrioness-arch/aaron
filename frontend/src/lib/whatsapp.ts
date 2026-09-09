/**
 * Utilidades para envío de comprobantes vía WhatsApp
 */

export function cleanChileanPhone(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  // Eliminar todo lo que no sea dígito
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  // Si tiene 9 dígitos y empieza con 9 (ej: 912345678), anteponer código país 56
  if (digits.length === 9 && digits.startsWith('9')) {
    return `56${digits}`;
  }

  // Si tiene 11 dígitos y empieza con 56 (ej: 56912345678), está completo
  if (digits.length === 11 && digits.startsWith('56')) {
    return digits;
  }

  // Si tiene 8 dígitos (formato antiguo fijo), anteponer 569
  if (digits.length === 8) {
    return `569${digits}`;
  }

  return digits;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export interface SendCreditReceiptInput {
  phone?: string | null;
  customerName: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    discount_amount?: number;
  }>;
  currentBalance?: number;
  creditLimit?: number;
}

export function openWhatsAppCreditReceipt(data: SendCreditReceiptInput, targetPhone?: string) {
  const phone = cleanChileanPhone(targetPhone || data.phone);

  const itemsText = data.items
    .map(
      (it) =>
        `• ${it.quantity}x ${it.product_name} (${money(it.subtotal - (it.discount_amount || 0))})`,
    )
    .join('\n');

  let balanceText = '';
  if (data.currentBalance != null) {
    balanceText = `\n📊 *Saldo adeudado a la fecha:* ${money(data.currentBalance)}`;
    if (data.creditLimit != null && data.creditLimit > 0) {
      const remaining = Math.max(0, data.creditLimit - data.currentBalance);
      balanceText += `\n💳 *Cupo disponible:* ${money(remaining)}`;
    }
  }

  const message = `🛒 *AARON PROVISIONES — COMPROBANTE DE FIADO*

Hola *${data.customerName}*, te compartimos el comprobante de tu compra registrada al fiado en el almacén:

📄 *Boleta N°:* #${data.invoiceNumber}
📅 *Fecha:* ${data.date}

*Detalle de compra:*
${itemsText}

💰 *Total de esta compra:* ${money(data.totalAmount)}
-----------------------------------${balanceText}

_¡Muchas gracias por su preferencia y confianza!_
📍 Aaron Provisiones`;

  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}

export interface SendPaymentReceiptInput {
  phone?: string | null;
  customerName: string;
  amount: number;
  paymentMethod: string;
  newBalance: number;
  notes?: string;
}

export function openWhatsAppPaymentReceipt(data: SendPaymentReceiptInput, targetPhone?: string) {
  const phone = cleanChileanPhone(targetPhone || data.phone);
  const now = new Date().toLocaleString('es-CL');
  const methodLabel = data.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia';

  const message = `💵 *AARON PROVISIONES — COMPROBANTE DE ABONO*

Hola *${data.customerName}*, confirmamos la recepción de tu pago en el almacén:

💰 *Monto abonado:* ${money(data.amount)}
💳 *Medio de pago:* ${methodLabel}
📅 *Fecha y hora:* ${now}
${data.notes ? `📝 *Detalle:* ${data.notes}\n` : ''}
📊 *Nuevo saldo adeudado:* ${money(data.newBalance)}

_¡Muchas gracias por mantener tu cuenta al día!_
📍 Aaron Provisiones`;

  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

  window.open(url, '_blank');
}

export interface SendAccountStatusInput {
  phone?: string | null;
  customerName: string;
  currentBalance: number;
  creditLimit?: number;
}

export function openWhatsAppAccountStatus(data: SendAccountStatusInput, targetPhone?: string) {
  const phone = cleanChileanPhone(targetPhone || data.phone);
  const now = new Date().toLocaleDateString('es-CL');
  let text = `📋 *AARON PROVISIONES — ESTADO DE CUENTA*

Hola *${data.customerName}*, te informamos el estado actual de tu cuenta corriente en el almacén al ${now}:

📊 *Saldo pendiente:* ${money(data.currentBalance)}`;

  if (data.creditLimit && data.creditLimit > 0) {
    const remaining = Math.max(0, data.creditLimit - data.currentBalance);
    text += `\n💳 *Límite asignado:* ${money(data.creditLimit)}`;
    text += `\n✅ *Cupo disponible:* ${money(remaining)}`;
  }

  text += `\n\n_Agradecemos tu preferencia y confianza._
📍 Aaron Provisiones`;

  const url = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

  window.open(url, '_blank');
}

