# AI.md — Project Intelligence Brief

## What Is This Project?

A **multi-shop retail ERP system** built as a single-page React application. It manages products, inventory, sales (POS), clients, users with role-based access, stock transfers between shops, a loyalty rewards program, and a comprehensive reporting engine. All data is stored **client-side in localStorage** using an in-memory database pattern — there is no backend server or external database.

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3 + shadcn/ui components |
| Routing | React Router DOM 6 |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| State | React Context (Auth) + direct module-level in-memory DB |
| Storage | localStorage (JSON serialization) |
| Testing | Vitest + Testing Library |

---

## Architecture Overview

### Data Flow

```
data.json (seed data)
    ↓
loadDatabase() → localStorage cache → in-memory `database` object
    ↓
CRUD functions in src/lib/database.ts mutate in-memory + persist to localStorage
    ↓
Components call database functions directly (no API layer)
```

### Key Architectural Decisions

1. **No backend** — Everything runs in the browser. Auth is simulated (plaintext passwords in JSON).
2. **Module-level singleton DB** — `src/lib/database.ts` exports CRUD functions that mutate a single `database` object.
3. **Audit logging** — Every create/update/delete is logged with field-level diffs via `src/lib/auditLog.ts`.
4. **Role-based access** — 4 roles: `super_admin`, `manager`, `shop_manager`, `app_user`. Permissions are granular and shop-scoped.
5. **Reusable UI patterns** — `ReusableForm`, `ModalForm`, `DataView`, `ExportMenu`, `StatusBadge` provide consistent CRUD interfaces.

### File Structure

```
src/
├── components/
│   ├── common/        # ExportMenu, StatusBadge, ThemeToggle
│   ├── dashboard/     # StatCard
│   ├── data/          # DataView (reusable table/grid)
│   ├── forms/         # ModalForm, ReusableForm
│   ├── layout/        # AppLayout, AppSidebar, PageLayout
│   └── ui/            # shadcn/ui primitives
├── data/
│   └── data.json      # Seed data for all entities
├── hooks/             # use-mobile, use-toast
├── lib/
│   ├── auth.tsx       # AuthContext + login/logout/RBAC
│   ├── auditLog.ts    # Field-level audit trail
│   ├── database.ts    # In-memory DB with localStorage persistence
│   ├── export.ts      # CSV & PDF export utilities
│   ├── permissions.ts # Permission labels, groups, role labels
│   ├── reports.ts     # Report generation engine (21 report types)
│   ├── rewards.ts     # Rewards program logic (allocation, cashout)
│   ├── schemas.ts     # Zod validation schemas + form types
│   └── utils.ts       # cn() helper
├── pages/             # One page per route (15 pages)
└── types/
    └── index.ts       # All TypeScript types & interfaces
```

### Data Model (Entity Relationships)

```
ProductCategory  1──N  ProductTemplate  1──N  Product (per shop)
Shop  1──N  Product
Shop  1──N  Client
Product  1──N  ProductSold
Client  1──N  ProductSold (optional)

User  1──1  UserRole
User  1──N  UserShopAssignment
User  1──N  Permission (shop-scoped)

Shop ──→ StockTransfer ←── Shop  (from/to)

RewardsProgram  1──N  RewardsTier
RewardsProgram  1──N  ClientRewardsBalance (per client)
RewardsProgram  1──N  RewardsPointLog
RewardsProgram  1──N  RewardsCashout
```

### Authentication & RBAC

| Role | Access |
|---|---|
| `super_admin` | Everything — users, audit logs, all shops, all reports |
| `manager` | All operational pages, all shops, reports (incl. financial) |
| `shop_manager` | Assigned shops only, POS, stock, sales, inventory reports |
| `app_user` | POS + basic views for assigned shops only |

Permissions are checked via `useAuth()` hook → `hasPermission(key, shopId?)`.

### Reporting Engine

21 report types across 7 categories:
- **Financial**: Profit & Loss, Gross Profit (COGS estimated at 60%)
- **Sales**: Daily, by Product/Category/Shop/Cashier, Hourly
- **Inventory**: Current Stock, Low/Out of Stock, Valuation, Stock Aging (60-day threshold)
- **Stock Transfers**: Transfer Summary, Transfer History
- **Customer**: Purchase History, Top Customers, Customer Balance
- **Product Performance**: Best Selling, Slow Moving, Dead Stock
- **Rewards**: Client Balances, Required Rewards

