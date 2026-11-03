import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { canAccessDealer, getShowroomScope, hasPermission } from '@/lib/permissions';
import { logAuditEvent } from '@/lib/audit';

const showroomSelect = {
  id: true,
  dealerId: true,
  name: true,
  code: true,
  address: true,
  phone: true,
  email: true,
  status: true,
  createdAt: true,
  dealer: { select: { name: true, registrationNumber: true } },
  warehouse: {
    select: {
      id: true,
      _count: { select: { inventories: true } },
    },
  },
  _count: {
    select: { users: true, orders: true, payments: true, returnRequests: true, retailSales: true },
  },
};

function isAllowed(user, permission) {
  return hasPermission(user.permissions, permission) || hasPermission(user.permissions, 'dealers.read');
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isAllowed(user, 'showrooms.read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [showrooms, dealers] = await Promise.all([
    prisma.showroom.findMany({
      where: { organizationId: user.organizationId, ...getShowroomScope(user) },
      select: showroomSelect,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    }),
    !user.dealerId && hasPermission(user.permissions, 'showrooms.manage')
      ? prisma.dealer.findMany({
        where: { organizationId: user.organizationId, status: 'active' },
        select: { id: true, name: true, registrationNumber: true },
        orderBy: { name: 'asc' },
      })
      : Promise.resolve([]),
  ]);

  const retailSales = await prisma.showroomSale.groupBy({
    by: ['showroomId'],
    where: { organizationId: user.organizationId, showroomId: { in: showrooms.map((showroom) => showroom.id) } },
    _sum: { totalAmount: true },
    _count: { id: true },
  });
  const salesByShowroom = new Map(retailSales.map((row) => [row.showroomId, row]));

  return NextResponse.json({
    success: true,
    data: showrooms.map((showroom) => {
      const sales = salesByShowroom.get(showroom.id);
      return {
        ...showroom,
        retailRevenue: Number(sales?._sum.totalAmount || 0),
        retailSalesCount: sales?._count.id || 0,
        stockSkuCount: showroom.warehouse?._count.inventories || 0,
      };
    }),
    options: { dealers },
    capabilities: {
      canManage: hasPermission(user.permissions, 'showrooms.manage'),
      canManageStaff: hasPermission(user.permissions, 'showrooms.staff.manage') || hasPermission(user.permissions, 'users.manage'),
    },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!hasPermission(user.permissions, 'showrooms.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  const dealerId = user.dealerId || String(body?.dealerId || '').trim();
  const name = String(body?.name || '').trim();
  const code = String(body?.code || '').trim().toUpperCase();
  const address = String(body?.address || '').trim();
  const phone = String(body?.phone || '').trim();
  const email = String(body?.email || '').trim().toLowerCase();

  if (!dealerId || name.length < 2 || name.length > 191 || !/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code)) {
    return NextResponse.json({ error: 'Choose a dealer, enter a showroom name, and use a 2–40 character code containing letters, numbers, hyphens, or underscores.' }, { status: 400 });
  }
  if (address.length > 500 || phone.length > 50 || email.length > 191 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return NextResponse.json({ error: 'Address, phone, or email is invalid or too long.' }, { status: 400 });
  }

  const dealer = await prisma.dealer.findFirst({
    where: { id: dealerId, organizationId: user.organizationId, status: 'active' },
    select: { id: true },
  });
  if (!dealer || !canAccessDealer(user, dealer.id)) {
    return NextResponse.json({ error: 'Active dealer not found in your organization.' }, { status: 404 });
  }

  const duplicate = await prisma.showroom.findFirst({ where: { dealerId, code } });
  if (duplicate) return NextResponse.json({ error: 'This showroom code is already in use for the dealer.' }, { status: 409 });

  const showroom = await prisma.showroom.create({
    data: {
      organizationId: user.organizationId,
      dealerId,
      name,
      code,
      address: address || null,
      phone: phone || null,
      email: email || null,
      warehouse: {
        create: {
          organization: { connect: { id: user.organizationId } },
          name: `${name} stock`,
          code: `SR-${randomUUID().replaceAll('-', '').slice(0, 24).toUpperCase()}`,
          location: address || null,
          type: 'showroom',
        },
      },
    },
    select: showroomSelect,
  });

  await logAuditEvent({
    user,
    organizationId: user.organizationId,
    action: 'showroom.created',
    entityType: 'showroom',
    entityId: showroom.id,
    details: { dealerId, name, code },
  });

  return NextResponse.json({ success: true, data: showroom }, { status: 201 });
}
