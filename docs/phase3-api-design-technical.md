# Kane's Komet Book Reader — Phase 3: API Design (Technical Specification)

> **Phase**: 3 — API Contract Design  
> **Generated from**: Full frontend codebase analysis + finalized data model (Phase 2)  
> **Target Backend**: Supabase (PostgreSQL + Edge Functions)  
> **Auth**: Supabase Auth (JWT)  
> **Payment**: Stripe  
> **Email**: GoHighLevel  
> **Date**: February 2026

---

## Table of Contents

1. [Overview & Goals](#1-overview--goals)
2. [API Tooling Recommendation](#2-api-tooling-recommendation)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Base URL & Conventions](#4-base-url--conventions)
5. [Error Response Format](#5-error-response-format)
6. [API Endpoint Reference](#6-api-endpoint-reference)
   - 6.1 [Authentication](#61-authentication)
   - 6.2 [Users & Profile](#62-users--profile)
   - 6.3 [Books & Catalog](#63-books--catalog)
   - 6.4 [Cart](#64-cart)
   - 6.5 [Orders & Checkout](#65-orders--checkout)
   - 6.6 [User Library](#66-user-library)
   - 6.7 [Reading Experience](#67-reading-experience)
   - 6.8 [Subscriptions](#68-subscriptions)
   - 6.9 [Promo Codes](#69-promo-codes)
   - 6.10 [Book Club](#610-book-club)
   - 6.11 [Events & RSVPs](#611-events--rsvps)
   - 6.12 [Discussions](#612-discussions)
   - 6.13 [Admin](#613-admin)
7. [Mock Data Strategy](#7-mock-data-strategy)
8. [Pagination Convention](#8-pagination-convention)
9. [Rate Limiting](#9-rate-limiting)
10. [Webhook Contracts](#10-webhook-contracts)
11. [Frontend Migration Map](#11-frontend-migration-map)

---

## 1. Overview & Goals

This document defines the **API contract** that bridges the Kane's Komet frontend (Next.js) and the Supabase backend. It specifies every endpoint, HTTP method, request body, query parameter, response shape, and error case — forming the single source of truth for both frontend and backend developers.

### Design Principles

| Principle | Detail |
|---|---|
| **REST-first** | Standard HTTP methods (GET, POST, PUT, DELETE) with JSON payloads |
| **Resource-oriented** | URLs represent nouns (e.g., `/books`, `/users`), not actions |
| **Consistent errors** | Every error follows the same JSON envelope |
| **Cursor pagination** | All list endpoints use cursor-based pagination |
| **Idempotent writes** | PUT/DELETE operations are idempotent |
| **JWT auth** | Supabase-issued JWTs in `Authorization: Bearer <token>` header |

---

## 2. API Tooling Recommendation

### Primary: OpenAPI 3.1 + Bruno

We recommend using **OpenAPI 3.1** as the specification format and **Bruno** as the API client/testing tool. Here's why:

| Tool | Role | Why This Over Alternatives |
|---|---|---|
| **OpenAPI 3.1** | API specification & documentation | Industry standard. Auto-generates client SDKs, server stubs, and interactive docs (via Swagger UI or Redocly). Version-controllable YAML files live alongside your code. |
| **Bruno** | API testing, collections, & automation | **Free, open-source, offline-first**. Collections are stored as plain files in your Git repo (no cloud sync required like Postman). Supports automated test scripts per request, environment variables, and CI/CD integration via CLI (`bru run`). |
| **Supabase Dashboard** | Quick queries & RLS testing | Built-in SQL editor and API explorer for ad-hoc testing during development. |

### Why Not Postman?

Postman is excellent but has moved toward a cloud-first, team-subscription model. Bruno gives you:
- **Git-native collections**: `.bru` files stored directly in your repo — no cloud account needed.
- **Built-in test assertions**: Write JavaScript test scripts per request (like Postman's Tests tab but fully local).
- **CLI runner**: `npx @usebruno/cli bru run --env production` for CI/CD pipeline integration.
- **Free forever**: No paid tiers for core functionality.

### Why Not Postman Alternatives (Insomnia, Hoppscotch)?

- **Insomnia**: Good, but Kong's recent licensing changes have disrupted trust. Also cloud-dependent for sync.
- **Hoppscotch**: Great for quick browser-based testing but lacks robust CI/CD scripting.

### Automated Testing Strategy

```
┌─────────────────────────────────────────────────┐
│                Testing Pyramid                   │
├─────────────────────────────────────────────────┤
│  Bruno Collection Tests (per-request scripts)    │  ← Contract validation
│  ├── Status code assertions                      │
│  ├── Response schema validation (JSON Schema)    │
│  ├── Business rule checks                        │
│  └── Chained request flows (e.g., register →     │
│      login → add to cart → checkout)             │
├─────────────────────────────────────────────────┤
│  Supabase Edge Function Unit Tests (Deno.test)   │  ← Logic validation
├─────────────────────────────────────────────────┤
│  RLS Policy Tests (pgTAP / SQL assertions)       │  ← Security validation
└─────────────────────────────────────────────────┘
```

### Recommended Project Structure for API Tooling

```
/api-spec/
├── openapi.yaml              # OpenAPI 3.1 specification
├── bruno/                    # Bruno collection (Git-tracked)
│   ├── bruno.json            # Collection config
│   ├── environments/
│   │   ├── local.bru         # http://localhost:54321
│   │   └── production.bru    # https://<project>.supabase.co
│   ├── auth/
│   │   ├── register.bru
│   │   ├── login.bru
│   │   └── logout.bru
│   ├── books/
│   │   ├── list-books.bru
│   │   ├── get-book.bru
│   │   └── ...
│   ├── cart/
│   ├── orders/
│   ├── reading/
│   ├── book-club/
│   ├── discussions/
│   └── admin/
└── mock-server/              # Optional: mock server config
    └── prism.config.yaml     # Prism (OpenAPI mock server)
```

---

## 3. Authentication & Authorization

### Auth Flow (Supabase Auth)

```
POST /auth/v1/signup        → Create account (email + password)
POST /auth/v1/token?grant_type=password  → Login (returns JWT)
POST /auth/v1/logout        → Invalidate session
```

### JWT Token Structure

```json
{
  "sub": "uuid-of-user",
  "email": "user@example.com",
  "role": "authenticated",
  "app_metadata": {
    "role": "reader"
  },
  "exp": 1708300800
}
```

### Authorization Tiers

| Tier | Header Required | Access Level |
|---|---|---|
| **Guest** | None (or `apikey` only) | Browse books, view public events, manage session cart |
| **Authenticated (Free)** | `Authorization: Bearer <jwt>` | + Purchase, read owned books, reader features, profile |
| **Authenticated (Premium)** | Same JWT + active subscription check | + Discussions, events RSVP, book club, dealer code |
| **Admin** | Same JWT + `role = 'admin'` in `app_metadata` | Full CRUD on all resources |
| **Banned** | Same JWT + `is_banned = true` check | Read owned books only, no community |

---

## 4. Base URL & Conventions

```
Base URL (local):       http://localhost:54321/rest/v1
Base URL (production):  https://<project-ref>.supabase.co/rest/v1
Edge Functions:         https://<project-ref>.supabase.co/functions/v1
```

### Headers (Every Request)

```
Content-Type: application/json
apikey: <supabase-anon-key>
Authorization: Bearer <jwt>  (when authenticated)
```

### HTTP Methods

| Method | Usage |
|---|---|
| `GET` | Read resources (never mutates) |
| `POST` | Create new resources |
| `PUT` | Full update of a resource |
| `PATCH` | Partial update of a resource |
| `DELETE` | Remove a resource (soft delete where applicable) |

### Naming Conventions

- URLs use **kebab-case**: `/book-club/selections`
- JSON fields use **snake_case**: `cover_image_url`
- Query params use **snake_case**: `?genre=Crime&sort_by=title`

---

## 5. Error Response Format

All errors follow a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the error",
    "details": [
      {
        "field": "email",
        "issue": "Must be a valid email address"
      }
    ]
  }
}
```

### Standard Error Codes

| HTTP Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid input, missing required fields |
| `401` | `UNAUTHORIZED` | Missing or expired JWT |
| `403` | `FORBIDDEN` | Valid JWT but insufficient permissions (e.g., free user accessing discussions) |
| `404` | `NOT_FOUND` | Resource doesn't exist or is soft-deleted |
| `409` | `CONFLICT` | Duplicate (e.g., book already in library, email already registered) |
| `422` | `BUSINESS_RULE_VIOLATION` | Valid input but violates a business rule (e.g., highlight cap exceeded) |
| `429` | `RATE_LIMITED` | Too many requests |
| `500` | `INTERNAL_ERROR` | Unexpected server error |

---

## 6. API Endpoint Reference

### 6.1 Authentication

#### `POST /auth/v1/signup` — Register

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePass123",
  "data": {
    "full_name": "Jane Doe",
    "display_name": "JaneDoe",
    "phone": "5551234567",
    "date_of_birth": "1995-06-15"
  }
}
```

**Response `201 Created`:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "access_token": "jwt-string",
  "refresh_token": "refresh-string",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "JaneDoe",
    "role": "reader"
  }
}
```

**Error Cases:**
- `409 CONFLICT` — Email already registered
- `400 VALIDATION_ERROR` — Password < 8 chars, missing fields

---

#### `POST /auth/v1/token?grant_type=password` — Login

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePass123"
}
```

**Response `200 OK`:**
```json
{
  "access_token": "jwt-string",
  "refresh_token": "refresh-string",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "JaneDoe",
    "role": "reader",
    "is_banned": false,
    "subscription_plan": "free"
  }
}
```

---

#### `POST /auth/v1/logout` — Logout

**Headers:** `Authorization: Bearer <jwt>`

**Response `200 OK`:** `{}`

---

### 6.2 Users & Profile

#### `GET /rest/v1/users?id=eq.{user_id}` — Get Own Profile

**Auth:** Required  
**Response `200 OK`:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "display_name": "JaneDoe",
  "full_name": "Jane Doe",
  "phone": "5551234567",
  "date_of_birth": "1995-06-15",
  "mailing_address": "123 Cosmic Way, Nebula City, 10001",
  "tshirt_size": "m",
  "avatar_url": null,
  "role": "reader",
  "is_banned": false,
  "created_at": "2025-01-15T10:00:00Z",
  "last_active_at": "2026-02-18T07:00:00Z"
}
```

---

#### `PATCH /rest/v1/users?id=eq.{user_id}` — Update Own Profile

**Auth:** Required (own row only)

**Request Body (partial):**
```json
{
  "display_name": "CosmicJane",
  "mailing_address": "456 Galaxy Blvd",
  "tshirt_size": "l"
}
```

**Response `200 OK`:** Updated user object.

---

### 6.3 Books & Catalog

#### `GET /rest/v1/books` — List Books (Browse Page)

**Auth:** Optional (public)  
**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `genre` | `string` | — | Filter by genre enum value |
| `search` | `string` | — | Full-text search on title + author |
| `sort_by` | `string` | `title` | Sort field: `title`, `price`, `author` |
| `sort_order` | `string` | `asc` | `asc` or `desc` |
| `status` | `string` | `published` | `published` or `draft` (admin only) |
| `cursor` | `string` | — | Pagination cursor |
| `limit` | `integer` | `20` | Items per page (max 50) |

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Brute Syndicate",
      "author": "Caleb V. Kaine",
      "description": "In a world ruled by corporate syndicates...",
      "genre": "Crime",
      "cover_image_url": "/Brute Syndicate 1 Cover.webp",
      "series_name": "Brute Syndicate",
      "series_order": 1,
      "is_age_restricted": false,
      "variants": [
        {
          "id": "variant-uuid-1",
          "format": "ebook",
          "price": 14.99,
          "is_in_stock": true
        },
        {
          "id": "variant-uuid-2",
          "format": "paper_book",
          "price": 29.99,
          "is_in_stock": true
        },
        {
          "id": "variant-uuid-3",
          "format": "komet_card",
          "price": 9.99,
          "is_in_stock": true
        }
      ]
    }
  ],
  "pagination": {
    "next_cursor": "eyJpZCI6IjEwIn0=",
    "has_more": true,
    "total_count": 45
  }
}
```

---

#### `GET /rest/v1/books?id=eq.{book_id}` — Get Single Book

**Auth:** Optional (public for published books)

**Response `200 OK`:** Single book object (same shape as list item, plus `illustrator`).

```json
{
  "id": "uuid",
  "title": "Brute Syndicate",
  "author": "Caleb V. Kaine",
  "illustrator": "John Smith",
  "description": "In a world ruled by corporate syndicates...",
  "genre": "Crime",
  "cover_image_url": "/Brute Syndicate 1 Cover.webp",
  "series_name": "Brute Syndicate",
  "series_order": 1,
  "is_age_restricted": false,
  "status": "published",
  "variants": [ /* ... */ ],
  "created_at": "2025-01-01T00:00:00Z"
}
```

> **Note**: Total page count is not stored on the `books` table. Use `GET /rest/v1/book_pages?book_id=eq.{book_id}` and read the `total_pages` field from that response.

---

#### `GET /rest/v1/book_pages?book_id=eq.{book_id}` — Get Book Pages

**Auth:** Required (must own book in `user_library`)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "page_number": 1,
      "page_image_url": "https://storage.supabase.co/.../page-001.webp",
      "word_count": 350
    }
  ],
  "total_pages": 45
}
```

**Note:** The reader displays `page_image_url` (a rendered image of the original PDF page) to preserve exact visual layout. Text content is stored server-side for search indexing only and is not returned in this response. Navigation shows "Page X of Y" style pagination.

**Error:** `403 FORBIDDEN` — User doesn't own this book.

---

#### `GET /rest/v1/book_illustrations?book_id=eq.{book_id}` — Get Illustrations

**Auth:** Required (must own book)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "image_url": "https://storage.supabase.co/...",
      "page_number": 3,
      "position_index": 0,
      "caption": "The nebula stretches across the viewport",
      "width": 400,
      "height": 300
    }
  ]
}
```

---

### 6.4 Cart

#### `GET /rest/v1/cart_items` — Get Cart

**Auth:** Optional  
- **Authenticated:** Filters by `user_id`  
- **Guest:** Requires `X-Session-Id` header, filters by `session_id`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "book_id": "uuid",
      "variant_id": "uuid",
      "quantity": 1,
      "added_at": "2026-02-18T05:00:00Z",
      "book": {
        "title": "Brute Syndicate",
        "cover_image_url": "/Brute Syndicate 1 Cover.webp",
        "author": "Caleb V. Kaine"
      },
      "variant": {
        "format": "ebook",
        "price": 14.99,
        "is_in_stock": true
      }
    }
  ]
}
```

---

#### `POST /rest/v1/cart_items` — Add to Cart

**Auth:** Optional (guests use `X-Session-Id`)

**Request Body:**
```json
{
  "book_id": "uuid",
  "variant_id": "uuid",
  "quantity": 1
}
```

**Response `201 Created`:** Created cart item.

**Error Cases:**
- `409 CONFLICT` — Ebook already in user's library (prevents re-purchase of ebooks). Physical variants (Paper Book, Komet Card) can still be purchased even if user owns the ebook.
- `409 CONFLICT` — Item already in cart (use PATCH to update quantity)
- `422 BUSINESS_RULE_VIOLATION` — Variant is out of stock
- `422 BUSINESS_RULE_VIOLATION` — Ebook quantity must be 1

---

#### `PATCH /rest/v1/cart_items?id=eq.{item_id}` — Update Cart Item Quantity

**Request Body:**
```json
{ "quantity": 2 }
```

---

#### `DELETE /rest/v1/cart_items?id=eq.{item_id}` — Remove from Cart

**Response `204 No Content`**

---

#### `DELETE /rest/v1/cart_items?user_id=eq.{user_id}` — Clear Cart

**Response `204 No Content`**

---

### 6.5 Orders & Checkout

#### `POST /functions/v1/checkout` — Create Order (Edge Function)

This is an Edge Function because it orchestrates: validate cart → check dealer code (prevent self-use) → apply promo code → determine shipping → create Stripe PaymentIntent → create order + order_items → add ebooks/Komet Cards to library → clear cart → trigger GoHighLevel email.

**Auth:** Required

**Request Body:**
```json
{
  "promo_code": "KANE-EVANS-4821",
  "shipping": {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "address": "123 Cosmic Way",
    "city": "Nebula City",
    "state": "NY",
    "zip": "10001"
  },
  "stripe_payment_method_id": "pm_xxxxxxxxxxxx"
}
```

**Response `201 Created`:**
```json
{
  "order": {
    "id": "uuid",
    "status": "confirmed",
    "subtotal": 44.98,
    "discount_amount": 15.74,
    "shipping_amount": 5.99,
    "tax_amount": 1.46,
    "total": 36.69,
    "has_physical_items": true,
    "promo_code_used": "KANE-EVANS-4821",
    "placed_at": "2026-02-18T07:00:00Z",
    "items": [
      {
        "book_id": "uuid",
        "title": "Brute Syndicate",
        "format": "ebook",
        "quantity": 1,
        "unit_price": 14.99
      },
      {
        "book_id": "uuid",
        "title": "Somes 3",
        "format": "paper_book",
        "quantity": 1,
        "unit_price": 39.99
      }
    ]
  },
  "library_additions": ["uuid-of-ebook-added"],
  "stripe_payment_intent_status": "succeeded"
}
```

**Error Cases:**
- `400 VALIDATION_ERROR` — Empty cart, missing shipping for physical items
- `409 CONFLICT` — Ebook already owned
- `422 BUSINESS_RULE_VIOLATION` — Invalid/inactive promo code, out-of-stock variant, self-use of own dealer code
- `402` — Stripe payment failed

---

#### `GET /rest/v1/orders?user_id=eq.{user_id}` — Get Order History

**Auth:** Required (own orders)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "confirmed",
      "subtotal": 44.98,
      "discount_amount": 15.74,
      "shipping_amount": 5.99,
      "tax_amount": 1.46,
      "total": 36.69,
      "placed_at": "2026-02-18T07:00:00Z",
      "items": [
        {
          "title": "Brute Syndicate",
          "format": "ebook",
          "quantity": 1,
          "unit_price": 14.99
        }
      ]
    }
  ],
  "pagination": { "next_cursor": null, "has_more": false }
}
```

---

### 6.6 User Library

#### `GET /rest/v1/user_library?user_id=eq.{user_id}` — Get My Library

**Auth:** Required

**Query Params:** `status` (optional) — `reading`, `not-started`, `finished`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "book_id": "uuid",
      "source": "purchase",
      "acquired_at": "2025-12-01T00:00:00Z",
      "book": {
        "id": "uuid",
        "title": "Brute Syndicate",
        "author": "Caleb V. Kaine",
        "cover_image_url": "/Brute Syndicate 1 Cover.webp",
        "genre": "Crime"
      },
      "reading_progress": {
        "current_page": 12,
        "progress_percent": 45.00,
        "last_read_at": "2026-02-18T06:00:00Z"
      }
    }
  ]
}
```

---

### 6.7 Reading Experience

#### `GET /rest/v1/reading_progress?user_id=eq.{user_id}&book_id=eq.{book_id}` — Get Progress

**Auth:** Required

**Response `200 OK`:**
```json
{
  "book_id": "uuid",
  "current_page": 12,
  "progress_percent": 45.00,
  "last_read_at": "2026-02-18T06:00:00Z"
}
```

---

#### `PUT /rest/v1/reading_progress` — Save Progress (Upsert)

**Auth:** Required  
**Debounce:** Client should debounce to every 30 seconds.

**Request Body:**
```json
{
  "user_id": "uuid",
  "book_id": "uuid",
  "current_page": 13,
  "progress_percent": 52.30
}
```

---

#### `GET /rest/v1/highlights?user_id=eq.{user_id}&book_id=eq.{book_id}` — Get Highlights

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "page_number": 3,
      "paragraph_index": 3,
      "text": "The stars had always called to her.",
      "color": "yellow",
      "note": "Beautiful opening line",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

#### `POST /rest/v1/highlights` — Create Highlight

**Request Body:**
```json
{
  "book_id": "uuid",
  "page_number": 3,
  "paragraph_index": 3,
  "text": "The stars had always called to her.",
  "color": "yellow",
  "note": "Beautiful opening line"
}
```

**Error:** `422 BUSINESS_RULE_VIOLATION` — Highlight cap exceeded (max 10 per book).

---

#### `DELETE /rest/v1/highlights?id=eq.{id}` — Delete Highlight

**Response `204 No Content`**

---

#### `GET /rest/v1/bookmarks?user_id=eq.{user_id}&book_id=eq.{book_id}` — Get Bookmarks

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "page_number": 12,
      "label": "Key scene",
      "created_at": "2026-01-15T10:00:00Z"
    }
  ]
}
```

**Note:** Bookmarks are page-level (no paragraph_index). Users bookmark entire pages.

#### `POST /rest/v1/bookmarks` — Create Bookmark

**Request Body:**
```json
{
  "book_id": "uuid",
  "page_number": 12,
  "label": "Key scene"
}
```

**Error:** `422 BUSINESS_RULE_VIOLATION` — Bookmark cap exceeded (max 10 per book).

#### `DELETE /rest/v1/bookmarks?id=eq.{id}` — Delete Bookmark

---

#### `GET /rest/v1/reading_settings?user_id=eq.{user_id}` — Get Reading Settings

**Response `200 OK`:**
```json
{
  "font_size": 18,
  "font_family": "Georgia",
  "theme": "dark",
  "line_height": 1.8
}
```

#### `PUT /rest/v1/reading_settings` — Save Reading Settings (Upsert)

**Request Body:**
```json
{
  "user_id": "uuid",
  "font_size": 20,
  "font_family": "Georgia",
  "theme": "sepia",
  "line_height": 2.0
}
```

---

### 6.8 Subscriptions

#### `POST /functions/v1/subscribe` — Create Premium Subscription (Edge Function)

Orchestrates: create one-time $49.99 Stripe charge → create $3.99/month Stripe Subscription (first invoice delayed 30 days) → create/update `user_subscriptions` → add 2 selected books to library → generate dealer code (+ Stripe Promotion Code) → sync t-shirt size and mailing address to GoHighLevel → trigger welcome email.

**Auth:** Required

**Request Body:**
```json
{
  "stripe_payment_method_id": "pm_xxxxxxxxxxxx",
  "selected_book_ids": ["uuid-1", "uuid-2"],
  "tshirt_size": "l",
  "mailing_address": "123 Cosmic Way, Nebula City, NY 10001"
}
```

**Response `201 Created`:**
```json
{
  "subscription": {
    "id": "uuid",
    "plan": "premium",
    "status": "active",
    "started_at": "2026-02-18T07:00:00Z",
    "initial_fee_paid": 49.99,
    "monthly_rate": 3.99
  },
  "promo_code": {
    "code": "KANE-DOE-4567",
    "discount_percent": 35
  },
  "library_additions": ["uuid-1", "uuid-2"]
}
```

---

#### `POST /functions/v1/cancel-subscription` — Cancel Subscription

**Auth:** Required

**Response `200 OK`:**
```json
{
  "subscription": {
    "status": "cancelled",
    "cancelled_at": "2026-02-18T07:30:00Z"
  },
  "promo_code_deactivated": true,
  "books_retained": true
}
```

---

#### `GET /rest/v1/user_subscriptions?user_id=eq.{user_id}` — Get Subscription Status

**Response `200 OK`:**
```json
{
  "id": "uuid",
  "plan": "premium",
  "status": "active",
  "started_at": "2026-01-01T00:00:00Z",
  "monthly_rate": 3.99,
  "expires_at": null
}
```

---

### 6.9 Promo Codes

#### `POST /functions/v1/validate-promo` — Validate Promo Code at Checkout

**Auth:** Required

**Request Body:**
```json
{ "code": "KANE-EVANS-4821" }
```

**Response `200 OK`:**
```json
{
  "valid": true,
  "discount_percent": 35,
  "owner_display_name": "LamontE"
}
```

**Error:** `422 BUSINESS_RULE_VIOLATION` — Code not found, inactive, owner banned, or user is trying to use their own code.

---

#### `GET /rest/v1/promo_codes?owner_id=eq.{user_id}` — Get My Dealer Code

**Auth:** Required (premium only)

**Response `200 OK`:**
```json
{
  "code": "KANE-EVANS-4821",
  "discount_percent": 35,
  "is_active": true,
  "total_uses": 12
}
```

---

### 6.10 Book Club

#### `GET /rest/v1/book_club_selections` — List Selections

**Auth:** Optional (public)

**Query Params:** `status` — `current`, `upcoming`, `past`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "month": "January",
      "year": 2025,
      "theme": "Underground Resistance",
      "description": "Dive into the gritty underbelly...",
      "status": "current",
      "discussion_date": "2025-01-28",
      "book": {
        "id": "uuid",
        "title": "Brute Syndicate",
        "author": "Caleb V. Kaine",
        "cover_image_url": "/Brute Syndicate 1 Cover.webp"
      }
    }
  ]
}
```

---

### 6.11 Events & RSVPs

#### `GET /rest/v1/book_club_events` — List Events

**Auth:** Optional  
- **Guest/Free:** Only `is_public = true` events  
- **Premium:** All events

**Query Params:** `status` — `upcoming`, `past`

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Live Q&A with 'Cosmic Drift' Author",
      "description": "Join us for an exclusive...",
      "date": "2025-02-15",
      "time": "7:00 PM EST",
      "type": "virtual",
      "location": "https://zoom.us/j/cosmic-drift",
      "cover_image_url": "/cosmic-sci-fi-book-cover.jpg",
      "attendee_count": 128,
      "status": "upcoming",
      "user_rsvp_status": "confirmed"
    }
  ]
}
```

---

#### `POST /rest/v1/event_rsvps` — RSVP to Event

**Auth:** Required (account needed)  
- **Public events:** Free users and premium users can RSVP  
- **Private events:** Premium users only

**Request Body:**
```json
{
  "event_id": "uuid",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response `201 Created`:** RSVP object.  
**Error:** `409 CONFLICT` — Already RSVPed.

---

#### `PATCH /rest/v1/event_rsvps?id=eq.{id}` — Cancel RSVP

**Request Body:**
```json
{ "rsvp_status": "cancelled" }
```

---

### 6.12 Discussions

#### `GET /rest/v1/discussion_topics` — List Discussion Topics

**Auth:** Required (Premium only — hidden from free/guest)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Official: 'Cosmic Drift' Discussion",
      "description": "The primary forge for all deep-dives...",
      "category": "Crime",
      "is_pinned": true,
      "is_featured": true,
      "post_count": 154,
      "member_count": 840,
      "last_activity_at": "2025-01-18T20:30:00Z",
      "book": {
        "id": "uuid",
        "title": "Brute Syndicate"
      }
    }
  ]
}
```

**Error:** `403 FORBIDDEN` — User is not premium.

---

#### `GET /rest/v1/discussion_posts?topic_id=eq.{topic_id}` — Get Posts in Topic

**Auth:** Required (Premium only)

**Response `200 OK`:**
```json
{
  "data": [
    {
      "id": "uuid",
      "content": "The ending was absolutely mind-blowing!",
      "author_display_name": "AstroReader",
      "author_id": "uuid",
      "parent_id": null,
      "likes": 34,
      "user_vote": "up",
      "is_editable": false,
      "created_at": "2025-01-18T18:00:00Z",
      "updated_at": "2025-01-18T18:00:00Z",
      "replies": [
        {
          "id": "uuid",
          "content": "Totally agree!",
          "author_display_name": "GalaxyExplorer",
          "likes": 5,
          "created_at": "2025-01-18T20:00:00Z"
        }
      ]
    }
  ],
  "pagination": { "next_cursor": null, "has_more": false }
}
```

---

#### `POST /rest/v1/discussion_posts` — Create Post/Reply

**Auth:** Required (Premium only)

**Request Body:**
```json
{
  "topic_id": "uuid",
  "parent_id": null,
  "content": "Great discussion everyone!"
}
```

---

#### `PATCH /rest/v1/discussion_posts?id=eq.{id}` — Edit Post

**Auth:** Required (own post, within 15-minute window)

**Request Body:**
```json
{ "content": "Updated content here" }
```

**Error:** `422 BUSINESS_RULE_VIOLATION` — Edit window expired (> 15 minutes).

---

#### `DELETE /rest/v1/discussion_posts?id=eq.{id}` — Delete Post (Soft)

**Auth:** Required (own post or admin)

---

#### `POST /rest/v1/discussion_votes` — Vote on Post

**Auth:** Required (Premium only)

**Request Body:**
```json
{
  "post_id": "uuid",
  "vote_type": "up"
}
```

**Error:** `409 CONFLICT` — Already voted (use PATCH to change vote).

---

### 6.13 Admin

All admin endpoints require `role = 'admin'` in JWT.

#### Books Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/rest/v1/books` | Create book (draft) |
| `PATCH` | `/rest/v1/books?id=eq.{id}` | Update book metadata |
| `DELETE` | `/rest/v1/books?id=eq.{id}` | Soft delete book |
| `PATCH` | `/rest/v1/book_variants?id=eq.{id}` | Update price/stock status |
| `POST` | `/functions/v1/upload-book` | Upload PDF + cover → extract pages and inline illustrations |

#### Admin Create Book Request:
```json
{
  "title": "New Cosmic Tale",
  "author": "Caleb V. Kaine",
  "description": "A new adventure...",
  "genre": "Crime",
  "series_name": "Brute Syndicate",
  "series_order": 2,
  "is_age_restricted": false,
  "status": "draft",
  "variants": [
    { "format": "ebook", "price": 14.99, "is_in_stock": true },
    { "format": "paper_book", "price": 29.99, "is_in_stock": true },
    { "format": "komet_card", "price": 9.99, "is_in_stock": false }
  ]
}
```

#### User Management

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/rest/v1/users` | List all users (with filters) |
| `PATCH` | `/rest/v1/users?id=eq.{id}` | Update user (ban, change role) |
| `POST` | `/functions/v1/ban-user` | Ban user → auto-cancel subscription, deactivate promo code |

#### Admin Ban User Request:
```json
{ "user_id": "uuid", "reason": "Terms violation" }
```

#### Book Club Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/rest/v1/book_club_selections` | Create monthly selection |
| `PATCH` | `/rest/v1/book_club_selections?id=eq.{id}` | Update selection status |
| `POST` | `/rest/v1/book_club_events` | Create event |
| `PATCH` | `/rest/v1/book_club_events?id=eq.{id}` | Update event |
| `DELETE` | `/rest/v1/book_club_events?id=eq.{id}` | Cancel event |

#### Discussion Management

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/rest/v1/discussion_topics` | Create topic (admin only) |
| `PATCH` | `/rest/v1/discussion_topics?id=eq.{id}` | Pin/feature/edit topic |
| `DELETE` | `/rest/v1/discussion_topics?id=eq.{id}` | Soft delete topic |
| `DELETE` | `/rest/v1/discussion_posts?id=eq.{id}` | Delete any post (moderation) |

---

## 7. Mock Data Strategy

### Phase 1: OpenAPI Mock Server (Prism)

Before the backend is built, use **Prism** (from Stoplight) to serve mock responses based on the OpenAPI spec:

```bash
npx @stoplight/prism-cli mock openapi.yaml --port 4010
```

This gives your frontend a working API at `http://localhost:4010` that returns example responses defined in the spec.

### Phase 2: Next.js API Route Middleware

During development, you can also create Next.js API routes (`/app/api/`) that return hardcoded mock data derived from your existing `lib/mock-*.ts` files. This allows the frontend to use `fetch('/api/books')` before the real Supabase backend is ready.

```
/app/api/
├── books/
│   └── route.ts          → Returns mockBooks as JSON
├── cart/
│   └── route.ts          → Returns cart from localStorage (server action)
├── user/
│   └── route.ts          → Returns mockUserData
└── book-club/
    └── selections/
        └── route.ts      → Returns mockBookClubSelections
```

### Phase 3: Supabase Integration

Replace mock routes with real Supabase client calls using `@supabase/supabase-js`.

---

## 8. Pagination Convention

All list endpoints use **cursor-based pagination**:

**Request:**
```
GET /rest/v1/books?limit=20&cursor=eyJpZCI6IjEwIn0=
```

**Response envelope:**
```json
{
  "data": [ /* items */ ],
  "pagination": {
    "next_cursor": "eyJpZCI6IjIwIn0=",
    "has_more": true,
    "total_count": 45
  }
}
```

- `next_cursor` is a base64-encoded opaque token (internally encoding the last item's primary key).
- `has_more` indicates if more pages exist.
- `total_count` is included where practical (optional for performance).

---

## 9. Rate Limiting

| Endpoint Category | Rate Limit | Window |
|---|---|---|
| Auth (login/register) | 10 requests | Per minute per IP |
| Read (GET) | 100 requests | Per minute per user |
| Write (POST/PUT/DELETE) | 30 requests | Per minute per user |
| Checkout | 5 requests | Per minute per user |
| File upload | 3 requests | Per minute per user |

Rate limit headers returned on every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1708300860
```

---

## 10. Webhook Contracts

### Stripe → Supabase Edge Function

| Stripe Event | Edge Function Action |
|---|---|
| `payment_intent.succeeded` | Confirm order → update status to `confirmed` |
| `invoice.payment_succeeded` | Renew subscription → update `expires_at` |
| `invoice.payment_failed` | Update subscription → `past_due` → trigger GHL email |
| `customer.subscription.deleted` | Cancel subscription → deactivate promo code |

### Supabase → GoHighLevel

| Trigger Event | GHL Action |
|---|---|
| New user registration | Create contact + send welcome email |
| Order confirmed | Send order confirmation email |
| Subscription created | Send premium welcome email |
| Subscription cancelled | Send cancellation acknowledgment |
| Event RSVP | Send event reminder email |
| Payment failed | Send payment failure notification |
| User banned | Send ban notification |

---

## 11. Frontend Migration Map

This maps every current frontend data source to its API endpoint replacement:

| Current Source | Current Type | API Endpoint Replacement |
|---|---|---|
| `lib/mock-books.ts` | Static TypeScript file | `GET /rest/v1/books` |
| `lib/mock-book-content.ts` | Static TypeScript file | `GET /rest/v1/book_pages` + `book_illustrations` |
| `lib/mock-user-data.ts` | Static TypeScript file | `GET /rest/v1/user_library` + `orders` |
| `lib/mock-admin-data.ts` | Static TypeScript file | `GET /rest/v1/users` (admin) |
| `lib/mock-book-club-data.ts` | Static TypeScript file | `GET /rest/v1/book_club_selections` + `events` + `discussion_topics` |
| `context/cart-context.tsx` (localStorage) | Client-side state | `GET/POST/DELETE /rest/v1/cart_items` |
| `lib/reading-storage.ts` (localStorage) | Client-side state | `GET/PUT /rest/v1/reading_progress` + `highlights` + `bookmarks` + `reading_settings` |
| `localStorage("komet_subscription_active")` | Client-side flag | `GET /rest/v1/user_subscriptions` + Supabase Auth session |
| `subscription-modal.tsx` (in-component) | UI state | `POST /functions/v1/subscribe` |
| Checkout form (in-component) | UI state | `POST /functions/v1/checkout` |

---

## Appendix: OpenAPI Spec Skeleton

A starter `openapi.yaml` should be created in `/api-spec/openapi.yaml` with:

```yaml
openapi: 3.1.0
info:
  title: Kane's Komet Book Reader API
  version: 1.0.0
  description: API contract for the Kane's Komet digital bookstore and book club platform
servers:
  - url: http://localhost:54321
    description: Local Supabase
  - url: https://{project_ref}.supabase.co
    description: Production Supabase
paths:
  /rest/v1/books:
    get:
      summary: List published books
      tags: [Catalog]
      # ... full spec continues
```

The full OpenAPI spec will be generated as a separate deliverable during the implementation phase.

---

> **Next Step**: Phase 4 — Backend Implementation. With this API contract locked, the backend developer builds the Supabase tables, Edge Functions, and RLS policies to match these exact endpoints and response shapes. The frontend developer can immediately begin replacing mock data with `fetch()` calls against the Prism mock server.
