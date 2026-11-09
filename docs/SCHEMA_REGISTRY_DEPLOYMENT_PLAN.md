# Dedicated Design Token Schema Registry Deployment Plan

> **Implementation Status:**
> - ✅ **In-App Self-Hosted Schema Registry (`/api/v1/schemas/*`)**: **Developed & Active** — All 182 Draft 2020-12 / DTCG 2025.10 schemas ([`data/schemaCatalog.ts`](file:///d:/GitHub/second-screen/data/schemaCatalog.ts) & [`utils/dtcgSchemaGenerator.ts`](file:///d:/GitHub/second-screen/utils/dtcgSchemaGenerator.ts)), wildcard CORS (`GET`, `HEAD`, `OPTIONS`), caching headers, and dynamic origin resolution are 100% implemented and running natively inside this application.
> - ⏳ **Standalone Custom Subdomain CDN (`registry.yourdomain.com`)**: **Optional Future Guide** — Use the steps below only if you wish to mirror the 182 schemas onto a separate standalone GitHub repository and custom domain outside the main Next.js app.

This document outlines the architectural plan, repository structure, automation scripts, and deployment steps to host your own dedicated Schema Registry (e.g. `https://registry.yourdomain.com`) using **GitHub**, **Vercel**, and your **custom domain**.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│            (e.g., github.com/your-org/schema-registry)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ git push
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Vercel Edge Network / CDN                  │
│       - Global Edge Caching (sub-20ms latency)              │
│       - Wildcard CORS (Access-Control-Allow-Origin: *)      │
│       - Automatic SSL / TLS certificates                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       Custom Domain                         │
│            https://registry.yourdomain.com/                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         ▼                                           ▼
┌─────────────────────────┐             ┌─────────────────────────┐
│  Second Screen Web App  │             │   Figma Plugin, IDEs    │
│  (Token Studio Manager) │             │    & CI/CD Pipelines    │
└─────────────────────────┘             └─────────────────────────┘
```

---

## 2. Dedicated Registry Repository Structure

Create a separate, lightweight GitHub repository named `schema-registry` (or `design-tokens-registry`).

```
schema-registry/
├── .gitignore
├── README.md
├── vercel.json                 # CORS headers & edge cache rules
└── public/
    └── api/
        └── v1/
            └── schemas/
                ├── types/tokens/
                │   ├── color/0/schema.json
                │   ├── fontSize/0/schema.json
                │   ├── dimension/0/schema.json
                │   └── ...
                ├── color-spaces/
                │   ├── oklch-color/0/schema.json
                │   ├── p3/0/schema.json
                │   └── ...
                ├── functions/
                │   ├── apca-contrast/0/schema.json
                │   ├── harmonize/0/schema.json
                │   └── ...
                └── targets/
                    ├── android-xml/0/schema.json
                    ├── flutter/0/schema.json
                    ├── jetpack-compose/0/schema.json
                    └── ...
```

---

## 3. Vercel Configuration (`vercel.json`)

Place this file at the root of the new repository. It enables wildcard CORS (so Figma plugins and external web applications can fetch schemas without browser security blocks) and sets immutable 1-year HTTP caching:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, HEAD, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" },
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

---

## 4. Automated Schema Export Script

You can generate all 182 schema files directly from this codebase using a simple export script.

### Create `scripts/export-schemas.js` in `second-screen`:
```javascript
const fs = require("fs");
const path = require("path");

// Target export directory
const OUTPUT_DIR = path.resolve(__dirname, "../../schema-registry/public");

// Read schema catalog
const { SCHEMA_CATALOG } = require("../data/schemaCatalog");

console.log(`Exporting ${SCHEMA_CATALOG.length} schemas to ${OUTPUT_DIR}...`);

SCHEMA_CATALOG.forEach((item) => {
  // item.schemaUrl format: /api/v1/schemas/types/tokens/fontSize/0/schema.json
  const relativePath = item.schemaUrl.replace(/^\//, "");
  const targetFilePath = path.join(OUTPUT_DIR, relativePath);
  const targetDir = path.dirname(targetFilePath);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const schemaContent = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `https://registry.yourdomain.com/${relativePath}`,
    title: item.name,
    description: item.description,
    type: "object",
    properties: {
      $type: {
        type: "string",
        description: "The design token type identifier."
      },
      $value: {
        description: "The value of the design token conforming to this schema."
      },
      $description: {
        type: "string",
        description: "An optional explanation of the token purpose."
      }
    },
    required: ["$value"],
    additionalProperties: true
  };

  fs.writeFileSync(targetFilePath, JSON.stringify(schemaContent, null, 2), "utf8");
});

console.log("Schema export complete!");
```

---

## 5. Deployment Steps

### Step 1: Push to GitHub
```bash
cd schema-registry
git init
git add .
git commit -m "feat: initial design token schema registry release (182 schemas)"
git branch -M main
git remote add origin https://github.com/your-org/schema-registry.git
git push -u origin main
```

### Step 2: Connect Repository to Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select the `schema-registry` repository.
4. Leave framework preset as **Other** (pure static).
5. Click **Deploy**. Vercel will deploy the site to a URL like `schema-registry-your-name.vercel.app`.

### Step 3: Configure Custom Subdomain
1. In Vercel, open your project -> **Settings** -> **Domains**.
2. Enter your desired subdomain: `registry.yourdomain.com` (or `schemas.yourdomain.com`).
3. In your DNS provider (Cloudflare, GoDaddy, Namecheap, Route 53, etc.), create a DNS record:
   - **Type:** `CNAME`
   - **Name:** `registry`
   - **Target / Value:** `cname.vercel-dns.com`
   - **Proxy status:** DNS only (or standard proxy if using Cloudflare).
4. Vercel automatically verifies the domain and provisions a free SSL certificate within 1–2 minutes.

---

## 6. Connecting the Registry to Second Screen

Once your custom domain is live, you can switch the web application to use it with **one environment variable**:

### 1. Update `.env.local`:
```env
NEXT_PUBLIC_SCHEMA_REGISTRY_URL=https://registry.yourdomain.com
```

### 2. Update `data/schemaCatalog.ts`:
Change the schema URL base resolution:
```typescript
const REGISTRY_BASE = process.env.NEXT_PUBLIC_SCHEMA_REGISTRY_URL || "/api/v1/schemas";

// In SCHEMA_CATALOG items:
schemaUrl: `${REGISTRY_BASE}/types/tokens/fontSize/0/schema.json`
```

---

## 7. Operational Checklist

- [x] **In-App Catalog & Generator (`data/schemaCatalog.ts` & `utils/dtcgSchemaGenerator.ts`)**: All 182 schema definitions implemented and validated (**✅ Developed**).
- [x] **In-App CORS & Caching (`/api/v1/schemas/[...path]/route.ts`)**: Wildcard CORS (`access-control-allow-origin: *`) and cache headers active on local registry (**✅ Developed**).
- [ ] *(Optional External Repo)* All 182 static schema files exported to standalone `schema-registry` repo.
- [ ] *(Optional External Domain)* Custom subdomain (`https://registry.yourdomain.com`) & SSL certificate configured on Vercel.
- [ ] *(Optional External Domain)* `NEXT_PUBLIC_SCHEMA_REGISTRY_URL` pointed to custom domain if separating from main app origin.
