# Rentify platform administration

The Angular admin application runs on port 4800. It requires a Core `admin`
account and reads live Core and Commerce records. Its operations dashboard
covers Stores and seller approval, users, websites, templates, subscriptions,
plans and plan payments, products, cross-channel orders, customer payments,
reviews, buyer reports, and usage statements.

Core remains authoritative for identity, Store profiles, seller review,
websites, and subscriptions. Commerce remains authoritative for products,
orders, payment records, reviews, and buyer reports. Admin reads are
paginated and require a fresh Core admin identity. The only administrative
write exposed by this UI is the existing audited Core seller-review operation.

The launch dashboard does not show platform revenue from COD orders,
commission, online settlement, or seller payouts. Marketplace COD cash is
collected by merchants; subscription payments are separate.

See [admin operations](../docs/admin-operations.md) for current capabilities,
known limits, and the next workflow gates.

## Local verification

```sh
npm run typecheck
npm test
npm run build
```

Docker Compose runs the `admin` service on port 4800. The Core and Commerce
databases must have their documented migrations applied before opening the
dashboard. In particular, Commerce's product review migration is required
for overview and review counts.
