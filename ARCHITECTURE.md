# NUVEXA HUB V11.8 — Orders & Invoices Module

## Active files
- `index.html`: semantic page structure only.
- `assets/css/app.css`: the complete approved visual system.
- `assets/js/app.js`: current stable runtime, extracted unchanged from the previous inline script.
- `assets/js/modules/orders.js`: active orders and invoices presentation module.
- `assets/js/modules/`: remaining module boundaries for staged migration.

## Migration rule
Functions are moved from `app.js` one domain at a time only after regression testing. The visual identity, Google login, Supabase roles, products, media studio and checkout flow must remain unchanged during migration.

## Planned order
1. Orders and invoices
2. Products
3. Seller portal
4. Admin dashboard
5. Authentication and roles
6. Customers, licenses, reports and settings


## Completed in V11.8
- Three order views: table, cards and list.
- Order search, status filters, KPI shortcuts and detail progress view.
- Three sales-invoice views, search, financial KPIs, details and print/edit actions.
- Orders and invoices rendering moved behind the `NuvexaOrders` module boundary while legacy business logic remains stable in `app.js`.
