let prismaClientPromise = null;

async function getPrismaClient() {
  if (prismaClientPromise) {
    return prismaClientPromise;
  }

  prismaClientPromise = (async () => {
    try {
      const prismaModule = await import('@/lib/prisma');
      return prismaModule.prisma;
    } catch {
      const fallback = await import('../lib/prisma.js');
      return fallback.prisma;
    }
  })();

  return prismaClientPromise;
}

export const defaultRoles = [
  'Super Admin',
  'General Manager',
  'Finance Manager',
  'Accounts Manager',
  'Sales Manager',
  'Dealer Manager',
  'Showroom Staff',
  'After-Sales Manager',
  'Employee Manager',
  'Regional Sales Manager',
  'Purchase Manager',
  'Warehouse Manager',
  'Dealer User',
  'Dealer Admin',
];

export const defaultPermissions = [
  'dealers.create',
  'dealers.read',
  'dealers.update',
  'dealers.delete',
  'showrooms.read',
  'showrooms.manage',
  'showrooms.staff.manage',
  'showroom.sales.create',
  'showroom.expenses.manage',
  'purchases.manage',
  'vendors.manage',
  'inventory.read',
  'inventory.update',
  'orders.create',
  'orders.approve',
  'payments.read',
  'payments.approve',
  'accounts.read',
  'accounts.manage',
  'expenses.manage',
  'returns.create',
  'returns.approve',
  'employees.manage',
  'reports.view',
  'users.manage',
  'roles.manage',
];

export const rolePermissions = {
  'Super Admin': defaultPermissions,
  'General Manager': ['dealers.read', 'orders.approve', 'reports.view', 'inventory.update', 'users.manage', 'accounts.read', 'returns.approve'],
  'Finance Manager': ['payments.read', 'payments.approve', 'accounts.read', 'accounts.manage', 'reports.view', 'returns.approve'],
  'Accounts Manager': ['payments.read', 'accounts.read', 'accounts.manage', 'expenses.manage', 'reports.view', 'dealers.read'],
  'Sales Manager': ['dealers.read', 'orders.create', 'returns.approve', 'reports.view'],
  'Dealer Manager': ['dealers.create', 'dealers.read', 'dealers.update', 'orders.create'],
  'Showroom Staff': ['dealers.read', 'showrooms.read', 'showroom.sales.create', 'orders.create', 'returns.create', 'inventory.read'],
  'After-Sales Manager': ['returns.create', 'returns.approve', 'inventory.read'],
  'Employee Manager': ['employees.manage', 'reports.view'],
  'Regional Sales Manager': ['dealers.read', 'reports.view', 'orders.approve'],
  'Purchase Manager': ['inventory.read', 'orders.create', 'reports.view', 'dealers.read', 'purchases.manage', 'vendors.manage'],
  'Warehouse Manager': ['inventory.read', 'inventory.update', 'orders.approve', 'returns.approve'],
  'Dealer User': ['dealers.read', 'orders.create', 'returns.create'],
  'Dealer Admin': [
    'dealers.read',
    'showrooms.read',
    'showrooms.manage',
    'showrooms.staff.manage',
    'showroom.sales.create',
    'showroom.expenses.manage',
    'orders.create',
    'returns.create',
    'inventory.read',
    'inventory.update',
  ],
};

export function normalizePermissions(permissions = []) {
  return [...new Set((Array.isArray(permissions) ? permissions : []).filter(Boolean))];
}

export function parseAttributes(attributes = {}) {
  if (!attributes) return {};
  if (typeof attributes === 'string') {
    try {
      return JSON.parse(attributes);
    } catch {
      return {};
    }
  }
  return attributes;
}

export function getUserRegions(user = {}) {
  const attributes = parseAttributes(user?.attributes);
  const raw = attributes?.regions || attributes?.region || [];
  const values = Array.isArray(raw) ? raw : [raw];

  return values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .map((value) => (value.toLowerCase() === 'all' ? 'all' : value.toLowerCase()));
}

export function hasABACAccess(user = {}, region = null) {
  if (!region) return true;

  const allowedRegions = getUserRegions(user);
  if (!allowedRegions.length || allowedRegions.includes('all')) return true;

  const normalizedRegion = String(region).trim().toLowerCase();
  return allowedRegions.some((value) => value.toLowerCase() === normalizedRegion);
}

export function hasPermission(userPermissions = [], permission) {
  if (!permission) return true;
  const permissions = Array.isArray(userPermissions) ? userPermissions : [];
  return permissions.includes(permission) || permissions.includes('*');
}

export function getDealerScope(user = {}) {
  return user?.dealerId ? { dealerId: user.dealerId } : {};
}

export function getShowroomScope(user = {}) {
  if (user?.showroomId) {
    return { id: user.showroomId, ...(user.dealerId ? { dealerId: user.dealerId } : {}) };
  }
  return getDealerScope(user);
}

export function getDealerActivityScope(user = {}) {
  if (!user?.dealerId) return {};
  return {
    dealerId: user.dealerId,
    ...(user.showroomId ? { showroomId: user.showroomId } : {}),
  };
}

export function canAccessDealer(user = {}, dealerId) {
  return !user?.dealerId || user.dealerId === dealerId;
}

export function canAccessShowroom(user = {}, showroom) {
  if (!showroom || (user?.dealerId && showroom.dealerId !== user.dealerId)) return false;
  return !user?.showroomId || showroom.id === user.showroomId;
}

export async function getUserPermissionSet(user) {
  if (!user?.id && !user?.email) {
    return [];
  }

  const prisma = await getPrismaClient();
  if (!prisma) {
    return normalizePermissions(user?.permissions || []);
  }

  const dbUser = await prisma.user.findFirst({
    where: user?.id ? { id: user.id } : { email: user.email },
    include: {
      userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
    },
  });

  const permissions = [];

  for (const userRole of dbUser?.userRoles || []) {
    const roleName = userRole.role?.name;
    const rolePermissionList = rolePermissions[roleName] || [];
    permissions.push(...rolePermissionList);

    for (const rolePermission of userRole.role?.rolePermissions || []) {
      permissions.push(rolePermission.permission?.key);
    }
  }

  return normalizePermissions([...permissions, ...(user?.permissions || [])]);
}

export async function requirePermission(user, permission) {
  const permissions = await getUserPermissionSet(user);
  if (!hasPermission(permissions, permission)) {
    throw new Error(`Permission denied: ${permission}`);
  }
  return true;
}
