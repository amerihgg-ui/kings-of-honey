# NUVEXA HUB V11.9 — Products Module

## Active modules
- `assets/js/modules/orders.js`: orders and invoices presentation.
- `assets/js/modules/products.js`: products and digital services presentation, search, filters and view preferences.
- `assets/js/app.js`: stable shared runtime and business actions.

## Completed in V11.9
- Moved products rendering behind the `NuvexaProducts` module boundary.
- Product table, cards and list views remain available.
- Search and quick filters are now owned by the products module.
- Existing Supabase product CRUD, media studio, smart copy generation and archive actions remain unchanged.
- Service worker cache upgraded to V11.9.

## Next migration
Seller portal, then admin dashboard and authentication/roles.
