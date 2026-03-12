## ERP_v1 Monorepo

This monorepo contains the FDC Portal frontend and the FDC LAN Bridge backend that synchronize and manage operational data for Phòng khám Gia Đình.

- `fdc-portal/` – React + Vite + Supabase portal for approvals, inventory, dashboards, and admin tools.
- `fdc-lan-bridge/` – Node.js + TypeScript service that syncs data between HIS (PostgreSQL), MISA (SQL Server), and Supabase, and exposes a health endpoint.

### Local Development

- See `fdc-portal/README.md` for running the portal.
- See `fdc-lan-bridge/.env.example` and `package.json` for running the bridge service.

