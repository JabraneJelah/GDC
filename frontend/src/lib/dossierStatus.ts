export const DOSSIER_STATUS_LABELS = {
  ENREGISTRE: "تم تسجيل الملف",
  DOCUMENTS_INITIAUX_GENERES: "تم إنشاء الوثائق الأولية",
  NOTIFIE: "تم تبليغ المعني بالأمر",
  REPONSE_RECUE: "تم التوصل بالجواب",
  REPONSE_CONVAINCANTE: "الجواب مقنع",
  REPONSE_NON_CONVAINCANTE: "الجواب غير مقنع",
  PROCEDURE_SUIVANTE_GENEREE: "تم إنشاء المسطرة اللاحقة",
  CLOTURE: "تم إغلاق الملف",
  A_ARCHIVER: "في انتظار الأرشفة",
  ARCHIVE: "مؤرشف",
} as const

export const DOSSIER_NEXT_ACTION_LABELS = {
  ENREGISTRE: "إنشاء الوثائق الأولية",
  DOCUMENTS_INITIAUX_GENERES: "تسجيل التبليغ",
  NOTIFIE: "تسجيل الجواب",
  REPONSE_RECUE: "تقييم الجواب",
  REPONSE_CONVAINCANTE: "إغلاق الملف",
  REPONSE_NON_CONVAINCANTE: "إنشاء المسطرة اللاحقة",
  PROCEDURE_SUIVANTE_GENEREE: "إغلاق الملف",
} as const

export const DOSSIER_STATUS_COLORS = {
  ENREGISTRE: "neutral",
  DOCUMENTS_INITIAUX_GENERES: "info",
  NOTIFIE: "warning",
  REPONSE_RECUE: "warning",
  REPONSE_CONVAINCANTE: "success",
  REPONSE_NON_CONVAINCANTE: "danger",
  PROCEDURE_SUIVANTE_GENEREE: "info",
  CLOTURE: "success",
  A_ARCHIVER: "warning",
  ARCHIVE: "success",
} as const

export type DossierStatus = keyof typeof DOSSIER_STATUS_LABELS
export type DossierStatusColor = typeof DOSSIER_STATUS_COLORS[DossierStatus]

export function getDossierStatusLabel(status: string): string {
  return DOSSIER_STATUS_LABELS[status as DossierStatus] ?? status
}

export function getNextActionLabel(status: string): string | null {
  return DOSSIER_NEXT_ACTION_LABELS[status as keyof typeof DOSSIER_NEXT_ACTION_LABELS] ?? null
}

export function getStatusColor(status: string): DossierStatusColor {
  return DOSSIER_STATUS_COLORS[status as DossierStatus] ?? "neutral"
}
