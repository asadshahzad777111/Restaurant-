# Super Passwords & Gmail

## Where (control.asfins.com)

1. Sign in as Super → **Your restaurants**
2. Click **Passwords & Gmail** on a restaurant row (blue highlighted button)
3. Panel shows each user’s **username**, **password** (Super copy), and **Gmail**
4. Edit + Save — values stay after refresh

**Open Admin (no password)** is unchanged Help mode (no kitchen password needed).

## What Super can see

| Field | Always? | Notes |
| --- | --- | --- |
| Username | Yes | |
| Gmail / email | Yes | Editable for Google sign-in |
| Password | When Super (or system) has a recoverable copy | Login uses scrypt hash; Super stores `superKnownPassword` when creating a kitchen or resetting here |

Older kitchens hashed before this copy existed may show “Not recoverable” — set a new password once in the panel; it stays visible afterward.

## Security

- Plaintext Super copy is **never** returned on staff/public/auth APIs or backups
- Only `POST /api/super/tenants` with Super session (`credentials` / `setUserCreds`)
