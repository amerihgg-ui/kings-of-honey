# NUVEXA HUB V11.11 — Auth Module

## Active modules
- `assets/js/modules/auth.js`: Google OAuth PKCE, session restore, sign-out, profiles and live role loading.
- `assets/js/modules/orders.js`: orders and invoices presentation.
- `assets/js/modules/products.js`: products and digital services presentation.
- `assets/js/modules/seller.js`: seller portal presentation and navigation.
- `assets/js/app.js`: shared runtime and business actions.

## Completed in V11.11
- Authentication and Supabase client creation moved behind `window.NuvexaAuth`.
- Google PKCE sign-in, callback exchange, session restoration and sign-out centralized.
- Live roles are read from `profiles` and `user_roles`.
- Helpers available: `hasRole`, `isOwner`, `canAdmin`, and `canSell`.
- Owner email keeps buyer, seller and partner access.
- Service worker cache upgraded to V11.11.

## Next migration
Admin dashboard and cloud user-role management.

## V11.12 — Admin module
- `assets/js/modules/admin.js` now owns admin application routing, module access checks, sidebar rendering, module selection, and launcher return behavior.
- `app.js` supplies state-aware renderers and business dependencies through a small admin context object.
- This keeps page navigation and permission gates isolated from individual business modules.


## V11.13 Customers Module
- `assets/js/modules/customers.js` owns buyers list, search, filters, three views, and follow-up rendering.
- Existing customer forms, archive action, and local data operations remain in `app.js` during safe migration.


## V11.14 Licenses Module
- `assets/js/modules/licenses.js` owns license overview, devices, subscriptions, products/sites catalog, search, and status filtering.
- Existing license creation, renewal, device actions, activation, modal forms, and audit operations remain in `app.js` during safe migration.
- Service worker cache upgraded to V11.14.

## V11.15 Reports Module
- `assets/js/modules/reports.js` owns reports overview, sales report, inventory report, period filters, search, and report presentation.
- Existing CSV export actions and shared calculations remain in `app.js` during safe migration.
- Service worker cache upgraded to V11.15.


## V11.16 Settings Module
- `assets/js/modules/settings.js` owns general settings presentation, backup history, and security audit presentation.
- Cloud email/role management continues to use the existing safe business actions in `app.js` while the UI routing is owned by the settings module.
- Existing profile image, password, backup import/export, reset, and settings-save actions remain unchanged.
- Service worker cache upgraded to V11.16.

## V12.0 — Core Engine
- Added `assets/js/core.js` as the shared runtime foundation.
- Centralized DOM helpers, HTML escaping, number/date/money formatting, ID generation, storage, session storage, event bus, lightweight state store, logging, and a safe Supabase API facade.
- `app.js` now consumes Core utilities instead of redefining its own low-level helpers.
- Added runtime diagnostics through `window.NuvexaRuntime` and lifecycle events: `core:ready`, `runtime:ready`, `state:saved`, and `state:changed`.
- Updated service worker cache and all module asset versions to V12.0.
- No visual design, authentication behavior, database schema, or existing module functionality was changed.

## Next phase
Connect each module to live Supabase data through the shared Core/API layer, starting with cloud seller/partner invitations and product media storage.