All reports support CSV and PDF export via `ExportMenu`.

### Rewards Program

See `REWARDS_README.md` for full details. Key mechanics:
- Threshold-based point allocation with optional continuous stacking
- Multi-program conflict resolution (highest yield wins)
- POS integration with reward icons + tooltips
- Tiered cashout system with full history

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@erp.com | admin123 |
| Manager | manager@erp.com | manager123 |
| Shop Manager | shopmanager@erp.com | shop123 |
| Cashier | cashier@erp.com | cashier123 |

---

## What Is Left To Do

### Critical (No Backend)
- [ ] **Migrate to a real backend** — Replace localStorage with a database (e.g., Supabase/PostgreSQL). The current system loses data on localStorage clear.
- [ ] **Proper authentication** — Passwords are stored in plaintext in JSON. Needs hashing, JWT/session tokens, and server-side validation.
- [ ] **API layer** — Components call `database.ts` directly. Need a proper API abstraction (REST or RPC) for backend migration.

### High Priority
- [ ] **Payment method tracking** — Sales don't track payment method (cash, card, mobile money). Needed for financial reports.
- [ ] **Discount system** — No discount/coupon functionality exists. Discount Report exists but has no data source.
- [ ] **Returns/refunds** — No return workflow. Refunds Report exists but has no data source.
- [ ] **Real COGS tracking** — Gross profit uses a hardcoded 60% estimate. Need cost price on product templates.
- [ ] **Stock reorder levels** — Low stock report exists but uses a hardcoded threshold (10 units). Need configurable reorder points.
- [ ] **Multi-quantity sales** — POS adds items one at a time. Cart exists but each line is quantity 1 per product instance.

### Medium Priority
- [ ] **Dashboard charts** — Dashboard shows stat cards but no trend charts or visualizations.
- [ ] **Report scheduling** — No recurring/scheduled report generation.
- [ ] **Email/WhatsApp notifications** — Notification list exists but no actual sending mechanism.
- [ ] **Barcode/SKU scanning** — Product codes exist but no scanner integration.
- [ ] **Supplier management** — No supplier tracking for purchase orders or restocking.
- [ ] **Purchase orders** — No inbound stock workflow (only manual stock quantity edits).
- [ ] **Multi-currency support** — Everything is in USD cents.
- [ ] **Offline-first with sync** — LocalStorage works offline but has no sync to a server.

### Low Priority / Nice to Have
- [ ] **Receipt printing** — POS has no receipt generation.
- [ ] **Customer-facing display** — No secondary screen for POS.
- [ ] **Mobile-optimized POS** — Responsive but not touch-optimized.
- [ ] **Data import** — No CSV/Excel import for bulk product/client loading.
- [ ] **Theming beyond dark/light** — Only light/dark toggle exists.
- [ ] **Internationalization (i18n)** — English only, no locale support.
- [ ] **Audit log export** — Audit logs are viewable but not exportable.

---

## Prompts to Recreate This Project

These prompts can be used sequentially with an AI coding assistant to rebuild a similar system from scratch.

### Phase 1: Foundation

```
Create a React + TypeScript + Vite project with Tailwind CSS and shadcn/ui.
Set up React Router with an authenticated layout that has a collapsible sidebar.
Create a login page and an AuthContext that stores the current user.
Use an in-memory database pattern with localStorage persistence and a JSON seed file.
Include dark/light theme toggle.
```

### Phase 2: Core Data Model

```
Create the data model for a multi-shop retail ERP:
- ProductCategory (name, code)
- ProductTemplate (name, code, price, categoryId)
- Shop (name, description)
- Product (templateId, shopId, quantity, optional shop-specific price)
- Client (name, phone, shopId)
Build CRUD pages for each entity using reusable form and table components.
Use Zod schemas for form validation with react-hook-form.
Support CSV and PDF export on all data tables.
```

### Phase 3: Point of Sale

```
Build a POS page where a cashier selects a shop, then sees available products in a grid.
Products show name, price, and available quantity.
Clicking a product adds it to a cart. The cart shows line items with totals.
Optionally select a client for the sale.
On checkout, create sale records, decrement stock, and clear the cart.
Products from other shops can be sold as cross-shop sales (creates a stock transfer).
```

