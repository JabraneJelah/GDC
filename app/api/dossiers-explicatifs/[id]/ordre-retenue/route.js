import { NextResponse } from 'next/server'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { resolveDocumentFilePath } from '@/lib/dossiers-explicatifs/documentPath'
import {
  deriveOrdreRetenuePolicy,
  isOrdreRetenueTimestampConsistent,
  ORDRE_RETENUE_PRE_ARCHIVE_STATUSES,
} from '@/lib/dossiers-explicatifs/ordreRetenuePolicy'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
}
const ALLOWED_STORAGE_PREFIXES = [
  '/uploads/procedures/ordres-retenue/',
  'uploads/procedures/ordres-retenue/',
]
const POTENTIALLY_ALLOWED_STATUSES = [...ORDRE_RETENUE_PRE_ARCHIVE_STATUSES, 'ARCHIVE']

function sanitizeFileNamePart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function sanitizeOriginalFileName(value) {
  return path.basename(String(value || 'document'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 180)
}

function createRouteError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

async function deletePreviousFileSafely(storedPath) {
  const normalizedPath = String(storedPath || '').trim().replace(/\\/g, '/')
  if (!ALLOWED_STORAGE_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix))) {
    throw new Error('previous_file_outside_ordre_retenue_storage')
  }

  const filePath = resolveDocumentFilePath(normalizedPath)
  const allowedDirectory = path.resolve(
    process.cwd(),
    'public',
    'uploads',
    'procedures',
    'ordres-retenue',
  )
  const relativeToAllowedDirectory = path.relative(allowedDirectory, filePath)
  if (
    !relativeToAllowedDirectory ||
    relativeToAllowedDirectory.startsWith('..') ||
    path.isAbsolute(relativeToAllowedDirectory)
  ) {
    throw new Error('previous_file_outside_ordre_retenue_storage')
  }

  await unlink(filePath)
}

