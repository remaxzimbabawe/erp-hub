

# Enterprise ERP System - Simulated Auth, RBAC, Audit Logging & Feature Enhancements

This is a comprehensive plan to transform the current ERP into an enterprise-ready system with simulated authentication, role-based permissions, audit trails, and enhanced POS/dashboard features.

---

## Phase 1: Simulated Authentication & Role System

### 1.1 Data Model (types + seed data)

Add to `src/types/index.ts`:

- **User** -- `_id`, `name`, `email`, `password` (plaintext for simulation), `isActive`
- **UserRole** -- `_id`, `userId`, `role` (enum: `super_admin | manager | shop_manager | app_user`)
- **UserShopAssignment** -- `_id`, `userId`, `shopId` (links shop_manager / app_user to a shop)
- **Permission** -- `_id`, `userId`, `permission` (e.g. `create_product`, `sell`, `manage_clients`, `view_sales`, `edit_product`, `delete_product`, `create_client`, `delete_client`), `shopId?` (scoped to shop for shop_manager/app_user)
- **AuditLog** -- `_id`, `_creationTime`, `userId`, `action` (string), `entityType`, `entityId`, `changes` (JSON: `{ field, from, to }[]`), `description`

Update `Database` interface to include `users`, `userRoles`, `userShopAssignments`, `permissions`, `auditLogs`.

Seed `data.json` with:
- A Super Admin user (e.g. "Admin User" / admin@erp.com / admin123)
- A Manager, a Shop Manager (assigned to shop_1), an App User (assigned to shop_1)
- Pre-configured permissions for each

### 1.2 Auth Context & Login Page

- **`src/lib/auth.ts`** -- `AuthContext` with `login(email, password)`, `logout()`, `currentUser`, `hasPermission(permission, shopId?)`, `hasRole(role)`, `getUserShops()`. Stores logged-in user in `localStorage`.
- **`src/pages/LoginPage.tsx`** -- Simple email/password login form. On success, redirects to dashboard.
- Update `App.tsx` to wrap with `AuthProvider`, show login if not authenticated, hide `AppLayout` behind auth.

### 1.3 Role-Based Visibility

Roles determine what the user sees:

| Feature | Super Admin | Manager | Shop Manager | App User |
|---------|-------------|---------|--------------|----------|
| Dashboard | Full (all shops) | Full (read-only) | Own shop only | Own shop only |
| Shops | Create/Edit/Delete | View all | View assigned | View assigned |
| Categories | Create/Edit/Delete | View all | View | View |
| Templates | Create/Edit/Delete | View all | View | View |
| Products | Full access | View all | Own shop (with perms) | Own shop (with perms) |
| POS | N/A | View | Sell (with perms) | Sell (with perms) |
| Clients | Full | View all | Own shop (with perms) | Own shop (with perms) |
| Sales | Full | View all | Own shop | Own shop |
| Notifications | Full | View | -- | -- |
| User Management | Full | -- | -- | -- |
| Audit Logs | Full | View | -- | -- |

- Update `AppSidebar.tsx` to filter nav items based on role/permissions
- Each page wraps actions (Add/Edit/Delete buttons) in permission checks
- Manager sees everything but action buttons are hidden unless they have specific permissions granted by Super Admin

---

## Phase 2: User Management & Permissions (Super Admin)

### 2.1 User Management Page (`/users`)

- List all users with their roles and assigned shops
- Create/edit/delete users
- Assign roles via dropdown
- Assign shops (for shop_manager and app_user)
- Grant/revoke granular permissions per user (with optional shop scope)
- Permissions UI: checkboxes grouped by category (Products, Sales, Clients, etc.)

### 2.2 Permissions Helper

- `src/lib/permissions.ts` -- Constants for all permission keys, helper to check if current user can perform an action on a specific shop, and a `withPermission` wrapper/hook.

---

## Phase 3: Audit Logging

### 3.1 Audit Logger

- **`src/lib/auditLog.ts`** -- `logAction(userId, action, entityType, entityId, changes, description)` that appends to `database.auditLogs`.
- Integrate into every create/update/delete function in `database.ts` -- each mutation logs the action with before/after diffs.
- Track: who, what, when, from-value, to-value.

### 3.2 Audit Logs Page (`/audit-logs`)

