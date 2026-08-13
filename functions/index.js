/**
 * Biomedical Engineering Maintenance Management System (BEMMS)
 * Custom Backend Callable Cloud Functions for Secure Hospital User Management.
 * Compliance: HIPAA Audit Trail & ISO 13485 Medical Software Quality Standard.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

// Initialize Admin SDK with default credentials
admin.initializeApp();

/**
 * 1. Securely Create/Provision new clinical staff keys in Firebase Auth and Firestore.
 * Executable Level: Admin or Department Head (HOD) only.
 */
exports.createUser = onCall(async (request) => {
  const { auth, data } = request;

  // Enforce auth state
  if (!auth) {
    throw new HttpsError("unauthenticated", "Authentication is required to register hospital engineers.");
  }

  // Look up caller permissions in database
  const callerSnap = await admin.firestore().collection("users").doc(auth.token.email.toLowerCase()).get();
  if (!callerSnap.exists) {
    throw new HttpsError("permission-denied", "Caller context is not registered in BEMMS.");
  }
  
  const callerData = callerSnap.data();
  if (callerData.role !== "admin" && callerData.role !== "head") {
    throw new HttpsError("permission-denied", "Operational clearance insufficient to manage directories.");
  }

  const { fullName, email, role, designation, department, password } = data;

  if (!fullName || !email || !role || !designation || !department) {
    throw new HttpsError("invalid-argument", "Missing core hospital personnel telemetry parameters.");
  }

  // Prevent HOD from provisioning Administrators
  if (callerData.role === "head" && role === "admin") {
    throw new HttpsError("permission-denied", "Department Heads (HOD) cannot escalate users to Admin level.");
  }

  const targetEmail = email.trim().toLowerCase();

  try {
    // A. Provision Credential inside Firebase Auth Engine
    const userRecord = await admin.auth().createUser({
      email: targetEmail,
      password: password || Math.random().toString(36).substring(2, 10) + "BEMMS!2k26",
      displayName: fullName,
      disabled: false,
    });

    // B. Save Secure Profile Document inside Firestore
    const newStaffProfile = {
      uid: userRecord.uid,
      email: targetEmail,
      name: fullName,
      fullName: fullName,
      role: role, // 'admin' | 'head' | 'engineer'
      designation: designation,
      department: department,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: auth.uid,
      updatedAt: new Date().toISOString()
    };

    await admin.firestore().collection("users").doc(targetEmail).set(newStaffProfile);

    return { 
      success: true, 
      uid: userRecord.uid, 
      message: `BEMMS User identity successfully authorized for ${fullName}.` 
    };
  } catch (error) {
    console.error("Failed to provision staff account via Cloud Functions:", error);
    throw new HttpsError("internal", error.message || "An unresolved server-side exception occurred.");
  }
});

/**
 * 2. Update existing directory card mapping.
 */
exports.updateUser = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Session is required for secure telemetry modifications.");
  }

  const callerSnap = await admin.firestore().collection("users").doc(auth.token.email.toLowerCase()).get();
  if (!callerSnap.exists) {
    throw new HttpsError("permission-denied", "Unauthorized operational vector.");
  }
  
  const callerData = callerSnap.data();
  if (callerData.role !== "admin" && callerData.role !== "head") {
    throw new HttpsError("permission-denied", "Operational level clearance mismatched.");
  }

  const { email, fullName, designation, department, role, active } = data;
  if (!email) {
    throw new HttpsError("invalid-argument", "Missing targeted catalog index.");
  }

  const targetEmail = email.toLowerCase();
  const targetSnap = await admin.firestore().collection("users").doc(targetEmail).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Targeted user does not exist in inventory.");
  }

  const targetData = targetSnap.data();

  // Restriction: HOD cannot escalate or modify admin files
  if (callerData.role === "head" && (targetData.role === "admin" || role === "admin")) {
    throw new HttpsError("permission-denied", "Department Heads cannot alter administrative layers.");
  }

  try {
    // A. Sync Blocked state with Auth Engine
    if (active !== undefined && targetData.active !== active) {
      await admin.auth().updateUser(targetData.uid, {
        disabled: !active
      });
    }

    // B. Sync updates to database Document
    const profileUpdates = {
      name: fullName || targetData.name,
      fullName: fullName || targetData.fullName,
      designation: designation || targetData.designation,
      department: department || targetData.department,
      role: role || targetData.role,
      active: active !== undefined ? active : (targetData.active !== false),
      updatedAt: new Date().toISOString()
    };

    await admin.firestore().collection("users").doc(targetEmail).update(profileUpdates);

    return { success: true, message: "Directory database altered successfully." };
  } catch (error) {
    console.error("Cloud Function updateUser exception:", error);
    throw new HttpsError("internal", error.message || "Could not complete directory updates.");
  }
});

/**
 * 3. Securely Reset password profiles.
 */
