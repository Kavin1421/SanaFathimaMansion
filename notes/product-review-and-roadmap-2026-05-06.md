# SanaFathima Mansion - Product Review and Feature Roadmap

Date: 2026-05-06  
Scope: Product feature suggestions + risk analysis (critical/high/medium) for current codebase.

---

## Executive Summary

The project is already strong in core shared-expense flows (expenses, balances, settlements, audit logs, WhatsApp, invite + activation, PWA).  
Main gaps now are around **role model consistency**, **settlement authorization rules**, and **operational hardening** (cron/security/reliability).

Highest-value next moves:
1. Fix onboarding/admin-role mismatch (showstopper risk).
2. Add settlement permission policy + approval mode.
3. Add resilience and governance (rate limits, idempotency, retention, alerting).
4. Ship engagement improvements (nudge intelligence, streaks, predictive budget alerts).

---

## Critical / Showstopper Findings

### 1) Onboarding can be blocked by super-admin-only invite rule
- **Why critical**: onboarding currently calls `createUserAction`, and this action now requires super admin. If first-time onboarding user is not super admin, roommate creation can fail and setup stalls.
- **Impact**: first-run setup breakage for non-super-admin accounts.
- **Recommendation**:
  - Allow `createUserAction` during onboarding context (`session.user.onboardingCompleted === false`), OR
  - Introduce dedicated `createUserOnboardingAction` with restricted scope and clear audit event.

### 2) Settlement endpoint allows any authenticated user to settle any pair
- **Why critical/high**: current settlement action does not enforce that initiator is involved in the settlement pair or has elevated role.
- **Impact**: a random logged-in user can mark others as settled, mutating balances.
- **Recommendation**:
  - Policy: only `fromUser`, `toUser`, or super admin can settle.
  - Optional: require confirmation workflow for non-admin.
  - Audit actor + reason + source (UI/API).

---

## High Risk Findings

### 3) Cron endpoints rely only on shared secret header
- **Risk**: replay/brute-force attempts and accidental abuse.
- **Recommendation**:
  - Add HMAC signature with timestamp (short validity window).
  - Add rate limiting + optional IP allowlist.
  - Add idempotency key per job run.

### 4) Atomicity gaps in multi-step operations
- **Risk**: settlement create + recompute + notifications are separate steps; partial failures can produce inconsistent user-facing state.
- **Recommendation**:
  - Use transaction boundaries where possible for DB-mutating steps.
  - Apply outbox pattern for notifications (retryable, durable queue).

### 5) Audit log data can grow quickly without retention strategy
- **Risk**: storage/queries degrade over time.
- **Recommendation**:
  - Define retention policy (e.g., archive old logs after N months).
  - Add index review + pagination constraints + export pipeline.

---

## Medium Risk / Quality Findings

### 6) Invite lifecycle may confuse users without join-state UX
- **Observation**: invite creates ledger user, but auth account may not exist yet.
- **Recommendation**:
  - Add "Invitation pending" state with resend invite and last-sent timestamp.
  - Add explicit "Sign up with invited email" helper in invite email.

### 7) Email service lacks delivery telemetry
- **Risk**: silent failures reduce trust.
- **Recommendation**:
  - Track `emailSentAt`, `emailProviderMessageId`, failure reason counters.
  - Expose lightweight admin "delivery health" panel.

### 8) Audit semantics can be further normalized
- **Observation**: action names and target types are improving but still expanding.
- **Recommendation**:
  - Introduce event taxonomy doc (`actor`, `verb`, `object`, `result`).
  - Add `requestId` correlation field for tracing across logs.

---

## Interesting and Suitable New Features

## 1) Smart Settlement Assistant (high value)
- Auto-suggest optimal settlement time windows based on user activity.
- One-tap UPI deep links (if users opt in).
- "Settlement confidence" indicator (how likely balances change soon).

## 2) Budget Intelligence (high value)
- Category-wise projected month-end overshoot.
- "If you continue this pace" forecast cards.
- Actionable suggestions (reduce X category by Y).

## 3) Engagement Layer (high value)
- Monthly badges: "Most Consistent Contributor", "Fast Settler".
- Streaks for timely settlement.
- Gentle peer nudge templates (WhatsApp/email prefilled).

## 4) Governance and Trust Features
- Dual control for sensitive actions (optional second approver for balance overrides).
- Soft-delete with undo window for expenses/users.
- Immutable exported audit snapshots (PDF/CSV signed hash).

## 5) Collaboration UX
- Expense comments and reactions.
- Receipt OCR (extract merchant/date/amount into draft expense).
- Split presets ("All", "Except me", "Weekend group").

## 6) Finance Operations
- Recurring expenses (rent/internet/gas) with reminder and auto-draft.
- House reserve/wallet contributions tracking separate from spends.
- "Who usually pays this category" insights.

---

## Prioritized Roadmap (Practical Sequence)

### Phase 1 - Safety and Correctness (Immediate)
1. Fix onboarding invite permission mismatch.
2. Enforce settlement authorization policy.
3. Add cron hardening (HMAC timestamp + rate limit + idempotency).

### Phase 2 - Reliability and Observability
1. Notification outbox/retry pipeline.
2. Email/WhatsApp delivery telemetry.
3. Audit retention + request correlation IDs.

### Phase 3 - Product Delight
1. Smart budget forecasts.
2. Gamified engagement nudges.
3. OCR-assisted receipt capture.

---

## Suggested New Audit Events (Optional Next)

- `INVITE_RESENT`
- `SETTLEMENT_REJECTED`
- `NOTIFICATION_RETRY`
- `CRON_RUN`
- `CRON_RUN_FAILED`
- `ROLE_CHANGED`

---

## Final Note

The foundation is product-grade and evolving fast.  
If Phase 1 items are closed, this can move from "functional tracker" to a robust, trustworthy shared-finance product with strong retention potential.

