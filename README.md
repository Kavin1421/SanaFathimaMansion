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
| **Auth** | `Account` collection (email/password or Google). Ledger `User` records are roommates for splits — separate from login. |
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

3. **Seed demo data** (ledger users, expenses, demo login account):

   ```bash
   npm run seed
   ```

   Demo auth (after seed): see comments in `.env.example`.

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. **Quality**

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

When enabled, `WHATSAPP_BOT_URL` and `WHATSAPP_BOT_API_KEY` must also be set or notification posts are skipped. Expense and settlement flows call `notifyWhatsAppExpense` / `notifyWhatsAppSettlementRecorded` after successful writes.

See `whatsapp-bot/` for QR login, group id, and bot env.

## Project layout (sketch)

- `app/(marketing)/` — landing
- `app/(auth)/` — login, signup, forgot-password placeholder
- `app/(app)/` — shell + dashboard, expenses, users, reports, onboarding
- `app/api/` — auth, CRUD, house, PDF, upload
- `components/` — UI, layout, marketing, auth
- `lib/` — db, auth options, validation, WhatsApp notify helpers
- `models/` — Mongoose schemas
- `services/` — domain logic
- `scripts/seed.ts` — local demo data + demo `Account`

## License

Private project — see repository owner for terms of use.
