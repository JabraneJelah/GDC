import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import {
  resolveDocumentFilePath,
  sanitizeFileName,
  getContentType,
} from '@/lib/dossiers-explicatifs/documentPath'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(_request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح بتنفيذ هذا الإجراء' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const dossierId = resolvedParams?.id
    const documentId = resolvedParams?.documentId

    if (!dossierId || !UUID_PATTERN.test(dossierId)) {
      return NextResponse.json({ error: 'معرف الملف غير صالح' }, { status: 400 })
    }

    if (!documentId || !UUID_PATTERN.test(documentId)) {
      return NextResponse.json({ error: 'معرف الوثيقة غير صالح' }, { status: 400 })
    }

    const document = await prisma.dossierDocument.findFirst({
      where: {
        id: documentId,
        dossier_id: dossierId,
      },
      select: {
        id: true,
        titre: true,
        identifiant: true,
        chemin_fichier: true,
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'لم يتم العثور على الوثيقة' }, { status: 404 })
    }

    let filePath
    try {
      filePath = resolveDocumentFilePath(document.chemin_fichier || '')
    } catch (error) {
      if (error.message === 'missing_path') {
        return NextResponse.json({ error: 'مسار الوثيقة غير موجود' }, { status: 400 })
      }

      if (error.message === 'pending_file') {
        return NextResponse.json({ error: 'الوثيقة لم يتم إنشاؤها بعد' }, { status: 400 })
      }

      return NextResponse.json({ error: 'مسار الوثيقة غير صالح' }, { status: 400 })
    }

    const fileStats = await stat(filePath).catch(() => null)
    if (!fileStats?.isFile()) {
      return NextResponse.json({ error: 'ملف الوثيقة غير موجود' }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    const fileName = sanitizeFileName(path.basename(filePath) || document.identifiant || document.titre || 'document')
    const contentType = getContentType(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.length),
      },
    })
  } catch (error) {
    console.error('Erreur lors du telechargement du document de dossier:', error)
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
