# Firebase Setup Guide — Notice System (the Gallery uses no Firebase)

This guide converts the notice system from browser-local storage to
**Firebase Firestore**, so that every visitor of the website sees the same
notices, and only you (the admin) can add/edit/delete them.

> **The photo Gallery no longer uses Firebase at all.** It is fully static:
>
> - **Cloudinary** hosts the actual image files (`gallery-upload.js` uploads them),
> - **`gallery-data.js`** in this repository is the list of Gallery items,
> - **GitHub Pages** serves the website.
>
> The Gallery needs no Firebase project, no Firestore database and no Firebase
> Storage. The instructions below are only for the **Notice system**.

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
- `gallery-upload.js` + `gallery-data.js` — the **Gallery** (see section R). No Firebase.

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

Replace `YOUR_ADMIN_UID` in **two files** (keep them in sync):

1. `firebase-config.js` → in the `ADMIN_UIDS` list.
   (This only controls which account sees the Admin Panel UI.)
2. `firestore.rules` → inside the list in `function isAdmin()`.
   (This is the REAL security boundary.)

To give extra people admin rights later, add their UIDs as new lines in
**both** lists — anyone not listed cannot write, even with a valid
Firebase account.

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

## R. Gallery — Cloudinary + static data (NO Firebase)

The Gallery is completely independent of Firebase: it uses **Cloudinary** for
image hosting plus a **static data file** that you commit to the repository.

```
ADMIN PANEL (admin.html)
   ↓ selects an image
   ↓ uploads to Cloudinary (gallery-upload.js, unsigned preset — no secret)
   ↓ gets back a permanent HTTPS image URL
   ↓ saves the item locally (title, caption, category, order)
   ↓ "Generate Gallery Data" writes the updated gallery-data.js content
   ↓ you commit + push the file to the GitHub repository
GitHub Pages → Public Website (gallery.html renders GALLERY_DATA)
```

- `gallery-upload.js` — uploads images to Cloudinary (cloud name + unsigned
  upload preset only; **no API secret** anywhere).
- `gallery-data.js` — the list of Gallery items (`imageUrl`, `title`,
  `caption`, `category`, `order`, `id`). One entry per photo, all HTTPS URLs.
- `gallery.html` — renders that file directly. No Firestore, no Storage,
  no SDK, no network requests to Firebase.

### Required manual step — Cloudinary (free account, ~2 minutes)

1. Create a free account at https://cloudinary.com — your **Cloud name** is on
   the Dashboard.
2. **Settings → Upload → Add upload preset** with:
   - "Save mode": **Unsigned** (important — not "Signed"),
   - Allowed formats: `jpg, png, gif, webp` (recommended),
   - Folder (optional): e.g. `gallery`.
3. This repository's `gallery-upload.js` is already configured with the Cloud
   name and unsigned preset in the `CONFIG` block (lines ~41-42). Only change
   them if you switch Cloudinary accounts.

### Managing gallery images

1. Open `admin.html` and sign in with the admin account.
2. Scroll to **Gallery Management**. Upload a file or paste an image URL, add
   Title / Caption / Category / Order, click **Add Image**.
3. Because GitHub Pages is static hosting, the admin page cannot write to the
   repository by itself. Use the **Publish to GitHub** card:
   1. **Generate Gallery Data**,
   2. **Copy** or **Download** the file,
   3. replace `gallery-data.js` in the repository and **commit + push**,
   4. GitHub Pages serves the updated Gallery within a minute or two.
4. **Edit** changes a photo's metadata / URL; **Delete** removes it from the
   data file (the Cloudinary-hosted file may remain in your Cloudinary account
   — its server-side delete needs the API secret, so it is never exposed).

> Nothing about the Gallery needs Firebase. Deleting / extending the gallery
> never touches `firestore.rules`, the Notice system or Firebase Authentication.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Unable to load notices right now" on public pages | `firebase-config.js` still has placeholders, wrong values, or no internet. Check browser console (F12). |
| Gallery page shows no photos | `gallery-data.js` has no usable entries, or its data block has a syntax error after hand-editing. Regenerate it in admin.html → **Publish to GitHub**. |
| Gallery upload fails | Cloudinary not configured yet (`gallery-upload.js` placeholders), the preset is not "Unsigned", or the image format is not allowed — see section R. |
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
| `gallery-upload.js` | NEW — Gallery image hosting: uploads files to Cloudinary with an unsigned preset (no secrets). |
| `gallery-data.js` | CHANGED — Now a static `GALLERY_DATA` list + a local-only store (no Firestore/Storage). Edited from admin.html; committed to publish. |
| `notices-data.js` | CHANGED — NoticeStore now reads/writes Firestore instead of localStorage. Same function names (`getAll/add/update/remove/formatDate/onChange`). |
| `script.js` | CHANGED — Notices render after Firestore data arrives; Admin Panel is behind Firebase login. Gallery now renders the static data file (no Firestore, no Storage) and gains a "Publish to GitHub" (Generate/Copy/Download) card. |
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
- [ ] `YOUR_ADMIN_UID` (inside the list in `isAdmin()`)

After replacing everything, run the steps L → Q once more.

> **Security checklist:** admin.html and firebase-config.js stay in the
> repository on purpose — the Web config is not a secret. Security comes
> only from Authentication + the deployed firestore.rules, so make sure
> the rules are published with your real UID (step K) before going live.
> Never add passwords, private keys or service-account files to this repo.
