# NUVEXA HUB V12.6

- Fixed inventory balance persistence by writing stock movements to Supabase products + inventory_movements.
- Added shared cloud state for admin data that was previously browser-local.
- Customer name/phone are requested on first checkout and stored against Google account for reuse across devices.
- Added seller application flow from customer account; admin approval grants seller role automatically.
- Added multi-step project brief from About -> Contact, ending with a prefilled WhatsApp summary.
- Offers remain admin-defined only; no automatic offer creation was added.
- Removed customer-facing physical stock quantity/out-of-stock blocking. Orders can be placed at zero stock; admin workflow receives the order.
- Added professional Open Graph/Twitter preview using the NUVEXA app icon.
- About hero now uses one visual treatment instead of a duplicated/overlapping hero image.
- Existing Google auth, roles, products, orders, licenses, and admin modules were preserved.

IMPORTANT: Run supabase_v12_6_cloud_workflow.sql once in Supabase SQL Editor before testing the new cloud features.
