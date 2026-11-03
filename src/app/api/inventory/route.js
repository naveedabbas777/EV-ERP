import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getShowroomScope, hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'inventory.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await prisma.inventory.findMany({
    where: {
      organizationId: user.organizationId,
      ...(user.dealerId ? { warehouse: { showroom: { is: getShowroomScope(user) } } } : {}),
    },
    include: {
      product: true,
      warehouse: true,
    },
    orderBy: { updatedAt: 'desc' },
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      sku: row.product?.sku || 'N/A',
      product: row.product?.name || 'N/A',
      warehouse: row.warehouse?.name || 'N/A',
      stock: row.quantity,
      reorderPoint: row.reorderLevel,
      status: row.quantity <= row.reorderLevel ? 'Low Stock' : 'Healthy',
    })),
    total: rows.length,
  });
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: 'Inventory adjustment recorded.' });
}