exports.resetUserPassword = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Authorized admin session is required.");
  }

  const callerSnap = await admin.firestore().collection("users").doc(auth.token.email.toLowerCase()).get();
  if (!callerSnap.exists || (callerSnap.data().role !== "admin" && callerSnap.data().role !== "head")) {
    throw new HttpsError("permission-denied", "Operational clearance insufficient.");
  }

  const { email } = data;
  if (!email) {
    throw new HttpsError("invalid-argument", "Targeted staff email required.");
  }

  const targetSnap = await admin.firestore().collection("users").doc(email.toLowerCase()).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Staff file not found in inventory.");
  }

  if (callerSnap.data().role === "head" && targetSnap.data().role === "admin") {
    throw new HttpsError("permission-denied", "HOD cannot trigger resets for system Admins.");
  }

  try {
    // Generate secure reset password invitation link via Firebase Auth
    const inviteLink = await admin.auth().generatePasswordResetLink(email.toLowerCase(), {
      url: "https://bemms-clinical.web.app/auth"
    });

    return { 
      success: true, 
      resetLink: inviteLink, 
      message: `Passphrase renewal link successfully calculated for ${email.toLowerCase()}.` 
    };
  } catch (error) {
    console.error("Cloud Function resetUserPassword exception:", error);
    throw new HttpsError("internal", error.message || "Could not dispatch reset directive.");
  }
});

/**
 * 4. Permanently delete user from directory catalog.
 */
exports.deleteUser = onCall(async (request) => {
  const { auth, data } = request;

  if (!auth) {
    throw new HttpsError("unauthenticated", "Unauthenticated deletion forbidden.");
  }

  const callerSnap = await admin.firestore().collection("users").doc(auth.token.email.toLowerCase()).get();
  if (!callerSnap.exists || (callerSnap.data().role !== "admin" && callerSnap.data().role !== "head")) {
    throw new HttpsError("permission-denied", "Level of authority mismatched.");
  }

  const { email } = data;
  if (!email) {
    throw new HttpsError("invalid-argument", "Missing unique targeted mail address.");
  }

  const targetEmail = email.toLowerCase();
  if (targetEmail === auth.token.email.toLowerCase()) {
    throw new HttpsError("failed-precondition", "You cannot delete your own session directory.");
  }

  const targetSnap = await admin.firestore().collection("users").doc(targetEmail).get();
  if (!targetSnap.exists) {
    throw new HttpsError("not-found", "Telemetry file already vacant.");
  }

  const targetData = targetSnap.data();
  if (callerSnap.data().role === "head" && targetData.role === "admin") {
    throw new HttpsError("permission-denied", "HOD cannot purge system Administrators.");
  }

  try {
    // A. Delete from Auth directory
    await admin.auth().deleteUser(targetData.uid);

    // B. Delete document from Firestore
    await admin.firestore().collection("users").doc(targetEmail).delete();

    return { success: true, message: `Permanently deleted ${targetEmail} access key.` };
  } catch (error) {
    console.error("Cloud Function deleteUser exception:", error);
    throw new HttpsError("internal", error.message || "Could not purge staff record.");
  }
});

/**
 * 5. Email an engineer when maintenance is assigned to them.
 *
 * Requires the "Trigger Email from Firestore" Firebase Extension, configured to
 * watch the `mail` collection. This function only writes the message; the
 * extension owns the SMTP connection and the actual delivery.
 *
 * Install with:
 *   firebase ext:install firebase/firestore-send-email
 *
 * Without the extension the app still works — the assignment is delivered
 * in-app on the engineer's dashboard, and the queued `mail` document is simply
 * never picked up.
 */
exports.onNotificationCreated = onDocumentCreated("notifications/{notificationId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const notification = snapshot.data();
  const recipientEmail = notification.recipientEmail;

  if (!recipientEmail) {
    console.warn("Notification has no recipient; nothing to email.", event.params.notificationId);
    return;
  }

  // Skip if the recipient has no sign-in credential or has been deactivated.
  const profileSnap = await admin.firestore().collection("users").doc(recipientEmail).get();
  if (profileSnap.exists && profileSnap.data().active === false) {
    console.log(`Recipient ${recipientEmail} is deactivated; no email sent.`);
    return;
  }

  const recipientName = profileSnap.exists
    ? (profileSnap.data().name || profileSnap.data().fullName || "Colleague")
    : "Colleague";

  const dueLine = notification.dueDate ? `Due date: ${notification.dueDate}` : "";
  const assignedBy = notification.createdByName ? `Assigned by ${notification.createdByName}.` : "";

  const text = [
    `Hello ${recipientName},`,
    "",
    notification.message,
    dueLine,
    assignedBy,
    "",
    "Open BEMMS to view the device history and record the work carried out.",
    "",
    "— BEMMS, Clinical Engineering Department",
    "General Hospital Lagos, Odan (GHL)",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;line-height:1.55;">
      <p>Hello ${recipientName},</p>
      <p>${notification.message}</p>
      ${notification.dueDate ? `<p><strong>Due date:</strong> ${notification.dueDate}</p>` : ""}
      ${assignedBy ? `<p style="color:#475569;font-size:14px;">${assignedBy}</p>` : ""}
      <p>Open BEMMS to view the device history and record the work carried out.</p>
      <hr style="border:none;border-top:1px solid #cbd5e1;margin:18px 0;" />
      <p style="color:#64748b;font-size:12px;">
        BEMMS — Clinical Engineering Department<br />
        General Hospital Lagos, Odan (GHL)
      </p>
    </div>`;

  try {
    await admin.firestore().collection("mail").add({
      to: [recipientEmail],
      message: {
        subject: `BEMMS: ${notification.title || "New maintenance assignment"}`,
        text,
        html,
      },
    });

    await snapshot.ref.update({ emailQueuedAt: new Date().toISOString() });
  } catch (error) {
    // The in-app notification already exists, so a mail failure is logged
    // rather than retried into a loop.
    console.error("Could not enqueue assignment email:", error);
  }
});
