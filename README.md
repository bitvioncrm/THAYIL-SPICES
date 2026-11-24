# Thayil Cardamom Spices — Farmer & Billing

Premium, simplified Cardamom Farmer & Billing Management for **THAYIL CARDAMOM SPICES**.

Opens directly to **Overview** — **no login**.

## Three modules

1. **Overview** — KPIs (default filter: **Today**), charts, activity, outstanding balances  
2. **Farmers** — registration, farmer-specific rates, **Add Daily Entry** (green / dry / labour)  
3. **Billing** — daily / weekly / monthly / yearly / custom period bills + PDF  

Settings (logo, rates, demo data) lives at the bottom of the sidebar.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173 — demo farmers load automatically on first empty start.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Unit tests |

## Persistence

Local IndexedDB (`thayil_cardamom_simple`) via Dexie. Not cloud-synced by default.  
Optional SQL: `supabase/migrations/002_simple_farmer_billing.sql`  
Never put service-role keys in the frontend.

## Demo data

Settings → **Load demo data** / **Clear demo data**. Records are tagged **DEMO DATA**.

## Mobile

Bottom nav: Overview · Farmers · Billing

# THAYIL-SPICES

