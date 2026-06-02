import { NextResponse } from 'next/server'

export const ROLES = {
  UTILISATEUR_RH: 'UTILISATEUR_RH',
  LECTEUR_RH: 'LECTEUR_RH',
}

export const VALID_ROLES = Object.values(ROLES)

export const ROLE_LABELS = {
  UTILISATEUR_RH: 'مستخدم الموارد البشرية',
  LECTEUR_RH: 'مستخدم للقراءة فقط',
}

/**
 * Pass the decoded JWT user (from getCurrentUser()).
 * Returns a 403 Response if the user is LECTEUR_RH, null otherwise.
 * Old tokens without a role field default to UTILISATEUR_RH (safe).
 */
export function rejectIfLecteur(currentUser) {
  const role = currentUser?.role ?? ROLES.UTILISATEUR_RH
  if (role === ROLES.LECTEUR_RH) {
    return NextResponse.json(
      { error: 'غير مسموح لهذا المستخدم بتنفيذ هذه العملية' },
      { status: 403 }
    )
  }
  return null
}

export function isLecteurRH(role) {
  return role === ROLES.LECTEUR_RH
}
