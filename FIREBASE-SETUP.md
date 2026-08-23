# Firebase Setup Guide — Notice & Gallery Systems

This guide converts the notice system from browser-local storage to
**Firebase Firestore**, so that every visitor of the website sees the same
notices, and only you (the admin) can add/edit/delete them.

Follow the steps in order. It takes about 15–20 minutes.

---

## How it works (big picture)

```
PUBLIC WEBSITE (GitHub Pages)
        ↓  reads
Firebase Firestore  ←── real-time updates ──┐
        ↑                                   │
ADMIN PANEL (admin.html)                    │
        ↓ signs in                          │
Firebase Authentication                     │
        ↓ admin UID check                   │
Firestore Security Rules  ──────────────────┘
```

- `firebase-config.js` — connects the site to YOUR Firebase project.
- `notices-data.js` — NoticeStore: same API as before, but backed by Firestore.
- `firestore.rules` — the actual security boundary (who may read/write).
- `migrate-notices.html` — ONE-TIME tool to copy your existing 4 notices into Firestore.

> **Security note:** The Firebase Web API key inside `firebase-config.js` is NOT a
> secret — it only identifies your project. Database protection comes from
> **Firestore Security Rules** (`firestore.rules`). Never put passwords, private
> keys or service-account credentials in any frontend file.

---

## A. Create a Firebase project

1. Go to https://console.firebase.google.com/ and sign in with your Google account.
2. Click **Create a project** (or "Add project").
3. Name it anything, e.g. `sec-cse-batch-2026`.
4. Google Analytics is optional — you can disable it.
5. Click **Create project** and wait for it to finish.

## B. Register a Web App

1. Inside the project, click the **Web icon** (`</>`, called "Web").
2. Nickname: e.g. `batch website`. Do **not** tick "Also set up Firebase Hosting".
3. Click **Register app**.
4. Firebase shows you a code snippet with a config object — keep this page open.

## C. Copy the Web configuration

The snippet looks like:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

(You can also find it later under ⚙ Project settings → General → Your apps → SDK setup and configuration.)

## D. Put the configuration into firebase-config.js

Open `firebase-config.js` in this project and replace each placeholder with the
matching value from step C:

| Placeholder | Replace with |
|---|---|
| `YOUR_FIREBASE_API_KEY` | `apiKey` |
| `YOUR_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `YOUR_FIREBASE_PROJECT_ID` | `projectId` |
| `YOUR_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `YOUR_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `YOUR_FIREBASE_APP_ID` | `appId` |

Do not change anything below the marked line in that file.

## E. Enable Firebase Authentication

1. In the left sidebar: **Build → Authentication → Get started**.

## F. Enable Email/Password sign-in

1. On the Authentication page choose the **Sign-in method** tab.
2. Click **Email/Password** → toggle **Enable** → Save.
   (Leave "Email link" disabled.)

## G. Create your admin user

1. Still in Authentication, open the **Users** tab.
2. Click **Add user**.
3. Enter an email (this can be any address you control; nothing is mailed to it)
   and a strong password. Example: `admin@example.com`.
4. Click **Add user**. This email + password is what you will type into `admin.html`.

## H. Find the admin user's UID

1. In the **Users** tab you now see one row for your user.
2. Copy the value in the **User UID** column (a long string like `xY09aBcDeFgHiJkLmNoP...`).

## I. Put the UID into the configuration and rules

Replace `YOUR_ADMIN_UID` in **two files**:

1. `firebase-config.js` → in the `ADMIN_UIDS` list.
   (This only controls which account sees the Admin Panel UI.)
2. `firestore.rules` → inside `function isAdmin()`.
   (This is the REAL security boundary.)

## J. Create the Firestore Database

1. Left sidebar: **Build → Firestore Database → Create database**.
2. Choose a location near your users (e.g. `asia-south1` / `asia-southeast1`).
3. Choose **Start in production mode** (locked down — correct choice).
4. Click **Create**. You will see an empty database.

## K. Deploy firestore.rules

Option 1 — Console (easiest):

1. In Firestore, open the **Rules** tab.
2. Delete whatever is there, paste the full content of `firestore.rules`
   (with YOUR_ADMIN_UID already replaced!), then click **Publish**.

Option 2 — CLI (if you have Node.js):

```bash
npm install -g firebase-tools
firebase login
firebase init firestore     # select your project; rules file: firestore.rules
firebase deploy --only firestore:rules
```

Until these rules are deployed, writes from the website will be rejected.

## L. Run the ONE-TIME migration (existing 4 notices)

Your original 4 notices are preserved in `notices-data.js`
(`NoticeStore.SEED_NOTICES`). To copy them into Firestore:

1. Publish/upload the site (or run it locally via a local web server —
   opening the file directly with `file://` will not work because ES modules
   need HTTP).
2. Open `migrate-notices.html`.
3. Sign in with the admin email/password from step G.
4. Click **Migrate 4 Notices**.
5. You should see: `Done. Added: 4 · Skipped: 0 · Failed: 0`.

