import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDealerActivityScope, hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'reports.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sales = await prisma.sale.findMany({
    where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
    select: {
      totalAmount: true,
      dealer: { select: { region: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const grouped = new Map();
  for (const sale of sales) {
    const regionName = sale.dealer?.region?.name || 'Unassigned';
    const current = grouped.get(regionName) || { region: regionName, sales: 0, transactions: 0 };
    current.sales += Number(sale.totalAmount || 0);
    current.transactions += 1;
    grouped.set(regionName, current);
  }

  return NextResponse.json({
    data: [...grouped.values()].sort((a, b) => b.sales - a.sales),
    total: grouped.size,
    summary: {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0),
    },
  });
}
