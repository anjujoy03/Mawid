# Mawid · موعد

Online booking for small service businesses (barbershops, salons, small clinics) in Saudi Arabia, in both Arabic and English.

Customers choose a service and a time, pay a small deposit, and get a WhatsApp confirmation. A reminder goes out a day before. The owner gets a simple dashboard showing who's coming today.

<!-- Add 2–3 screenshots here: home (Arabic), booking flow (mobile), admin dashboard -->

## Why I built this

A lot of small shops around me still take bookings through WhatsApp voice notes and a paper notebook. When they're busy, double bookings and no-shows are common. Most booking SaaS products are either English-only or far too heavy for a two-chair barbershop.

I wanted to build the whole thing end to end, the way I'd build it for a real client: Arabic first, mobile first, real payments, real messaging, and code that another developer could pick up.

## What it does

**For customers** (Arabic by default, English one tap away)
- See services with prices, durations and whether a deposit is needed
- Pick a day and an open time slot. Slots are calculated from working hours, existing bookings and service length
- Enter a name and phone number. The phone field accepts Arabic digits (٠٥٠…), `+966`, spaces, whatever people actually type
- Pay the deposit through **Moyasar** (mada / Visa / Apple Pay), or skip payment entirely for services with no deposit
- Get a **WhatsApp** confirmation, then a reminder 24h before

**For the owner**
- Daily view of bookings, with mark completed / no-show / cancel
- Stats: today, upcoming, deposits collected this week, no-shows this week
- Services management API (bilingual names, price, deposit, active/inactive)

## Stack

| | |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Backend | Node.js 20, Express 5, TypeScript, Zod |
| Database | PostgreSQL 16 + Prisma |
| Integrations | Moyasar (payments), WhatsApp Cloud API |
| Tooling | Vitest + Supertest, Docker Compose, GitHub Actions |

```
apps/
  api/   REST API: bookings, payments, auth, admin, reminder job
  web/   Next.js site: customer booking flow + owner dashboard
```

## Decisions worth explaining

**Double bookings.** Two people tapping the same 7:30 slot at the same moment is the main thing that can go wrong. Booking creation runs in a `SERIALIZABLE` transaction, so Postgres aborts one of the two and that person sees "someone just took that time" and the slot list refreshes. I also looked at a Postgres exclusion constraint on `tsrange`. It's stronger, but it can't express "unpaid bookings only block the slot for 15 minutes", so I chose the transaction.

**Unpaid bookings hold the slot for 15 minutes.** Without this, people who open checkout and leave would block slots forever. With it, the slot frees itself and no cleanup job is needed.

**Never trust the payment redirect or the webhook body.** The webhook is checked with a constant-time comparison of Moyasar's shared secret, and the invoice is then fetched back from Moyasar before anything is marked paid. Marking a booking paid is idempotent, so the webhook and the "customer came back from checkout" check can both run without sending two WhatsApp messages.

**Money in halalas.** All amounts are integers (1 SAR = 100 halalas). No floats anywhere near money.

**Time zones.** Slots are generated in the business's timezone (`Asia/Riyadh`) and stored in UTC. The frontend formats with `ar-SA-u-ca-gregory`, because plain `ar-SA` gives you Hijri dates, which isn't what people expect for an appointment.

**RTL done properly.** `dir="rtl"` on `<html>`, Tailwind logical properties (`text-start`, `ps-*`, `ms-*`) instead of left/right, and phone numbers/times wrapped in an LTR isolate so `+966 50…` doesn't get scrambled inside Arabic text.

**Same-origin API.** The browser only talks to the Next.js app, which proxies `/api/*` to the API. The admin session is an `httpOnly`, `SameSite=Lax` cookie, and there's no CORS setup to get wrong.

**Works without any API keys.** If Moyasar keys aren't set, checkout is replaced by a "simulate payment" button. If WhatsApp isn't set, messages are logged. Anyone can clone the repo and click through the full flow in a couple of minutes.

## Running it locally

You need Node 20+ and Docker (for Postgres).

```bash
cp .env.example .env
npm install
docker compose up -d db
npm run db:migrate      # applies migrations
npm run db:seed         # demo services, working hours, admin user
npm run dev             # api on :4000, web on :3000
```

- Customer site: http://localhost:3000
- Owner dashboard: http://localhost:3000/ar/admin. Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`

Or run everything in containers:

```bash
docker compose up --build
docker compose exec api npx tsx prisma/seed.ts
```

### Tests

```bash
npm test
```

The unit tests cover the pieces most likely to break quietly: slot generation (timezone offsets, overlaps, lead time), Saudi phone normalisation, and webhook secret checks. The HTTP tests cover validation, auth guards and error shapes. CI runs typecheck, tests and a full build against a real Postgres service on every push.

### Real integrations

- **Moyasar:** set `MOYASAR_SECRET_KEY` (a test key works) and `MOYASAR_WEBHOOK_SECRET`, then point the webhook at `https://<your-domain>/api/payments/moyasar/webhook`.
- **WhatsApp:** create two templates in Meta Business Manager named `booking_confirmed` and `booking_reminder`, each with three body variables (name, service, date/time), in both `ar` and `en`. Then set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.

## API overview

| Method | Path | |
|---|---|---|
| GET | `/services` | Active services |
| GET | `/services/:id/availability?date=YYYY-MM-DD` | Open slots |
| POST | `/bookings` | Create booking → returns `paymentUrl` if a deposit is needed |
| GET | `/bookings/:id` | Public booking status |
| POST | `/bookings/:id/sync-payment` | Re-check payment with Moyasar |
| POST | `/payments/moyasar/webhook` | Moyasar webhook |
| POST | `/auth/login` · `/auth/logout` · GET `/auth/me` | Owner session |
| GET | `/admin/bookings?date=` · `/admin/stats` · `/admin/services` | Dashboard data |
| PATCH | `/admin/bookings/:id` | Change status |
| POST/PATCH | `/admin/services[/:id]` | Manage services |

## What's not done yet

Things I'd do next, roughly in order:

- **Multiple staff.** Right now the shop is treated as one chair. Bookings need a `staffId`, and availability becomes per-staff.
- **Prayer-time breaks.** Many shops close for ~20 minutes at each prayer. This could be generated from a prayer-times API instead of being entered by hand.
- **Refund flow** for cancellations, using Moyasar's refund API.
- **Services management UI** in the dashboard (the API exists, but the screen doesn't yet).
- **Multi-tenant.** One deployment per business is fine for now. Going SaaS needs a `businessId` on everything and per-tenant settings.
- An integration test suite that runs against the CI Postgres, especially for the concurrent-booking case.
