# API Documentation — modern-node-app

> **For frontend developers:** This document covers every endpoint, request/response shape, authentication, and integration notes. All examples use realistic data.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Health Check](#health-check)
- [Auth — `/api/auth`](#auth)
- [Categories — `/api/categories`](#categories)
- [Products — `/api/products`](#products)
- [Orders — `/api/orders`](#orders)
- [Analytics — `/api/analytics`](#analytics)
- [Users — `/api/users`](#users)
- [File Upload — `/api/upload`](#file-upload)
- [Data Models](#data-models)

---

## Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:5000` |
| Production | `https://your-deployed-domain.com` |

---

## Authentication

This API uses **JWT Bearer tokens**.

### How to use

**Step 1:** Register or login → receive a `token` in the response.

**Step 2:** Send the token in the `Authorization` header on every protected request:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Tokens expire after **30 days** (set by `JWT_EXPIRE` in `.env`).

### Access Levels

| Level | Description |
|---|---|
| `Public` | No token needed |
| `Optional` | Token optional — when provided, response is filtered to the user's own data |
| `Private` | Valid token required |
| `Private (owner or admin)` | Valid token required; users can only act on resources they own; admins can act on all |
| `Admin` | Valid token required with `role: "admin"` |

---

## Error Handling

### Error response shape

```json
{
  "success": false,
  "message": "Human-readable description of the error"
}
```

### Validation error shape

```json
{
  "success": false,
  "errors": [
    { "msg": "Product name is required", "path": "name" }
  ]
}
```

### HTTP status codes

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation failed |
| `401` | Unauthorized — missing or invalid token |
| `403` | Forbidden — valid token but insufficient permissions |
| `404` | Resource not found |
| `429` | Rate limited — 100 requests per 15 minutes per IP |
| `500` | Internal server error |

---

## Health Check

### `GET /health`

Check if the server and database are alive. Useful for frontend startup checks.

**Access:** Public

**Response `200`:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-24T10:00:00.000Z",
  "service": "modern-node-app",
  "database": "connected"
}
```

---

## Auth

### `POST /api/auth/register`

Create a new user account.

**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "secret123"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–50 characters |
| `email` | string | Yes | Valid email format, must be unique |
| `password` | string | Yes | Min 6 characters |

**Response `201`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6628a1c2f4e3b2001c8d1234",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

> Save the `token` — you need it for all Private endpoints.

---

### `POST /api/auth/login`

Login with email and password.

**Access:** Public

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6628a1c2f4e3b2001c8d1234",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### `GET /api/auth/me`

Get the profile of the currently logged-in user.

**Access:** Private

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "id": "6628a1c2f4e3b2001c8d1234",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

## Categories

Categories are dynamic and managed through the API. They must be created before assigning them to products.

### Integration tip for frontend

1. On app load, call `GET /api/categories` to populate your category dropdown/filter UI.
2. When creating or updating a product, send the category `_id` in the `category` field.
3. To filter products by category, pass the category `_id` as `?category=<id>` to the product endpoints.

---

### `GET /api/categories`

Get all active categories. Use this to populate dropdowns and filter menus.

**Access:** Public

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "_id": "6628b1a2f4e3b2001c8d5678",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "createdBy": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "isActive": true,
      "createdAt": "2026-04-20T08:00:00.000Z",
      "updatedAt": "2026-04-20T08:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/categories/:id`

Get a single category by its ID.

**Access:** Public

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "6628b1a2f4e3b2001c8d5678",
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "createdBy": { "name": "John Doe", "email": "john@example.com" },
    "isActive": true,
    "createdAt": "2026-04-20T08:00:00.000Z",
    "updatedAt": "2026-04-20T08:00:00.000Z"
  }
}
```

---

### `POST /api/categories`

Create a new category.

**Access:** Private

**Request Body:**
```json
{
  "name": "Electronics",
  "description": "Electronic devices and accessories"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | Max 50 chars, must be unique |
| `description` | string | No | Max 200 chars |

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "_id": "6628b1a2f4e3b2001c8d5678",
    "name": "Electronics",
    "description": "Electronic devices and accessories",
    "createdBy": "6628a1c2f4e3b2001c8d1234",
    "isActive": true,
    "createdAt": "2026-04-24T10:00:00.000Z",
    "updatedAt": "2026-04-24T10:00:00.000Z"
  }
}
```

---

### `PUT /api/categories/:id`

Update a category.

**Access:** Private (owner or admin)

> Regular users can only update categories they created. Admins can update any.

**Request Body (all fields optional):**
```json
{
  "name": "Consumer Electronics",
  "description": "Updated description"
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { ...updated category }
}
```

**Error `403`** — if a regular user tries to update someone else's category:
```json
{
  "success": false,
  "message": "Not authorized to update this category"
}
```

---

### `DELETE /api/categories/:id`

Delete a category permanently.

**Access:** Private (owner or admin)

> Regular users can only delete categories they created. Admins can delete any.

**Response `200`:**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

---

## Products

### Access rules summary

| Action | No token | Logged-in user | Admin |
|---|---|---|---|
| List / Search | All products | Own products only | All products |
| Get single | All | All | All |
| Create | ❌ 401 | ✅ | ✅ |
| Update | ❌ 401 | Own products only | All products |
| Delete | ❌ 401 | Own products only | All products |
| Low stock | ❌ 401 | ❌ 403 | ✅ |
| Stock-in | ❌ 401 | ❌ 403 | ✅ |

---

### `GET /api/products`

Get products with pagination, search, and filtering.

**Access:** Optional (unauthenticated → all products; logged-in user → own products only; admin → all products)

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `page` | number | Page number (default: `1`) |
| `limit` | number | Results per page (default: `10`) |
| `search` | string | Full-text search on name and description |
| `category` | string | Filter by category **ID** (get IDs from `GET /api/categories`) |
| `minPrice` | number | Minimum selling price |
| `maxPrice` | number | Maximum selling price |

**Example request:**
```
GET /api/products?category=6628b1a2f4e3b2001c8d5678&minPrice=10&maxPrice=200&page=1&limit=10
```

**Response `200`:**
```json
{
  "success": true,
  "count": 2,
  "total": 2,
  "pagination": {
    "page": 1,
    "pages": 1,
    "limit": 10
  },
  "data": [
    {
      "_id": "6628c1a3f4e3b2001c8d9012",
      "name": "Wireless Headphones",
      "description": "Premium audio experience",
      "buyingPrice": 50,
      "sellingPrice": 99.99,
      "stock": 25,
      "category": {
        "_id": "6628b1a2f4e3b2001c8d5678",
        "name": "Electronics",
        "description": "Electronic devices and accessories"
      },
      "images": ["https://example.com/image.jpg"],
      "rating": 4.5,
      "featured": false,
      "isActive": true,
      "createdBy": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "profitMargin": 49.99,
      "profitMarginPercentage": "99.98",
      "createdAt": "2026-04-20T08:00:00.000Z",
      "updatedAt": "2026-04-20T08:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/products/search`

Search products with flexible filtering and sorting.

**Access:** Optional (same ownership rules as `GET /api/products`)

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `search` | string | — | Search in name and description (case-insensitive) |
| `category` | string | — | Filter by category **ID** |
| `minPrice` | number | — | Minimum selling price |
| `maxPrice` | number | — | Maximum selling price |
| `inStock` | boolean | — | Pass `true` to show only in-stock items |
| `sortBy` | string | `createdAt` | Sort field: `name`, `sellingPrice`, `rating`, `createdAt` |
| `sortOrder` | string | `desc` | `asc` or `desc` |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Results per page |

**Example request:**
```
GET /api/products/search?search=headphone&inStock=true&sortBy=sellingPrice&sortOrder=asc
```

**Response `200`:** Same shape as `GET /api/products`.

---

### `GET /api/products/:id`

Get a single product by ID.

**Access:** Public

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "6628c1a3f4e3b2001c8d9012",
    "name": "Wireless Headphones",
    "description": "Premium audio experience",
    "buyingPrice": 50,
    "sellingPrice": 99.99,
    "stock": 25,
    "category": {
      "_id": "6628b1a2f4e3b2001c8d5678",
      "name": "Electronics",
      "description": "Electronic devices and accessories"
    },
    "images": [],
    "rating": 4.5,
    "featured": false,
    "isActive": true,
    "createdBy": { "name": "John Doe", "email": "john@example.com" },
    "profitMargin": 49.99,
    "profitMarginPercentage": "99.98",
    "createdAt": "2026-04-20T08:00:00.000Z",
    "updatedAt": "2026-04-20T08:00:00.000Z"
  }
}
```

---

### `POST /api/products`

Create a new product. The product is automatically linked to the logged-in user.

**Access:** Private

> `POST /api/products/create` is an alias for the same endpoint.

**Request Body:**
```json
{
  "name": "Wireless Headphones",
  "description": "Premium audio experience with noise cancellation",
  "buyingPrice": 50,
  "sellingPrice": 99.99,
  "stock": 25,
  "category": "6628b1a2f4e3b2001c8d5678",
  "images": ["https://example.com/image.jpg"]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–100 chars, must be unique |
| `description` | string | Yes | Max 500 chars |
| `buyingPrice` | number | Yes | >= 0 |
| `sellingPrice` | number | Yes | Must be greater than `buyingPrice` |
| `stock` | number | Yes | Integer >= 0 |
| `category` | string | Yes | Valid category `_id` from `GET /api/categories` |
| `images` | string[] | No | Array of image URLs |

**Response `201`:**
```json
{
  "success": true,
  "data": { ...created product }
}
```

**Error `400`** — duplicate name:
```json
{
  "success": false,
  "message": "Product with name \"Wireless Headphones\" already exists",
  "existingProduct": {
    "id": "6628c1a3f4e3b2001c8d9012",
    "name": "Wireless Headphones",
    "category": "6628b1a2f4e3b2001c8d5678"
  }
}
```

---

### `PUT /api/products/:id`

Update an existing product.

**Access:** Private (owner or admin)

> Regular users can only update products they created. Admins can update any product.

**Request Body:** Same fields as create — all are optional for update.

```json
{
  "sellingPrice": 89.99,
  "stock": 30
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { ...updated product }
}
```

**Error `403`** — user does not own this product:
```json
{
  "success": false,
  "message": "Not authorized to update this product"
}
```

---

### `DELETE /api/products/:id`

Permanently delete a product.

**Access:** Private (owner or admin)

> Regular users can only delete products they created. Admins can delete any product.

**Response `200`:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

**Error `403`** — user does not own this product:
```json
{
  "success": false,
  "message": "Not authorized to delete this product"
}
```

---

### `GET /api/products/low-stock`

Get active products with stock at or below a threshold.

**Access:** Admin

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `threshold` | number | `10` | Stock level cutoff |
| `page` | number | `1` | Page number |
| `limit` | number | `10` | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "pagination": { "page": 1, "pages": 1, "limit": 10 },
  "data": [
    {
      "_id": "6628c1a3f4e3b2001c8d9012",
      "name": "USB Cable",
      "stock": 2,
      "buyingPrice": 2,
      "sellingPrice": 9.99,
      "category": "6628b1a2f4e3b2001c8d5678"
    }
  ]
}
```

---

### `PATCH /api/products/:id/stock-in`

Add stock quantity to a product.

**Access:** Admin

**Request Body:**
```json
{
  "quantity": 50
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `quantity` | number | Yes | Positive integer >= 1 |

**Response `200`:**
```json
{
  "success": true,
  "message": "Stock updated. Added 50 unit(s).",
  "data": {
    "_id": "6628c1a3f4e3b2001c8d9012",
    "name": "USB Cable",
    "stock": 52,
    "buyingPrice": 2,
    "sellingPrice": 9.99
  }
}
```

---

## Orders

> All order endpoints require authentication (`Authorization: Bearer <token>`).

---

### `POST /api/orders`

Create a new order. Stock is automatically decremented for each item.

**Access:** Private

**Request Body:**
```json
{
  "items": [
    { "product": "6628c1a3f4e3b2001c8d9012", "quantity": 2 },
    { "product": "6628c1a3f4e3b2001c8d9013", "quantity": 1 }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "address": "123 Main St",
    "city": "Bangkok",
    "postalCode": "10110",
    "country": "Thailand",
    "phone": "+66812345678"
  },
  "paymentMethod": "credit_card"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `items` | array | Yes | Min 1 item |
| `items[].product` | string | Yes | Valid product `_id` |
| `items[].quantity` | number | Yes | Integer >= 1 |
| `shippingAddress.fullName` | string | Yes | — |
| `shippingAddress.address` | string | Yes | — |
| `shippingAddress.city` | string | Yes | — |
| `shippingAddress.postalCode` | string | Yes | — |
| `shippingAddress.country` | string | Yes | — |
| `shippingAddress.phone` | string | No | — |
| `paymentMethod` | string | Yes | `credit_card`, `paypal`, or `cash_on_delivery` |

**Response `201`:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "_id": "6628d1a4f4e3b2001c8d3456",
    "orderNumber": "ORD-1745488800000-5678",
    "user": { "name": "John Doe", "email": "john@example.com" },
    "items": [
      {
        "name": "Wireless Headphones",
        "quantity": 2,
        "price": 99.99,
        "buyingPrice": 50,
        "sellingPrice": 99.99,
        "product": "6628c1a3f4e3b2001c8d9012"
      }
    ],
    "totalAmount": 199.98,
    "totalCost": 100,
    "totalProfit": 99.98,
    "shippingAddress": { ... },
    "paymentMethod": "credit_card",
    "paymentStatus": "pending",
    "orderStatus": "pending",
    "createdAt": "2026-04-24T10:00:00.000Z"
  }
}
```

---

### `GET /api/orders/my-orders`

Get all orders placed by the currently logged-in user.

**Access:** Private

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [ ...array of orders ]
}
```

---

### `GET /api/orders/:id`

Get a specific order by ID.

**Access:** Private

> Users can only view their own orders. Admins can view any order.

**Response `200`:**
```json
{
  "success": true,
  "data": { ...full order object }
}
```

---

### `GET /api/orders/:id/success`

Get order confirmation details after a successful order placement or payment.

**Access:** Private (must be the order owner)

**Response `200`:**
```json
{
  "success": true,
  "message": "Order completed successfully!",
  "data": {
    "order": { ...full order object },
    "successDetails": {
      "orderNumber": "ORD-1745488800000-5678",
      "totalAmount": 199.98,
      "estimatedDelivery": "2026-05-01T10:00:00.000Z",
      "trackingAvailable": false,
      "supportEmail": "support@yourstore.com"
    }
  }
}
```

---

### `POST /api/orders/:id/process`

Simulate payment processing for an order.

**Access:** Private (order owner or admin)

**Request Body:**
```json
{
  "paymentSuccess": true
}
```

**Response `200`** — payment succeeded:
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": { ...order with paymentStatus: "paid" }
}
```

**Response `400`** — payment failed:
```json
{
  "success": false,
  "message": "Payment failed"
}
```

---

### `GET /api/orders/report`

Get a profit/revenue report for the currently logged-in user's own orders, grouped by day or month.

**Access:** Private

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `period` | string | `daily` | `daily` or `monthly` |
| `startDate` | string | 30 days ago | Format: `YYYY-MM-DD` |
| `endDate` | string | today | Format: `YYYY-MM-DD` |

**Example request:**
```
GET /api/orders/report?period=monthly&startDate=2026-01-01&endDate=2026-04-24
```

**Response `200`:**
```json
{
  "success": true,
  "period": "daily",
  "startDate": "2026-03-25",
  "endDate": "2026-04-24",
  "note": "All orders are counted toward profit regardless of payment or delivery status. paymentSummary is for display only.",
  "summary": {
    "totalProfit": 299.94,
    "totalRevenue": 599.94,
    "totalCost": 300,
    "totalOrders": 6
  },
  "paymentSummary": {
    "paid": 4,
    "pending": 2,
    "failed": 0,
    "refunded": 0
  },
  "data": [
    {
      "date": "2026-04-20",
      "profit": 99.98,
      "revenue": 199.98,
      "cost": 100,
      "orders": 2,
      "paidOrders": 1,
      "unpaidOrders": 1
    }
  ]
}
```

---

### `GET /api/orders` — Admin

Get all orders from all users.

**Access:** Admin

**Response `200`:**
```json
{
  "success": true,
  "count": 150,
  "data": [ ...array of all orders ]
}
```

---

### `GET /api/orders/report/admin` — Admin

Get a profit report for all users with a per-user breakdown. Optionally filter by a specific user.

**Access:** Admin

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `period` | string | `daily` | `daily` or `monthly` |
| `startDate` | string | 30 days ago | Format: `YYYY-MM-DD` |
| `endDate` | string | today | Format: `YYYY-MM-DD` |
| `userId` | string | — | Optional: filter to a specific user's orders |

**Response `200`:**
```json
{
  "success": true,
  "period": "daily",
  "startDate": "2026-03-25",
  "endDate": "2026-04-24",
  "filteredByUser": null,
  "note": "All orders are counted toward profit regardless of payment or delivery status.",
  "summary": {
    "totalProfit": 899.82,
    "totalRevenue": 1799.82,
    "totalCost": 900,
    "totalOrders": 18
  },
  "paymentSummary": {
    "paid": 12,
    "pending": 5,
    "failed": 1,
    "refunded": 0
  },
  "data": [
    {
      "date": "2026-04-20",
      "profit": 299.94,
      "revenue": 599.94,
      "cost": 300,
      "orders": 6,
      "paidOrders": 4,
      "unpaidOrders": 2
    }
  ],
  "userBreakdown": [
    {
      "userId": "6628a1c2f4e3b2001c8d1234",
      "name": "John Doe",
      "email": "john@example.com",
      "totalProfit": 299.94,
      "totalRevenue": 599.94,
      "totalCost": 300,
      "totalOrders": 6,
      "paidOrders": 4,
      "unpaidOrders": 2
    }
  ]
}
```

---

### `PUT /api/orders/:id/status` — Admin

Update the status of any order.

**Access:** Admin

**Request Body:**
```json
{
  "orderStatus": "shipped"
}
```

Valid values: `pending`, `processing`, `shipped`, `delivered`, `cancelled`

**Response `200`:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": { ...updated order }
}
```

---

## Analytics

Analytics endpoints require a token. Regular users see data **scoped to their own products only**. Admins see all data.

> `/api/analytics/dashboard` is **admin-only**.

---

### `GET /api/analytics/profit`

Get profit, revenue, cost, and top-selling products for a time period.

**Access:** Private

> **Regular users:** data is calculated from orders that contain products they created (item-level, not order-level totals).
> **Admins:** all orders.

**Query Parameters:**

| Param | Values | Default | Description |
|---|---|---|---|
| `period` | `day`, `week`, `month`, `year` | `day` | Time window to analyze |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "dateRange": {
      "start": "2026-03-24T00:00:00.000Z",
      "end": "2026-04-24T10:00:00.000Z"
    },
    "summary": {
      "totalRevenue": 15000,
      "totalCost": 8000,
      "totalProfit": 7000,
      "orderCount": 45,
      "averageOrderValue": 333.33,
      "profitMargin": "46.67"
    },
    "dailyProfit": [
      {
        "_id": "2026-04-23",
        "revenue": 500,
        "cost": 250,
        "profit": 250,
        "orders": 3
      }
    ],
    "topProducts": [
      {
        "_id": "6628c1a3f4e3b2001c8d9012",
        "productName": "Wireless Headphones",
        "totalSold": 20,
        "totalRevenue": 1999.80,
        "totalCost": 1000,
        "totalProfit": 999.80,
        "profitMargin": "50.00",
        "productDetails": { ...full product object or null }
      }
    ]
  }
}
```

---

### `GET /api/analytics/products`

Get performance analytics per product — revenue, cost, profit, and margin.

**Access:** Private

> **Regular users:** only their own products appear.
> **Admins:** all products.

**Query Parameters:**

| Param | Values | Default |
|---|---|---|
| `period` | `week`, `month`, `year` | `month` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "productPerformance": [
      {
        "_id": "6628c1a3f4e3b2001c8d9012",
        "productName": "Wireless Headphones",
        "totalSold": 20,
        "totalRevenue": 1999.80,
        "totalCost": 1000,
        "totalProfit": 999.80,
        "profitMargin": 49.99,
        "averageSellingPrice": 99.99,
        "productDetails": { ...full product object or null }
      }
    ]
  }
}
```

---

### `GET /api/analytics/dashboard` — Admin

Get system-wide dashboard metrics: today's performance, growth vs yesterday, inventory value, and low-stock alerts.

**Access:** Admin

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "today": {
      "revenue": 1500,
      "cost": 800,
      "profit": 700,
      "orders": 9,
      "averageOrderValue": 166.67
    },
    "growth": {
      "revenue": 25.5,
      "profit": 30.2,
      "orders": "12.50"
    },
    "inventory": {
      "totalInventoryCost": 50000,
      "totalInventoryValue": 95000,
      "totalPotentialProfit": 45000,
      "productCount": 120
    },
    "lowStockProducts": [
      {
        "_id": "6628c1a3f4e3b2001c8d9012",
        "name": "USB Cable",
        "stock": 3,
        "buyingPrice": 2,
        "sellingPrice": 9.99
      }
    ],
    "alerts": {
      "lowStockCount": 8,
      "outOfStockCount": 2
    }
  }
}
```

---

## Users

> All user management endpoints require Admin access.

---

### `GET /api/users`

Get all registered users with pagination.

**Access:** Admin

**Query Parameters:**

| Param | Default | Description |
|---|---|---|
| `page` | `1` | Page number |
| `limit` | `10` | Results per page |

**Response `200`:**
```json
{
  "success": true,
  "count": 10,
  "total": 85,
  "pagination": { "page": 1, "pages": 9, "limit": 10 },
  "data": [
    {
      "_id": "6628a1c2f4e3b2001c8d1234",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-01-10T08:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/users/:id`

Get a single user by ID.

**Access:** Admin

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "_id": "6628a1c2f4e3b2001c8d1234",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-01-10T08:00:00.000Z"
  }
}
```

---

### `PUT /api/users/:id`

Update a user's details.

**Access:** Admin

**Request Body (all fields optional):**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "admin",
  "isActive": true
}
```

**Response `200`:**
```json
{
  "success": true,
  "data": { ...updated user }
}
```

---

### `DELETE /api/users/:id`

Deactivate a user account (soft delete — sets `isActive: false`).

**Access:** Admin

**Response `200`:**
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "data": { ...user with isActive: false }
}
```

---

## File Upload

### `POST /api/upload`

Upload a product image to Cloudinary. Returns the URL to use in the `images` array when creating/updating a product.

**Access:** Private

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `image` | file | Image file to upload |

**Response `200`:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/abc123.jpg"
}
```

