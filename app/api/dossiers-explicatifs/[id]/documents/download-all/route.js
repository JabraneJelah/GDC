import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { readFile, stat } from 'fs/promises'
import path from 'path'
import {
  resolveDocumentFilePath,
  sanitizeFileName,
} from '@/lib/dossiers-explicatifs/documentPath'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeZipPart(value) {
  return String(value || '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET(_request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح بتنفيذ هذا الإجراء' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const dossierId = resolvedParams?.id

    if (!dossierId || !UUID_PATTERN.test(dossierId)) {
      return NextResponse.json({ error: 'معرف الملف غير صالح' }, { status: 400 })
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id: dossierId },
      select: {
        id: true,
        reference: true,
        nom_complet: true,
        documents: {
          select: {
            id: true,
            titre: true,
            identifiant: true,
            chemin_fichier: true,
          },
          orderBy: { cree_le: 'asc' },
        },
      },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'لم يتم العثور على الملف' }, { status: 404 })
    }

    const { default: PizZip } = await import('pizzip')
    const zip = new PizZip()
    const usedNames = new Set()

    for (const doc of dossier.documents) {
      let filePath
      try {
        filePath = resolveDocumentFilePath(doc.chemin_fichier || '')
      } catch {
        continue
      }

      const fileStats = await stat(filePath).catch(() => null)
      if (!fileStats?.isFile()) continue

      const buffer = await readFile(filePath)

      let baseName = sanitizeFileName(path.basename(filePath) || doc.identifiant || doc.titre || 'document')
      if (usedNames.has(baseName)) {
        const ext = path.extname(baseName)
        const stem = path.basename(baseName, ext)
        let i = 2
        while (usedNames.has(`${stem}-${i}${ext}`)) i++
        baseName = `${stem}-${i}${ext}`
      }
      usedNames.add(baseName)
      zip.file(baseName, buffer)
    }

    if (usedNames.size === 0) {
      return NextResponse.json({ error: 'لا توجد وثائق متاحة لتحميلها' }, { status: 404 })
    }

    const zipBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    const refPart = sanitizeZipPart(dossier.reference)
    const namePart = sanitizeZipPart(dossier.nom_complet)
    const zipName = [refPart, namePart].filter(Boolean).join('-') + '.zip'

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
        'Content-Length': String(zipBuffer.length),
      },
    })
  } catch (error) {
    console.error('Erreur lors du telechargement de tous les documents:', error)
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 })
  }
}
