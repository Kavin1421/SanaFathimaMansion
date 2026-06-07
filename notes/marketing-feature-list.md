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
| **Roles** | **Super Admin / Admin / Member** with permissions card on Profile. |
| **Wallet amend** | Add funds with confirm sheet (existing + add = total); funding history + CSV. |
| **Trust UX** | Expense **impact preview**, settlement confirm sheet, **5-min undo** on new expenses. |
| **Governance** | **Pending expense approval** queue for admins; members propose spends. |
| **Automation** | **Recurring expense templates** with post-now preview. |
| **Goals** | **Savings goals** with contribute confirm flow. |
| **Global spend** | **Multi-currency** expenses with INR conversion preview. |
| **Delight** | **Monthly story card** (shareable); budget threshold alerts with Add funds CTA. |
| **Pre-Bills+** | **Book as expense wizard** (multi-step) from finalized lists. |

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

## Roadmap teasers

Most interaction features from the June 2026 upgrade doc are **shipped**. Optional future polish:

- Live FX rates for multi-currency (today: reference rates + manual override)
- Cron auto-post recurring expenses on due day
- Auto Telegram monthly story on last day of month

Framing: *Confirm-before-commit on every money action — expenses, wallet, settlements, goals.*

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

Refresh when shipping major features. Last updated: 2026-06-06 (feature upgrade batch — see `notes/feature-upgrade-ideas-2026-06-06.md`).
