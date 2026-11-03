# PROJECT: EV DEALER MANAGEMENT ERP SAAS

Act as a Senior Full-Stack Software Architect, Senior Next.js Developer, Database Architect, UI/UX Designer, and Application Security Engineer.

Build a complete, modern, production-oriented EV Dealer Management ERP SaaS application inside my currently opened VS Code project.

IMPORTANT: Generate actual working source code and files in the project. Do not just provide explanations, examples, pseudocode, or partial snippets.

## 1. STRICT TECHNOLOGY REQUIREMENTS

Use the following technology stack:

- Next.js with App Router
- JavaScript ONLY (NOT TypeScript)
- React
- Tailwind CSS
- Prisma ORM
- PostgreSQL through Prisma
- Axios for API requests where appropriate
- React Hook Form
- Zod for validation
- Zustand for state management
- TanStack React Query
- Lucide React for icons
- Recharts for analytics and charts
- Sonner for notifications
- bcrypt for password hashing
- Secure cookie-based authentication

Strict rules:
- Use .js and .jsx files only.
- Never create .ts or .tsx files.
- Use PostgreSQL for the database.
- Use Prisma with the PostgreSQL provider.
- Use JavaScript syntax throughout the frontend, backend, API routes, services, and utilities.

## 2. PROJECT OBJECTIVE

Create a complete EV Scooter Dealer Management ERP system.

The company manages:
- Approximately 300 dealers.
- Approximately 20 EV scooter models.
- Company warehouses and inventory.
- Dealer warehouses and inventory.
- Product sales and orders.
- Dealer payments and outstanding balances.
- Defective product returns.
- Vendors and purchasing.
- Employees, attendance, and payroll.
- Regional sales managers and performance.

The application must support multiple organizations (multi-tenant architecture), with strict organization-level data isolation.

## 3. APPLICATION DESIGN

Create a professional enterprise-level SaaS dashboard.

Design requirements:
- Modern, clean and professional UI.
- Responsive desktop, tablet, and mobile layouts.
- Collapsible sidebar.
- Top navigation bar.
- Breadcrumb navigation.
- Dashboard analytics cards.
- Tables with search, filters, sorting and pagination.
- Reusable forms and modal dialogs.
- Confirmation dialogs for destructive operations.
- Loading skeletons.
- Empty states.
- Error states.
- Toast notifications.
- Consistent spacing, typography, colors and components.
- Light and dark mode if practical.

Use reusable components instead of duplicating UI code.

## 4. USER AUTHENTICATION

Implement:
- Login.
- Logout.
- Secure password hashing using bcrypt.
- Session management.
- Protected dashboard routes.
- Forgot password workflow.
- User account management.
- Secure cookie settings.
- Server-side authentication verification.

Never store plaintext passwords or authentication tokens in localStorage.

## 5. ROLE-BASED AND ATTRIBUTE-BASED ACCESS CONTROL

Implement dynamic RBAC + ABAC.

Do not hardcode all permissions directly into components.

Create database-driven:
- Users.
- Roles.
- Permissions.
- User-role assignments.
- Role-permission assignments.
- User attributes.
- Organizational and regional assignments.

Required default roles:

1. Super Admin
2. General Manager
3. Finance Manager
4. Accounts Manager
5. Sales Manager
6. Dealer Manager
7. Showroom Staff
8. After-Sales Manager
9. Employee Manager
10. Regional Sales Manager
11. Purchase Manager
12. Warehouse Manager
13. Dealer User

Permission examples:
- dealers.create
- dealers.read
- dealers.update
- dealers.delete
- inventory.read
- inventory.update
- orders.create
- orders.approve
- payments.read
- payments.approve
- returns.create
- returns.approve
- employees.manage
- reports.view
- users.manage
- roles.manage

ABAC examples:
- A regional manager can only access assigned regions.
- A dealer can only access its own records.
- Finance can approve financial transactions but cannot approve sales orders.
- Sales can approve eligible return requests but cannot alter payment records.
- Employee managers can manage attendance but cannot assign administrative permissions.

Enforce access control on the server for every protected operation.

## 6. ERP MODULES

Build the following modules.

### A. Dashboard
- Total dealers.
- Total employees.
- Total products.
- Company inventory.
- Dealer inventory.
- Total sales.
- Total revenue.
- Pending orders.
- Pending requisitions.
- Outstanding dealer balances.
- Regional performance.
- Sales charts.
- Recent transactions.

### B. Dealer Management
- Add dealer.
- Edit dealer.
- View dealer details.
- Dealer registration number.
- Contact information.
- Address.
- Region.
- Assigned manager.
- Dealer status.
- Dealer payment history.
- Dealer inventory.
- Dealer sales reports.
- Dealer outstanding balance.

### C. Product Management
- Product categories.
- Scooter models.
- Product SKU.
- Product name.
- Description.
- Purchase price.
- Dealer price.
- Retail price.
- Product images.
- Product specifications.
- Active/inactive status.

