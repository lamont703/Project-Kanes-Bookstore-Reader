# Kane's Komet — API Specification & Testing

This directory contains the machine-readable API contract and Bruno test collection for the Kane's Komet Book Reader backend.

---

## Directory Structure

```
api-spec/
├── openapi.yaml               # OpenAPI 3.1 specification (tags + server definitions)
└── bruno/                     # Bruno API collection (Git-tracked, no cloud sync needed)
    ├── bruno.json             # Collection config
    ├── environments/
    │   ├── local.bru          # Local Supabase (http://localhost:54321)
    │   └── production.bru     # Hosted Supabase instance
    ├── auth/
    │   ├── register.bru       # POST /auth/v1/signup
    │   ├── login.bru          # POST /auth/v1/token  ← captures JWT automatically
    │   └── logout.bru         # POST /auth/v1/logout
    ├── books/
    │   ├── list-books.bru     # GET /rest/v1/books
    │   ├── get-book.bru       # GET /rest/v1/books?id=eq.{id}
    │   └── get-book-pages.bru # GET /rest/v1/book_pages?book_id=eq.{id}
    ├── cart/
    │   ├── get-cart.bru       # GET /rest/v1/cart_items
    │   └── add-to-cart.bru    # POST /rest/v1/cart_items
    ├── orders/
    │   └── checkout.bru       # POST /functions/v1/checkout  (Edge Function)
    ├── reading/
    │   └── save-progress.bru  # PUT /rest/v1/reading_progress
    └── promo-codes/
        └── validate-promo.bru # POST /functions/v1/validate-promo (Edge Function)
```

---

## Quick Start

### 1. Install Bruno
Download the free Bruno desktop app from [usebruno.com](https://www.usebruno.com) or install the CLI:
```bash
npm install -g @usebruno/cli
```

### 2. Open the Collection
In the Bruno app, click **"Open Collection"** and select the `api-spec/bruno/` folder.

### 3. Set Your Environment
In Bruno, select the **local** environment and fill in your Supabase `anon_key`:
- Edit `environments/local.bru` and replace `<your-supabase-anon-key>` with your actual key.

### 4. Run Auth First
Always run `login.bru` first — it auto-captures your JWT and stores it as `auth_token` for all subsequent authenticated requests.

### 5. Run the Full Collection via CLI
```bash
cd api-spec/bruno
npx @usebruno/cli bru run --env local
```

---

## Adding New Requests

As each Edge Function or REST endpoint is built, add a corresponding `.bru` file in the appropriate folder. Follow the pattern in existing files:

```bru
meta {
  name: My New Request
  type: http
  seq: 4
}

post {
  url: {{base_url}}/functions/v1/my-function
  body: json
  auth: bearer
}

auth:bearer {
  token: {{auth_token}}
}

headers {
  apikey: {{anon_key}}
  Content-Type: application/json
}

body:json {
  {
    "example": "payload"
  }
}

tests {
  test("Status is 201", function() {
    expect(res.status).to.equal(201);
  });
}
```

---

## Key Environment Variables

| Variable | Description | Set In |
|---|---|---|
| `base_url` | Supabase project URL | `environments/local.bru` or `production.bru` |
| `anon_key` | Supabase anonymous key (public, safe to commit) | `environments/*.bru` |
| `auth_token` | JWT — auto-set by `login.bru` | Captured at runtime |

> ⚠️ **Never commit** your `service_role_key` to this file. Only the `anon_key` is safe to commit.

---

## References

- **API Contract**: [`../docs/phase3-api-design-technical.md`](../docs/phase3-api-design-technical.md)
- **Backend Architecture**: [`../docs/phase4-backend-architecture-technical.md`](../docs/phase4-backend-architecture-technical.md)
- **Data Model**: [`../docs/backend-data-model-recommendation.md`](../docs/backend-data-model-recommendation.md)
- **Frontend → Backend Mapping**: See the Appendix in the data model doc
