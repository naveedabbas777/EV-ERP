import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'inventory.read') && !hasPermission(user.permissions, 'inventory.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [movements, inventory] = await Promise.all([
    prisma.stockMovement.findMany({
      where: {
        warehouse: {
          organizationId: user.organizationId,
          ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : {}),
        },
      },
      include: { warehouse: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.inventory.findMany({
      where: {
        organizationId: user.organizationId,
        ...(user.dealerId ? { warehouse: { showroom: { is: getShowroomScope(user) } } } : {}),
      },
      include: { product: true, warehouse: true },
      orderBy: [{ warehouse: { name: 'asc' } }, { product: { name: 'asc' } }],
    }),
  ]);
  const movementProducts = await prisma.product.findMany({
    where: {
      organizationId: user.organizationId,
      id: { in: movements.map((movement) => movement.productId).filter(Boolean) },
    },
    select: { id: true, name: true, sku: true },
  });
  const productById = new Map(movementProducts.map((product) => [product.id, product]));

  return NextResponse.json({
    data: movements.map((movement) => ({
      id: movement.id,
      product: productById.get(movement.productId)?.name || 'Unknown product',
      sku: productById.get(movement.productId)?.sku || 'N/A',
      warehouse: movement.warehouse.name,
      type: movement.type,
      quantity: movement.quantity,
      reason: movement.reason || '',
      referenceNo: movement.referenceNo || '',
      createdAt: movement.createdAt.toISOString(),
    })),
    options: inventory.map((row) => ({
      productId: row.productId,
      product: row.product.name,
      sku: row.product.sku,
      warehouseId: row.warehouseId,
      warehouse: row.warehouse.name,
      quantity: row.quantity,
      reservedStock: row.reservedStock,
    })),
    total: movements.length,
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'inventory.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const productId = String(body?.productId || '').trim();
  const warehouseId = String(body?.warehouseId || '').trim();
  const quantityDelta = Number(body?.quantityDelta);
  const reason = String(body?.reason || '').trim();

  if (!productId || !warehouseId || !Number.isInteger(quantityDelta) || quantityDelta === 0 || !reason) {
    return NextResponse.json({ error: 'Product, warehouse, a non-zero whole-number adjustment, and a reason are required.' }, { status: 400 });
  }

  const inventory = await prisma.inventory.findFirst({
    where: {
      organizationId: user.organizationId,
      productId,
      warehouseId,
      ...(user.dealerId ? { warehouse: { showroom: { is: getShowroomScope(user) } } } : {}),
    },
    include: { product: true, warehouse: true },
  });
  if (!inventory) {
    return NextResponse.json({ error: 'Inventory record not found in this organization.' }, { status: 404 });
  }

  const newQuantity = inventory.quantity + quantityDelta;
  if (newQuantity < inventory.reservedStock) {
    return NextResponse.json({ error: `Adjustment would reduce stock below the ${inventory.reservedStock} units currently reserved.` }, { status: 400 });
  }

  const referenceNo = `ADJ-${Date.now()}`;
  const movement = await prisma.$transaction(async (tx) => {
    const updated = await tx.inventory.updateMany({
      where: {
        id: inventory.id,
        quantity: inventory.quantity,
        reservedStock: inventory.reservedStock,
      },
      data: { quantity: newQuantity },
    });

    if (updated.count !== 1) {
      const error = new Error('Inventory changed while this adjustment was being submitted. Refresh and retry.');
      error.code = 'INVENTORY_CONFLICT';
      throw error;
    }

    return tx.stockMovement.create({
      data: {
        warehouseId,
        productId,
        type: quantityDelta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
        quantity: quantityDelta,
        reason,
        referenceNo,
      },
    });
  }).catch((error) => {
    if (error?.code === 'INVENTORY_CONFLICT') return null;
    throw error;
  });

  if (!movement) {
    return NextResponse.json({ error: 'Inventory changed while this adjustment was being submitted. Refresh and retry.' }, { status: 409 });
  }

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'inventory.adjusted',
    entityType: 'inventory',
    entityId: inventory.id,
    details: { productId, warehouseId, quantityDelta, newQuantity, referenceNo, reason },
  });

  return NextResponse.json({ success: true, data: { id: movement.id, referenceNo, quantity: quantityDelta, newQuantity } });
}
