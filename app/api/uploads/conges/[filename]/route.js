import { NextResponse } from 'next/server'
import { join } from 'path'
import { stat, readFile } from 'fs/promises'

export const runtime = 'nodejs'

function getContentTypeFromFilename(filename) {
  const ext = filename.toLowerCase().split('.').pop()
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

function isSafeFilename(filename) {
  if (!filename) return false
  // Block path traversal and directory separators
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) return false
  return true
}

export async function GET(_request, { params }) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params
    const raw = resolvedParams?.filename
    const filename = raw ? decodeURIComponent(String(raw)) : ''

    if (!isSafeFilename(filename)) {
      return NextResponse.json({ error: 'Nom de fichier invalide' }, { status: 400 })
    }

    const filePath = join(process.cwd(), 'public', 'uploads', 'conges', filename)

    try {
      const s = await stat(filePath)
      if (!s.isFile()) {
        return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
      }
    } catch {
      return NextResponse.json({ error: 'Fichier introuvable' }, { status: 404 })
    }

    const buffer = await readFile(filePath)
    const contentType = getContentTypeFromFilename(filename)

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // inline so images/PDF can be previewed; links can still force download via `download` attribute
        'Content-Disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Erreur lecture fichier uploadé:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

