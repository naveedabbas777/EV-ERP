import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDealerScope, hasPermission } from '@/lib/permissions';

export async function GET(request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'dealers.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const dealer = await prisma.dealer.findFirst({
    where: { id, organizationId: user.organizationId, ...getDealerScope(user) },
    include: {
      region: true,
      sales: true,
      payments: true,
      returnRequests: true,
      showrooms: { select: { id: true, name: true, code: true, status: true } },
    },
  });

  if (!dealer) {
    return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      id: dealer.id,
      name: dealer.name,
      registrationNumber: dealer.registrationNumber,
      region: dealer.region?.name || 'Unassigned',
      contactPerson: dealer.contactPerson,
      contactEmail: dealer.contactEmail,
      phone: dealer.phone,
      address: dealer.address,
      status: dealer.status,
      creditLimit: Number(dealer.creditLimit || 0),
      outstandingBalance: Number(dealer.outstandingBalance || 0),
      sales: dealer.sales.length,
      payments: dealer.payments.length,
      returns: dealer.returnRequests.length,
      showrooms: dealer.showrooms,
    },
  });
}
