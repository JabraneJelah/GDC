/**
 * Required extra fields per TypeFaute code.
 * Keys must match the TypeFaute.code values stored in the database.
 * These fields are stored in DossierExplicatif.donnees_supplementaires (Json).
 */
export const EXTRA_FIELDS_BY_TYPE_FAUTE_CODE = {
  CERTIFICAT_MEDICAL_HORS_DELAI: [
    {
      key: 'date_certificat_medical',
      label: 'تاريخ الشهادة الطبية',
      type: 'date',
      required: true,
      placeholder: 'DD/MM/YYYY',
    },
    {
      key: 'duree_certificat_medical',
      label: 'مدة العجز بالأيام',
      type: 'text',
      required: true,
      placeholder: 'مثال: 3',
    },
  ],
}

/**
 * Blocking message shown when required extra fields are missing,
 * keyed by TypeFaute code.
 */
const EXTRA_FIELDS_BLOCKING_MESSAGES = {
  CERTIFICAT_MEDICAL_HORS_DELAI: 'يرجى إدخال تاريخ الشهادة الطبية ومدة العجز قبل إنشاء الوثائق.',
}

/**
 * Returns the extra fields config for a given TypeFaute code.
 * Returns an empty array if the code has no extra fields.
 */
export function getExtraFieldsForCode(code) {
  if (!code) return []
  return EXTRA_FIELDS_BY_TYPE_FAUTE_CODE[code] || []
}

/**
 * Returns the list of required keys that are missing from the given data object.
 */
export function getMissingRequiredFields(code, data) {
  const fields = getExtraFieldsForCode(code)
  const safeData = data && typeof data === 'object' ? data : {}
  return fields
    .filter((f) => f.required)
    .filter((f) => !safeData[f.key]?.toString().trim())
    .map((f) => f.key)
}

/**
 * Returns the blocking message to display when required extra fields are missing.
 * Falls back to a generic message if none is configured for the given code.
 */
export function getBlockingMessageForCode(code) {
  if (!code) return null
  return EXTRA_FIELDS_BLOCKING_MESSAGES[code] || null
}
