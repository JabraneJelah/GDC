import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const VALID_USAGES = [
  'LETTRE_EXPLICATIVE',
  'BORDEREAU_NOTIFICATION',
  'AVERTISSEMENT',
  'RETENUE',
  'PROCEDURE_DISCIPLINAIRE',
]

export const runtime = 'nodejs'

function jsonError(message, status) {
  return NextResponse.json({ error: message }, { status })
}

function getStringValue(formData, field) {
  const value = formData.get(field)
  return typeof value === 'string' ? value.trim() : ''
}

function isUploadedFile(file) {
  return file && typeof file.name === 'string' && typeof file.arrayBuffer === 'function'
}

function isDocxFile(file) {
  const name = typeof file?.name === 'string' ? file.name.toLowerCase() : ''
  return name.endsWith('.docx')
}

function buildSafeFileName(originalName) {
  const baseName = path
    .basename(originalName, path.extname(originalName))
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

  return `${Date.now()}-${randomUUID()}-${baseName || 'template'}.docx`
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const formData = await request.formData()
    const file = formData.get('file')
    const nom = getStringValue(formData, 'nom')
    const identifiant = getStringValue(formData, 'identifiant')
    const description = getStringValue(formData, 'description')
    const usage = getStringValue(formData, 'usage')
    const typeFauteIdRaw = getStringValue(formData, 'type_faute_id')
    const type_faute_id = typeFauteIdRaw ? parseInt(typeFauteIdRaw, 10) : null

    if (!nom || !identifiant || !typeFauteIdRaw || !usage || !isUploadedFile(file)) {
      return jsonError('المرجو ملء الحقول المطلوبة وإرفاق ملف DOCX', 400)
    }

    if (type_faute_id == null || isNaN(type_faute_id)) {
      return jsonError('نوع المخالفة غير صالح', 400)
    }

    if (!VALID_USAGES.includes(usage)) {
      return jsonError('نوع الاستعمال غير صالح', 400)
    }

    if (!isDocxFile(file)) {
      return jsonError('يجب اختيار ملف بصيغة DOCX فقط', 400)
    }

    const [typeFaute, existingIdentifiant, existingUsagePair] = await Promise.all([
      prisma.typeFaute.findUnique({
        where: { id: type_faute_id },
      }),
      prisma.documentTemplate.findFirst({
        where: {
          identifiant: { equals: identifiant, mode: 'insensitive' },
          actif: true,
        },
      }),
      prisma.documentTemplate.findFirst({
        where: { type_faute_id, usage, actif: true },
      }),
    ])

    if (!typeFaute) {
      return jsonError('نوع المخالفة غير موجود', 404)
    }

    if (existingIdentifiant) {
      return jsonError('يوجد بالفعل نموذج نشط بنفس المعرف', 409)
    }

    if (existingUsagePair) {
      return jsonError('يوجد بالفعل نموذج نشط بنفس نوع المخالفة ونوع الاستعمال', 409)
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'templates')
    await mkdir(uploadDir, { recursive: true })

    const fileName = buildSafeFileName(file.name)
    const diskPath = path.join(uploadDir, fileName)
    const publicPath = `/uploads/templates/${fileName}`
    const bytes = Buffer.from(await file.arrayBuffer())

    await writeFile(diskPath, bytes, { flag: 'wx' })

    const template = await prisma.documentTemplate.create({
      data: {
        identifiant,
        nom,
        code: usage,
        description: description || null,
        format_source: 'DOCX',
        usage,
        chemin_fichier: publicPath,
        version: 1,
        actif: true,
        type_faute_id,
      },
      include: {
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        message: 'تم إنشاء نموذج الوثيقة بنجاح',
        template,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Erreur lors de l'upload du template de document:", error)

    if (error?.code === 'P2002') {
      return jsonError('يوجد بالفعل نموذج نشط بنفس المعرف', 409)
    }

    return jsonError('حدث خطأ غير متوقع أثناء رفع النموذج', 500)
  }
}
