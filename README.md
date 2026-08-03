# BEMMS — Biomedical Equipment Management & Maintenance System

Clinical engineering Work Done Book and medical device maintenance registry, built as a
React + TypeScript PWA on Firebase (Auth + Firestore).

## Modules

| View | Purpose |
| :--- | :--- |
| Dashboard | Fleet status, workload and maintenance KPIs |
| Equipment Registry | Device catalogue with QR labels and status tracking |
| Work Done Book | Digital maintenance log with dual hand-signed certification |
| Equipment History | Per-device service timeline |
| PM Scheduler | Preventive maintenance planning and overdue tracking |
| Reports | Monthly maintenance reporting |
| User Management | Staff provisioning, roles and access control (admin/HOD) |
| Administration | Directory and ward configuration (admin/HOD) |

## Requirements

- Node.js 20+
- A Firebase project with **Firestore** and **Authentication** enabled

## Run locally

```bash
npm install
```

```bash
npm run dev
```

The dev server listens on port 3000, or on `$PORT` if that variable is set.

Other scripts:

```bash
npm run lint
```

```bash
npm run build
```

## Firebase configuration

Client configuration lives in [`firebase-applet-config.json`](firebase-applet-config.json).
These values are public by design — Firestore security rules, not the API key, are what
protect the data.

The app connects to the project's **`(default)`** Firestore database. To target a named
database instead, set `VITE_FIRESTORE_DATABASE_ID` in a `.env.local` file. Pointing at a
database that has not been provisioned makes every read and write fail with `NOT_FOUND`.

### Required one-time setup

1. **Provision Firestore.** In the Firebase console, create the `(default)` database if it
   does not exist.
2. **Enable sign-in providers.** Authentication → Sign-in method → enable **Email/Password**
   and **Google**.
3. **Authorize your domains.** Authentication → Settings → Authorized domains. `localhost`
   is authorized by default; add your production hostname before deploying.
4. **Deploy the security rules.** The rules in this repo are what allow the first admin
   sign-in to succeed:

   ```bash
   npx firebase deploy --only firestore:rules
   ```

## First sign-in and roles

The account in `BOOTSTRAP_ADMIN_EMAIL` ([`src/constants.ts`](src/constants.ts)) is granted
the `admin` role automatically and has its profile created on first sign-in. This is what
seeds the staff directory on an empty database — every other account must be registered by
an admin or HOD before it can sign in.

The same address is hardcoded in [`firestore.rules`](firestore.rules); change both together.

| Role | Capabilities |
| :--- | :--- |
| `admin` | Full access; manages all staff including other admins |
| `head` | Manages engineers; cannot create, modify or delete admins |
| `engineer` | Registry, Work Done Book, history, scheduler and reports |

Staff accounts are provisioned from **User Management**, which creates the Firebase Auth
credential through a secondary Firebase app so the admin's own session is not disturbed.

## Deploy

```bash
npm run deploy
```

This builds to `dist/` and deploys Hosting plus Firestore rules. Configuration is in
[`firebase.json`](firebase.json) and [`.firebaserc`](.firebaserc).

### Cloud Functions (optional)

[`functions/index.js`](functions/index.js) contains callable functions for server-side user
administration. **The app does not call them** — user management runs entirely client-side,
so the app is fully functional without deploying them. They require the Blaze billing plan.

Deploying them would improve two things the client cannot do on its own: disabling the
Firebase Auth credential when an account is deactivated (today only the Firestore `active`
flag is set, and the app enforces it at sign-in), and deleting the Auth credential when a
staff record is removed (today the credential is left orphaned).

```bash
cd functions && npm install && cd ..
```

```bash
npx firebase deploy --only functions
```

## Data model

Firestore collections, all guarded by [`firestore.rules`](firestore.rules):

- `users/{email}` — staff profiles, keyed by lowercased email
- `equipment/{EQ-nnnn}` — device registry
- `jobs/{JOB-YYYY-nnnn}` — Work Done Book entries
- `schedules/{SCH-nnnn}` — preventive maintenance schedules

Record IDs are allocated transactionally, so two engineers filing at the same moment cannot
overwrite each other's records.

## PWA

The app installs to the home screen and caches its shell for offline use.
[`public/sw.js`](public/sw.js) serves navigations network-first (so a redeploy is picked up
immediately) and other assets stale-while-revalidate. The worker is registered in production
builds only.

---

App created and developed by V-Tech.
