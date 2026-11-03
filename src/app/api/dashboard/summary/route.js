import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { getDealerActivityScope, getDealerScope, getShowroomScope } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }

  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const inventoryShowroomScope = user.dealerId ? { warehouse: { showroom: { is: getShowroomScope(user) } } } : {};
  const [dealerCount, employeeCount, productCount, inventory, dealerInventory, companyInventory, sales, paymentTotals, pendingOrders, approvals, outstandingBalance, regionSales, showroomCount, retailSales, retailPayments, retailRows] = await Promise.all([
    prisma.dealer.count({ where: { organizationId: user.organizationId, ...getDealerScope(user) } }),
    prisma.employee.count({
      where: {
        organizationId: user.organizationId,
        ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : {}),
      },
    }),
    prisma.product.count({ where: { organizationId: user.organizationId, isActive: true } }),
    prisma.inventory.aggregate({
      where: { organizationId: user.organizationId, ...inventoryShowroomScope },
      _sum: { quantity: true, reservedStock: true },
    }),
    prisma.inventory.aggregate({
      where: {
        organizationId: user.organizationId,
        warehouse: { ...(user.dealerId ? { showroom: { is: getShowroomScope(user) } } : { type: { not: 'company' } }) },
      },
      _sum: { quantity: true },
    }),
    user.dealerId ? Promise.resolve({ _sum: { quantity: 0 } }) : prisma.inventory.aggregate({
      where: { organizationId: user.organizationId, warehouse: { type: 'company' } },
      _sum: { quantity: true },
    }),
    prisma.sale.findMany({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      orderBy: { createdAt: 'desc' },
      include: { dealer: { include: { region: true } } },
    }),
    prisma.payment.aggregate({
      where: {
        dealer: { organizationId: user.organizationId, ...getDealerScope(user) },
        ...getDealerActivityScope(user),
        status: { in: ['paid', 'approved'] },
      },
      _sum: { amount: true },
    }),
    prisma.order.count({ where: { organizationId: user.organizationId, ...getDealerActivityScope(user), status: 'pending' } }),
    user.dealerId ? Promise.resolve([]) : prisma.approvalRequest.groupBy({
      by: ['currentStatus'],
      where: { organizationId: user.organizationId, ...getDealerScope(user) },
      _count: { id: true },
    }),
    prisma.dealer.aggregate({
      where: { organizationId: user.organizationId, ...getDealerScope(user) },
      _sum: { outstandingBalance: true },
    }),
    prisma.sale.findMany({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      select: { totalAmount: true, dealer: { select: { region: { select: { name: true } } } } },
    }),
    prisma.showroom.count({ where: { organizationId: user.organizationId, ...getShowroomScope(user) } }),
    prisma.showroomSale.aggregate({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      _sum: { totalAmount: true },
      _count: { id: true },
    }),
    prisma.showroomPayment.aggregate({
      where: {
        organizationId: user.organizationId,
        ...getDealerActivityScope(user),
      },
      _sum: { amount: true },
    }),
    prisma.showroomSale.findMany({
      where: { organizationId: user.organizationId, ...getDealerActivityScope(user) },
      include: { showroom: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const monthlySales = new Map();
  for (const sale of user.dealerId ? retailRows : sales) {
    if (sale.createdAt < yearStart) continue;
    const monthIndex = sale.createdAt.getMonth();
    const current = monthlySales.get(monthIndex) || { revenue: 0, orders: 0 };
    current.revenue += Number(sale.totalAmount || 0);
    current.orders += 1;
    monthlySales.set(monthIndex, current);
  }

  const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData = monthOrder.map((month, monthIndex) => ({
    month,
    revenue: monthlySales.get(monthIndex)?.revenue || 0,
    orders: monthlySales.get(monthIndex)?.orders || 0,
  }));

  const groupedRegions = new Map();
  for (const sale of regionSales) {
    const regionName = sale.dealer?.region?.name || 'Unassigned';
    const current = groupedRegions.get(regionName) || { region: regionName, sales: 0, transactions: 0 };
    current.sales += Number(sale.totalAmount || 0);
    current.transactions += 1;
    groupedRegions.set(regionName, current);
  }

  const approvalCounts = Object.fromEntries(approvals.map((entry) => [entry.currentStatus.toLowerCase(), entry._count.id]));
  const approvedCount = approvalCounts.approved || 0;
  const totalApprovalCount = approvals.reduce((sum, item) => sum + item._count.id, 0);
  const paidRevenue = Number((user.dealerId ? retailPayments : paymentTotals)._sum.amount || 0);
  const billedRevenue = user.dealerId
    ? Number(retailSales._sum.totalAmount || 0)
    : sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
  const collectionRate = billedRevenue > 0 ? Math.round((paidRevenue / billedRevenue) * 100) : 0;

  const metrics = [
    { label: 'Total Dealers', value: String(dealerCount), tone: 'emerald' },
    { label: 'Showrooms', value: String(showroomCount), tone: 'teal' },
    { label: 'Total Employees', value: String(employeeCount), tone: 'sky' },
    { label: 'Active Products', value: String(productCount), tone: 'violet' },
    { label: 'Company Stock Units', value: String(companyInventory._sum.quantity || 0), tone: 'amber' },
    { label: 'Dealer Stock Units', value: String(dealerInventory._sum.quantity || 0), tone: 'rose' },
    { label: 'Sales Invoices', value: String(user.dealerId ? retailSales._count.id || 0 : sales.length), tone: 'cyan' },
    { label: 'Sales Revenue', value: Number(billedRevenue).toLocaleString(), tone: 'emerald' },
    { label: 'Pending Orders', value: String(pendingOrders), tone: 'orange' },
    { label: 'Outstanding Balance', value: Number(outstandingBalance._sum.outstandingBalance || 0).toLocaleString(), tone: 'red' },
    { label: 'Reserved Stock Units', value: String(inventory._sum.reservedStock || 0), tone: 'indigo' },
  ];

  const recentTransactions = user.dealerId
    ? retailRows.slice(0, 6).map((sale) => ({
      type: 'Retail sale',
      customer: `${sale.showroom.name} · ${sale.customerName || 'Walk-in customer'}`,
      amount: Number(sale.totalAmount || 0).toLocaleString(),
      time: sale.createdAt.toISOString(),
    }))
    : sales.slice(0, 6).map((sale) => ({
    type: 'Sale',
    customer: sale.dealer?.name || 'Dealer',
    amount: Number(sale.totalAmount || 0).toLocaleString(),
    time: sale.createdAt.toISOString(),
  }));

  return jsonSuccess(NextResponse, {
    metrics,
    sales: chartData,
    transactions: recentTransactions,
    regions: [...groupedRegions.values()],
    operationalHealth: {
      approvalRate: totalApprovalCount ? Math.round((approvedCount / totalApprovalCount) * 100) : 0,
      collectionRate,
      approvalCount: totalApprovalCount,
      approvedCount,
      collectedAmount: paidRevenue,
      billedAmount: billedRevenue,
    },
    currentYear: now.getFullYear(),
  });
}
