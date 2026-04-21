# API Documentation

Base URL: `http://localhost:5000` (development) / `https://your-production-domain.com` (production)

All protected routes require:
```
Authorization: Bearer <token>
```

---

## Authentication

### Register
```
POST /api/auth/register
```
**Body (JSON)**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
**Response 201**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Login
```
POST /api/auth/login
```
**Body (JSON)**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Response 200**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Get Current User
```
GET /api/auth/me
```
**Protected**: Yes

**Response 200**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

## Image Upload *(NEW)*

> Upload images to Google Drive before creating or updating a product. You will receive a public URL to use in the product form.

### Upload Images
```
POST /api/upload/image
```
**Protected**: Yes

**Content-Type**: `multipart/form-data`

**Form field name**: `images` (must be exactly this name)

**Limits**:
- Max **5 images** per request
- Max **5MB** per image
- Allowed types: `JPEG`, `JPG`, `PNG`, `WebP`

**Request example (fetch)**
```js
const formData = new FormData();
formData.append('images', file); // file from <input type="file">

const response = await fetch('/api/upload/image', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    // Do NOT set Content-Type manually — browser sets it with the boundary
  },
  body: formData,
});
const data = await response.json();
// data.data.urls[0] → Google Drive public URL
```

**Request example (mobile — React Native)**
```js
const formData = new FormData();
formData.append('images', {
  uri: photo.uri,          // from camera or gallery picker
  name: 'photo.jpg',
  type: 'image/jpeg',
});

const response = await fetch('/api/upload/image', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

**Response 200**
```json
{
  "success": true,
  "count": 2,
  "data": {
    "urls": [
      "https://drive.google.com/uc?export=view&id=1AbC...",
      "https://drive.google.com/uc?export=view&id=2DeF..."
    ]
  }
}
```

**Error Responses**

| Status | Message | Cause |
|--------|---------|-------|
| 400 | No files uploaded. Please attach at least one image. | No file attached |
| 400 | File too large. Maximum size is 5MB per image. | File exceeds 5MB |
| 400 | Unexpected field name. Use "images" as the field name. | Wrong form field name |
| 400 | Invalid file type. Only JPEG, PNG, and WebP images are allowed. | Non-image file |
| 401 | Not authorized | Missing or invalid token |

---

## Products

### Get All Products
```
GET /api/products
```
**Protected**: No

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |
| `search` | string | Full-text search on name and description |
| `category` | string | Filter by category (`Electronics`, `Clothing`, `Books`, `Home`, `Sports`, `Other`) |
| `minPrice` | number | Minimum selling price |
| `maxPrice` | number | Maximum selling price |

**Response 200**
```json
{
  "success": true,
  "count": 10,
  "total": 42,
  "pagination": {
    "page": 1,
    "pages": 5,
    "limit": 10
  },
  "data": [ ...products ]
}
```

---

### Search Products *(NEW)*
```
GET /api/products/search
```
**Protected**: No

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Partial, case-insensitive match on name or description |
| `category` | string | `Electronics`, `Clothing`, `Books`, `Home`, `Sports`, `Other` |
| `minPrice` | number | Minimum selling price |
| `maxPrice` | number | Maximum selling price |
| `inStock` | boolean | `true` = only show products with stock > 0 |
| `sortBy` | string | `name`, `sellingPrice`, `rating`, `createdAt` (default: `createdAt`) |
| `sortOrder` | string | `asc` or `desc` (default: `desc`) |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

**Examples**
```
GET /api/products/search?search=phone&inStock=true&sortBy=sellingPrice&sortOrder=asc
GET /api/products/search?category=Electronics&minPrice=10&maxPrice=200&page=1&limit=5
GET /api/products/search?search=headphone&sortBy=rating&sortOrder=desc
```

**Response 200**
```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "pagination": {
    "page": 1,
    "pages": 1,
    "limit": 10
  },
  "data": [ ...products ]
}
```

**React fetch example**
```js
const searchProducts = async ({ search, category, inStock, sortBy, sortOrder, page }) => {
  const params = new URLSearchParams();
  if (search)    params.append('search', search);
  if (category)  params.append('category', category);
  if (inStock)   params.append('inStock', 'true');
  if (sortBy)    params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);
  if (page)      params.append('page', page);

  const res = await fetch(`/api/products/search?${params.toString()}`);
  const data = await res.json();
  return data; // data.data = array of products, data.total = total count
};
```

> **Note**: `/api/products/search` uses regex matching (supports partial words like `"head"` → matches `"Headphones"`). The existing `GET /api/products?search=` uses MongoDB full-text index and requires complete words.

---

### Get Single Product
```
GET /api/products/:id
```
**Protected**: No

**Response 200**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "name": "Product Name",
    "description": "Description here",
    "buyingPrice": 50,
    "sellingPrice": 80,
    "stock": 100,
    "category": "Electronics",
    "images": ["https://drive.google.com/uc?export=view&id=..."],
    "rating": 0,
    "featured": false,
    "isActive": true,
    "createdBy": { "_id": "...", "name": "John", "email": "john@example.com" },
    "profitMargin": 30,
    "profitMarginPercentage": "60.00",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### Create Product *(updated — now supports images)*
```
POST /api/products
```
or
```
POST /api/products/create
```
**Protected**: Yes

**Content-Type**: `application/json`

> **Image upload flow**: Call `POST /api/upload/image` first → get the URL(s) → pass them in the `images` array below.

**Body (JSON)**
```json
{
  "name": "Wireless Headphones",
  "description": "High-quality noise cancelling headphones",
  "buyingPrice": 50,
  "sellingPrice": 99.99,
  "stock": 200,
  "category": "Electronics",
  "images": [
    "https://drive.google.com/uc?export=view&id=1AbC..."
  ],
  "featured": false
}
```

**Field Rules**

| Field | Required | Rules |
|-------|----------|-------|
| `name` | Yes | 2–100 characters, must be unique (case-insensitive) |
| `description` | Yes | Max 500 characters |
| `buyingPrice` | Yes | Positive number |
| `sellingPrice` | Yes | Positive number, must be greater than `buyingPrice` |
| `stock` | Yes | Non-negative integer |
| `category` | Yes | One of: `Electronics`, `Clothing`, `Books`, `Home`, `Sports`, `Other` |
| `images` | No | Array of URL strings (from upload endpoint) |
| `featured` | No | Boolean (default: false) |

**Response 201**
```json
{
  "success": true,
  "data": {
    "_id": "64f...",
    "name": "Wireless Headphones",
    "images": ["https://drive.google.com/uc?export=view&id=1AbC..."],
    ...
  }
}
```

**Error Responses**

| Status | Message | Cause |
|--------|---------|-------|
| 400 | Validation errors array | Missing or invalid fields |
| 400 | Product with name "X" already exists | Duplicate name |
| 400 | Selling price must be greater than buying price | Price logic error |
| 401 | Not authorized | Missing or invalid token |

---

### Update Product
```
PUT /api/products/:id
```
**Protected**: Yes

**Content-Type**: `application/json`

**Body**: Same fields as Create (all optional — only send fields you want to update).

To update images, upload new files first via `POST /api/upload/image` and pass the returned URLs.

**Response 200**
```json
{
  "success": true,
  "data": { ...updated product }
}
```

---

### Delete Product
```
DELETE /api/products/:id
```
**Protected**: Yes

**Response 200**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Full Create Product Flow (Frontend Guide)

This is the recommended step-by-step flow for a "Create Product" form with image upload.

```
Step 1 — User selects image(s) in the form
         ↓
