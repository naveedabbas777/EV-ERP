import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { productSchema } from '@/lib/validation';
import { jsonError, jsonSuccess } from '@/lib/api-response';

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }
  const rows = await prisma.product.findMany({
    where: { organizationId: user.organizationId },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });

  return jsonSuccess(NextResponse, {
    data: rows.map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category?.name || 'General',
      sku: product.sku,
      purchasePrice: Number(product.purchasePrice || 0),
      dealerPrice: Number(product.dealerPrice || 0),
      retailPrice: Number(product.retailPrice || 0),
      status: product.isActive ? 'Active' : 'Inactive',
      description: product.description || '',
    })),
    total: rows.length,
  });
}

export async function POST(request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }
  if (user.dealerId) {
    return jsonError(NextResponse, 'Forbidden', 403);
  }

  const payload = await request.json();
  const parsed = productSchema.safeParse(payload);

  if (!parsed.success) {
    return jsonError(NextResponse, parsed.error.issues[0]?.message || 'Invalid product payload.', 400);
  }

  const body = parsed.data;
  const categoryName = body.category.trim();

  let category = await prisma.productCategory.findFirst({
    where: {
      name: { equals: categoryName, mode: 'insensitive' },
    },
  });

  if (!category) {
    category = await prisma.productCategory.create({
      data: {
        name: categoryName,
        description: `${categoryName} scooter catalog`,
      },
    });
  }

  const existing = await prisma.product.findFirst({
    where: {
      organizationId: user.organizationId,
      sku: body.sku,
    },
  });

  if (existing) {
    return jsonError(NextResponse, 'A product with this SKU already exists in your organization.', 409);
  }

  const product = await prisma.product.create({
    data: {
      organizationId: user.organizationId,
      categoryId: category.id,
      sku: body.sku,
      name: body.name,
      description: body.description || `${body.name} EV scooter`,
      purchasePrice: body.purchasePrice,
      dealerPrice: body.dealerPrice,
      retailPrice: body.retailPrice,
      isActive: body.isActive,
    },
    include: {
      category: true,
    },
  });

  return jsonSuccess(NextResponse, {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category?.name || categoryName,
    status: product.isActive ? 'Active' : 'Inactive',
  }, { message: 'Product created successfully.' });
}
