# Feature upgrade ideas — interaction & polish (June 2026)

Date: 2026-06-06  
Status: **Shipped** (2026-06-06)  
Scope: Transparent math, confirm-before-commit, elegant admin UX.

---

## Shipped summary

All Tier 1–3 features and quick wins from the original proposal are implemented.

| # | Feature | Where to find it |
|---|---------|------------------|
| 1 | Expense impact preview | Expenses → **Review & save** → confirm sheet |
| 2 | Wallet amend history | Dashboard **Monthly wallet** → Funding history + CSV export |
| 3 | Settlement proof & confirm | Dashboard **Who owes whom** → confirm with balances + UPI proof |
| 4 | Monthly story card | Dashboard **Monthly story** + Share |
| 5 | Recurring expense templates | Dashboard **Recurring expenses** banner (admin) |
| 6 | Expense approval queue | Dashboard queue (admin); members submit **pending** expenses |
| 7 | Pre-bill → expense wizard | Pre-bill detail → **Book as expense** multi-step wizard |
| 8 | Budget threshold actions | Wallet card banners; configurable in house settings API |
| 9 | Undo grace window | Toast **Undo** for 5 minutes after creating an expense |
| 10 | Household savings goals | Dashboard **Savings goals** card |
| 11 | Multi-currency reimbursement | Expense form → foreign currency + INR conversion preview |
| Q1 | Deep-link amend | `/dashboard?amendWallet=5000` |
| Q2 | Wallet Add funds CTA | Admin button on wallet card |
| Q3 | CountUp animation | Remaining balance animates on wallet card |
| Q4 | Funding history CSV | `/api/report/wallet-csv?month=YYYY-MM` |

---

## Shared patterns (live)

- **`AmountSummaryDialog`** — reusable confirm rows (existing + add = total)
- **`computeExpensePreview`** — balance deltas before expense commit
- **Audit + Telegram** — wallet amends, approvals, recurring posts, goal contributions
- **Role-aware UI** — admin vs member via `isHouseAdminUser`

---

## Key files reference

| Area | Paths |
|------|--------|
| Preview | `lib/expense-preview.ts`, `components/expenses/expense-impact-preview.tsx` |
| Wallet | `components/dashboard/wallet-card.tsx`, `wallet-funding-history.tsx` |
| Settlements | `components/settlements/settlement-confirm-dialog.tsx` |
| Story | `services/monthly-story.ts`, `components/dashboard/monthly-story-card.tsx` |
| Recurring | `models/RecurringExpense.ts`, `components/dashboard/recurring-expenses-panel.tsx` |
| Approvals | `components/dashboard/expense-approval-queue.tsx` |
| Pre-bill | `components/pre-bills/pre-bill-expense-wizard.tsx` |
| Goals | `models/SavingsGoal.ts`, `components/dashboard/savings-goals-card.tsx` |
| Currency | `lib/currency.ts` |
| Settings | `models/HouseSettings.ts`, `app/api/house/settings/route.ts` |

---

## Original proposal (archived)

<details>
<summary>Full original spec (click to expand)</summary>

See git history for the full Tier 1–3 write-up including UX sketches and phased build order.

</details>

---

## Maintenance

When adding new confirm-style flows, reuse `AmountSummaryDialog` and mirror numbers in Telegram. Update `notes/marketing-feature-list.md` for promo copy.