export async function POST(request, { params }) {
  let newlyWrittenFilePath = null

  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح بتنفيذ هذا الإجراء' }, { status: 401 })
    }

    const databaseUser = await prisma.utilisateurRH.findUnique({
      where: { id: currentUser.userId },
      select: { id: true, role: true, actif: true },
    })

    if (!databaseUser || !databaseUser.actif || databaseUser.role !== 'UTILISATEUR_RH') {
      return NextResponse.json({ error: 'غير مسموح لهذا المستخدم بتنفيذ هذه العملية' }, { status: 403 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id || !UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'معرف الملف غير صالح' }, { status: 400 })
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        statut: true,
        type_procedure_selectionne: true,
      },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'لم يتم العثور على الملف التوضيحي' }, { status: 404 })
    }

    if (dossier.type_procedure_selectionne !== 'RETENUE') {
      return NextResponse.json({ error: 'أمر الاقتطاع متاح فقط للملفات ذات مسطرة الاقتطاع' }, { status: 409 })
    }

    if (!POTENTIALLY_ALLOWED_STATUSES.includes(dossier.statut)) {
      return NextResponse.json({ error: 'لا يمكن رفع أمر الاقتطاع في الحالة الحالية للملف' }, { status: 409 })
    }

    const formData = await request.formData()
    const formEntries = Array.from(formData.entries())
    if (formEntries.length !== 1 || formEntries[0][0] !== 'file') {
      return NextResponse.json({ error: 'يجب أن يحتوي الطلب على ملف أمر الاقتطاع فقط' }, { status: 400 })
    }
    const file = formEntries[0][1]

    if (!file || typeof file === 'string' || file.size === 0) {
      return NextResponse.json({ error: 'ملف أمر الاقتطاع مطلوب' }, { status: 400 })
    }

    const extension = ALLOWED_FILE_TYPES[file.type]
    if (!extension) {
      return NextResponse.json(
        { error: 'صيغة الملف غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG' },
        { status: 400 },
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (8 ميغابايت)' }, { status: 413 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'procedures', 'ordres-retenue')
    await mkdir(uploadDir, { recursive: true })

    const uniquePart = crypto.randomUUID()
    const safeReference = sanitizeFileNamePart(dossier.reference) || 'dossier'
    const fileName = `${safeReference}_ordre_retenue_${uniquePart}.${extension}`
    newlyWrittenFilePath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/procedures/ordres-retenue/${fileName}`
    const originalFileName = sanitizeOriginalFileName(file.name)

    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(newlyWrittenFilePath, bytes, { flag: 'wx' })

    const result = await prisma.$transaction(async (tx) => {
      const lockedDossiers = await tx.$queryRaw`
        SELECT "id", "reference", "statut", "type_procedure_selectionne", "date_archivage"
        FROM "dossiers_explicatifs"
        WHERE "id" = ${id}
        FOR UPDATE
      `
      const lockedDossier = lockedDossiers[0]

      if (!lockedDossier) {
        throw createRouteError('DOSSIER_NOT_FOUND')
      }

      const [eligibleUser, existingDocuments, firstUploadHistory] = await Promise.all([
        tx.utilisateurRH.findUnique({
          where: { id: databaseUser.id },
          select: { id: true, role: true, actif: true },
        }),
        tx.dossierDocument.findMany({
          where: { dossier_id: id, categorie: 'ordre_retenue' },
          select: {
            id: true,
            identifiant: true,
            titre: true,
            chemin_fichier: true,
            origine: true,
            categorie: true,
            cree_le: true,
          },
          orderBy: [{ cree_le: 'asc' }, { id: 'asc' }],
        }),
        tx.dossierHistory.findFirst({
          where: { dossier_id: id, action: 'ORDRE_RETENUE_TELEVERSE' },
          select: {
            id: true,
            action: true,
            ancien_statut: true,
            nouveau_statut: true,
            cree_le: true,
          },
          orderBy: [{ cree_le: 'asc' }, { id: 'asc' }],
        }),
      ])

      if (!eligibleUser || !eligibleUser.actif || eligibleUser.role !== 'UTILISATEUR_RH') {
        throw createRouteError('USER_NOT_AUTHORIZED')
      }

      if (existingDocuments.length > 1) {
        throw createRouteError('MULTIPLE_DOCUMENTS')
      }

      const existingDocument = existingDocuments[0] || null
      const policy = deriveOrdreRetenuePolicy({
        statut: lockedDossier.statut,
        typeProcedure: lockedDossier.type_procedure_selectionne,
        document: existingDocument,
        firstUploadHistory,
      })

      if (existingDocument && !isOrdreRetenueTimestampConsistent({
        documentCreatedAt: existingDocument.cree_le,
        archiveDate: lockedDossier.date_archivage,
        firstUploadPhase: policy.firstUploadPhase,
      })) {
        console.warn(`Incoherence temporelle ordre_retenue pour le dossier ${id}`)
      }

      if (!existingDocument && !policy.canUpload) {
        throw createRouteError('DOSSIER_NOT_ELIGIBLE')
      }

      if (existingDocument && !policy.canReplace) {
        throw createRouteError(
          policy.lockedAfterArchive ? 'DOCUMENT_LOCKED_AFTER_ARCHIVE' : 'DOSSIER_NOT_ELIGIBLE',
        )
      }

      const title = originalFileName ? `أمر اقتطاع - ${originalFileName}` : 'أمر اقتطاع'
      const document = existingDocument
        ? await tx.dossierDocument.update({
            where: { id: existingDocument.id },
            data: {
              titre: title,
              chemin_fichier: publicPath,
              origine: 'TELEVERSE',
              template_id: null,
              cree_par_rh_id: eligibleUser.id,
            },
            select: {
              id: true,
              identifiant: true,
              titre: true,
              chemin_fichier: true,
              origine: true,
              categorie: true,
              cree_le: true,
            },
          })
        : await tx.dossierDocument.create({
            data: {
              identifiant: `ORDRE-RETENUE-${id}-${uniquePart}`,
              titre: title,
              chemin_fichier: publicPath,
              origine: 'TELEVERSE',
              categorie: 'ordre_retenue',
              dossier_id: id,
              template_id: null,
              cree_par_rh_id: eligibleUser.id,
            },
            select: {
              id: true,
              identifiant: true,
              titre: true,
              chemin_fichier: true,
              origine: true,
              categorie: true,
              cree_le: true,
            },
          })

      const action = existingDocument ? 'ORDRE_RETENUE_REMPLACE' : 'ORDRE_RETENUE_TELEVERSE'
      await tx.dossierHistory.create({
        data: {
          dossier_id: id,
          action,
          description: JSON.stringify({
            document_id: document.id,
            nom_fichier_original: originalFileName,
            ancien_chemin_fichier: existingDocument?.chemin_fichier || null,
            nouveau_chemin_fichier: publicPath,
          }),
          ancien_statut: lockedDossier.statut,
          nouveau_statut: lockedDossier.statut,
          effectue_par_rh_id: eligibleUser.id,
        },
      })

      return {
        document,
        action,
        statut: lockedDossier.statut,
        previousFilePath: existingDocument?.chemin_fichier || null,
      }
    })

    newlyWrittenFilePath = null

    let oldFileCleanupWarning = null
    if (result.previousFilePath && result.previousFilePath !== result.document.chemin_fichier) {
      try {
        await deletePreviousFileSafely(result.previousFilePath)
      } catch (cleanupError) {
        if (cleanupError?.code !== 'ENOENT') {
          oldFileCleanupWarning = 'تعذر حذف الملف السابق من التخزين'
          console.error('Impossible de supprimer l ancien fichier ordre retenue:', cleanupError)
        }
      }
    }

    return NextResponse.json({
      message: result.action === 'ORDRE_RETENUE_REMPLACE'
        ? 'تم استبدال أمر الاقتطاع بنجاح'
        : 'تمت إضافة أمر الاقتطاع بنجاح',
      dossier_id: id,
      statut: result.statut,
      action: result.action,
      document: result.document,
      warning: oldFileCleanupWarning,
    }, { status: result.action === 'ORDRE_RETENUE_REMPLACE' ? 200 : 201 })
  } catch (error) {
    if (newlyWrittenFilePath) {
      await unlink(newlyWrittenFilePath).catch((cleanupError) => {
        console.error('Impossible de supprimer le nouveau fichier ordre retenue apres echec:', cleanupError)
      })
    }

    if (error?.code === 'DOSSIER_NOT_FOUND') {
      return NextResponse.json({ error: 'لم يتم العثور على الملف التوضيحي' }, { status: 404 })
    }

    if (error?.code === 'USER_NOT_AUTHORIZED') {
      return NextResponse.json({ error: 'غير مسموح لهذا المستخدم بتنفيذ هذه العملية' }, { status: 403 })
    }

    if (error?.code === 'DOCUMENT_LOCKED_AFTER_ARCHIVE') {
      return NextResponse.json(
        { error: 'أمر الاقتطاع المرفوع قبل الأرشفة مقفل ولا يمكن استبداله بعد الأرشفة' },
        { status: 409 },
      )
    }

    if (error?.code === 'MULTIPLE_DOCUMENTS') {
      return NextResponse.json(
        { error: 'تعذر تحديد وثيقة أمر الاقتطاع الحالية بسبب وجود بيانات غير متناسقة' },
        { status: 409 },
      )
    }

    if (error?.code === 'DOSSIER_NOT_ELIGIBLE') {
      return NextResponse.json({ error: 'هذا الملف غير مؤهل لرفع أو استبدال أمر الاقتطاع' }, { status: 409 })
    }

    console.error('Erreur lors du televersement de l ordre de retenue:', error)
    return NextResponse.json({ error: 'حدث خطأ أثناء رفع أمر الاقتطاع' }, { status: 500 })
  }
}
