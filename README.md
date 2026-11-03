# EV Dealer Management ERP

EV ERP is a JavaScript-based dealer operations application for an electric-vehicle company. It combines an organization-aware ERP dashboard with dealer and showroom workflows, backed by PostgreSQL through Prisma.

> **Project status:** This repository is an actively developed application and demo, not a fully security-hardened production SaaS. Review the security and operational notes before exposing it to real users or data.

## Contents

- [Product overview](#product-overview)
- [Technology](#technology)
- [Application modules](#application-modules)
- [Roles and access](#roles-and-access)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [API overview](#api-overview)
- [Requirements and setup](#requirements-and-setup)
- [Demo data and accounts](#demo-data-and-accounts)
- [Database migrations](#database-migrations)
- [Commands and validation](#commands-and-validation)
- [Security and operational notes](#security-and-operational-notes)
- [License](#license)

## Product overview

The application supports company-side dealer operations and dealer-side showroom operations:

- Multiple organizations, dealers, regions, products, and warehouses.
- Company-to-dealer sales and orders, kept distinct from dealer-to-customer retail sales.
- Multiple showrooms per dealer, each with a dedicated stock warehouse.
- Dealer Admin access across all showrooms belonging to their assigned dealer.
- Showroom Staff access scoped to their assigned showroom.
- Inventory, transfers, adjustments, payments, returns, expenses, purchasing, employees, attendance, payroll, approvals, audit records, and reports.

Organization, dealer, showroom, and sale ownership is represented by Prisma relations and database constraints. API handlers also apply user permission and dealer/showroom scope checks.

## Technology

- **Runtime and UI:** Next.js 16 App Router, React 19, JavaScript, Tailwind CSS 4.
- **Database:** PostgreSQL (including hosted PostgreSQL services connected through Vercel).
- **Data access:** Prisma ORM and Prisma Client.
- **Forms and validation:** React Hook Form and Zod.
- **Client state/data:** TanStack React Query and Zustand.
- **UI utilities:** Lucide React, Recharts, Sonner, `clsx`, `tailwind-merge`, and class-variance-authority.
- **Requests and authentication:** Fetch-based browser API calls, bcryptjs password hashes, and HTTP-only cookie sessions.
- **Tests and lint:** Node.js built-in test runner and ESLint.

The application source is JavaScript; the repository uses `.js` and `.mjs` files rather than TypeScript source files.

## Application modules

### Dashboard

The dashboard combines organization activity, KPIs, sales charts, regional performance, and recent transactions. Available data depends on the signed-in user’s access scope.

### Dealers and regions

Manage dealer records and region assignments. Dealer data includes registration number, contacts, address, status, credit limit, and outstanding balance. Dealer detail views summarize relevant sales, inventory, and payments.

### Products and inventory

Products include SKU, category, purchase/dealer/retail prices, specifications, and active state. Inventory is tracked by warehouse and product, with reserved quantities and reorder levels. Inventory adjustments and stock transfers use transactional database updates.

### Sales, orders, and finance

- **Company sales** are invoices from the EV company to dealers.
- **Dealer orders** are submitted for company review and can be associated with a showroom.
- **Dealer payments** record receipts against dealer balances and update ledger accounts.
- **Showroom retail sales** are dealer-to-customer sales, with itemized receipts, stock decrement, and optional initial or later customer payments.

Amounts are stored using Prisma `Decimal` columns and API workflows use decimal/cents calculations where monetary arithmetic is required.

### Showroom management

Create and manage multiple showrooms for a dealer. Creating a showroom also creates its dedicated warehouse. The showroom portfolio and detail screens expose:

- Warehouse stock and retail SKU availability.
- Retail sale history, revenue, and customer receipts.
- Dealer orders and payment history attributed to the showroom.
- Return requests, staff accounts, employees, and showroom expenses.
- Stock transfers into showroom warehouses.

Dealer Admins manage the dealer’s locations and staff. Showroom Staff accounts are assigned one location. Showroom retail sales are a separate workflow from company-to-dealer invoicing.

### Returns

Dealers can submit product return requests with quantities and defect reasons. Users with approval permissions can review pending requests. Return records can be attributed to a showroom.

### Purchasing and vendors

Purchase requisitions, purchase orders, vendor records, and purchasing permissions are available as ERP modules.

### People operations

Employee records can be assigned a region and showroom. The application also includes attendance, leave, and salary/payroll screens and APIs.

### Accounts, reporting, and administration

The application includes ledger accounts and entries, reconciliation, reports, approvals, notifications, audit logs, user/role administration, and settings.

## Roles and access

Seeded default roles include:

- Super Admin
- General Manager
- Finance Manager
- Accounts Manager
- Sales Manager
- Dealer Manager
- Dealer Admin
- Showroom Staff
- After-Sales Manager
- Employee Manager
- Regional Sales Manager
- Purchase Manager
- Warehouse Manager
- Dealer User

Permissions are stored as role-permission records and are also resolved using the application’s permission map. Examples include `dealers.read`, `inventory.update`, `orders.approve`, `payments.approve`, `showrooms.manage`, `showrooms.staff.manage`, `showroom.sales.create`, `returns.create`, and `users.manage`.

Access is scoped using organization identity and, where applicable, dealer and showroom assignments. Dealer Admins have dealer-wide showroom access. Showroom Staff have a dealer and a single showroom assignment. API handlers are responsible for authorization; hiding a UI control is not an authorization boundary.

## Project structure

```text
prisma/
  migrations/                 PostgreSQL SQL migration history
  migrations-mysql-legacy/    Archived MySQL migrations; not used by Prisma
  schema.prisma               PostgreSQL data model and relations
  seed.js                     Demo organizations, roles, users, and records
src/
  app/
    (auth)/                   Login and password reset screens
    (dashboard)/              ERP dashboard screens
    api/                      Next.js Route Handler APIs
    globals.css
    layout.js
  components/
    dashboard/                KPI and chart components
    layout/                   Sidebar, topbar, and application shell
    providers/                React Query provider
    ui/                       Reusable buttons, cards, tables, inputs, badges
  features/                   Feature exports and shared feature modules
  lib/                        Prisma, auth, permissions, validation, audit, utilities
  services/                   Client-side service helpers
  store/                      Zustand stores
tests/                        Node.js tests
```

## Data model

The Prisma schema is the source of truth. It includes:

- **Tenancy and identity:** `Organization`, `User`, `Role`, `Permission`, `UserRole`, `RolePermission`.
- **Company and dealer structure:** `Region`, `Department`, `Employee`, `Dealer`, `DealerAssignment`, `Showroom`.
- **Catalog and stock:** `ProductCategory`, `Product`, `Warehouse`, `Inventory`, `StockMovement`, `StockTransfer`.
- **Sales and fulfillment:** `Sale`, `SaleItem`, `Order`, `OrderItem`, `ApprovalRequest`.
- **Payments and accounting:** `Payment`, `Account`, `LedgerEntry`, `Expense`.
- **Returns and procurement:** `ReturnRequest`, `ReturnItem`, `Vendor`, `PurchaseRequisition`, `PurchaseRequisitionItem`, `PurchaseOrder`.
- **People operations:** `Attendance`, `LeaveRequest`, `Salary`.
- **Showroom retail:** `ShowroomSale`, `ShowroomSaleItem`, `ShowroomPayment`.
- **Administration:** `AuditLog`, `Notification`.

Composite unique keys and foreign keys enforce important tenant relationships—for example, a user’s showroom must belong to their assigned dealer and organization, and a showroom payment must reference a sale from the same dealer, showroom, and organization. Financial and audit relations use restrictive delete behavior where appropriate.

## API overview

All routes are Next.js App Router handlers under `src/app/api`. Protected routes use the session cookie and permission checks.

| Area | Endpoint(s) | Main operations |
|---|---|---|
| Health | `/api/health` | `GET` health check |
| Authentication | `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/forgot-password` | Login, logout, current user, password reset |
| Dashboard | `/api/dashboard/summary` | Summary metrics |
| Dealers | `/api/dealers`, `/api/dealers/[id]` | List/create dealers, dealer detail |
| Products | `/api/products`, `/api/products/[id]` | List/create and get/update/delete products |
| Inventory | `/api/inventory`, `/api/inventory/adjustments`, `/api/inventory/transfers` | Stock views, adjustments, transfers |
| Sales and orders | `/api/sales`, `/api/orders` | List/create company sales and dealer orders |
| Finance | `/api/finance`, `/api/reconciliation`, `/api/accounts` | Payments, reconciliation, accounts |
| Returns | `/api/returns` | List, submit, and review returns |
| Showrooms | `/api/showrooms`, `/api/showrooms/[id]` | List/create showrooms, showroom detail/status |
| Showroom activity | `/api/showrooms/[id]/sales`, `/api/showrooms/[id]/payments`, `/api/showrooms/[id]/expenses` | Record retail sales, customer payments, and expenses |
| People | `/api/employees`, `/api/attendance`, `/api/payroll` | Employees, attendance, payroll |
| Procurement | `/api/vendors`, `/api/purchases` | Vendors and purchasing workflows |
| Administration | `/api/users`, `/api/roles`, `/api/settings`, `/api/audit`, `/api/notifications`, `/api/approvals`, `/api/reports` | Access control, settings, audit, alerts, approvals, and reporting |

For exact request and response shapes, see the corresponding `route.js` handler and UI caller.

## Requirements and setup

### Requirements

- Node.js supported by the installed Next.js version (Node.js 20.9 or later recommended).
- npm.
- A PostgreSQL database, hosted or running locally.

### 1. Install packages

```powershell
npm install
```

### 2. Create and configure `.env`

In PowerShell:

```powershell
Copy-Item .env.example .env
```

Create a PostgreSQL database named `ev_erp` using your provider's dashboard or a PostgreSQL client:

```sql
CREATE DATABASE ev_erp;
```

Set both connection URLs in `.env`. Use a pooled PostgreSQL URL for application requests and a direct, non-pooled PostgreSQL URL for Prisma migrations. For local PostgreSQL, both can use the same connection:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/ev_erp?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/ev_erp?schema=public"
```

URL-encode special characters in the username or password. In Vercel, assign the pooled integration URL to the exact variable name `DATABASE_URL` and its direct/non-pooled URL to `DIRECT_URL`, for each deployment environment. Do not use MySQL URLs with this PostgreSQL schema.

Other environment variables in `.env.example`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL pooled connection used by the app (required) |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migrations (required) |
| `NEXTAUTH_SECRET` | Secret placeholder for deployment configuration; review actual session implementation before production |
| `NEXT_PUBLIC_APP_NAME` | Application display name |
| `NEXT_PUBLIC_APP_URL` | Public base URL |
| `SESSION_COOKIE_NAME` | Session cookie name; current auth code uses `ev_session` |
| `DEMO_ADMIN_EMAIL` | Seeded primary admin email override |
| `DEMO_ADMIN_PASSWORD` | Seeded primary admin password override |
| `DEMO_COUNTRY` | Demo environment setting |

Do not commit `.env`. Environment files are ignored by `.gitignore`, except the safe-to-share `.env.example` template.

### 3. Apply migrations, generate the client, and seed

For a fresh local database:

```powershell
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

`migrate deploy` applies the checked-in PostgreSQL migration history; the seed adds demo data. The seed can be rerun to reapply baseline data, but it resets demo account passwords to the configured seed values.

### Vercel deployment

The checked-in `vercel.json` runs `npm run vercel-build`. That command applies pending PostgreSQL migrations with `prisma migrate deploy`, generates Prisma Client, and then builds the Next.js app. Configure these Vercel environment variables for every environment you deploy:

| Variable | Value |
|---|---|
| `DATABASE_URL` | The provider's pooled PostgreSQL connection URL, used by the running app |
| `DIRECT_URL` | The provider's direct, non-pooled PostgreSQL connection URL, used by Prisma migrations |

Use the PostgreSQL integration values, not variables containing `POSTGRES_URL` unless they actually contain the PostgreSQL URL and are assigned to the exact names above. Set separate Preview and Production database URLs (or disable Preview deployments) so a Preview build cannot apply migrations to the Production database. The PostgreSQL database itself must already exist; Prisma migrations create its tables and constraints. The Vercel build does **not** run the seed script, to avoid creating or resetting demo accounts in production.

### 4. Start the application

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo data and accounts

The seed creates two organizations and their sample ERP records. It creates demo regions, dealers, products, company stock, roles, permissions, and Pakistan showroom inventory.

Primary account (password can be overridden with `DEMO_ADMIN_PASSWORD`):

| Email | Default password | Role |
|---|---|---|
| `admin@evdealer.com` | `Admin@1234` | Super Admin |

Pakistan organization accounts:

| Email | Default password | Role |
|---|---|---|
| `hamza.khan@pakistan-ev.com` | `PakAdmin@123` | Super Admin |
| `sana.malik@pakistan-ev.com` | `PakSales@123` | Sales Manager |
| `bilal.ahmed@pakistan-ev.com` | `PakFinance@123` | Finance Manager |
| `usman.tariq@pakistan-ev.com` | `PakDealer@123` | Dealer Admin |

The Pakistan Dealer Admin is assigned to dealer `PAK-1001` and can manage its Karachi City Centre and Karachi Clifton showrooms. These credentials are for local development only. Change or disable them before sharing the environment or using real data.

## Database migrations

Migration directories are timestamped and applied in order. The active `prisma/migrations/` history is PostgreSQL-specific. The earlier MySQL migration files are retained in `prisma/migrations-mysql-legacy/` for reference only; Prisma does not apply them. PostgreSQL is being introduced with a fresh database, so apply the initial PostgreSQL migration to an empty database and then seed it. Existing MySQL records are not automatically transferred.

For local schema development, edit `prisma/schema.prisma`, then create and apply a named migration:

```powershell
npx prisma migrate dev --name describe_the_change
npx prisma generate
```

Check migration state:

```powershell
npx prisma migrate status
```

For deployed environments, apply checked-in migrations with `npx prisma migrate deploy` or `npm run prisma:deploy`; do not use `migrate dev` against production. Avoid editing an already-applied migration. If Prisma Client regeneration fails on Windows because the query-engine DLL is locked, stop the project’s Next.js process, regenerate the client, then restart the app.

## Commands and validation

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Create the optimized production build |
| `npm run vercel-build` | Apply PostgreSQL migrations, generate Prisma Client, and build for Vercel |
| `npm start` | Start the production server after building |
| `npm run lint` | Run ESLint across the repository |
| `npm test` | Run Node.js tests under `tests/` |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:deploy` | Apply checked-in migrations to the configured database |
| `npm run prisma:seed` | Seed demo data |
| `npx prisma validate` | Validate Prisma schema |
| `npx prisma migrate status` | Check migration state |

Use `npx prisma migrate dev --name describe_the_change` when creating a new migration during local development. The deployment script applies existing migrations only.

## Security and operational notes

- Passwords are hashed using bcryptjs. The authentication routes use an HTTP-only cookie with `sameSite=lax`; production cookie `secure` behavior depends on `NODE_ENV`.
- The current demo session is a serialized cookie and should not be treated as a finished production identity/session system. Before production, implement and review signed or opaque server-side sessions, CSRF protections, session rotation/revocation, and deployment secrets.
- Login and password-reset throttling use an in-memory process-local store. This is not shared across instances and is not a substitute for distributed rate limiting.
- Password reset currently stores a reset token in user attributes. It does not send an email; in non-production mode the API returns the token for local development.
- Do not use the committed/demo credentials for real data. Set unique secrets and passwords and restrict access to the demo seed accounts.
- Configure HTTPS, backups, database least-privilege access, logging/monitoring, and an appropriate secret-management mechanism before deployment.
- The seed includes example organizations and business records; inspect `prisma/seed.js` before running it against a database containing important data.

## License

This project is licensed under the [MIT License](./LICENSE).
