# Split Bill — Product Requirements Document (MVP)

Source: build conversation to date. This PRD describes the app **as specified and built**, to guide the UI refurbishment. Stack: Next.js (App Router) + Firebase (Auth + Firestore). No Firebase Storage in this version.

## 1. Product overview

A user (requestor) creates a **bill request** — an amount split equally among a list of people for an event — and shares a **public URL**. Anyone with the link views what they owe and where to pay. The signed-in owner tracks Received/Unreceived from the My Bills dashboard, then closes or deletes the request, or prints any bill as PDF.

## 2. Users & roles

| Role | Definition | Capabilities |
|---|---|---|
| Owner | Signed in with Google; `uid` matches bill `ownerUid` | Create bills, toggle status via dashboard chips, close/delete bills, print bills, view My Bills |
| Guest / payer | Anyone with the link, no login required | View bill, select name to see personal share + transfer details |

## 3. Authentication

- Google sign-in only (Firebase Auth, popup flow).
- Creating a bill requires sign-in; viewing a bill never does.
- Signed-in state shown in navbar (email + Sign out); signed-out state shows Sign in button.
- Auth must degrade gracefully: if Firebase is unconfigured, pages explain setup instead of crashing.

## 4. Bill creation (`/create`, owner only)

### 4.1 Inputs

| # | Field | Required | Rules |
|---|---|---|---|
| a | Amount paid | Yes | Number > 0, max 1,000,000, up to 2 decimals; stored as integer cents |
| b | Total number of people responsible | Yes | Integer 1–20; drives the name sub-section |
| b1 | Person names (one text field per person) | Yes, each | Non-empty after trim, max 50 chars; each row removable via **X** (minimum 1 row); removing a row decrements the people count |
| c | Event name | Yes | Max 100 chars |
| d | Event date | Yes | Date picker |
| e | Currency | Yes | Select, default **USD** (EUR, GBP, INR, JPY, SGD, CAD, AUD also offered) |
| f | Payment info — bank details | Yes | Bank Name* (≤60), Account Number* (**digits only**, ≤32), Notes (optional textarea, ≤300) |
| — | Generate Bill Request | Button | Submits; shows inline field errors on failure; "Generating…" while busy; lands on the success screen |

There is **no expiry** in this version (removed entirely: no field, no logic, stored values migrated away — see §8).

### 4.2 Split logic & live preview

- Equal split in cents: `base = floor(total / N)`, remainder cents go to the **first** rows so shares always sum to the total.
- A per-person pill in the page header plus a per-share preview under People, both formatted in the chosen currency, **must recompute on every change** (amount, count, add/remove/rename).
- Count ↔ names stay in sync: changing the count appends blank rows or truncates; X-removal updates the count. Out-of-range/empty count input leaves names untouched (submit validation flags it) so typed names are never clobbered.
- Per-person `amountOwed` is stored on the bill so a future custom-amount editor needs no migration.

## 5. Success screen (`/success/[id]`, owner, right after Generate)

- Check hero + "Bill request created!", summary rows (Event / Total / Per person), copyable share-link box with Copied feedback, **Create another** + **View my bills** buttons. Unknown ID → not-found card.

## 6. Bill page (`/b/[id]`, public, identical for all viewers)

- `← Back` (browser back — guests have no dashboard).
- Indigo hero: BILL REQUEST eyebrow, event name, long-form date, Total + Per-person **average**.
- SELECT YOUR NAME chips (re-tap deselects); selection shows a green banner: "Name, your share is **{actual share}** / Please transfer to Bank · Account".
- TRANSFER TO card: Bank / mono Account (+ Copy account button) / notes callout; pre-payment-info bills show the fallback text.
- States: **closed** → styled closed notice; unknown ID / load failure → styled not-found card. No expired state exists.
- `?print=1` auto-opens print after load (used by dashboard PDF buttons). Print hides nav/back/buttons.

## 7. My Bills (`/my-bills`, owner only, realtime)

- Header: title, "N bill requests", **+ New bill**.
- Row cards newest-first: event + CLOSED badge (closed rows dimmed, green border) + `Sep 5, 2026 · N people` | total + avg/person | buttons **View link / Close (open only) / PDF / Delete**.
- Progress bar (indigo → green at 100%) + `x/y received`; clickable person chips toggle Received (disabled when closed).
- **Close** → confirm dialog → closed. **Delete** → confirm modal (permanent; link becomes not-found) → row disappears. **PDF** → bill print view in a new tab.
- Opening the dashboard strips the retired `expireOn` field from legacy bills (automatic one-time migration).
- Empty state + New-bill CTA.

## 8. Theme & presentation

- **Light theme only, everywhere** (dark variants disabled globally; Plus Jakarta Sans).
- Responsive: grids collapse, dashboard rows stack, table-free layouts throughout.
- Landing (`/`) in-theme: hero + auth card + 3-step cards (create → share → track & close).

## 9. Data & backend (Firebase)

- Firestore `bills/{id}` (8-char URL-safe ID): owner identity, total (cents), currency, event name/date, `status`, timestamps, `people[]` (`id`, `name`, `amountOwed` cents, `status`), `paymentMethod: "bank"`, `bankInfo`. `expireOn` is retired: never written; legacy values auto-stripped (§7).
- Rules: **public read**; create/update/delete **owner-only**; create enforces amount > 0, 1–20 people, `status == active`, bank name non-empty + digits-only account.
- Dashboard uses a single-field `ownerUid` query + realtime subscription + in-app newest-first sort (deliberately avoids composite indexes).
- Setup requires: Google provider enabled, Firestore with published `firestore.rules`, 6 web-app keys in `.env.local`. **No Storage, no billing upgrade.**

## 10. Deferred / out of scope for this version

- **QR payment image upload** — blocked: Firebase Storage needs a paid plan. Upload code removed (recoverable from git history). `paymentMethod` field is kept so QR can return without migration.
- **Expiry** — removed by decision (code + data), not deferred.
- Custom (non-equal) per-person amounts; reopening a closed bill; editing a bill after creation; multi-currency per person; notifications/reminders.

## 11. Acceptance checklist (happy path)

1. Sign in → create bill (130, 3 people, bank details) → previews correct → Generate → success screen → copy link works.
2. Incognito: hero, name chips, personal share banner, transfer details — no login, no management UI.
3. Owner taps dashboard chips → progress bar + counts update live.
4. Close → bill shows closed notice; Delete → link shows not found; PDF → bill print view.
5. No expiry anywhere; legacy bill with stored expiry still opens and gets migrated; identical light UI in all browsers.
