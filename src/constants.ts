/**
 * The single designated bootstrap account. This account is granted the admin
 * role on first sign-in so the staff directory can be seeded on an empty
 * database. It is mirrored in firestore.rules — change both together.
 */
export const BOOTSTRAP_ADMIN_EMAIL = 'kuteyioluwaloyevincent291@gmail.com';

/** Institution shown in the app shell and on the sign-in screen. */
export const INSTITUTION_NAME = 'General Hospital Lagos, Odan (GHL)';
export const INSTITUTION_SHORT_NAME = 'GHL';

/**
 * Clinical wards and units at GHL. Used by the equipment registry, the
 * scheduler and the administration screen so every ward name is spelled
 * identically across records.
 */
export const WARDS: string[] = [
  'CASUALTY',
  'LASEM',
  'MOPD',
  'NHIS (STAFF CLINIC)',
  'GOPD',
  'SOPD',
  'ENT CLINIC',
  'CARDIOLOGY',
  'SPECIAL CLINIC (SKIN)',
  'RADIOLOGY',
  'FAMILY MEDICINE',
  'A1 WARD (FEMALE SURGICAL)',
  'A2 WARD (STROKE WARD)',
  'B1 WARD (MALE SURGICAL)',
  'B2 WARD (GENITO-URINARY)',
  'B3 WARD (BURNS UNIT)',
  'EEG LAB',
  'EYE CLINIC',
  'PHYSICAL MEDICINE & PHYSIOTHERAPY',
  'PAEDIATRIC PHYSIOTHERAPY',
  'D1 WARD (FEMALE MEDICAL)',
  'D2 WARD (FEMALE MEDICAL)',
  'E1 WARD (MALE MEDICAL)',
  'E2 WARD (CHILDREN SURGICAL)',
  'MAIN THEATRE (RECOVERY ROOM)',
  'MAIN THEATRE SUITE 1',
  'MAIN THEATRE SUITE 2',
  'MINOR THEATRE',
  'PRIVATE WARD (IKOLABA A1)',
  'PRIVATE WARD (IKOLABA A2)',
  'PRIVATE WARD (IKOLABA B1)',
  'PRIVATE WARD (IKOLABA B2)',
  'PRIVATE WARD (IKOLABA D1)',
  'PRIVATE WARD (IKOLABA D2)',
  'PRIVATE WARD (IKOLABA E1)',
  'PRIVATE WARD (ANGERE A1)',
  'PRIVATE WARD (ANGERE B1)',
  'PRIVATE WARD (ANGERE D1)',
  'PRIVATE WARD (ANGERE E1)',
  'PRIVATE WARD (OLOGEDE A1)',
  'PRIVATE WARD (OLOGEDE B1)',
  'PRIVATE WARD (OLOGEDE D1)',
  'PRIVATE WARD (OLOGEDE E1)',
  'PRIVATE WARD (ADIMU A2)',
  'PRIVATE WARD (ADIMU B2)',
  'PRIVATE WARD (ADIMU D2)',
  'PRIVATE WARD (ADIMU E2)',
  'PRIVATE WARD (ONIKO A2)',
  'PRIVATE WARD (ONIKO D2)',
  'PATHOLOGY',
];

/**
 * Query parameter a QR label points at, e.g. https://<host>/?equipment=EQ-0001
 *
 * Encoding a real URL rather than a custom scheme means a phone's built-in
 * camera can open the record directly, with no app or scanner required.
 */
export const EQUIPMENT_DEEP_LINK_PARAM = 'equipment';

export function equipmentDeepLink(equipmentId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/?${EQUIPMENT_DEEP_LINK_PARAM}=${encodeURIComponent(equipmentId)}`;
}

/**
 * Pulls an equipment ID out of a scanned code or a typed entry.
 *
 * Accepts the current URL labels, the `bemms-equip:EQ-0001` scheme printed by
 * earlier versions, and a bare ID or asset number typed by hand.
 */
export function parseEquipmentCode(raw: string): string {
  const text = raw.trim();
  if (!text) return '';

  try {
    const url = new URL(text);
    const fromQuery = url.searchParams.get(EQUIPMENT_DEEP_LINK_PARAM);
    if (fromQuery) return fromQuery.trim();
  } catch {
    // Not a URL; fall through to the other formats.
  }

  if (text.toLowerCase().startsWith('bemms-equip:')) {
    return text.slice('bemms-equip:'.length).trim();
  }

  return text;
}

/** Document ID prefixes for the human-readable record identifiers. */
export const EQUIPMENT_ID_PREFIX = 'EQ-';
export const SCHEDULE_ID_PREFIX = 'SCH-';
export const jobIdPrefix = (date = new Date()) => `JOB-${date.getFullYear()}-`;
