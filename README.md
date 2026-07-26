# Passura - Buku Besar Adat Digital

> Buku Besar Adat Digital — Toraja's open-source offline-first ledger system.

Passura App is a local-first SPA migrated from [passura-digital](https://github.com/rasyidf/passura-digital) (Next.js + Payload CMS) to a fully offline-capable progressive web app backed by IndexedDB. Data optionally syncs to a Cloudflare Workers + D1 backend when online.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (v1) — Vite + React 19 |
| Routing | TanStack Router (file-based, type-safe) |
| Local DB | [Dexie.js](https://dexie.org/) (IndexedDB) |
| UI | shadcn/ui + Radix UI + Tailwind CSS v4 |
| Server State | TanStack Query v5 |
| Forms | React Hook Form |
| PWA | vite-plugin-pwa + Workbox |
| Backend | [Hono](https://hono.dev/) on Cloudflare Workers |
| DB (server) | Cloudflare D1 + [Drizzle ORM](https://orm.drizzle.team/) |
| Runtime | Bun |
| Deploy | Cloudflare Workers / Pages |

---

## Architecture

```
Browser (SPA + PWA)
├── TanStack Start (Vite)
├── TanStack Router   — file-based routes under src/routes/
│   └── /dashboard/*  — ssr: false (pure client, reads Dexie)
├── Dexie.js          — IndexedDB: clans, elders, loans, receipts, …
├── shadcn UI         — all primitives in src/components/ui/
├── Screen components — src/components/screen/<entity>/
└── Sync layer        — src/sync/ → CloudflareD1Adapter or NoopAdapter

Cloudflare Workers (optional, when online)
├── Hono API          — api/src/index.ts
├── POST /api/auth/login
├── POST /api/sync/push   — receive client changes
├── GET  /api/sync/pull   — send server changes
└── /api/:entity          — generic CRUD (GET, POST, PATCH, DELETE)
       └── Drizzle ORM → D1 (SQLite)
```

### Key design decisions

- **Offline-first** — app works 100% without a server after first load. All writes go to Dexie, marked `syncStatus: "pending"`.
- **Routes are thin** — every dashboard route is a 5-line file that just imports a screen component. All UI logic lives in `src/components/screen/`.
- **No vendor lock-in** — sync is interface-based (`SyncAdapter`). Swap `CloudflareD1Adapter` for Supabase, AWS, or `NoopAdapter` (pure offline).
- **Same auth model** — PBKDF2-SHA256 via Web Crypto API in the browser; identical algorithm used in the Hono backend, so password hashes are portable.

---

## Project Structure

```
passura-app/
├── api/                        # Hono backend (Cloudflare Workers)
│   └── src/
│       ├── db/schema.ts        # Drizzle schema (mirrors Dexie)
│       ├── lib/auth.ts         # JWT + PBKDF2
│       ├── middleware/         # CORS, requireAuth, requireRole
│       └── routes/             # auth, sync, entities
├── drizzle/                    # D1 migrations
├── public/images/              # Landing page images
├── src/
│   ├── auth/                   # Local auth (PBKDF2, session in IndexedDB)
│   ├── components/
│   │   ├── layout/             # Sidebar, SyncStatusBar
│   │   ├── screen/             # All dashboard screens (CRUD)
│   │   │   ├── clans/
│   │   │   ├── loans/
│   │   │   ├── receipts/
│   │   │   ├── handovers/
│   │   │   ├── obligations/
│   │   │   ├── groups/
│   │   │   ├── participants/
│   │   │   ├── animal-types/
│   │   │   └── dashboard/      # PendingActionsPanel
│   │   └── ui/                 # shadcn primitives
│   ├── db/
│   │   ├── local-db.ts         # Dexie schema
│   │   ├── types.ts            # TypeScript entity types
│   │   ├── seed.ts             # Demo data (seeded on first login)
│   │   └── repositories/       # Generic Dexie CRUD + sync log
│   ├── hooks/
│   │   ├── useLocalQuery.ts    # Replaces useCollection()
│   │   ├── useLocalMutation.ts # Replaces useCreateDoc/useUpdateDoc/useDeleteDoc
│   │   └── useSync.ts          # Push/pull orchestration
│   ├── routes/
│   │   ├── __root.tsx          # HTML shell, providers
│   │   ├── index.tsx           # Landing page (SSR)
│   │   ├── login.tsx           # Split-pane login (client-only)
│   │   └── dashboard/          # One file per entity, all ssr: false
│   └── sync/
│       ├── sync-adapter.ts     # Interface
│       └── adapters/
│           ├── cloudflare-d1.ts
│           └── noop.ts
├── drizzle.config.ts
├── vite.config.ts              # TanStack Start + PWA
├── vite.config.cloudflare.ts   # Variant with @cloudflare/vite-plugin
└── wrangler.api.jsonc          # API worker config
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.3+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) v4+ (for API dev/deploy)

### Frontend (SPA)

```bash
bun install
bun run dev          # http://localhost:3000
bun run build        # production build
bun run preview      # preview production build
```

### Backend (Hono API)

```bash
# Start local API worker (uses Wrangler's local D1)
bun run dev:api      # http://localhost:8787

# Generate a new D1 migration after schema changes
bun run db:generate

# Apply migrations locally
bun run db:migrate:local

# Apply migrations to remote D1
bun run db:migrate:remote
```

### Environment

Copy `.env.local` and set your API URL:

```bash
# .env.local (already created, defaults to local wrangler dev)
VITE_API_URL=http://localhost:8787
```

For production, set `VITE_API_URL` to your deployed worker URL.

---

## Demo Credentials

Seeded automatically on first visit to `/login`:

| Account | Email | Password |
|---|---|---|
| Superadmin | `admin@passura.local` | `passura123` |
| Elder (validator) | `rante-ne-tato-dena@passura.local` | `elder123` |
| Elder (participant) | `buntu-pune-ambe-rante@passura.local` | `elder123` |

> **First login?** Click **"Reset data demo"** at the bottom of the login page to wipe and re-seed IndexedDB with the latest demo data.

---

## Dashboard Features

| Screen | Description |
|---|---|
| **Dasbor** | Metric cards (clans, loans, receipts, handovers) + PendingActionsPanel |
| **Grup** | Event groups — CRUD with DataTable |
| **Clan** | Tongkonan households — CRUD |
| **Silsilah** | Participants / lineage — CRUD with clan filter |
| **Kewajiban** | Obligations between clans — CRUD |
| **Penerimaan** | Receipts (donations received) — CRUD with status filter |
| **Penyerahan** | Handovers (donations given) — CRUD |
| **Utang Piutang** | Loans — DataTable with status filter + quick repayment dialog |
| **Jenis Hewan** | Animal types & prices — CRUD with category filter |
| **Profil & Backup** | Export all data as JSON backup |

### PendingActionsPanel (Dashboard Quick Actions)

The dashboard shows actionable items with one-click buttons:
- **Approve / Reject** loans with `requested` status
- **Activate** loans with `approved` status
- **Mark settled** receipts with `pending` settlement status

---

## Sync

The sync layer is optional and pluggable. Configure it via `src/sync/adapters/`.

### With Cloudflare D1

1. Create a D1 database:
   ```bash
   wrangler d1 create passura-sync
   ```
2. Update `wrangler.api.jsonc` with your `database_id`.
3. Set a `JWT_SECRET` via Wrangler secrets:
   ```bash
   wrangler secret put JWT_SECRET --config wrangler.api.jsonc
   ```
4. Run migrations and deploy:
   ```bash
   bun run db:migrate:remote
   bun run deploy:api
   ```
5. Set `VITE_API_URL` to your worker URL in production.

### Sync flow

```
Client                          Server (Hono + D1)
  │  POST /api/auth/login          │
  │ ──────────────────────────────>│  Returns JWT
  │                                │
  │  POST /api/sync/push           │
  │  { entries: [...syncLog] } ───>│  Writes to D1, returns accepted/rejected
  │                                │
  │  GET /api/sync/pull?since=N    │
  │ <──────────────────────────────│  Returns all entities updated since N
  │                                │
  │  Apply pulled entities         │
  │  to local Dexie tables         │
```

---

## Deployment

### Frontend → Cloudflare Workers (with server functions)

```bash
# Use the Cloudflare-specific vite config
vite build --config vite.config.cloudflare.ts
wrangler deploy
```

### Frontend → Vercel / Netlify / Static CDN

```bash
bun run build       # outputs to dist/
# Deploy dist/ as a static site
```

### API → Cloudflare Workers

```bash
bun run deploy:api
```

---

## Entity Data Model

| Entity | Key Fields |
|---|---|
| `clans` | id, name, region, lineageHead |
| `elders` | id, name, email, passwordHash, salt, clan, role |
| `participants` | id, name, clan, role (head/member/ancestor), next |
| `groups` | id, name, eventName, description, members[] |
| `animalTypes` | id, name, category, breed, quality, price |
| `loans` | id, lender, borrower, loanType, status, repayments[], remainingValue |
| `receipts` | id, receiver, giver, assetType, calculatedValue, settlementStatus |
| `handovers` | id, fromClan, toClan, assetType, calculatedValue |
| `obligations` | id, giver, receiver, paymentType, quantity, event |
| `syncLog` | id, entityType, entityId, action, syncStatus |

Each entity has `syncStatus: "local" | "pending" | "synced" | "conflict"`.

---

## License

MIT — see [LICENSE](./LICENSE.md)
