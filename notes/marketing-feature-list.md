# Sana Fathima Mansion — Marketing & promotion feature list

Derived from the codebase (`README.md`), product notes (`notes/product-review-and-roadmap-2026-05-06.md`), and implemented capabilities (including Smart Pre-Bills). Use for landing copy, one-pagers, ads, and pitch decks.

---

## One-line positioning

**Sana Fathima Mansion** — A calm, single-household app for shared expenses: who paid, fair splits, live balances, settlements, and optional Telegram updates—without spreadsheet friction.

---

## Headline benefits (hero / ads)

- **One home, one ledger** — Built for one flat / household, not generic “groups.”
- **Fair splits, automatic balances** — See who owes whom without redoing the math.
- **From receipt to clarity** — Log expenses fast; optional bill photos (Cloudinary).
- **Close the loop** — Record settlements and optional nudges when balances shift.
- **Household in the loop** — Optional **Telegram** alerts for expenses, month events, and shopping lists.
- **Plan before you spend** — **Smart Pre-Bills**: shared shopping lists, finalize, and checklist-style “purchased” tracking.

---

## Core product features (today)

| Theme | Promo language |
|--------|----------------|
| **Expenses** | Add rent, groceries, bills; who paid; categories; optional receipt image. |
| **Splits** | Shared splits vs **house expenses** (wallet total without balance noise). |
| **Balances** | Live roommate balances derived from expenses and splits. |
| **Monthly wallet** | Month-scoped view with **budget** and carry-forward context. |
| **Settlements** | Record transfers; policies so the right people can confirm. |
| **Household users** | Invite by email; **invited → active** lifecycle; link login to ledger profile. |
| **Auth** | Email/password + **optional Google**; JWT sessions. |
| **Reports** | Export / reporting (e.g. PDF flows in the app). |
| **Admin & trust** | **Super admin** (email-gated): sensitive ops + **audit logs** for accountability. |
| **Notifications** | Optional **Telegram** bot (expenses, settlements, budget/month events, pre-bills). |
| **Engagement** | Cron-friendly **reminders** and **monthly summary** (when configured). |
| **Collaboration** | **Comments and reactions** on expenses. |
| **Preferences** | **Reminder preferences** (channels, quiet hours, frequency) per user. |

---

## Smart Pre-Bills (differentiator)

- **Shared shopping lists** before you shop (draft → finalize).
- **Telegram** when a list is finalized, updated, or **shopping is fully completed**.
- **Checklist mode**: mark lines **purchased**, progress bar, pending-first sort, “show only pending.”
- **Optional line prices** and notes for estimates or receipt reconciliation.
- **Duplicate** lists; **link to ledger expense** after shopping.
- **Role-aware** editing and delete rules.

**Tagline ideas:** *“Splitwise meets a shared grocery brain.”* · *“Plan the shop, run the shop, book the receipt.”*

---

## Trust & ops angle

- **Audit trail** for important actions.
- **Notification telemetry** for delivery visibility (admin-facing).
- **Single-household focus** — simpler than multi-group apps.

---

## Roadmap teasers (from `product-review-and-roadmap-2026-05-06.md`)

Position as **coming next** or waitlist hooks:

- **Smart nudge composer** — One-tap reminders with context (WhatsApp / email angles in roadmap).
- **Richer settlement experience** — “Settlement room” with status and proof (vision).
- **Shareable monthly story** — Top spender, categories, month-over-month; share to WhatsApp.
- **Real-time activity feed** — Dashboard timeline for expenses, settlements, invites.

Framing: *Strong on correctness and notifications today; next wave is daily interaction and shareable moments.*

---

## Channel snippets

**Short social:**  
*One flat. One app. Split bills, settle up, and run shared shopping lists with checkboxes—optional pings to your household Telegram.*

**Landing bullets:**  
- Fair splits & balances  
- Settlements & monthly budget  
- Receipt photos  
- Telegram alerts (optional)  
- Smart shopping lists + purchased progress  
- Built for one home, not endless groups  

**Trust:**  
*Super-admin tools and audit logs when you want accountability, not drama.*

---

## Maintenance

Refresh this file when you ship major features (e.g. new notification types, pre-bill flows, or roadmap items that graduate to “shipped”).
