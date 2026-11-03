import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { productSchema } from '@/lib/validation';
import { jsonError, jsonSuccess } from '@/lib/api-response';

export async function GET(_request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: { category: true },
  });

  if (!product) {
    return jsonError(NextResponse, 'Product not found.', 404);
  }

  return jsonSuccess(NextResponse, {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category?.name || 'General',
    description: product.description || '',
    purchasePrice: Number(product.purchasePrice || 0),
    dealerPrice: Number(product.dealerPrice || 0),
    retailPrice: Number(product.retailPrice || 0),
    status: product.isActive ? 'Active' : 'Inactive',
  });
}

export async function PATCH(request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }
  if (user.dealerId) {
    return jsonError(NextResponse, 'Forbidden', 403);
  }

  const { id } = await params;
  const payload = await request.json();
  const parsed = productSchema.partial().safeParse(payload);

  if (!parsed.success) {
    return jsonError(NextResponse, parsed.error.issues[0]?.message || 'Invalid product update payload.', 400);
  }

  const update = parsed.data;
  const existing = await prisma.product.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!existing) {
    return jsonError(NextResponse, 'Product not found.', 404);
  }

  let categoryId = existing.categoryId;
  if (update.category) {
    const categoryName = update.category.trim();
    let category = await prisma.productCategory.findFirst({
      where: { name: { equals: categoryName, mode: 'insensitive' } },
    });

    if (!category) {
      category = await prisma.productCategory.create({
        data: { name: categoryName, description: `${categoryName} catalog` },
      });
    }

    categoryId = category.id;
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(update.name ? { name: update.name } : {}),
      ...(update.sku ? { sku: update.sku } : {}),
      ...(update.description !== undefined ? { description: update.description || '' } : {}),
      ...(update.purchasePrice !== undefined ? { purchasePrice: update.purchasePrice } : {}),
      ...(update.dealerPrice !== undefined ? { dealerPrice: update.dealerPrice } : {}),
      ...(update.retailPrice !== undefined ? { retailPrice: update.retailPrice } : {}),
      ...(update.isActive !== undefined ? { isActive: update.isActive } : {}),
      categoryId,
    },
    include: { category: true },
  });

  return jsonSuccess(NextResponse, {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category?.name || 'General',
    status: product.isActive ? 'Active' : 'Inactive',
  }, { message: 'Product updated successfully.' });
}

export async function DELETE(_request, { params }) {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(NextResponse, 'Unauthorized', 401);
  }
  if (user.dealerId) {
    return jsonError(NextResponse, 'Forbidden', 403);
  }

  const { id } = await params;
  const product = await prisma.product.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  if (!product) {
    return jsonError(NextResponse, 'Product not found.', 404);
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return jsonSuccess(NextResponse, { id }, { message: 'Product archived successfully.' });
}
