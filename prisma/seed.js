const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { runSeedOnce } = require('./seed-once');

const prisma = new PrismaClient();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required before running Prisma seed data.');
}

async function createNotificationsIfMissing(db, notifications) {
  for (const notification of notifications) {
    const existing = await db.notification.findFirst({
      where: {
        organizationId: notification.organizationId,
        userId: notification.userId,
        title: notification.title,
        body: notification.body,
      },
      select: { id: true },
    });

    if (!existing) {
      await db.notification.create({ data: notification });
    }
  }
}

async function seedDemoData(db) {
  const roles = [
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

  const permissions = [
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

  const rolePermissionMap = {
    'Super Admin': permissions,
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

  const org = await db.organization.upsert({
    where: { slug: 'ev-dealer-group' },
    update: {},
    create: {
      name: 'EV Dealer Group',
      slug: 'ev-dealer-group',
      status: 'active',
      settings: { theme: 'dark' },
    },
  });

  for (const roleName of roles) {
    const role = await db.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, description: `${roleName} access role` },
    });

    const keys = rolePermissionMap[roleName] || [];
    for (const permissionKey of keys) {
      const permission = await db.permission.upsert({
        where: { key: permissionKey },
        update: {},
        create: { key: permissionKey, description: permissionKey },
      });

      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permission.id },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  for (const permissionKey of permissions) {
    await db.permission.upsert({
      where: { key: permissionKey },
      update: {},
      create: { key: permissionKey, description: permissionKey },
    });
  }

  const demoUsers = [
    { name: 'Aisha Rahman', email: process.env.DEMO_ADMIN_EMAIL || 'admin@evdealer.com', password: process.env.DEMO_ADMIN_PASSWORD || 'Admin@1234', role: 'Super Admin', region: 'all' },
    { name: 'Rakesh Nair', email: 'gm@evdealer.com', password: 'Gm@1234', role: 'General Manager', region: 'all' },
    { name: 'Deepa Menon', email: 'finance@evdealer.com', password: 'Finance@1234', role: 'Finance Manager', region: 'all' },
    { name: 'Kabir Sethi', email: 'sales@evdealer.com', password: 'Sales@1234', role: 'Sales Manager', region: 'NORTH' },
    { name: 'Nimisha Shah', email: 'dealer@evdealer.com', password: 'Dealer@1234', role: 'Dealer Manager', region: 'WEST' },
    { name: 'Varun Das', email: 'warehouse@evdealer.com', password: 'Warehouse@1234', role: 'Warehouse Manager', region: 'EAST' },
    { name: 'Leena Bose', email: 'purchase@evdealer.com', password: 'Purchase@1234', role: 'Purchase Manager', region: 'SOUTH' },
    { name: 'Ishaan Verma', email: 'dealeruser@evdealer.com', password: 'DealerUser@1234', role: 'Dealer User', region: 'NORTH' },
  ];

  for (const demoUser of demoUsers) {
    const passwordHash = await bcrypt.hash(demoUser.password, 10);
    const user = await db.user.upsert({
      where: { organizationId_email: { organizationId: org.id, email: demoUser.email } },
      update: {
        name: demoUser.name,
        passwordHash,
        isActive: true,
        attributes: { region: demoUser.region },
      },
      create: {
        organizationId: org.id,
        email: demoUser.email,
        name: demoUser.name,
        passwordHash,
        isActive: true,
        attributes: { region: demoUser.region },
      },
    });

    const role = await db.role.findUnique({ where: { name: demoUser.role } });
    if (role) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
  }

  const primaryAdmin = await db.user.findFirst({
    where: { organizationId: org.id, email: process.env.DEMO_ADMIN_EMAIL || 'admin@evdealer.com' },
  });

  if (primaryAdmin) {
    await createNotificationsIfMissing(db, [
      {
        organizationId: org.id,
        userId: primaryAdmin.id,
        title: 'Inventory alert',
        body: 'Three warehouse SKUs are below their reorder threshold and require review.',
        readAt: null,
      },
      {
        organizationId: org.id,
        userId: primaryAdmin.id,
        title: 'Order approval pending',
        body: 'A sales order from the North region is waiting for finance clearance.',
        readAt: null,
      },
      {
        organizationId: org.id,
        userId: primaryAdmin.id,
        title: 'Dealer payment reminder',
        body: 'Dealer balance reconciliation has been posted for the last 7 days.',
        readAt: null,
      },
    ]);
  }

  const pakistanOrg = await db.organization.upsert({
    where: { slug: 'pakistan-ev-dealer-group' },
    update: {
      settings: { country: 'Pakistan', theme: 'dark' },
    },
    create: {
      name: 'Pakistan EV Dealer Group',
      slug: 'pakistan-ev-dealer-group',
      status: 'active',
      settings: { country: 'Pakistan', theme: 'dark' },
    },
  });

  const pakistanUsers = [
    { name: 'Hamza Khan', email: 'hamza.khan@pakistan-ev.com', password: 'PakAdmin@123', role: 'Super Admin', region: 'KHI' },
    { name: 'Sana Malik', email: 'sana.malik@pakistan-ev.com', password: 'PakSales@123', role: 'Sales Manager', region: 'LHR' },
    { name: 'Bilal Ahmed', email: 'bilal.ahmed@pakistan-ev.com', password: 'PakFinance@123', role: 'Finance Manager', region: 'ISB' },
    { name: 'Usman Tariq', email: 'usman.tariq@pakistan-ev.com', password: 'PakDealer@123', role: 'Dealer Admin', region: 'KHI' },
  ];

  for (const pakistanUser of pakistanUsers) {
    const passwordHash = await bcrypt.hash(pakistanUser.password, 10);
    const user = await db.user.upsert({
      where: { organizationId_email: { organizationId: pakistanOrg.id, email: pakistanUser.email } },
      update: {
        name: pakistanUser.name,
        passwordHash,
        isActive: true,
        attributes: { region: pakistanUser.region, country: 'Pakistan' },
      },
      create: {
        organizationId: pakistanOrg.id,
        email: pakistanUser.email,
        name: pakistanUser.name,
        passwordHash,
        isActive: true,
        attributes: { region: pakistanUser.region, country: 'Pakistan' },
      },
    });

    const role = await db.role.findUnique({ where: { name: pakistanUser.role } });
    if (role) {
      await db.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: role.id } },
        update: {},
        create: { userId: user.id, roleId: role.id },
      });
    }
  }

  const pakistanAdmin = await db.user.findFirst({
    where: { organizationId: pakistanOrg.id, email: 'hamza.khan@pakistan-ev.com' },
  });

  if (pakistanAdmin) {
    await createNotificationsIfMissing(db, [
      {
        organizationId: pakistanOrg.id,
        userId: pakistanAdmin.id,
        title: 'Pakistan operations summary',
        body: 'New Lahore region dealer registrations are ready for verification.',
        readAt: null,
      },
      {
        organizationId: pakistanOrg.id,
        userId: pakistanAdmin.id,
        title: 'Return review',
        body: 'A defective scooter return request has been escalated to finance.',
        readAt: null,
      },
    ]);
  }

  const pakistanRegions = [
    { name: 'Karachi', code: 'KHI' },
    { name: 'Lahore', code: 'LHR' },
    { name: 'Islamabad', code: 'ISB' },
    { name: 'Multan', code: 'MUX' },
  ];

  const createdPakistanRegions = [];
  for (const region of pakistanRegions) {
    const result = await db.region.upsert({
      where: { organizationId_code: { organizationId: pakistanOrg.id, code: region.code } },
      update: {},
      create: {
        organizationId: pakistanOrg.id,
        name: region.name,
        code: region.code,
      },
    });
    createdPakistanRegions.push(result);
  }

  const pakistanDealers = [
    { registrationNumber: 'PAK-1001', name: 'Karachi Green Mobility', contactPerson: 'Abdul Rehman', contactEmail: 'abdul@karachigreenmobility.pk', phone: '+92 300 1112233', address: 'Karachi, Sindh', status: 'active', creditLimit: 450000, outstandingBalance: 12000, regionCode: 'KHI' },
    { registrationNumber: 'PAK-1002', name: 'Lahore EV Hub', contactPerson: 'Maryam Ali', contactEmail: 'maryam@lahoreevhub.pk', phone: '+92 321 3344556', address: 'Lahore, Punjab', status: 'active', creditLimit: 400000, outstandingBalance: 18000, regionCode: 'LHR' },
    { registrationNumber: 'PAK-1003', name: 'Islamabad Metro Electric', contactPerson: 'Omer Siddique', contactEmail: 'omer@islamabadmetro.pk', phone: '+92 333 6677889', address: 'Islamabad, ICT', status: 'pending', creditLimit: 300000, outstandingBalance: 45000, regionCode: 'ISB' },
  ];

  for (const dealer of pakistanDealers) {
    const region = createdPakistanRegions.find((entry) => entry.code === dealer.regionCode);
    await db.dealer.upsert({
      where: { registrationNumber: dealer.registrationNumber },
      update: {},
      create: {
        organizationId: pakistanOrg.id,
        regionId: region?.id,
        registrationNumber: dealer.registrationNumber,
        name: dealer.name,
        contactPerson: dealer.contactPerson,
        contactEmail: dealer.contactEmail,
        phone: dealer.phone,
        address: dealer.address,
        status: dealer.status,
        creditLimit: dealer.creditLimit,
        outstandingBalance: dealer.outstandingBalance,
      },
    });
  }

  const karachiDealer = await db.dealer.findUnique({ where: { registrationNumber: 'PAK-1001' } });
  const pakistanDealerAdmin = await db.user.findUnique({
    where: { organizationId_email: { organizationId: pakistanOrg.id, email: 'usman.tariq@pakistan-ev.com' } },
  });
  if (karachiDealer && pakistanDealerAdmin) {
    await db.user.update({
      where: { id: pakistanDealerAdmin.id },
      data: { dealerId: karachiDealer.id, showroomId: null },
    });
    const dealerAdminRole = await db.role.findUnique({ where: { name: 'Dealer Admin' } });
    if (dealerAdminRole) {
      await db.userRole.deleteMany({ where: { userId: pakistanDealerAdmin.id } });
      await db.userRole.create({ data: { userId: pakistanDealerAdmin.id, roleId: dealerAdminRole.id } });
    }

    for (const showroom of [
      { name: 'Karachi City Centre', code: 'KHI-CENTRAL', address: 'Saddar, Karachi' },
      { name: 'Karachi Clifton', code: 'KHI-CLIFTON', address: 'Clifton, Karachi' },
    ]) {
      const location = await db.showroom.upsert({
        where: { dealerId_code: { dealerId: karachiDealer.id, code: showroom.code } },
        update: { name: showroom.name, address: showroom.address, status: 'active' },
        create: {
          organizationId: pakistanOrg.id,
          dealerId: karachiDealer.id,
          name: showroom.name,
          code: showroom.code,
          address: showroom.address,
          warehouse: {
            create: {
              organizationId: pakistanOrg.id,
              name: `${showroom.name} stock`,
              code: `SR-PAK-${showroom.code}`,
              location: showroom.address,
              type: 'showroom',
            },
          },
        },
        include: { warehouse: true },
      });
      if (!location.warehouse) {
        await db.warehouse.create({
          data: {
            organizationId: pakistanOrg.id,
            showroomId: location.id,
            name: `${showroom.name} stock`,
            code: `SR-PAK-${showroom.code}`,
            location: showroom.address,
            type: 'showroom',
          },
        });
      }
    }
  }

  const regions = [
    { name: 'North', code: 'NORTH' },
    { name: 'South', code: 'SOUTH' },
    { name: 'East', code: 'EAST' },
    { name: 'West', code: 'WEST' },
  ];

  const createdRegions = [];
  for (const region of regions) {
    const result = await db.region.upsert({
      where: { organizationId_code: { organizationId: org.id, code: region.code } },
      update: {},
      create: {
        organizationId: org.id,
        name: region.name,
        code: region.code,
      },
    });
    createdRegions.push(result);
  }

  const initialDealers = [
    { registrationNumber: 'REG-1001', name: 'GreenVolt Jaipur', contactPerson: 'Amit Singh', contactEmail: 'amit@greenvolt.com', phone: '+91 9876543210', address: 'Jaipur, Rajasthan', status: 'active', creditLimit: 250000, outstandingBalance: 15000, regionCode: 'NORTH' },
    { registrationNumber: 'REG-1002', name: 'EcoRide Lucknow', contactPerson: 'Pooja Verma', contactEmail: 'pooja@ecoride.com', phone: '+91 9988776655', address: 'Lucknow, Uttar Pradesh', status: 'active', creditLimit: 230000, outstandingBalance: 22000, regionCode: 'NORTH' },
    { registrationNumber: 'REG-1003', name: 'Metro EV Pune', contactPerson: 'Rohan Kulkarni', contactEmail: 'rohan@metroelectric.com', phone: '+91 9155667788', address: 'Pune, Maharashtra', status: 'pending', creditLimit: 180000, outstandingBalance: 60000, regionCode: 'WEST' },
  ];

  for (const dealer of initialDealers) {
    const region = createdRegions.find((entry) => entry.code === dealer.regionCode);
    await db.dealer.upsert({
      where: { registrationNumber: dealer.registrationNumber },
      update: {},
      create: {
        organizationId: org.id,
        regionId: region?.id,
        registrationNumber: dealer.registrationNumber,
        name: dealer.name,
        contactPerson: dealer.contactPerson,
        contactEmail: dealer.contactEmail,
        phone: dealer.phone,
        address: dealer.address,
        status: dealer.status,
        creditLimit: dealer.creditLimit,
        outstandingBalance: dealer.outstandingBalance,
      },
    });
  }

  const products = [
    { sku: 'EV-CTX-001', name: 'CityFlow X1', purchasePrice: 12000, dealerPrice: 14400, retailPrice: 16800 },
    { sku: 'EV-CTX-002', name: 'Volt Sprint', purchasePrice: 13500, dealerPrice: 16000, retailPrice: 18900 },
    { sku: 'EV-CTX-003', name: 'EcoMax Pro', purchasePrice: 14500, dealerPrice: 17500, retailPrice: 21400 },
    { sku: 'EV-CTX-004', name: 'AeroRide Mini', purchasePrice: 11000, dealerPrice: 13400, retailPrice: 15600 },
  ];

  for (const product of products) {
    await db.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        organizationId: org.id,
        sku: product.sku,
        name: product.name,
        description: `${product.name} EV scooter`,
        purchasePrice: product.purchasePrice,
        dealerPrice: product.dealerPrice,
        retailPrice: product.retailPrice,
        isActive: true,
      },
    });
  }

  const pakistanProducts = [
    { sku: 'PAK-EV-CTX-001', name: 'CityFlow X1', purchasePrice: 420000, dealerPrice: 465000, retailPrice: 499000 },
    { sku: 'PAK-EV-CTX-002', name: 'Volt Sprint', purchasePrice: 455000, dealerPrice: 505000, retailPrice: 545000 },
    { sku: 'PAK-EV-CTX-003', name: 'EcoMax Pro', purchasePrice: 485000, dealerPrice: 535000, retailPrice: 579000 },
  ];
  for (const product of pakistanProducts) {
    await db.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: {
        organizationId: pakistanOrg.id,
        sku: product.sku,
        name: product.name,
        description: `${product.name} electric scooter`,
        purchasePrice: product.purchasePrice,
        dealerPrice: product.dealerPrice,
        retailPrice: product.retailPrice,
        isActive: true,
      },
    });
  }
  if (karachiDealer) {
    const pakistanShowrooms = await db.showroom.findMany({
      where: { organizationId: pakistanOrg.id, dealerId: karachiDealer.id },
      include: { warehouse: true },
    });
    const localProducts = await db.product.findMany({ where: { organizationId: pakistanOrg.id, isActive: true } });
    for (const showroom of pakistanShowrooms) {
      if (!showroom.warehouse) continue;
      for (const [index, product] of localProducts.entries()) {
        await db.inventory.upsert({
          where: { productId_warehouseId: { productId: product.id, warehouseId: showroom.warehouse.id } },
          update: {},
          create: {
            organizationId: pakistanOrg.id,
            productId: product.id,
            warehouseId: showroom.warehouse.id,
            quantity: 8 + index * 2,
            reservedStock: 0,
            reorderLevel: 3,
          },
        });
      }
    }
  }

  const departments = ['Operations', 'Sales', 'Finance', 'Warehouse'];
  for (const departmentName of departments) {
    await db.department.upsert({
      where: { id: departmentName },
      update: {},
      create: {
        id: departmentName,
        name: departmentName,
        description: `${departmentName} team`,
      },
    });
  }

  const employees = [
    { employeeCode: 'EMP-1001', firstName: 'Amit', lastName: 'Singh', email: 'amit@evdealer.com', designation: 'Regional Manager', departmentName: 'Operations', regionCode: 'NORTH', baseSalary: 76000 },
    { employeeCode: 'EMP-1002', firstName: 'Riya', lastName: 'Sharma', email: 'riya@evdealer.com', designation: 'Sales Executive', departmentName: 'Sales', regionCode: 'NORTH', baseSalary: 52000 },
    { employeeCode: 'EMP-1003', firstName: 'Farhan', lastName: 'Ali', email: 'farhan@evdealer.com', designation: 'Warehouse Supervisor', departmentName: 'Warehouse', regionCode: 'WEST', baseSalary: 61000 },
    { employeeCode: 'EMP-1004', firstName: 'Meera', lastName: 'Nair', email: 'meera@evdealer.com', designation: 'Finance Analyst', departmentName: 'Finance', regionCode: 'SOUTH', baseSalary: 69000 },
  ];

  for (const employee of employees) {
    const department = await db.department.findFirst({ where: { name: employee.departmentName } });
    const region = createdRegions.find((entry) => entry.code === employee.regionCode);
    await db.employee.upsert({
      where: { employeeCode: employee.employeeCode },
      update: {},
      create: {
        organizationId: org.id,
        departmentId: department?.id,
        regionId: region?.id,
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        designation: employee.designation,
        status: 'active',
        baseSalary: employee.baseSalary,
      },
    });
  }

  const vendors = [
    { name: 'Nova Battery Labs', contactName: 'Aisha Khanna', phone: '+91 9822011222', email: 'sales@novabattery.in', status: 'active' },
    { name: 'Torque Components', contactName: 'Gautam Shah', phone: '+91 9911002233', email: 'info@torquecomponents.in', status: 'active' },
    { name: 'GreenCharge Systems', contactName: 'Maya Iyer', phone: '+91 9876540099', email: 'support@greencharge.in', status: 'active' },
  ];

  for (const vendor of vendors) {
    await db.vendor.upsert({
      where: { id: vendor.name },
      update: {},
      create: {
        id: vendor.name,
        organizationId: org.id,
        name: vendor.name,
        contactName: vendor.contactName,
        phone: vendor.phone,
        email: vendor.email,
        status: vendor.status,
      },
    });
  }

  const employeeList = await db.employee.findMany({ where: { organizationId: org.id } });
  for (const [index, employee] of employeeList.entries()) {
    await db.attendance.upsert({
      where: { id: `attendance-${employee.id}` },
      update: {},
      create: {
        id: `attendance-${employee.id}`,
        employeeId: employee.id,
        date: new Date(Date.now() - index * 86400000),
        status: index % 2 === 0 ? 'present' : 'late',
      },
    });

    await db.salary.upsert({
      where: { id: `salary-${employee.id}` },
      update: {},
      create: {
        id: `salary-${employee.id}`,
        employeeId: employee.id,
        month: '2026-10',
        amount: Number(employee.baseSalary || 50000),
        paidAt: new Date(),
      },
    });
  }

  const warehouse = await db.warehouse.upsert({
    where: { code: 'WH-CENTRAL' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'Central Warehouse',
      code: 'WH-CENTRAL',
      location: 'Jaipur',
      type: 'company',
    },
  });

  const northHub = await db.warehouse.upsert({
    where: { code: 'WH-NORTH' },
    update: {},
    create: {
      organizationId: org.id,
      name: 'North Hub',
      code: 'WH-NORTH',
      location: 'Delhi',
      type: 'dealer-support',
    },
  });

  const productList = await db.product.findMany({ where: { organizationId: org.id } });
  for (const [index, item] of productList.entries()) {
    await db.inventory.upsert({
      where: { productId_warehouseId: { productId: item.id, warehouseId: warehouse.id } },
      update: {},
      create: {
        organizationId: org.id,
        productId: item.id,
        warehouseId: warehouse.id,
        quantity: 120 + index * 20,
        reservedStock: 10,
        reorderLevel: 30,
      },
    });

    await db.inventory.upsert({
      where: { productId_warehouseId: { productId: item.id, warehouseId: northHub.id } },
      update: {},
      create: {
        organizationId: org.id,
        productId: item.id,
        warehouseId: northHub.id,
        quantity: 40 + index * 10,
        reservedStock: 5,
        reorderLevel: 20,
      },
    });
  }

  const sampleProduct = productList[0];
  if (sampleProduct) {
    await db.stockTransfer.upsert({
      where: { referenceNo: 'TR-INIT-001' },
      update: {},
      create: {
        organizationId: org.id,
        productId: sampleProduct.id,
        fromWarehouseId: warehouse.id,
        toWarehouseId: northHub.id,
        quantity: 18,
        referenceNo: 'TR-INIT-001',
        status: 'approved',
        notes: 'Initial warehouse balancing transfer.',
        approvedAt: new Date(),
        approvedBy: 'Operations Lead',
      },
    });
  }
}

runSeedOnce(prisma, seedDemoData)
  .then((seeded) => {
    if (!seeded) {
      console.log('Demo data has already been seeded; skipping.');
      return;
    }

    console.log(JSON.stringify({
      message: 'Seed complete',
      organizations: ['ev-dealer-group', 'pakistan-ev-dealer-group'],
      demoAccounts: [
        process.env.DEMO_ADMIN_EMAIL || 'admin@evdealer.com',
        'hamza.khan@pakistan-ev.com',
        'sana.malik@pakistan-ev.com',
        'bilal.ahmed@pakistan-ev.com',
        'usman.tariq@pakistan-ev.com',
      ],
    }, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
