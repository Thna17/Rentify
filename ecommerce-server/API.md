# E-commerce API contract

All endpoints are under the API base URL. Storefront reads are deliberately public; merchant, staff, and service operations require the appropriate cookie or service header.

## Storefront (public)

`GET /api/product/:websiteId`, `GET /api/product/:websiteId/slug/:slug`, `GET /api/categories/:websiteId`, and cart/checkout endpoints support an anonymous storefront session. Product and category responses contain public catalog data only. Cart analytics is not public; it requires the analytics permission.

`POST /api/order/websites/:websiteId/orders` creates a storefront order from that website's anonymous or customer cart.

Example request:

```json
{ "shippingDetails": { "name": "Customer", "phone": "012345678" }, "paymentMethod": "COD", "currency": "USD" }
```

`GET /api/payment/payments/:paymentId` returns safe payment status and QR data for the checkout flow. It never returns payment-provider credentials.

## Merchant and staff

These endpoints require a Core-authenticated merchant cookie or staff cookie. The website must belong to the merchant. Staff must both appear in the synced website staff list and hold the listed permission.

| Route group | Required staff permission |
| --- | --- |
| Product CRUD and inventory | `products` / `manage_products`; inventory also accepts `inventory` |
| Order history and changes | `orders` / `manage_orders` |
| POS | `pos` |
| Invoices | `invoice` / `invoices` |
| Payment configuration | `payments`, `manage_payments`, or `manage_settings` |
| Analytics | `analytics` / `manage_analytics` |

Platform-wide analytics at `GET /ecommerce/stats/admin` is restricted to a Core user with role `admin`.

Example product create:

```http
POST /api/product/WEBSITE_ID
Content-Type: application/json
```

```json
{ "name": "Canvas bag", "price": 12.5, "productType": "physical", "trackInventory": true, "stockQuantity": 10 }
```

Response: `201` with the created product. A cross-tenant request receives `403`.

`POST /api/merchant/orders/:orderId/confirm`, `/cancel`, `/complete`, and `/process` are transactionally guarded state changes. Valid transitions are pending → confirmed, confirmed/processing → completed, and pending/confirmed/processing → cancelled.

## Service synchronization

`POST|PUT /api/website-data` only accepts Core API synchronization with `x-rentify-service-token`. It is not a browser endpoint.
