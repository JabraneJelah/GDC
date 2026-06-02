import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const FINAL_STATUSES = ['CLOTURE', 'A_ARCHIVER', 'ARCHIVE']

export async function POST(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorise' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id || !UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: { id: true, reference: true, statut: true },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier non trouve' }, { status: 404 })
    }

    if (FINAL_STATUSES.includes(dossier.statut)) {
      return NextResponse.json(
        { error: 'الملف مغلق — لا يمكن تعديل الوثائق بعد الإغلاق' },
        { status: 400 }
      )
    }

    const existingDoc = await prisma.dossierDocument.findFirst({
      where: { dossier_id: id, categorie: 'procedure_suivante' },
      select: { id: true, titre: true },
    })

    if (!existingDoc) {
      return NextResponse.json(
        { error: 'لا توجد وثيقة مسطرة لتحديثها' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'الملف مطلوب' }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'صيغة الملف غير مقبولة. الصيغ المقبولة: PDF أو JPG أو PNG أو DOCX' },
        { status: 400 }
      )
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'procedures')
    await mkdir(uploadDir, { recursive: true })

    const safeRef = dossier.reference.replace(/[^a-zA-Z0-9_-]/g, '-')
    const rawExt = file.name.includes('.') ? file.name.split('.').pop() : 'pdf'
    const ext = rawExt.toLowerCase()
    const fileName = `${safeRef}_procedure_${Date.now()}.${ext}`
    const filePath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/procedures/${fileName}`

    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    const updatedDoc = await prisma.dossierDocument.update({
      where: { id: existingDoc.id },
      data: {
        chemin_fichier: publicPath,
        titre: file.name,
      },
      select: {
        id: true,
        titre: true,
        chemin_fichier: true,
        categorie: true,
        origine: true,
        cree_le: true,
      },
    })

    return NextResponse.json({
      message: 'تم تحديث وثيقة طلب استكمال المسطرة التأديبية بنجاح',
      document: updatedDoc,
    })
  } catch (error) {
    console.error('Erreur lors de la mise a jour du document de procedure:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