Running it again is safe — existing notices are skipped, never duplicated
(each document gets a stable ID computed from its content).

## M. Test the Admin Panel

1. Open `admin.html`.
2. Sign in with the admin account.
3. Add a test notice → it should appear instantly on `notice.html` and on the
   Home Page (latest 3), even without refreshing those pages.
4. Edit it, delete it (a confirmation appears) and verify everywhere again.
5. Click **Logout** → the management interface disappears.

## N. Publish on GitHub Pages

Nothing special is required — the site stays fully static:

1. Commit/push all files to your repository.
2. Settings → Pages → deploy from your branch as before.

## O. Test public read access

1. Open the site in a private/incognito window (signed out).
2. The Notice Board and the Home Page must show the notices.

## P. Test unauthorized write protection

1. In an incognito window open `admin.html`.
2. Try signing in with a wrong password → friendly error, no access.
3. Advanced check (optional): paste in the browser console of a public page:

```js
fetch("https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/notices", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({fields:{title:{stringValue:"HACK"}}}) })
```

It must answer `Permission denied`.

## Q. Test authenticated admin write access

Sign in at `admin.html` and add/delete a notice — it must succeed and appear
for all visitors.

---

## R. Gallery system (Firestore "gallery" collection)

The photo gallery works exactly like the notice system and reuses the same
Firebase project, the same admin account and the same `firebase-config.js` —
there is no second Firebase initialisation.

- **Collection:** `gallery`
- **Document fields:** `imageUrl` (required), `title`, `caption`,
  `category` (optional, drives the public filter buttons), `order`
  (number, smaller shows first), `createdAt`, `updatedAt`.
- **Public visitors** can only READ gallery images.
- **Only the admin** can add/update/delete them (enforced by the
  `match /gallery/{imageId}` block in `firestore.rules`, which uses the same
  `isAdmin()` check as the notices rules).

### Required manual step

If you deployed the security rules before the gallery existed, re-publish
`firestore.rules` (Firebase Console → Firestore Database → Rules → paste the
full file → **Publish**). Without this, the Gallery page shows an error state
and the admin panel cannot save images.

### Managing gallery images

1. Open `admin.html` and sign in with the admin account.
2. Scroll to **Gallery Management**.
3. Paste an **Image URL**, add a Title / Caption / Category / Order if you
   want, click **Add Image** — it appears on the public Gallery instantly
   (real-time listener).
4. Use **Edit** to replace a URL or change title/caption/order, and
   **Delete** to remove an image.

You never need to edit HTML to change gallery photos.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Unable to load notices right now" on public pages | `firebase-config.js` still has placeholders, wrong values, or no internet. Check browser console (F12). |
| Gallery shows "Unable to load…" or admin image saves fail | The `gallery` rules block was not published yet — see section R. |
| Admin sign-in works but every save fails | `firestore.rules` not published yet, or YOUR_ADMIN_UID still in the rules. |
| "Not Authorized" card after signing in correctly | Your UID was not put into `ADMIN_UIDS` in `firebase-config.js`. |
| Nothing happens when opening pages with double-click (`file://`) | Normal. Use GitHub Pages or a local server (`python -m http.server`). |
| Migration says permission denied | Sign in first, and make sure the rules were published with your real UID. |

---

## Files involved

| File | Purpose |
|---|---|
| `firebase-config.js` | NEW — Firebase project config + SDK bootstrap (placeholders inside). |
| `firestore.rules` | NEW — Security rules (placeholder `YOUR_ADMIN_UID` inside). |
| `FIREBASE-SETUP.md` | NEW — This guide. |
| `migrate-notices.html` | NEW — One-time migration tool for the original 4 notices. |
| `notices-data.js` | CHANGED — NoticeStore now reads/writes Firestore instead of localStorage. Same function names (`getAll/add/update/remove/formatDate/onChange`). |
| `script.js` | CHANGED — Notices render after Firestore data arrives; error/empty states added; Admin Panel is now behind Firebase login. (Also fixed a pre-existing bug where the admin code was nested inside the gallery-filter block.) |
| `admin.html` | CHANGED — Adds a sign-in card, logout bar and "not authorized" card using the existing styles. |
| `index.html`, `notice.html` | CHANGED — Only `<script>` include for `firebase-config.js`. No visual changes. |
| `style1.css` | CHANGED — Small additions only: `[hidden]` helper and `.admin-user-bar` (reuses existing colors/fonts). |

## Checklist — every placeholder to replace before going live

In `firebase-config.js`:
- [ ] `YOUR_FIREBASE_API_KEY`
- [ ] `YOUR_FIREBASE_AUTH_DOMAIN`
- [ ] `YOUR_FIREBASE_PROJECT_ID`
- [ ] `YOUR_FIREBASE_STORAGE_BUCKET`
- [ ] `YOUR_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `YOUR_FIREBASE_APP_ID`
- [ ] `YOUR_ADMIN_UID` (inside `ADMIN_UIDS`)

In `firestore.rules`:
- [ ] `YOUR_ADMIN_UID` (inside `isAdmin()`)

After replacing everything, run the steps L → Q once more.