### Phase 4: User Management & RBAC

```
Add a user management system with 4 roles: super_admin, manager, shop_manager, app_user.
Users are assigned to shops. Permissions are granular and shop-scoped.
Permission keys: create_product, edit_product, delete_product, sell, manage_clients,
create_client, delete_client, view_sales, view_products, view_clients, manage_stock,
view_dashboard, manage_notifications.
Super admins bypass all checks. Managers have implicit view permissions.
Build a user management page with role assignment, shop assignment, and permission toggles.
Add audit logging that records every create/update/delete with field-level diffs.
```

### Phase 5: Stock Management

```
Add a stock overview page showing inventory levels across all shops with color-coded
quantity badges (red for out-of-stock, yellow for low, green for healthy).
Build a stock transfer system between shops with statuses: pending, approved, rejected, completed.
Transfers can be linked to cross-shop POS sales.
Include approval workflow where managers can approve/reject pending transfers.
```

### Phase 6: Reporting Engine

```
Build a comprehensive reporting engine with these report categories:
1. Financial: Profit & Loss (per shop), Gross Profit (per product/category)
2. Sales: Daily, by Product, by Category, by Shop, by Cashier, Hourly peaks
3. Inventory: Current Stock, Low Stock, Out of Stock, Valuation, Stock Aging
4. Stock Transfers: Transfer Summary (aggregated routes), Transfer History (itemized)
5. Customer: Purchase History, Top Customers, Customer Balance
6. Product Performance: Best Selling, Slow Moving, Dead Stock (60-day threshold)

Each report should have configurable filters (shop, date range).
Reports display in data tables with summary cards and support CSV/PDF export.
Role-gate financial reports to super_admin and manager only.
```

### Phase 7: Rewards Program

```
Build a reusable loyalty rewards program system:
- Admins create programs with: minimum product price ($1+), spending threshold,
  points per threshold, and optional continuous allocation (stacking).
- Programs auto-include product templates at or above the minimum price.
- Multiple programs can run simultaneously; highest-yield program wins per sale.
- POS shows reward icons on eligible products with tooltip showing program details.
- Points are allocated at sale completion only when a client is selected.
- Configurable reward tiers (e.g., 50 pts = Pen, 100 pts = $100 Cash).
- Cashout system that deducts points and records history.
- Reports tab showing client balances, tier distribution, and rewards needed.
```

---

## Future Feature Ideas

### Revenue & Growth
- **Subscription/membership tiers** — Monthly membership that gives automatic discounts or bonus reward points.
- **Gift cards** — Issue and redeem store gift cards across shops.
- **Layaway/installment plans** — Allow customers to pay in installments for high-value items.

### Operations
- **Supplier & purchase orders** — Track vendors, create POs, receive stock with cost tracking.
- **Automated reorder alerts** — When stock hits reorder level, generate a suggested PO.
- **Employee shift tracking** — Clock in/out with hours worked and POS activity per shift.
- **Expense tracking** — Record shop expenses (rent, utilities, supplies) for true P&L.

### Customer Experience
- **Customer portal** — Web view where customers can check their reward points and purchase history.
- **SMS/WhatsApp notifications** — Send purchase receipts, reward milestones, and promotions.
- **Customer segmentation** — RFM analysis (Recency, Frequency, Monetary) for targeted marketing.

### Analytics & Intelligence
- **Dashboard visualizations** — Revenue trends, top products, shop comparisons with interactive charts.
- **Demand forecasting** — Use sales history to predict future stock needs.
- **ABC analysis** — Classify products by revenue contribution (A = top 20%, B = next 30%, C = bottom 50%).
- **Margin analysis** — Track actual margins per product when cost prices are available.

### Technical Improvements
- **Backend migration** — Move to Supabase or similar for persistent, multi-user data.
- **Real-time sync** — Multiple POS terminals syncing stock in real-time.
- **Offline mode with sync queue** — Queue operations when offline, sync when reconnected.
- **Role-based API rate limiting** — Prevent abuse when backend is added.
- **Automated testing** — E2E tests for POS flow, report generation, rewards allocation.
- **Data import/export** — Bulk CSV/Excel import for products, clients, and stock counts.
- **Webhook integrations** — Connect to accounting software (Xero, QuickBooks) or delivery services.