- Searchable/filterable table of all audit entries
- Filters: by user, action type, entity type, date range
- Shows: timestamp, user name, action, entity, change summary
- Only visible to Super Admin (and Manager if given permission)

---

## Phase 4: Enhanced POS

### 4.1 POS Improvements

- Remove the "cashier name" text input; instead use the logged-in user's name automatically
- Shop selection: shop_manager/app_user auto-selects their assigned shop; Super Admin can choose any shop
- Product grid: maintain the 4-column layout with bordered squares, out-of-stock items at the end with a muted red/gray background, search by name/category/price (case-insensitive)
- Cart with quantity controls, client selector (from shop's clients), walk-in option
- Sale completion: creates `ProductSold` entries, decrements stock, logs audit entry
- Receipt dialog: 80mm-width styled receipt with print support, shop name, items, totals, client, cashier, timestamp
- "Last Sale" summary bar at the bottom with click-to-expand and reprint
- Quick actions: clear cart, hold/recall transaction

---

## Phase 5: Enhanced Dashboard

### 5.1 Role-Aware Dashboard

- Super Admin / Manager: sees all-shop aggregate data
- Shop Manager / App User: sees only their assigned shop's data
- **Charts & Stats:**
  - Today's sales pie chart by shop (already exists, keep)
  - 7-day trend line (already exists, keep)
  - Top selling products bar chart (already exists, keep)
  - **New:** Yesterday vs Today comparison cards with trend arrows
  - **New:** Revenue by category donut chart
  - **New:** Hourly sales distribution for today (bar chart)
  - Low stock and out of stock alerts (already exist, keep)
  - Top clients (already exists, keep)
  - **New:** Recent activity feed (last 10 audit log entries)

---

## Phase 6: Notification Phone Numbers Page

- Already exists at `/notifications` -- verify it allows add/remove of phone numbers
- Ensure it respects permissions (Super Admin full access, Manager view)

---

## Technical Details

### Files to Create
- `src/lib/auth.ts` -- AuthContext, AuthProvider, useAuth hook
- `src/lib/permissions.ts` -- Permission constants and helpers
- `src/lib/auditLog.ts` -- Audit logging functions
- `src/pages/LoginPage.tsx` -- Login page
- `src/pages/UsersPage.tsx` -- User management (Super Admin)
- `src/pages/AuditLogsPage.tsx` -- Audit log viewer

### Files to Modify
- `src/types/index.ts` -- Add User, UserRole, UserShopAssignment, Permission, AuditLog types
- `src/data/data.json` -- Add seed users, roles, assignments, permissions, empty auditLogs
- `src/lib/database.ts` -- Add CRUD for users/roles/permissions/auditLogs, integrate audit logging into all mutations
- `src/lib/schemas.ts` -- Add user, login, permission schemas
- `src/App.tsx` -- Wrap with AuthProvider, add login route, add new page routes
- `src/components/layout/AppSidebar.tsx` -- Filter nav items by role/permissions
- `src/components/layout/AppLayout.tsx` -- Show user info in header, add logout button
- `src/pages/POSPage.tsx` -- Use logged-in user instead of cashier name input, auto-select shop
- `src/pages/DashboardPage.tsx` -- Filter data by user's shop scope, add new chart sections
- `src/pages/ShopsPage.tsx` -- Hide create/edit/delete based on permissions
- `src/pages/CategoriesPage.tsx` -- Hide mutations based on permissions
- `src/pages/TemplatesPage.tsx` -- Hide mutations based on permissions
- `src/pages/ProductsPage.tsx` -- Filter by shop, hide mutations based on permissions
- `src/pages/ClientsPage.tsx` -- Filter by shop, hide mutations based on permissions
- `src/pages/SalesPage.tsx` -- Filter by shop scope
- `src/pages/NotificationsPage.tsx` -- Permission-gated

### Implementation Order
1. Types and seed data
2. Auth context, login page, and app wrapper
3. Permission helpers
4. Sidebar and layout updates (role-based nav)
5. User management page
6. Audit logging infrastructure
7. Integrate audit logging into all database mutations
8. Audit logs page
9. Update all existing pages with permission checks
10. POS enhancements (auto-user, shop scoping)
11. Dashboard enhancements (new charts, role-aware filtering)
12. Final polish and testing

