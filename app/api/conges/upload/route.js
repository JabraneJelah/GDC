import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

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

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Fichier manquant' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non supporté (JPEG, PNG, PDF uniquement)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 8MB)' },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'conges')
    await mkdir(uploadDir, { recursive: true })

    const extension = file.name.includes('.') ? file.name.split('.').pop() : ''
    const safeExtension = extension ? `.${extension.toLowerCase()}` : ''
    const filename = `${Date.now()}-${randomUUID()}${safeExtension}`
    const filePath = join(uploadDir, filename)
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    await writeFile(filePath, fileBuffer)

    return NextResponse.json({
      fileUrl: `/uploads/conges/${filename}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('Erreur upload pièce justificative:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
