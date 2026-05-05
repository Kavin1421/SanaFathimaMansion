# Sana Fathima Mansion

A **single-household** shared expense app: track who paid, split fairly, see balances, record settlements, and export reports. Built for roommates who want clarity without spreadsheet friction.

## Stack

- **Next.js 14** (App Router) · **React** · **TypeScript**
- **MongoDB** + **Mongoose** (expenses, ledger users, settlements, auth accounts, house settings)
- **NextAuth** (credentials + optional Google) · **JWT sessions**
- **Tailwind CSS** · **shadcn/ui** · **Framer Motion** (marketing)
- **TanStack Query** · **react-hook-form** + **Zod**

## High-level architecture

| Area | Notes |
|------|--------|
| **Auth** | `Account` collection (email/password or Google) with `role: "admin" \| "user"` and optional `ledgerUserId` linking the signed-in person to a ledger `User`. Ledger `User` records are roommates for splits — separate from login. |
| **Monthly wallet** | `HouseMonth` per `YYYY-MM` holds admin-set `budget` and `carryForwardBalances`. Expenses still live in `Expense`; totals are derived by month. |
| **Routes** | `/` marketing · `/login`, `/signup` auth · `/dashboard`, `/expenses`, `/users`, `/reports`, `/onboarding` behind middleware + session. |
| **House name** | `HouseSettings` in DB (and env fallback). Set during onboarding. |
| **APIs** | REST handlers under `app/api/*`; mutations also use server actions where applicable. |
| **WhatsApp** | Optional: Next app can call a small **whatsapp-bot** service when enabled (see below). |

## Quick start

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and set at least:

   - `MONGO_URL`
   - `NEXTAUTH_SECRET` and `NEXTAUTH_URL`

3. **Seed** — interactive in a terminal (`1` = full demo reset + sample data, `2` = super-admin account only, no deletes). Or skip the menu:

   ```bash
   npm run seed              # prompt when TTY; CI defaults to full
   npm run seed -- full      # wipe + full demo (same as option 1)
   npm run seed -- admin     # upsert super admin only (same as option 2)
   ```

   After a **full** seed: demo login and super admin — see `.env.example`. Super admin email defaults to `kavinkumar24@gmail.com` unless `SUPER_ADMIN_EMAIL` is set; password from `SEED_ADMIN_PASSWORD` (default `Admin12345!` in `scripts/seed.ts`).

4. **Existing databases** — after pulling changes, run once to backfill `splitEnabled` on old expenses:

   ```bash
   npm run migrate:expenses-split
   ```

   Set `NEXT_PUBLIC_APP_URL` (e.g. `https://your-domain.com`) so WhatsApp notifications can include deep links to `/expenses?month=YYYY-MM`.

5. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

6. **Quality**

   ```bash
   npm run lint
   npm run build
   ```

## WhatsApp integration (optional)

The main app does **not** talk to WhatsApp directly. It can POST to a companion **`whatsapp-bot`** service (`npm run bot:dev` from repo root runs the bot package).

**Feature flag (validated):** `IS_WHATSAPP_BOT_ENABLED` is read in `lib/whatsapp-notify.ts` by `isWhatsAppBotEnabled()`.

- **Disabled by default:** unset, empty, or any value other than an explicit “on” token → no HTTP calls to the bot.
- **Enabled only when** the value (trimmed) matches **`1`**, **`true`**, **`yes`**, or **`on`** (case-insensitive).
- Values like `false`, `0`, or random text are treated as **off** (regex does not match → `false`).

When enabled, `WHATSAPP_BOT_URL` and `WHATSAPP_BOT_API_KEY` must also be set or notification posts are skipped. Expense and settlement flows call `notifyWhatsAppExpense` / `notifyWhatsAppSettlementRecorded` after successful writes. Expense alerts can include wallet remaining, split vs house-expense lines, and a detail URL when `NEXT_PUBLIC_APP_URL` is set; month reset uses `notifyWhatsAppMonthReset`.

See `whatsapp-bot/` for QR login, group id, and bot env.

## Engagement cron endpoints

- `POST /api/cron/reminders` — daily reminders for users with negative balance (email + WhatsApp group summary)
- `POST /api/cron/monthly-summary` — month-end broadcast of totals/top spender/remaining budget
- Both endpoints require header `x-cron-secret: <CRON_SECRET>`

## Project layout (sketch)

- `app/(marketing)/` — landing
- `app/(auth)/` — login, signup, forgot-password placeholder
- `app/(app)/` — shell + dashboard, expenses, users, reports, audit logs (super admin), onboarding
- `app/api/` — auth, CRUD, house, PDF, upload
- `components/` — UI, layout, marketing, auth
- `lib/` — db, auth options, validation, WhatsApp notify helpers
- `models/` — Mongoose schemas
- `services/` — domain logic
- `scripts/seed.ts` — local demo data + demo `Account`

## Product notes (household finance)

- **House expense** (`splitEnabled: false`): counts toward the monthly wallet total but does **not** change ledger user balances (no IOU movement).
- **Super admin** (email-based): `SUPER_ADMIN_EMAIL` (default `kavinkumar24@gmail.com`) can edit/delete any expense, invite/edit/delete ledger users, set monthly budget, start new month (WhatsApp reset), balance override, and open **Audit logs**. Invites require `name + email`, create users with `status: invited`, and send styled HTML email when `EMAIL_USER` / `EMAIL_PASSWORD` are configured. On sign-in with a matching email, the ledger user is auto-activated (`status: active`) and linked to the account.
- **Audit logs**: append-only `AuditLog` collection (expense create/update/delete, budget, month reset, user changes, balance override, sign-in). `/audit-logs` and `GET /api/audit-logs` are super-admin only.
- **Expense images**: the client uploads to `/api/upload` first, then saves the expense with the Cloudinary URL; WhatsApp notifications run asynchronously and failures are logged only (they do not roll back the expense).
- **Balance override**: direct `User.balance` changes may be overwritten the next time balances are recomputed from expenses; treat as a temporary adjustment unless you add durable override bookkeeping.

## License

Private project — see repository owner for terms of use.
