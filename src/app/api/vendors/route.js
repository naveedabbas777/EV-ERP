import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'vendors.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    data: vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      contact: vendor.contactName || 'N/A',
      phone: vendor.phone || 'N/A',
      email: vendor.email || 'N/A',
      status: vendor.status === 'active' ? 'Approved' : 'Pending',
    })),
    total: vendors.length,
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!hasPermission(user.permissions, 'vendors.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const name = body?.name?.trim();
  const contactName = body?.contactName?.trim();
  const phone = body?.phone?.trim();
  const email = body?.email?.trim();

  if (!name) {
    return NextResponse.json({ error: 'Vendor name is required.' }, { status: 400 });
  }

  const vendor = await prisma.vendor.create({
    data: {
      organizationId: user.organizationId,
      name,
      contactName: contactName || null,
      phone: phone || null,
      email: email || null,
      status: 'active',
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: vendor.id,
      name: vendor.name,
      contact: vendor.contactName || 'N/A',
      phone: vendor.phone || 'N/A',
      email: vendor.email || 'N/A',
      status: 'Approved',
    },
  });
}
