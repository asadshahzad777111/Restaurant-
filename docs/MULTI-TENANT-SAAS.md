# Multi-tenant SaaS model

## Actors

- **Super Admin** (`/super`): create/suspend restaurants, plans, leads, Open (impersonate)
- **Restaurant Admin / Staff** (`/login`): isolated per tenant code
- **Guest** (`/order?tenant=CODE`): menu, cart, payments, track, review

## Isolation

Each restaurant has its own `tenant.json`. Orders, stock, logo, staff, and reviews never cross tenants. Sessions carry `tenantId` for staff; guests pass `tenant` / `tenantCode`.

## File store layout

```
.data/
  platform.json
  tenants/{tenantId}/tenant.json
```

Map to a DB later with the same boundaries (platform tables vs tenant-scoped tables).
