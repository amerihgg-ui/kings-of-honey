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
