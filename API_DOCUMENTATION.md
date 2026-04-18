# API Documentation — modern-node-app

> **Purpose:** This document is intended to help AI models (or developers) integrate with this API. It covers every available endpoint, authentication, request/response shapes, and error handling.

---

## Base URL

```
http://localhost:5000
```

> In production, replace with your deployed domain.

---

## Authentication

This API uses **JWT Bearer tokens**.

1. Register or log in to receive a `token`.
2. Include the token in every protected request:

```
Authorization: Bearer <token>
```

Tokens expire after **30 days** (configurable via `JWT_EXPIRE` in `.env`).

### Access Levels

| Level | Description |
|-------|-------------|
| `Public` | No authentication required |
| `Private` | Must send a valid JWT token |
| `Admin` | Must send a valid JWT token with `role: "admin"` |

---

## Error Response Format

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable error description"
}
```

Validation errors return an `errors` array:

```json
{
  "success": false,
  "errors": [
    { "msg": "Email is required", "path": "email" }
  ]
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | OK |
| `201` | Created |
| `400` | Bad Request / Validation Error |
| `401` | Unauthorized (missing/invalid token) |
| `403` | Forbidden (insufficient role) |
| `404` | Resource Not Found |
| `429` | Too Many Requests (rate limited: 100 req/15min) |
| `500` | Internal Server Error |

---

## Health & Root

### `GET /health`

Check if the server and database are running.

**Access:** Public

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-04-18T10:00:00.000Z",
  "service": "modern-node-app",
  "database": "connected"
}
```

---

### `GET /`

Root endpoint, confirms the API is online.

**Access:** Public

**Response:**
```json
{
  "message": "Modern Node App API is running!",
  "timestamp": "2026-04-18T10:00:00.000Z",
  "environment": "development"
}
```

---

## Authentication — `/api/auth`

### `POST /api/auth/register`

Register a new user account.

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
|-------|------|----------|-------|
| `name` | string | Yes | 2–50 characters |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 6 characters |

**Response `201`:**
```json
{
  "success": true,
  "token": "<jwt-token>",
  "user": {
    "id": "64abc123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### `POST /api/auth/login`

Log in with email and password.

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
  "token": "<jwt-token>",
  "user": {
    "id": "64abc123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

### `GET /api/auth/me`

Get the currently authenticated user's profile.

**Access:** Private

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "success": true,
  "user": {
    "id": "64abc123...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

## Products — `/api/products`

### `GET /api/products`

Get all products with pagination, search, and filtering.

**Access:** Public

**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: `1`) |
| `limit` | number | Results per page (default: `10`) |
| `search` | string | Full-text search on name and description |
| `category` | string | Filter by category: `Electronics`, `Clothing`, `Books`, `Home`, `Sports`, `Other` |
| `minPrice` | number | Minimum selling price filter |
| `maxPrice` | number | Maximum selling price filter |

**Response `200`:**
```json
{
  "success": true,
  "count": 5,
  "total": 42,
  "pagination": {
    "page": 1,
    "pages": 9,
    "limit": 5
  },
  "data": [
    {
      "_id": "64abc123...",
      "name": "Wireless Headphones",
      "description": "Premium audio experience",
      "buyingPrice": 50,
      "sellingPrice": 99.99,
      "stock": 25,
      "category": "Electronics",
      "images": [],
      "rating": 4.5,
      "featured": false,
      "isActive": true,
      "createdBy": { "name": "Admin", "email": "admin@example.com" },
      "profitMargin": 49.99,
      "profitMarginPercentage": "99.98"
    }
  ]
}
```

---

### `GET /api/products/:id`

Get a single product by ID.

**Access:** Public

**Response `200`:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### `POST /api/products`

Create a new product.

**Access:** Private

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "Wireless Headphones",
  "description": "Premium audio experience",
  "buyingPrice": 50,
  "sellingPrice": 99.99,
  "stock": 25,
  "category": "Electronics"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `name` | string | Yes | 2–100 chars, must be unique |
| `description` | string | Yes | Max 500 chars |
| `buyingPrice` | number | Yes | >= 0 |
| `sellingPrice` | number | Yes | >= 0, must be > buyingPrice |
| `stock` | number | Yes | Integer >= 0 |
| `category` | string | Yes | One of: `Electronics`, `Clothing`, `Books`, `Home`, `Sports`, `Other` |
| `images` | string[] | No | Array of image URLs |

**Response `201`:**
```json
{
  "success": true,
  "data": { ... }
}
```

> `POST /api/products/create` is an alias for the same endpoint.

---

### `PUT /api/products/:id`

Update an existing product.

**Access:** Admin

**Headers:** `Authorization: Bearer <admin-token>`

**Request Body:** Same fields as create (all optional for update).

**Response `200`:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### `DELETE /api/products/:id`

Delete a product permanently.

**Access:** Admin

**Headers:** `Authorization: Bearer <admin-token>`

**Response `200`:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Orders — `/api/orders`

> All order endpoints require authentication.

### `POST /api/orders`

Create a new order.

**Access:** Private

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "items": [
    {
      "product": "64abc123...",
      "quantity": 2
    }
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
|-------|------|----------|-------|
| `items` | array | Yes | Min 1 item |
| `items[].product` | string | Yes | Valid product ID |
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
    "_id": "64def456...",
    "orderNumber": "ORD-1713432000000-1234",
    "user": { "name": "John Doe", "email": "john@example.com" },
    "items": [ ... ],
    "totalAmount": 199.98,
    "totalCost": 100,
    "totalProfit": 99.98,
    "paymentStatus": "pending",
    "orderStatus": "pending"
  }
}
```

> Stock is automatically decremented when an order is created.

---

### `GET /api/orders/my-orders`

Get all orders for the currently logged-in user.

**Access:** Private

**Response `200`:**
```json
{
  "success": true,
  "count": 3,
  "data": [ ... ]
}
```

---

### `GET /api/orders/:id`

Get a specific order by ID. Users can only view their own orders; admins can view any.

**Access:** Private

**Response `200`:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

### `GET /api/orders/:id/success`

Get order success confirmation details (user must own the order).

**Access:** Private

**Response `200`:**
```json
{
  "success": true,
  "message": "Order completed successfully!",
  "data": {
    "order": { ... },
    "successDetails": {
      "orderNumber": "ORD-1713432000000-1234",
      "totalAmount": 199.98,
      "estimatedDelivery": "2026-04-25T10:00:00.000Z",
      "trackingAvailable": false,
      "supportEmail": "support@yourstore.com"
    }
  }
}
```

---

### `POST /api/orders/:id/process`

Simulate payment processing for an order.

**Access:** Private (owner or admin)

**Request Body:**
```json
{
  "paymentSuccess": true
}
```

**Response `200`** (success) or `400` (failed):
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": { ... }
}
```

---

### `GET /api/orders`

Get all orders (admin only).

**Access:** Admin

**Response `200`:**
```json
{
  "success": true,
  "count": 150,
  "data": [ ... ]
}
```

---

### `PUT /api/orders/:id/status`

Update the status of an order.

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
  "data": { ... }
}
```

---

## Analytics — `/api/analytics`

> All analytics endpoints require Admin access.

**Headers:** `Authorization: Bearer <admin-token>`

---

### `GET /api/analytics/profit`

Get profit analytics for a specific time period.

**Access:** Admin

**Query Parameters:**

| Param | Values | Default | Description |
|-------|--------|---------|-------------|
| `period` | `day`, `week`, `month`, `year` | `day` | Time period to analyze |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "dateRange": {
      "start": "2026-03-18T00:00:00.000Z",
      "end": "2026-04-18T10:00:00.000Z"
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
        "_id": "2026-04-17",
        "revenue": 500,
        "cost": 250,
        "profit": 250,
        "orders": 3
      }
    ],
    "topProducts": [
      {
        "_id": "64abc123...",
        "productName": "Wireless Headphones",
        "totalSold": 20,
        "totalRevenue": 1999.80,
        "totalCost": 1000,
        "totalProfit": 999.80,
        "profitMargin": "50.00",
        "productDetails": { ... }
      }
    ]
  }
}
```

---

### `GET /api/analytics/dashboard`

Get comprehensive dashboard metrics including today's performance, growth vs yesterday, inventory status, and low-stock alerts.

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
        "_id": "64abc123...",
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

### `GET /api/analytics/products`

Get product performance analytics showing revenue, cost, profit, and margin per product.

**Access:** Admin

**Query Parameters:**

| Param | Values | Default |
|-------|--------|---------|
| `period` | `week`, `month`, `year` | `month` |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "period": "month",
    "productPerformance": [
      {
        "_id": "64abc123...",
        "productName": "Wireless Headphones",
        "totalSold": 20,
        "totalRevenue": 1999.80,
        "totalCost": 1000,
        "totalProfit": 999.80,
        "profitMargin": 49.99,
        "averageSellingPrice": 99.99,
        "productDetails": { ... }
      }
    ]
  }
}
```

---

## Users — `/api/users`

> All user management endpoints require Admin access.

**Headers:** `Authorization: Bearer <admin-token>`

---

### `GET /api/users`

Get all users with pagination.

**Access:** Admin

**Query Parameters:**

| Param | Default | Description |
|-------|---------|-------------|
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
      "_id": "64abc123...",
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
  "data": { ... }
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
  "data": { ... }
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
  "data": { ... }
}
```

---

## Data Models

### User
```
_id, name, email, password (hashed), role (user|admin), isActive, createdAt, updatedAt
```

### Product
```
_id, name, description, buyingPrice, sellingPrice, stock, category, images[], rating, featured, isActive, createdBy (User ref), createdAt, updatedAt
Virtuals: profitMargin, profitMarginPercentage
```

### Order
```
_id, orderNumber, user (User ref), items[], totalAmount, totalCost, totalProfit,
shippingAddress { fullName, address, city, postalCode, country, phone },
paymentMethod, paymentStatus (pending|paid|failed|refunded),
orderStatus (pending|processing|shipped|delivered|cancelled),
paidAt, deliveredAt, createdAt, updatedAt
```

#### Order Item
```
name, quantity, price, buyingPrice, sellingPrice, product (Product ref)
```

---

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
# Edit .env — set your MongoDB Atlas URI (see .env for instructions)

# 3. Start in development mode
npm run dev

# 4. Start in production mode
npm start
```

---

## Rate Limiting

- **100 requests per 15 minutes** per IP address
- Exceeding this returns HTTP `429` with message: `"Too many requests from this IP, please try again later."`
