## FDC Portal – Approval & Inventory System

FDC Portal is a React + Supabase web app for handling approval workflows, inventory visibility, and operational dashboards for Phòng khám Gia Đình. It connects to data synchronized from on‑prem HIS and MISA systems via the `fdc-lan-bridge` service.

---

## Tech Stack

- **Frontend**: React 19, React Router, Vite 6, Tailwind CSS 4
- **State & Data**: Supabase (auth + Postgres)
- **Architecture**: MVVM-style with `viewmodels/`, `app/` pages, and shared layout components

---

## Getting Started

**Prerequisites:** Node.js 20+ and a Supabase project.

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Create `.env.local` based on `.env.example` and set:

   - `VITE_SUPABASE_URL` – your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` – your Supabase anon/public key

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be available on `http://localhost:3000` by default.

---

## Build & Preview

- **Build**

  ```bash
  npm run build
  ```

- **Preview production build**

  ```bash
  npm run preview
  ```

---

## Supabase Integration (High Level)

- Auth is handled by Supabase; the portal maps authenticated users to HIS staff via the `fdc_user_mapping` table.
- Core tables used include:
  - `fdc_approval_requests`, `fdc_approval_steps`, `fdc_notifications`
  - `fdc_inventory_snapshots`, `fdc_analytics_anomalies`
  - `fdc_sync_health`, `fdc_sync_logs`

The `fdc-lan-bridge` service (separate project) is responsible for synchronizing data from HIS/MISA into these tables.
