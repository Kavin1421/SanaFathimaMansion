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
| **Telegram** | Optional **Bot API** alerts when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set (see below). |

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

5. **Dev-only DB wipe (keeps one login)** — clears expenses, settlements, audit logs, notification events, house months, house settings, and deletes every **Account** / **User** except the preserved email. Requires `ALLOW_DB_CLEAN=true`; refuses `VERCEL_ENV=production`. Preserved email defaults to `SUPER_ADMIN_EMAIL`, then `kkavinkumar24@gmail.com`.

   ```bash
   ALLOW_DB_CLEAN=true npm run db:clean:dev
   ```

   Override which login to keep: `PRESERVE_ACCOUNT_EMAIL=you@example.com ALLOW_DB_CLEAN=true npm run db:clean:dev`. Do **not** add `ALLOW_DB_CLEAN` to production env vars.

6. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

   Optional: set `NEXT_PUBLIC_APP_URL` or `APP_URL` (e.g. `https://your-domain.com`) so Telegram notifications can link to `/expenses?month=YYYY-MM`.

7. **Quality**

   ```bash
   npm run lint
   npm run build
   ```

## Telegram notifications (optional)

Outbound alerts use the **Telegram Bot HTTP API** from `services/telegram.ts` (via `axios`). No browser, Puppeteer, or QR login.

Set:

- `TELEGRAM_BOT_TOKEN` — from [@BotFather](https://t.me/BotFather)
- `TELEGRAM_CHAT_ID` — group or user id to receive messages (add the bot to the group if needed)

When either variable is missing, notification sends are **skipped** (logged as skipped in **Notification events**). Expenses, settlements, month reset, budget updates, and cron summaries call `lib/telegram-notify.ts` helpers; failures never roll back database writes.

## Engagement cron endpoints

- `POST /api/cron/reminders` — daily reminders for users with negative balance (email + Telegram group summary when configured)
- `POST /api/cron/monthly-summary` — month-end broadcast of totals/top spender/remaining budget
- Both endpoints require header `x-cron-secret: <CRON_SECRET>`

## Project layout (sketch)

- `app/(marketing)/` — landing
- `app/(auth)/` — login, signup, forgot-password placeholder
- `app/(app)/` — shell + dashboard, expenses, users, reports, audit logs (super admin), onboarding
- `app/api/` — auth, CRUD, house, PDF, upload
- `components/` — UI, layout, marketing, auth
- `lib/` — db, auth options, validation, Telegram notify helpers
- `models/` — Mongoose schemas
- `services/` — domain logic
- `scripts/seed.ts` — local demo data + demo `Account`

## Product notes (household finance)

- **House expense** (`splitEnabled: false`): counts toward the monthly wallet total but does **not** change ledger user balances (no IOU movement).
- **Super admin** (email-based): `SUPER_ADMIN_EMAIL` (default `kavinkumar24@gmail.com`) can edit/delete any expense, invite/edit/delete ledger users, set monthly budget, start new month (Telegram reset notice), balance override, and open **Audit logs**. Invites require `name + email`, create users with `status: invited`, and send styled HTML email when `EMAIL_USER` / `EMAIL_PASSWORD` are configured. On sign-in with a matching email, the ledger user is auto-activated (`status: active`) and linked to the account.
- **Audit logs**: append-only `AuditLog` collection (expense create/update/delete, budget, month reset, user changes, balance override, sign-in). `/audit-logs` and `GET /api/audit-logs` are super-admin only.
- **Expense images**: the client uploads to `/api/upload` first, then saves the expense with the Cloudinary URL; Telegram notifications run asynchronously and failures are logged only (they do not roll back the expense).
- **Balance override**: direct `User.balance` changes may be overwritten the next time balances are recomputed from expenses; treat as a temporary adjustment unless you add durable override bookkeeping.

## License

Private project — see repository owner for terms of use.
