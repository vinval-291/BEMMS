/**
 * The single designated bootstrap account. This account is granted the admin
 * role on first sign-in so the staff directory can be seeded on an empty
 * database. It is mirrored in firestore.rules — change both together.
 */
export const BOOTSTRAP_ADMIN_EMAIL = 'kuteyioluwaloyevincent291@gmail.com';

/** Institution shown in the app shell and on the sign-in screen. */
export const INSTITUTION_NAME = 'General Hospital Lagos, Odan (GHL)';
export const INSTITUTION_SHORT_NAME = 'GHL';

/** Document ID prefixes for the human-readable record identifiers. */
export const EQUIPMENT_ID_PREFIX = 'EQ-';
export const SCHEDULE_ID_PREFIX = 'SCH-';
export const jobIdPrefix = (date = new Date()) => `JOB-${date.getFullYear()}-`;