### D. Inventory Management
- Company warehouses.
- Dealer warehouses.
- Stock quantities.
- Stock transfers.
- Stock adjustments.
- Stock movement history.
- Low-stock alerts.
- Defective stock.
- Inventory reports.

Use database transactions for stock-changing operations.

### E. Sales Management
- Dealer sales entry.
- Product selection.
- Quantity.
- Unit price.
- Discount.
- Total amount.
- Sales invoice.
- Sales history.
- Sales approval.
- Regional sales reports.

### F. Order Management
- Dealers create orders.
- Company reviews orders.
- Sales team approves or rejects orders.
- Finance verifies payment requirements.
- Warehouse processes approved orders.
- Order shipment tracking.
- Order status history.

### G. Finance Management
- Dealer payments.
- Payment receipts.
- Payment history.
- Outstanding balances.
- Credit limits.
- Payment verification.
- Payment approval.
- Financial statements.
- Transaction reports.

Use decimal database types for monetary amounts. Never use floating-point arithmetic for financial calculations.

### H. Accounts Management
- Accounts payable.
- Accounts receivable.
- Expense records.
- Income records.
- Financial ledger.
- Transaction history.
- Financial reports.

Keep accounts management separate from the finance approval workflow.

### I. Return and Defective Product Management

Dealers can submit defective scooter/product return requests.

Workflow:

1. Dealer creates a return request.
2. Dealer selects product and quantity.
3. Dealer provides defect description.
4. Dealer uploads supporting images/documents.
5. Sales team reviews the request.
6. Sales team approves or rejects it.
7. Finance verifies dealer payment history and outstanding balance.
8. Finance approves or rejects the financial clearance.
9. Approved returns are processed by warehouse.
10. Inventory is updated according to inspection outcome.
11. Return status and audit history are recorded.

### J. Purchasing and Vendor Management
- Vendor registration.
- Purchase requisitions.
- Purchase orders.
- Parts purchasing.
- Delivery charges.
- Product/parts amounts.
- Total requisition amount.
- Vendor payments.
- Defective parts returns.
- Purchase approval workflow.
- Goods receiving.

### K. Employee Management
- Employee profiles.
- Departments.
- Designations.
- Attendance.
- Leave management.
- Salary records.
- Employee payments.
- Employee status.
- Employee reports.

### L. Reports
- Dealer sales reports.
- Product sales reports.
- Inventory reports.
- Stock movement reports.
- Regional performance.
- Payment reports.
- Outstanding balance reports.
- Employee attendance reports.
- Financial reports.

### M. System Settings
- Organization settings.
- User management.
- Role management.
- Permission management.
- Departments.
- Regions.
- Warehouses.
- Audit logs.
- Application settings.

## 7. DATABASE ARCHITECTURE

Use Prisma ORM with PostgreSQL.

Configure schema.prisma:

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

Create properly related database models for:

- Organization
- User
- Role
- Permission
- UserRole
- RolePermission
- Region
- Department
- Employee
- Dealer
- DealerAssignment
- Product
- ProductCategory
- Warehouse
- Inventory
- StockMovement
- Sale
- SaleItem
- Order
- OrderItem
- Payment
- Account
- LedgerEntry
- ReturnRequest
- ReturnItem
- Vendor
- PurchaseRequisition
- PurchaseRequisitionItem
- PurchaseOrder
- Attendance
- LeaveRequest
- Salary
- Expense
- AuditLog
- Notification

Add appropriate:
- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Timestamps.
- Organization IDs.
- Status fields.
- Decimal fields for money.

Use appropriate cascading behavior. Never cascade-delete important financial or audit records.

Design the schema carefully before generating migrations.

## 8. POSTGRESQL DATABASE CONFIGURATION

Use a hosted or local PostgreSQL database. Create a database named:

ev_erp

Use the following environment variable format:

DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/ev_erp?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/ev_erp?schema=public"

Explain that credentials in the connection URL must be URL-encoded when they contain special characters.

Do not commit .env files to Git.

Generate:
- .env.example
- Prisma schema.
- Prisma client initialization.
- Database migration instructions.
- Database seed script.

Use Prisma migrations rather than manually editing the database schema.

## 9. PROJECT FOLDER STRUCTURE

Keep the project modular and organized.

Use a structure similar to:

src/
  app/
    (auth)/
    (dashboard)/
    api/
    layout.js
    page.js

  components/
    ui/
    layout/
    dashboard/
    forms/
    tables/

  features/
    auth/
    users/
    roles/
    dealers/
    employees/
    products/
    inventory/
    sales/
    orders/
    finance/
    accounts/
    returns/
    purchasing/
    vendors/
    reports/

  lib/
    prisma.js
    auth.js
    permissions.js
    validation.js
    utils.js

  services/
  hooks/
  store/
  config/

prisma/
  schema.prisma
  seed.js

public/
  images/

Use the appropriate files for each feature:
- components/
- schemas/
- services/
- hooks/
- constants/
- API routes.

Avoid placing all logic in page.js or route.js.

