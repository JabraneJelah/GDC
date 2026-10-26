export const ORDRE_RETENUE_PRE_ARCHIVE_STATUSES = [
  'PROCEDURE_SUIVANTE_GENEREE',
  'A_ARCHIVER',
]

export function getOrdreRetenueFirstUploadPhase(firstUploadHistory) {
  if (!firstUploadHistory || firstUploadHistory.action !== 'ORDRE_RETENUE_TELEVERSE') {
    return null
  }

  const { ancien_statut: oldStatus, nouveau_statut: newStatus } = firstUploadHistory

  if (oldStatus === 'ARCHIVE' && newStatus === 'ARCHIVE') {
    return 'POST_ARCHIVE'
  }

  if (
    oldStatus === newStatus &&
    ORDRE_RETENUE_PRE_ARCHIVE_STATUSES.includes(oldStatus)
  ) {
    return 'PRE_ARCHIVE'
  }

  return null
}

export function deriveOrdreRetenuePolicy({
  statut,
  typeProcedure,
  document,
  firstUploadHistory,
  hasMultipleDocuments = false,
}) {
  const firstUploadPhase = getOrdreRetenueFirstUploadPhase(firstUploadHistory)
  const basePolicy = {
    firstUploadPhase,
    canUpload: false,
    canReplace: false,
    lockedAfterArchive: false,
  }

  if (typeProcedure !== 'RETENUE' || hasMultipleDocuments) {
    return basePolicy
  }

  if (ORDRE_RETENUE_PRE_ARCHIVE_STATUSES.includes(statut)) {
    return {
      ...basePolicy,
      canUpload: !document,
      canReplace: Boolean(document),
    }
  }

  if (statut !== 'ARCHIVE') {
    return basePolicy
  }

  if (!document) {
    return { ...basePolicy, canUpload: true }
  }

  if (firstUploadPhase === 'POST_ARCHIVE') {
    return { ...basePolicy, canReplace: true }
  }

  return { ...basePolicy, lockedAfterArchive: true }
}

export function isOrdreRetenueTimestampConsistent({
  documentCreatedAt,
  archiveDate,
  firstUploadPhase,
}) {
  if (!documentCreatedAt || !archiveDate || !firstUploadPhase) return true

  const documentTime = new Date(documentCreatedAt).getTime()
  const archiveTime = new Date(archiveDate).getTime()
  if (!Number.isFinite(documentTime) || !Number.isFinite(archiveTime)) return true

  return firstUploadPhase === 'PRE_ARCHIVE'
    ? documentTime <= archiveTime
    : documentTime >= archiveTime
}
