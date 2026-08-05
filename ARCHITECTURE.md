# NUVEXA HUB V11.7 — Modular Foundation

## Active files
- `index.html`: semantic page structure only.
- `assets/css/app.css`: the complete approved visual system.
- `assets/js/app.js`: current stable runtime, extracted unchanged from the previous inline script.
- `assets/js/modules/`: module boundaries for staged migration.

## Migration rule
Functions are moved from `app.js` one domain at a time only after regression testing. The visual identity, Google login, Supabase roles, products, media studio and checkout flow must remain unchanged during migration.

## Planned order
1. Orders and invoices
2. Products
3. Seller portal
4. Admin dashboard
5. Authentication and roles
6. Customers, licenses, reports and settings