> Use the returned `url` as a value in the `images` array when calling `POST /api/products`.

---

## Data Models

### User
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Unique ID |
| `name` | string | — |
| `email` | string | Unique |
| `role` | string | `user` or `admin` |
| `isActive` | boolean | `false` = soft-deleted |
| `createdAt` | date | — |
| `updatedAt` | date | — |

### Category
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Use this as `category` when creating products |
| `name` | string | Unique |
| `description` | string | — |
| `createdBy` | User ref | The user who created this category |
| `isActive` | boolean | — |
| `createdAt` | date | — |
| `updatedAt` | date | — |

### Product
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | — |
| `name` | string | Unique |
| `description` | string | — |
| `buyingPrice` | number | Cost price |
| `sellingPrice` | number | Sale price (must be > buyingPrice) |
| `stock` | number | Current stock quantity |
| `category` | Category ref | Populated as `{ _id, name, description }` in responses |
| `images` | string[] | Array of image URLs |
| `rating` | number | 0–5 |
| `featured` | boolean | — |
| `isActive` | boolean | — |
| `createdBy` | User ref | Populated as `{ name, email }` in responses |
| `profitMargin` | number | Virtual: `sellingPrice - buyingPrice` |
| `profitMarginPercentage` | string | Virtual: percentage |