## 10. API ARCHITECTURE

Use Next.js Route Handlers.

Implement REST endpoints for each module.

Examples:

GET /api/dealers
POST /api/dealers
GET /api/dealers/[id]
PATCH /api/dealers/[id]
DELETE /api/dealers/[id]

GET /api/products
POST /api/products

GET /api/inventory
POST /api/inventory/adjustments

GET /api/orders
POST /api/orders
POST /api/orders/[id]/approve

GET /api/payments
POST /api/payments

GET /api/returns
POST /api/returns
POST /api/returns/[id]/approve

Every mutation must:
1. Authenticate the user.
2. Check authorization.
3. Verify organization and resource ownership.
4. Validate input on the server.
5. Enforce business rules.
6. Use transactions when necessary.
7. Handle errors properly.
8. Record important actions in audit logs.

Never trust frontend validation alone.

## 11. SECURITY REQUIREMENTS

Implement a security-first architecture.

Include:
- Secure authentication.
- Server-side permission checks.
- Organization-level data isolation.
- Input validation using Zod.
- SQL injection protection through Prisma.
- XSS prevention.
- CSRF protections where applicable.
- Rate limiting for authentication and sensitive endpoints.
- Secure HTTP-only cookies.
- Environment variable validation.
- Secure file uploads.
- Audit logging.
- Safe error responses.
- Prevention of unauthorized mass assignment.
- Database transaction handling.
- Protection against duplicate payment processing.
- Protection against unauthorized stock changes.

Never expose secrets, passwords, internal stack traces, or sensitive database details to the frontend.

## 12. SEED AND DEMO DATA

Create a Prisma seed script.

Generate realistic demo data:

- 1 organization.
- 13 default roles.
- Required permissions.
- 20 scooter models.
- 10 regions.
- 30 demo dealers initially, with support for generating 300.
- 5 warehouses.
- 20 employees.
- 10 vendors.
- Sample sales.
- Sample orders.
- Sample payments.
- Sample return requests.
- Sample inventory movements.

Create separate demo users for each role.

Use environment-configurable demo passwords and hash them before saving.

## 13. DEVELOPMENT QUALITY

Follow these standards:

- Clean code.
- Reusable components.
- Separation of concerns.
- Consistent naming conventions.
- No unnecessary duplication.
- Centralized validation.
- Centralized error handling.
- Consistent API response formats.
- Proper loading states.
- Proper empty states.
- Maintainable code.
- Accessible UI.
- Responsive layouts.

Write meaningful comments only when necessary.

## 14. TESTING AND SECURITY AUDIT

Add tests for critical business logic and API permissions.

Manually review every mutation with this checklist:

- Is the user authenticated?
- Is the user authorized?
- Is the organization correct?
- Is resource ownership verified?
- Is the input validated?
- Are business rules enforced?
- Are database transactions used correctly?
- Are duplicate operations prevented?
- Are errors handled safely?
- Are audit logs created?

Test unauthorized access between organizations.

Test dealer access restrictions.

Test role and permission restrictions.

Test payment approval and stock update workflows.

## 15. EXECUTION INSTRUCTIONS FOR THE AI AGENT

Work directly inside the VS Code project.

Follow this sequence:

PHASE 1:
Inspect the existing project and its package.json. Configure the Next.js JavaScript application.

PHASE 2:
Create the complete modular folder structure.

PHASE 3:
Configure Tailwind CSS, reusable UI components, layouts, sidebar, topbar, and dashboard.

PHASE 4:
Configure Prisma and PostgreSQL connectivity.

PHASE 5:
Design and implement the complete database schema.

PHASE 6:
Create migrations and seed/demo data.

PHASE 7:
Implement authentication and session management.

PHASE 8:
Implement RBAC and ABAC.

PHASE 9:
Implement ERP modules one by one.

PHASE 10:
Implement reports, analytics, and notifications.

PHASE 11:
Perform testing, security review, and code cleanup.

PHASE 12:
Prepare production deployment documentation.

IMPORTANT EXECUTION RULES:

- Do not generate the entire application as one giant file.
- Create actual files in their correct directories.
- Use JavaScript only.
- Do not leave TODO placeholders for core functionality.
- Do not create fake APIs that return hardcoded data for completed modules.
- Connect completed frontend modules to actual database-backed APIs.
- Keep the application runnable after each phase.
- Run npm install and relevant validation commands.
- Fix errors before moving to the next phase.
- Never overwrite existing working code without inspecting it first.
- If the implementation is too large for one execution, complete one phase at a time and maintain a checklist of completed and pending work.

At the end of each phase, provide:
1. Files created.
2. Files modified.
3. Features completed.
4. Commands to execute.
5. Any remaining issues.
6. Security checks performed.

FINAL GOAL:

Deliver a complete, modular, responsive EV Dealer Management ERP SaaS application built with Next.js JavaScript, Prisma ORM, and PostgreSQL, with working business workflows, secure authorization, clean code, seed data, and production-oriented architecture.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
