# Product / backend plan

## APIs

- `POST/GET/DELETE /api/auth` — Super or tenant login; Bearer session
- `GET /api/state` — Auth → full tenant state; else `?tenant=CODE` public menu
- `PUT /api/admin` — Menu/shop/branding/stock/staff (permission gated)
- `POST /api/orders` + `PATCH /api/orders/[id]`
- `GET /api/track/[token]`
- `POST /api/reviews`
- `GET/POST /api/leads`
- `GET/POST /api/super/tenants`

Client token key: `restaurant_pos_token_v2`.

## Payment scheme

| Mode | Choices |
|---|---|
| Table | Pay at counter |
| Pickup | Pay at counter or Paid in advance |
| Delivery | COD or Paid in advance |
| Counter POS | cash / card / wallet |

## Non-goals (MVP)

- Native APK / ESC/POS hardware
- Real JazzCash/card gateway
- Full supplier/finance ledger
