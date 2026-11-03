import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessShowroom, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

class InsufficientStockError extends Error {}

function parseCents(value) {
  const text = String(value ?? '').trim();
  if (!/^(0|[1-9]\d{0,15})(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function centsToDecimal(cents) {
  return `${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`;
}

export async function POST(request, { params }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'showroom.sales.create')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id: showroomId } = await params;
  const showroom = await prisma.showroom.findFirst({
    where: { id: showroomId, organizationId: user.organizationId, ...getShowroomScope(user) },
    include: { warehouse: true },
  });
  if (!canAccessShowroom(user, showroom)) return NextResponse.json({ error: 'Showroom not found.' }, { status: 404 });
  if (showroom.status !== 'active') return NextResponse.json({ error: 'Sales cannot be recorded for an inactive showroom.' }, { status: 409 });
  if (!showroom.warehouse) return NextResponse.json({ error: 'This showroom has no stock warehouse configured.' }, { status: 409 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items.map((item) => ({
    productId: String(item?.productId || '').trim(),
    quantity: Number(item?.quantity),
  })) : [];
  const customerName = String(body?.customerName || '').trim();
  const customerPhone = String(body?.customerPhone || '').trim();
  if (!items.length || items.length > 50 || items.some((item) => !item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0 || item.quantity > 2147483647)) {
    return NextResponse.json({ error: 'Add at least one product with a positive whole-number quantity.' }, { status: 400 });
  }
  if (customerName.length > 191 || customerPhone.length > 50) {
    return NextResponse.json({ error: 'Customer name or phone is too long.' }, { status: 400 });
  }

  const combined = new Map();
  for (const item of items) combined.set(item.productId, (combined.get(item.productId) || 0) + item.quantity);
  const productIds = [...combined.keys()];
  const [products, inventory] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds }, organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, retailPrice: true },
    }),
    prisma.inventory.findMany({
      where: { organizationId: user.organizationId, warehouseId: showroom.warehouse.id, productId: { in: productIds } },
      select: { id: true, productId: true, quantity: true, reservedStock: true },
    }),
  ]);
  if (products.length !== productIds.length) return NextResponse.json({ error: 'One or more selected products are unavailable.' }, { status: 400 });

  const productMap = new Map(products.map((product) => [product.id, product]));
  const inventoryMap = new Map(inventory.map((row) => [row.productId, row]));
  const normalizedItems = [];
  let totalCents = 0n;

  for (const [productId, quantity] of combined) {
    const product = productMap.get(productId);
    const stock = inventoryMap.get(productId);
    if (!stock || stock.quantity - stock.reservedStock < quantity) {
      return NextResponse.json({ error: `Insufficient showroom stock for ${product.name}.` }, { status: 409 });
    }
    const priceCents = parseCents(product.retailPrice.toFixed(2));
    if (priceCents === null || priceCents <= 0n) {
      return NextResponse.json({ error: `Product ${product.name} does not have a valid retail price.` }, { status: 409 });
    }
    const itemTotal = priceCents * BigInt(quantity);
    totalCents += itemTotal;
    normalizedItems.push({
      productId,
      productName: product.name,
      quantity,
      unitPrice: centsToDecimal(priceCents),
      totalAmount: centsToDecimal(itemTotal),
      stock,
    });
  }

  const paidCents = parseCents(body?.paidAmount ?? '0');
  const paymentMethod = String(body?.paymentMethod || '').trim();
  const paymentMethods = ['cash', 'card', 'bank-transfer', 'cheque', 'mobile-wallet'];
  if (paidCents === null || paidCents > totalCents || (paidCents > 0n && !paymentMethods.includes(paymentMethod))) {
    return NextResponse.json({ error: 'Paid amount must not exceed the sale total, and a supported payment method is required for payments.' }, { status: 400 });
  }

  const invoiceNumber = `RTL-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
  let sale;
  try {
    sale = await prisma.$transaction(async (tx) => {
      for (const item of normalizedItems) {
        const updated = await tx.inventory.updateMany({
          where: {
            id: item.stock.id,
            reservedStock: item.stock.reservedStock,
            quantity: { gte: item.quantity + item.stock.reservedStock },
          },
          data: { quantity: { decrement: item.quantity } },
        });
        if (updated.count !== 1) throw new InsufficientStockError();
      }

      const createdSale = await tx.showroomSale.create({
        data: {
          organizationId: user.organizationId,
          dealerId: showroom.dealerId,
          showroomId,
          invoiceNumber,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          totalAmount: centsToDecimal(totalCents),
          paidAmount: centsToDecimal(paidCents),
          createdBy: user.id,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalAmount: item.totalAmount,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      if (paidCents > 0n) {
        await tx.showroomPayment.create({
          data: {
            organizationId: user.organizationId,
            dealerId: showroom.dealerId,
            showroomId,
            saleId: createdSale.id,
            amount: centsToDecimal(paidCents),
            paymentMethod,
            referenceNo: String(body?.referenceNo || '').trim().slice(0, 191) || null,
          },
        });
      }

      await tx.stockMovement.createMany({
        data: normalizedItems.map((item) => ({
          warehouseId: showroom.warehouse.id,
          productId: item.productId,
          type: 'showroom-sale',
          quantity: -item.quantity,
          reason: `Retail sale ${invoiceNumber}`,
          referenceNo: invoiceNumber,
        })),
      });
      return createdSale;
    });
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: 'Showroom stock changed while this sale was being recorded. Refresh and try again.' }, { status: 409 });
    }
    throw error;
  }

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'showroom.sale.created',
    entityType: 'showroom_sale',
    entityId: sale.id,
    details: {
      invoiceNumber,
      dealerId: showroom.dealerId,
      showroomId,
      amount: Number(sale.totalAmount),
      paidAmount: Number(centsToDecimal(paidCents)),
      itemCount: normalizedItems.length,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: sale.id,
      invoiceNumber,
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(centsToDecimal(paidCents)),
      items: sale.items.length,
    },
  }, { status: 201 });
}
