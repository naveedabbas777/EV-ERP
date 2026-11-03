import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { dealerSchema } from '@/lib/validation';
import { jsonError, jsonSuccess } from '@/lib/api-response';
import { getDealerScope, hasPermission } from '@/lib/permissions';

function normalizeStatus(value) {
  if (!value) return 'Active';
  const formatted = String(value).trim();
  if (!formatted) return 'Active';
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }
  if (!hasPermission(user.permissions, 'dealers.read')) {
    return jsonError(NextResponse, 'Forbidden', 403);
  }

  const rows = await prisma.dealer.findMany({
    where: { organizationId: user.organizationId, ...getDealerScope(user) },
    include: {
      region: true,
      sales: {
        select: { totalAmount: true },
      },
      _count: { select: { showrooms: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const data = rows.map((dealer) => {
    const revenue = dealer.sales.reduce((sum, sale) => sum + Number(sale.totalAmount || 0), 0);
    const status = normalizeStatus(dealer.status);

    return {
      id: dealer.id,
      registrationNumber: dealer.registrationNumber,
      name: dealer.name,
      region: dealer.region?.name || 'Unassigned',
      manager: dealer.contactPerson || 'Unassigned',
      revenue,
      outstanding: Number(dealer.outstandingBalance || 0),
      status,
      contactEmail: dealer.contactEmail || '',
      phone: dealer.phone || '',
      address: dealer.address || dealer.region?.name || '',
      showroomCount: dealer._count.showrooms,
    };
  });

  const totalDealers = data.length;
  const activeDealers = data.filter((dealer) => dealer.status === 'Active').length;
  const pendingDealers = data.filter((dealer) => dealer.status === 'Pending').length;
  const outstandingBalance = data.reduce((sum, dealer) => sum + Number(dealer.outstanding || 0), 0);

  return jsonSuccess(NextResponse, {
    data,
    total: totalDealers,
    stats: {
      totalDealers,
      activeDealers,
      pendingDealers,
      outstandingBalance,
    },
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }
  if (!hasPermission(user.permissions, 'dealers.create')) {
    return jsonError(NextResponse, 'Forbidden', 403);
  }

  const body = await request.json();
  const parsed = dealerSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError(NextResponse, parsed.error.issues[0]?.message || 'Invalid payload', 400);
  }

  const regionName = parsed.data.region.trim();
  let region = await prisma.region.findFirst({
    where: {
      organizationId: user.organizationId,
      name: { equals: regionName, mode: 'insensitive' },
    },
  });

  if (!region) {
    region = await prisma.region.create({
      data: {
        organizationId: user.organizationId,
        name: regionName,
        code: `${regionName.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
      },
    });
  }

  const dealer = await prisma.dealer.create({
    data: {
      organizationId: user.organizationId,
      regionId: region.id,
      registrationNumber: parsed.data.registrationNumber,
      name: parsed.data.name,
      contactPerson: body.contactPerson || parsed.data.name,
      phone: parsed.data.phone,
      contactEmail: parsed.data.contactEmail || null,
      status: parsed.data.status,
      address: regionName,
      creditLimit: 0,
      outstandingBalance: 0,
    },
  });

  return jsonSuccess(NextResponse, dealer, { success: true });
}
