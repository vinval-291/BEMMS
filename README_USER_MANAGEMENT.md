# BEMMS Hospital Staff User Management Module Documentation

Welcome to the **Biomedical Engineering Maintenance Management System (BEMMS)** Staff and Authorization Module.

This system guarantees compliance with clinical information standard **ISO 13485** and **HIPAA** patient safety data guidelines through modern Attribute-Based and Role-Based Access Control (RBAC).

---

## 1. Role-Based Access Control (RBAC) Matrices

| Role Tab | System Role | Operational Level | Permitted Actions | De-Authorization Boundaries |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | Maximum Access | Read/Write full catalog, Register and Deactivate any staff, manage departments, full backups | Cannot delete self, cannot self-deactivate |
| **HOD** | Department Head / Chief | Medium-High Access | Register and Deactivate Engineers, reset Engineer passwords, edit registries | Cannot modify Admin records, cannot register Admin accounts |
| **Engineer**| Clinical Field Engineer | Standard Access | Maintenance Logs, Work Done entry books, submit preventative maintenance actions | Restricted from access to User Management, cannot edit staff records |

---

## 2. Bootstrapping the First Account

The database ships empty. Exactly one account is bootstrapped automatically, and every
other account is created from within the app by that account.

### Chief System Admin (Auto-Bootstrapped Master)
*   **Email:** the address in `BOOTSTRAP_ADMIN_EMAIL` (`src/constants.ts`), mirrored in `firestore.rules`
*   **Role:** System Administrator, granted automatically on first sign-in
*   **Setup:** Sign in with Google using that address, or create an Email/Password credential
    for it in the Firebase console first.

There are no other preseeded accounts. HOD and Engineer profiles are created through
**User Management** as described in Test Case B below, and only then can they sign in.

---

## 3. How to Deploy Cloud Functions

If your workspace transitions to self-managed production hosting inside Firebase, comply with the following deployment scripts:

### Prerequisites:
1. Ensure the Firebase CLI tool is installed locally:
   ```bash
   npm install -g firebase-tools
   ```
2. Authenticate and select your designated project:
   ```bash
   firebase login
   firebase use <YOUR-PROJECT-ID>
   ```

### Command to deploy:
```bash
firebase deploy --only functions
```

This registers the complete callable triggers exported from `/functions/index.js` secure server-side:
*   `createUser` (Callable HTTPS)
*   `updateUser` (Callable HTTPS)
*   `resetUserPassword` (Callable HTTPS)
*   `deleteUser` (Callable HTTPS)

---

## 4. Operational Guidelines for Validation & Testing

Follow these physical test checklists to verify modular compliance:

### Test Case A: Email & Password Validation Errors
1. Trigger sign-out from the sidebar.
2. Enter an invalid email format (e.g. `invalid-email`). Click **Sign In**.
3. Verify that the warning alert highlights: `"Please enter a valid email address."`
4. Enter password smaller than 8 characters. Verify compliance warning: `"Password must be at least 8 characters long for HIPAA & ISO compliance."`

### Test Case B: Registering Clinical Staff
1. Log in with the Chief Admin account.
2. Open the **User Management** tab on the left.
3. Click the **Authorize New Staff** button in top-right.
4. Enter the staff member's details and a password of at least 8 characters. Select role **Engineer**.
5. Click **Register Directory Profile**.
6. The new account binds instantly to the table. Log out and sign in with the new credential to verify.

### Test Case C: Access Deactivation & Lockout
1. Log in with the Admin account. Go to **User Management**.
2. Locate the recently created Engineer card on the list.
3. Click the green **Active** pill on their row. The pill switches to gray **Locked** status.
4. Attempt to log in as that engineer.
5. The gateway intercepts the attempt and reports that the account has been deactivated.

---

## 5. Security Architecture and Compliance Highlights

*   **Audit-Compliant Records:** Staff documents carry `createdBy`, `createdAt` and `updatedAt` properties.
*   **Enforced Server-Side:** `firestore.rules` is the real boundary — role and activation checks
    are evaluated by Firestore on every read and write, not just in the UI. The client-side
    role checks are there to give better error messages, not to provide the protection.
*   **State Locking Gateways:** Deactivating an account sets `active: false`. The rules then
    deny that account every read and write, and `AppContext.tsx` signs them out at their next
    sign-in attempt. Note that an already-open session is not terminated mid-use, and the
    Firebase Auth credential itself stays enabled unless the optional Cloud Functions are
    deployed — see the Cloud Functions section of the main README.
*   **Sandboxed Credential Creation:** A secondary Firebase app instance is used to provision
    staff passwords, so creating an account does not sign the administrator out of their own
    session.
*   **Signatures Are Never Synthesised:** Work Done Book entries require hand-drawn signatures
    from both the engineer and the ward user; the form refuses to file an entry without them.
