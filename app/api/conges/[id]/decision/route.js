import { NextResponse } from 'next/server'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 8 * 1024 * 1024 // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

function filenameFromDecisionUrl(fileUrl) {
  if (!fileUrl) return null
  const marker = '/uploads/decisions/'
  const idx = fileUrl.indexOf(marker)
  if (idx === -1) return null
  const name = fileUrl.slice(idx + marker.length).split('?')[0]
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null
  return name
}

async function deleteDecisionFileFromDisk(fileUrl) {
  const filename = filenameFromDecisionUrl(fileUrl)
  if (!filename) return
  const filePath = join(process.cwd(), 'public', 'uploads', 'decisions', filename)
  try {
    await unlink(filePath)
  } catch (e) {
    if (e?.code !== 'ENOENT') throw e
  }
}

const congeInclude = {
  type_conge: true,
  cree_par_rh: {
    select: { nom_complet: true },
  },
}

// POST — upload or replace decision file
export async function POST(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json({ error: 'ID du congé manquant' }, { status: 400 })
    }

    const existing = await prisma.conge.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Congé non trouvé' }, { status: 404 })
    }

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

    let oldFileUrl = ''
    if (existing.decision_doc) {
      try {
        const meta = JSON.parse(existing.decision_doc)
        if (meta && typeof meta === 'object' && meta.fileUrl) {
          oldFileUrl = meta.fileUrl
        }
      } catch {
        // ignore invalid JSON
      }
    }
    if (oldFileUrl) {
      await deleteDecisionFileFromDisk(oldFileUrl)
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'decisions')
    await mkdir(uploadDir, { recursive: true })

    const extension = file.name.includes('.') ? file.name.split('.').pop() : ''
    const safeExtension = extension ? `.${extension.toLowerCase()}` : ''
    const filename = `${Date.now()}-${randomUUID()}${safeExtension}`
    const filePath = join(uploadDir, filename)
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    await writeFile(filePath, fileBuffer)

    const decisionPayload = {
      fileUrl: `/uploads/decisions/${filename}`,
      fileName: file.name,
      fileType: file.type,
    }

    const conge = await prisma.conge.update({
      where: { id },
      data: { decision_doc: JSON.stringify(decisionPayload) },
      include: congeInclude,
    })

    return NextResponse.json(conge)
  } catch (error) {
    console.error('Erreur upload décision de congé:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — remove decision file
export async function DELETE(_request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json({ error: 'ID du congé manquant' }, { status: 400 })
    }

    const existing = await prisma.conge.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Congé non trouvé' }, { status: 404 })
    }

    let fileUrl = ''
    if (existing.decision_doc) {
      try {
        const meta = JSON.parse(existing.decision_doc)
        if (meta && typeof meta === 'object' && meta.fileUrl) {
          fileUrl = meta.fileUrl
        }
      } catch {
        // ignore
      }
    }

    if (fileUrl) {
      await deleteDecisionFileFromDisk(fileUrl)
    }

    await prisma.conge.update({
      where: { id },
      data: { decision_doc: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression décision de congé:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
