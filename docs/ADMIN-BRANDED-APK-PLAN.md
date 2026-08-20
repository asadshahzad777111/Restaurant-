# Admin branded Customer APK — isolation plan

## Goal
Har Admin apne **customers** ko apni restaurant ki APK de sake.  
Phone pe naam = restaurant name. App khulte hi **usi kitchen** ka menu/orders.  
Kisi aur restaurant se **merge / mix-up nahi**.

## Isolation rules (never break)
1. Har APK deep link mein `tenant=CODE` baked  
2. Files Super ke paas: `.data/apks/tenants/{tenantId}/customer.apk`  
3. Admin API sirf **apne** `session.tenantId` ki APK download kare  
4. Customer APK kabhi `/super`, `/control`, ya Admin login nahi khole  
5. Branding (name + logo) Settings se aati hai — WebView mein wahi dikhe

## Roles
| Who | What |
|---|---|
| **Super** | Build/upload named Staff + Customer APK per kitchen |
| **Admin** | Settings → download **Customer APK** for guests; Staff APK for own team |
| **Customer** | Install Admin-given APK → only that kitchen |

## Branding
| Layer | Source |
|---|---|
| Android app label | Build: `{Restaurant Name} Order` / `{Restaurant Name} Staff` |
| In-app header / splash | Live `branding.name` + `branding.logoUrl` (Settings) |
| Orders / menu | Same `tenant.menu` + orders for that code only |

## Shipped
- Admin `/api/admin/apks` status + download (own tenant only)  
- Settings card: logo/name preview + Customer/Staff download  
- Customer shell guest entry shows kitchen logo + name; locked APK skips code picker  
- Plan + APK docs update  

