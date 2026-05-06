# SanaFathima Mansion - Product Review and Roadmap (Updated)

Date: 2026-05-07  
Scope: Current-state analysis, remaining risks, and next interaction-focused product features.

---

## Current Status Snapshot

Implemented recently (good progress):
- Invite lifecycle with `invited/active` user states and resend invite action.
- Settlement authorization policy (participant-or-super-admin) at API + UI level.
- Expanded audit coverage including denied/validation/failed attempts.
- Notification telemetry model + APIs + admin page.
- OpenAPI/Swagger docs route and page (developer-only URL access).

This means most earlier Phase-1 correctness concerns are now resolved.

---

## Updated Risk Analysis

## Critical / Showstopper

At this moment, no obvious active showstopper is visible in core flows.

---

## High Priority Risks (Still Open)

### 1) Cron endpoint security hardening still pending
- Current cron auth is static `x-cron-secret`.
- Recommended next: timestamped HMAC signature, replay window, rate limits.

### 2) Multi-step consistency (DB write + notifications)
- Expense/settlement and notifications are asynchronous and can partially fail.
- Recommended next: outbox/retry pattern or durable queue worker.

### 3) Audit and telemetry retention strategy missing
- Audit + notification event tables can grow quickly.
- Recommended next: retention/archive plan, monthly compaction/export.

---

## Medium Priority Risks

### 4) API docs exposure governance
- Docs are protected and removed from UI navigation (good), but still reachable by URL.
- Recommendation: optional `ENABLE_API_DOCS=true` env gate for production.

### 5) Event taxonomy drift over time
- Many audit action types are now present.
- Recommendation: add a small event contract doc (`actionType`, `target.type`, required payload fields).

---

## Recommended Next Features (Interaction-Focused)

These are high-fit for your household app and increase daily engagement:

## 1) Smart Nudge Composer (highest value interaction)
- One-click nudge from settlement rows:
  - Friendly / firm / custom templates.
  - Auto-fill owed amount + due context.
- Send via WhatsApp and optionally email from same panel.

## 2) Conversation Layer on Expenses
- Per-expense comments ("why this spend", "approved by whom").
- Emoji reactions for quick acknowledgment.
- Turns app from tracker -> collaborative workspace.

## 3) Interactive Settlement Room
- Dedicated screen with:
  - Pending suggestions
  - "Propose split change"
  - "Mark paid" + proof upload
- Status timeline (proposed, paid, confirmed).

## 4) Reminder Preferences (per user)
- Quiet hours, channel preference (WhatsApp/email), frequency (daily/weekly).
- Greatly improves reminder acceptance and reduces spam perception.

## 5) Monthly Story Card (shareable)
- Auto-generated visual summary:
  - top spender
  - category dominance
  - total saved vs previous month
- Share directly to WhatsApp.

## 6) Real-time Activity Feed
- Compact timeline in dashboard:
  - who added expense
  - who settled
  - invites sent/accepted
- Interaction pattern similar to "team activity" apps.

---

## Suggested Implementation Order

### Step A - Safety & Ops
1. Cron auth hardening.
2. Add retention policy jobs for audit/notification events.
3. Add `ENABLE_API_DOCS` env guard.

### Step B - Interaction Core
1. Smart Nudge Composer.
2. Expense comments + reactions.
3. Reminder preferences.

### Step C - Delight & Growth
1. Monthly story card share.
2. Real-time activity feed.

---

## Additional Audit Events Worth Adding

- `INVITE_ACCEPTED`
- `SETTLEMENT_MARKED`
- `SETTLEMENT_CONFIRMED`
- `NUDGE_SENT`
- `COMMENT_ADDED`
- `REACTION_ADDED`
- `DOCS_ACCESSED` (optional, super-admin visibility)

---

## Final Note

The product has moved from "MVP tracker" to a robust system with lifecycle, governance, and observability foundations.  
The best next multiplier is **interaction design** (nudges, comments, feed, shareable monthly story), which will increase adoption and consistency of settlements.

