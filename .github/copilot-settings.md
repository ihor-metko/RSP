# Copilot Settings for Padel Platform

## 1. Universal Role-Based Access Control

This file contains the authoritative project-level rules that GitHub Copilot (or any code generator used in this repo) must follow when working with membership, admin, and authorization logic. Write code in TypeScript for Next.js and Prisma, and always prefer server-side, centralized, and reusable solutions.

### Core Rules (must follow)

1. **Universal Role-Based Access Control**
   - Always use the **centralized role-based access control mechanism** implemented in the repo.
   - Do **not** introduce ad-hoc role checks anywhere in the codebase.
   - The canonical helper is `requireRole` (or a similarly named central helper).
   - All membership and authorization checks **must** be performed on the server and **must** reuse this helper.

2. **Extending Helpers**
   - If additional helper functionality is required, **extend the existing helper in place**.
   - Do **not** create multiple copies of similar helpers across files.
   - Ensure all extensions remain **centralized, reusable, and type-safe**.

3. **Consistency**
   - Always follow the existing patterns for role checks, error handling, and return types.
   - Ensure all new code is compatible with the existing access control flow and maintains security guarantees.


## 2. UI Components Usage

All UI elements **must** use the existing components from our `components/ui/*` library. This ensures consistency across the platform and maintains the dark theme with `im-*` classes.

### Rules:
1. **Always reuse existing components** when possible (buttons, inputs, modals, tables, toasts, pagination, etc.).
2. **Extend components** when additional props, styling, or functionality is needed:
   - Use `className` with `@apply` for custom styles following the `im-*` semantic class pattern.
   - Keep extended components reusable and type-safe.
3. **Create new components** in `components/ui/` if no suitable component exists:
   - Name it semantically according to its purpose.
   - Follow the same design system (`im-*` classes, dark theme, type safety, a11y).
   - Make it reusable across the platform.
4. **Do not write ad-hoc HTML/CSS** for UI elements; always prefer component-based implementation.

### Example:
- If a new table layout is needed, first check `components/ui/Table`.
- If it does not satisfy the requirements, extend it or create `CustomTable` in `components/ui/` and reuse it wherever needed.

## 2.1. Dark Theme and Styling
- Use `im-*` semantic classes for all custom styles.
- Use Tailwind only for basic layout, spacing, and positioning.
- All new components must support dark theme.

## 2.2. Coding Standards
- Use TypeScript with proper types.
- Ensure a11y compliance for all interactive elements.
- Write modular, reusable, and testable components.

## 2.3. Enforcement
Copilot should **always follow these rules** when generating code, UI, or pages, unless explicitly instructed otherwise.


# 3. User Store and Role Management

All user state and role checks **must** use the centralized `useUserStore` Zustand store.

## Core Rules:

1. **Use the Store for All User State**
   - Import and use `useUserStore` from `@/stores/useUserStore` for all user-related state.
   - Never access `session.user.isRoot` or similar session properties directly in components.
   - Always use the store's state and methods.

2. **Role Checks Must Use Store Helpers**
   - All admin permission checks must use `hasRole()` or `hasAnyRole()` methods from the store.
   - Do **not** manually compare roles like `if (user.role === "ROOT_ADMIN")`.
   - Do **not** check `localStorage` for role or login state.

3. **Supported Admin Roles**
   - `ROOT_ADMIN`: Platform root administrator
   - `ORGANIZATION_ADMIN`: Organization administrator
   - `CLUB_ADMIN`: Club administrator

   **Note**: Context-specific membership roles (e.g., `MEMBER` in organization or club) are not stored in the client store. These are managed server-side via the `requireRole` helper with appropriate context (organization ID or club ID).

4. **Usage Examples**

```typescript
// Check if user has a specific role
const hasRole = useUserStore(state => state.hasRole);
if (hasRole("ROOT_ADMIN")) {
  // Root admin logic
}

// Check if user has any of multiple roles
const hasAnyRole = useUserStore(state => state.hasAnyRole);
if (hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"])) {
  // Admin logic
}

// Get current user
const user = useUserStore(state => state.user);

// Check if logged in
const isLoggedIn = useUserStore(state => state.isLoggedIn);
```

5. **Store Should NOT Contain**
   - Complex authorization rules (like org-to-club mapping)
   - Business logic beyond pure role checks
   - Availability or booking logic

## On Login/Logout:
- The store is automatically loaded via `UserStoreInitializer` in the `AuthProvider`.
- On login: Store is populated automatically when session changes to authenticated.
- On logout: Call `clearUser()` before `signOut()`.


# 4. Copilot Documentation Settings

## Output Folder
All generated documentation should be saved under the `/docs` folder at the project root.

## Structure
- Organize documentation logically by feature or module.
- Use subfolders for major sections (e.g., `/docs/admin`, `/docs/users`, `/docs/clubs`).
- File names should be descriptive and lowercase with hyphens, e.g., `organization-detail.md`.

## Formatting
- Use Markdown (`.md`) for all docs.
- Include clear titles, short descriptions, and relevant lists or tables where appropriate.
- Keep content concise and structured for easy navigation.

# 5. State Management Guidelines (Zustand)

This project uses Zustand as the global state manager for all app-level entities.

## Core Principles

1. **All entity data (organizations, clubs, courts, users, overlays, bookings, etc.) must be stored in Zustand stores. No direct fetch calls in components.**
2. **Each store must implement a lazy-loading pattern:**
   - Component calls: `store.getEntityList()`
   - If the list is empty → store performs the fetch → saves to state → returns data
   - If the list already exists → store returns it without fetching
3. **All components must read entity data only from Zustand stores, not from direct API fetches.**
4. **Stores must contain:**
   - State
   - Actions
   - A `loadIfNeeded` mechanism (lazy fetch)
   - A `refresh` method (forced refetch)

## Usage Rules

### Components:
- NEVER call `fetch()` directly to load organizations, clubs, courts, users, or bookings.
- ALWAYS use the corresponding Zustand store:
