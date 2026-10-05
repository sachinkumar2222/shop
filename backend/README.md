# 🙏 Shree Pooja Ghar — Backend API

**श्री पूजा घर | POS, Inventory & WhatsApp Automation System**

A production-grade Node.js backend for a retail pooja store in Ajmer, Rajasthan.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js v18+ (ES Modules) |
| Framework | Express.js |
| ORM | Prisma |
| Database | PostgreSQL |
| Cache/Queue | Redis + BullMQ |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest |

---

## Quick Start

### 1. Clone & Install

```bash
cd backend
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your DB and Redis credentials
```

### 3. Start Infrastructure (Docker)

```bash
docker compose up -d
```

### 4. Run Migrations & Seed

```bash
npx prisma migrate dev --name init
npm run db:seed
```

This seeds:
- 8 product categories
- 1 Admin user → `admin@shreepooja.com` / `admin123`

### 5. Start Server

```bash
npm run dev        # development
npm start          # production
```

Server runs at `http://localhost:3000`

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login with email + password |
| GET | `/api/v1/auth/me` | Get current user profile |

### Products & Categories
| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/v1/categories` | Any |
| POST | `/api/v1/categories` | Admin |
| PUT | `/api/v1/categories/:id` | Admin |
| DELETE | `/api/v1/categories/:id` | Admin |
| GET | `/api/v1/products` | Any |
| POST | `/api/v1/products` | Admin |
| GET | `/api/v1/products/barcode/:barcode` | Any |
| GET | `/api/v1/products/low-stock` | Any |

### Inventory Batches
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/batches` | Record a new purchase batch |
| GET | `/api/v1/batches/product/:productId` | List product batches |

### POS Checkout
```
POST /api/v1/pos/checkout
Authorization: Bearer <token>

{
  "customerName": "Ramesh Sharma",
  "phone": "9829012345",
  "paymentMode": "UPI",
  "items": [
    { "productId": "<uuid>", "qty": 2, "salePrice": 180 }
  ]
}
```

Response:
```json
{
  "success": true,
  "invoiceNo": "SPG-000001",
  "total": 360,
  "profit": 120,
  "waStatus": "QUEUED"
}
```

### Invoices
| Method | Endpoint |
|--------|----------|
| GET | `/api/v1/invoices` |
| GET | `/api/v1/invoices/:invoiceNo` |

### Reports (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/dashboard` | Today's overview |
| GET | `/api/v1/reports/daily?date=YYYY-MM-DD` | Daily summary |
| GET | `/api/v1/reports/customers/ltv` | Customer lifetime value |

### Customers & Exports (Admin only)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/customers` | List all customers |
| GET | `/api/v1/customers/:phone` | Customer details + order history |
| GET | `/api/v1/exports/wsm?segment=all` | Download customer CSV |

**Export Segments:** `all` | `high_value` | `recent`

---

## Key Business Rules

### FIFO Costing
When selling a product, stock is deducted from the **oldest batch first**. The exact purchase cost at time of sale is permanently locked in the invoice — it never changes even if the product gets new stock later.

### Negative Stock Protection
If requested quantity exceeds available stock, the system returns:
```json
{ "success": false, "code": "INSUFFICIENT_STOCK", "message": "..." }
```

### Invoice Numbers
Invoice numbers (`SPG-000001`) are generated using a **PostgreSQL sequence**, making them unique and safe under concurrent checkouts.

### WhatsApp Automation
After checkout, the WhatsApp receipt is dispatched asynchronously via BullMQ. If WhatsApp fails, the invoice remains saved. Failed jobs retry 3 times with exponential backoff.

---

## Running Tests

```bash
npm test
```

Test coverage includes:
- FIFO single and multi-batch costing
- Insufficient stock rejection
- Profit calculation
- Historical cost preservation
- Phone normalization
- Payment mode validation
- AppError classes

---

## Project Structure

```
backend/
├── src/
│   ├── config/        # DB, Redis, Logger
│   ├── constants/     # Payment modes, invoice prefix
│   ├── controllers/   # Thin HTTP handlers
│   ├── jobs/          # BullMQ queues and workers
│   ├── middleware/     # Auth, error, rate limit, requestId
│   ├── routes/        # Express routers
│   ├── services/      # Business logic
│   ├── utils/         # AppError, JWT, phone, invoiceNumber
│   └── validators/    # Zod schemas
├── prisma/
│   ├── schema.prisma
│   └── seed.js
└── tests/             # Vitest unit tests
```

---

## Environment Variables

See `.env.example` for all required variables.

> ⚠️ Never commit `.env` to version control.
