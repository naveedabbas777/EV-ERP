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

  const warehouses = await prisma.warehouse.findMany({
    where: {
      organizationId: user.organizationId,
      ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : {}),
    },
    select: { id: true, name: true, code: true, type: true },
    orderBy: { name: 'asc' },
  });
  const visibleWarehouseIds = warehouses.map((warehouse) => warehouse.id);
  const [transfers, products] = await Promise.all([
    prisma.stockTransfer.findMany({
      where: {
        organizationId: user.organizationId,
        ...(user.dealerId ? {
          OR: [
            { fromWarehouseId: { in: visibleWarehouseIds } },
            { toWarehouseId: { in: visibleWarehouseIds } },
          ],
        } : {}),
      },
      include: { product: true, fromWarehouse: true, toWarehouse: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return NextResponse.json({
    data: transfers.map((transfer) => ({
      id: transfer.id,
      referenceNo: transfer.referenceNo,
      product: transfer.product?.name || 'Unknown product',
      fromWarehouse: transfer.fromWarehouse?.name || 'Unknown',
      toWarehouse: transfer.toWarehouse?.name || 'Unknown',
      quantity: transfer.quantity,
      status: transfer.status,
      notes: transfer.notes || '',
      createdAt: transfer.createdAt.toISOString(),
    })),
    options: { products, warehouses },
    total: transfers.length,
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
  const fromWarehouseId = String(body?.fromWarehouseId || '').trim();
  const toWarehouseId = String(body?.toWarehouseId || '').trim();
  const quantity = Number(body?.quantity);
  const notes = String(body?.notes || '').trim();

  if (!productId || !fromWarehouseId || !toWarehouseId || !Number.isInteger(quantity) || quantity <= 0) {
    return NextResponse.json({ error: 'Product, source, destination, and a positive whole-number quantity are required.' }, { status: 400 });
  }
  if (fromWarehouseId === toWarehouseId) {
    return NextResponse.json({ error: 'A transfer must move stock between different warehouses.' }, { status: 400 });
  }

  const [product, fromWarehouse, toWarehouse, sourceInventory] = await Promise.all([
    prisma.product.findFirst({ where: { id: productId, organizationId: user.organizationId, isActive: true } }),
    prisma.warehouse.findFirst({
      where: { id: fromWarehouseId, organizationId: user.organizationId, ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : {}) },
    }),
    prisma.warehouse.findFirst({
      where: { id: toWarehouseId, organizationId: user.organizationId, ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : {}) },
    }),
    prisma.inventory.findFirst({ where: { organizationId: user.organizationId, productId, warehouseId: fromWarehouseId } }),
  ]);

  if (!product || !fromWarehouse || !toWarehouse) {
    return NextResponse.json({ error: 'Product and both warehouses must belong to your organization.' }, { status: 404 });
  }
  if (!sourceInventory || sourceInventory.quantity - sourceInventory.reservedStock < quantity) {
    return NextResponse.json({ error: 'Insufficient available stock in the source warehouse.' }, { status: 400 });
  }

  const referenceNo = `TR-${Date.now()}`;
  const transfer = await prisma.$transaction(async (tx) => {
    const decremented = await tx.inventory.updateMany({
      where: {
        id: sourceInventory.id,
        quantity: { gte: quantity + sourceInventory.reservedStock },
      },
      data: { quantity: { decrement: quantity } },
    });

    if (decremented.count !== 1) {
      throw new Error('Stock changed while this transfer was being submitted. Refresh and try again.');
    }

    const created = await tx.stockTransfer.create({
      data: {
        organizationId: user.organizationId,
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        referenceNo,
        status: 'approved',
        notes: notes || null,
        approvedAt: new Date(),
        approvedBy: user.name,
      },
    });

    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
      update: { quantity: { increment: quantity } },
      create: {
        organizationId: user.organizationId,
        productId,
        warehouseId: toWarehouseId,
        quantity,
        reservedStock: 0,
        reorderLevel: 0,
      },
    });

    await tx.stockMovement.createMany({
      data: [
        { warehouseId: fromWarehouseId, productId, type: 'transfer-out', quantity: -quantity, reason: notes || 'Warehouse transfer', referenceNo },
        { warehouseId: toWarehouseId, productId, type: 'transfer-in', quantity, reason: notes || 'Warehouse transfer', referenceNo },
      ],
    });

    return created;
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'inventory.transfer.created',
    entityType: 'stock_transfer',
    entityId: transfer.id,
    details: { referenceNo, productId, fromWarehouseId, toWarehouseId, quantity },
  });

  return NextResponse.json({
    success: true,
    data: { id: transfer.id, referenceNo, product: product.name, quantity, status: transfer.status },
  });
}