### Order
| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | — |
| `orderNumber` | string | e.g. `ORD-1745488800000-5678` |
| `user` | User ref | Who placed the order |
| `items` | array | See Order Item below |
| `totalAmount` | number | Total revenue |
| `totalCost` | number | Total cost |
| `totalProfit` | number | totalAmount - totalCost |
| `shippingAddress` | object | `fullName, address, city, postalCode, country, phone` |
| `paymentMethod` | string | `credit_card`, `paypal`, `cash_on_delivery` |
| `paymentStatus` | string | `pending`, `paid`, `failed`, `refunded` |
| `orderStatus` | string | `pending`, `processing`, `shipped`, `delivered`, `cancelled` |
| `paidAt` | date | Set when payment succeeds |
| `deliveredAt` | date | Set when delivered |

#### Order Item
| Field | Type | Notes |
|---|---|---|
| `name` | string | Product name at time of order |
| `quantity` | number | — |
| `price` | number | Selling price at time of order |
| `buyingPrice` | number | Cost at time of order |
| `sellingPrice` | number | Selling price at time of order |
| `product` | Product ref | — |

---

## Frontend Integration Checklist

- [ ] Store the `token` from login/register in `localStorage` or a secure cookie
- [ ] Attach `Authorization: Bearer <token>` header to all Private/Admin requests
- [ ] Call `GET /api/categories` on app load to populate category dropdowns
- [ ] When creating a product, send the category `_id` (not the name string)
- [ ] When filtering products, pass `?category=<categoryId>` (not the name)
- [ ] Handle `401` globally — redirect to login and clear the stored token
- [ ] Handle `403` — show "permission denied" message, not a login redirect
- [ ] Handle `429` — show a "too many requests, please wait" message

---

## Rate Limiting

- **100 requests per 15 minutes** per IP address
- Exceeding this limit returns HTTP `429`:

```json
{
  "message": "Too many requests from this IP, please try again later."
}
```
