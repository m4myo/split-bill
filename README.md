# Split Bill

Bill-split MVP: Google login, generate a bill request (amount, up to 20 people, event name/date,
currency default USD, required bank payment details), share a public URL, track
Received/Unreceived as owner, close or delete requests, and print any bill as PDF.

Stack: Next.js (App Router) + Firebase (Auth + Firestore).

## 1. Firebase setup (required once)

1. Go to the [Firebase Console](https://console.firebase.google.com/), create a project.
2. **Authentication > Sign-in method**: enable **Google**.
3. **Firestore Database**: Create database (production mode is fine), then go to **Rules** tab
   and paste the contents of `firestore.rules` in this repo. Publish.
4. **Project settings > Your apps > Web app**: register a web app, copy the config values.
5. Locally:
   ```bash
   copy .env.example .env.local
   # fill in the 6 NEXT_PUBLIC_FIREBASE_* values
   npm run dev
   ```
6. Open http://localhost:3000.

## 2. Developing

```bash
npm install
npm run dev
npm run build
npm run lint
```

## 3. How it works

- `/` — landing + Google sign-in.
- `/create` — protected form. Amount is split equally (remainder cents go to the first people
  so the sum always matches). Per-person `amountOwed` is stored, so a future custom-amount
  editor needs no migration. Bank payment details are required (name, digits-only account
  number, optional notes). No expiry in this version.
- `/success/[id]` — confirmation with summary + copyable share link after Generate.
- `/b/[id]` — public payer page, identical for everyone: hero card (total + per-person),
  select-your-name chips with a personalized share banner, and a Transfer-to card.
  Closed bills show a closed notice; unknown IDs show not found. `?print=1` auto-opens print.
- `/my-bills` — owner dashboard (realtime): per-bill progress bar, clickable Received chips,
  and per-row **View link / Close / PDF / Delete** (Delete is permanent, with confirmation).
  Opening it also strips the retired `expireOn` field from old bills (one-time migration).

## 4. Rules

`firestore.rules`: public read; create/update/delete **owner-only**. Create requires
`paymentMethod == 'bank'` with a name and digits-only account number.

## 5. Design

Light-only theme (Plus Jakarta Sans; indigo `#6366F1` on `#F8F7FF`). Dark variants are disabled globally.
