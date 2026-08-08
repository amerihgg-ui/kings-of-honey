# NUVEXA HUB V12.9 — Final workflow update

- Persistent cloud inventory with absolute stock reconciliation.
- Shared admin state across devices via Supabase.
- Customer name + phone saved once against Google account.
- Customer orders load by Google user ID on any device.
- Full-screen 4-step website project brief ending in a prepared WhatsApp message.
- Seller application flow with benefits + short application form; admin approval grants seller role.
- Offers are manual only (`is_offer`) and never inferred automatically from product text.
- Customer storefront does not expose physical stock quantity or block ordering because stock is zero.
- About section uses one real visual per visual block (no overlapping double-image composition).
- Open Graph / Twitter share image uses the NUVEXA app icon.
- Existing Google auth, roles, admin gate, products, orders, invoices and License Management preserved.

## Database
Run `RUN_ONCE_FINAL_V12_9.sql` once in Supabase SQL Editor after the existing V11/V12 base schema.