Step 2 — POST /api/upload/image  (multipart/form-data)
         ← receives: { data: { urls: ["https://drive.google.com/..."] } }
         ↓
Step 3 — Store the URL(s) in component state
         ↓
Step 4 — User fills in product name, price, etc.
         ↓
Step 5 — POST /api/products  (application/json)
         Body includes: { ..., images: ["https://drive.google.com/..."] }
         ← receives: { data: { ...full product object } }
```

**React example (create product form)**
```jsx
const handleSubmit = async () => {
  // Step 1: Upload images first
  let imageUrls = [];
  if (selectedFiles.length > 0) {
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('images', file));

    const uploadRes = await fetch('/api/upload/image', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    imageUrls = uploadData.data.urls;
  }

  // Step 2: Create product with image URLs
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      description,
      buyingPrice,
      sellingPrice,
      stock,
      category,
      images: imageUrls,
    }),
  });
  const data = await res.json();
};
```

**HTML input for file picker (supports laptop + phone camera/gallery)**
```html
<!-- Laptop file picker -->
<input type="file" accept="image/jpeg,image/png,image/webp" multiple />

<!-- Mobile: opens camera AND gallery -->
<input type="file" accept="image/*" multiple />

<!-- Mobile: opens camera only -->
<input type="file" accept="image/*" capture="environment" />
```

---

## Orders

### Create Order
```
POST /api/orders
```
**Protected**: Yes

**Body (JSON)**
```json
{
  "items": [
    { "product": "64f...", "quantity": 2 }
  ],
  "shippingAddress": {
    "fullName": "John Doe",
    "address": "123 Main St",
    "city": "Phnom Penh",
    "postalCode": "12000",
    "country": "Cambodia",
    "phone": "012345678"
  },
  "paymentMethod": "cash_on_delivery"
}
```

`paymentMethod` options: `credit_card`, `paypal`, `cash_on_delivery`

**Response 201**
```json
{
  "success": true,
  "data": { ...order object }
}
```

---

### Get My Orders
```
GET /api/orders/my-orders
```
**Protected**: Yes

---

### Get Order Details
```
GET /api/orders/:id
```
**Protected**: Yes

---

### Process Payment
```
POST /api/orders/:id/process
```
**Protected**: Yes

---

### Get My Order Profit Report *(NEW)*
```
GET /api/orders/report
```
**Protected**: Yes

Returns the logged-in user's orders aggregated by day or month, showing profit, revenue, cost, and order count.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `daily` (default) or `monthly` |
| `startDate` | string | ISO date `YYYY-MM-DD` (default: 30 days ago) |
| `endDate` | string | ISO date `YYYY-MM-DD` (default: today) |

**Examples**
```
GET /api/orders/report
GET /api/orders/report?period=daily&startDate=2026-04-01&endDate=2026-04-21
GET /api/orders/report?period=monthly&startDate=2026-01-01&endDate=2026-04-21
```

**Response 200**
```json
{
  "success": true,
  "period": "daily",
  "startDate": "2026-03-22",
  "endDate": "2026-04-21",
  "summary": {
    "totalProfit": 500.00,
    "totalRevenue": 1200.00,
    "totalCost": 700.00,
    "totalOrders": 12
  },
  "data": [
    {
      "date": "2026-04-01",
      "profit": 80.00,
      "revenue": 200.00,
      "cost": 120.00,
      "orders": 2
    },
    {
      "date": "2026-04-05",
      "profit": 150.00,
      "revenue": 350.00,
      "cost": 200.00,
      "orders": 3
    }
  ]
}
```

> `data` only includes dates where at least one order exists. Days/months with no orders are not returned.

**React fetch example**
```js
const getOrderReport = async ({ period = 'daily', startDate, endDate, token }) => {
  const params = new URLSearchParams({ period });
  if (startDate) params.append('startDate', startDate);
  if (endDate)   params.append('endDate', endDate);

  const res = await fetch(`/api/orders/report?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data;
  // data.summary  → totals for the full period
  // data.data     → array of { date, profit, revenue, cost, orders }
};
```

**Chart integration example (recharts)**
```jsx
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// data.data from the API maps directly to recharts format
<LineChart data={reportData.data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="profit"  stroke="#10b981" name="Profit" />
  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" />
  <Line type="monotone" dataKey="cost"    stroke="#ef4444" name="Cost" />
</LineChart>
```

---

### Get All Users Order Report *(Admin only — NEW)*
```
GET /api/orders/report/admin
```
**Protected**: Yes (Admin only)

Returns a time-series report across **all users**, plus a per-user profit breakdown. Filter down to a single user with `userId`.

**Query Parameters**

| Param | Type | Description |
|-------|------|-------------|
| `period` | string | `daily` (default) or `monthly` |
| `startDate` | string | ISO date `YYYY-MM-DD` (default: 30 days ago) |
| `endDate` | string | ISO date `YYYY-MM-DD` (default: today) |
| `userId` | string | MongoDB user `_id` — filter to one specific user |

**Examples**
```
GET /api/orders/report/admin
GET /api/orders/report/admin?period=monthly&startDate=2026-01-01&endDate=2026-04-21
GET /api/orders/report/admin?userId=64f1a2b3c4d5e6f7a8b9c0d1&period=daily
```

**Response 200 (all users)**
```json
{
  "success": true,
  "period": "daily",
  "startDate": "2026-03-22",
  "endDate": "2026-04-21",
  "filteredByUser": null,
  "summary": {
    "totalProfit": 1800.00,
    "totalRevenue": 4500.00,
    "totalCost": 2700.00,
    "totalOrders": 35
  },
  "data": [
    { "date": "2026-04-01", "profit": 200.00, "revenue": 500.00, "cost": 300.00, "orders": 5 },
    { "date": "2026-04-02", "profit": 150.00, "revenue": 400.00, "cost": 250.00, "orders": 3 }
  ],
  "userBreakdown": [
    {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "John Doe",
      "email": "john@example.com",
      "totalProfit": 900.00,
      "totalRevenue": 2200.00,
      "totalCost": 1300.00,
      "totalOrders": 18
    },
    {
      "userId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "totalProfit": 900.00,
      "totalRevenue": 2300.00,
      "totalCost": 1400.00,
      "totalOrders": 17
    }
  ]
}
```

> When `userId` is provided, `filteredByUser` equals that ID and `userBreakdown` contains only that user's entry.

**React fetch example**
```js
const getAdminReport = async ({ period = 'daily', startDate, endDate, userId, token }) => {
  const params = new URLSearchParams({ period });
  if (startDate) params.append('startDate', startDate);
  if (endDate)   params.append('endDate', endDate);
  if (userId)    params.append('userId', userId);

  const res = await fetch(`/api/orders/report/admin?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
  // .summary        → overall totals
  // .data           → time-series (for charts)
  // .userBreakdown  → ranked list of users by profit (for table)
};
```

**Admin dashboard pattern — user selector + chart**
```jsx
const [selectedUser, setSelectedUser] = useState(null);
const [report, setReport] = useState(null);

useEffect(() => {
  getAdminReport({ period, startDate, endDate, userId: selectedUser, token })
    .then(setReport);
}, [selectedUser, period, startDate, endDate]);

// User selector (populate from GET /api/users)
<select onChange={(e) => setSelectedUser(e.target.value || null)}>
  <option value="">All Users</option>
  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
</select>

// Time-series chart — report.data maps directly
<LineChart data={report?.data}>
  <Line dataKey="profit"  stroke="#10b981" name="Profit" />
  <Line dataKey="revenue" stroke="#3b82f6" name="Revenue" />
  <Line dataKey="cost"    stroke="#ef4444" name="Cost" />
</LineChart>

// Per-user table — report.userBreakdown (sorted by profit desc)
{report?.userBreakdown.map(u => (
  <tr key={u.userId}>
    <td>{u.name}</td>
    <td>{u.email}</td>
    <td>${u.totalRevenue}</td>
    <td>${u.totalProfit}</td>
    <td>{u.totalOrders}</td>
  </tr>
))}
```

---

## Users *(Admin only)*

### List Users
```
GET /api/users
```

### Get User
```
GET /api/users/:id
```

### Update User
```
PUT /api/users/:id
```

### Deactivate User
```
DELETE /api/users/:id
```

---

## Analytics *(Admin only)*

### Dashboard
```
GET /api/analytics/dashboard
```

### Profit by Period
```
GET /api/analytics/profit?period=monthly
```
`period` options: `daily`, `weekly`, `monthly`, `yearly`

### Product Performance
```
GET /api/analytics/products
```

---

## Common Error Response Shape

All errors follow this structure:
```json
{
  "success": false,
  "message": "Error description here"
}
```

Validation errors:
```json
{
  "success": false,
  "errors": [
    { "field": "name", "message": "Product name is required" }
  ]
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 429 | Too many requests (rate limit: 100 req / 15 min) |
| 500 | Server error |
