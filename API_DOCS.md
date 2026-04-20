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
