import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(_request, { params }) {
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
      return NextResponse.json(
        { error: 'ID invalide' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: {
        id: true,
        statut: true,
      },
    })

    if (!dossier) {
      return NextResponse.json(
        { error: 'Dossier explicatif non trouve' },
        { status: 404 }
      )
    }

    if (dossier.statut === 'ARCHIVE') {
      return NextResponse.json(
        { error: 'Ce dossier est deja archive' },
        { status: 400 }
      )
    }

    if (dossier.statut !== 'A_ARCHIVER') {
      return NextResponse.json(
        { error: 'Ce dossier ne peut etre archive que depuis le statut A_ARCHIVER' },
        { status: 400 }
      )
    }

    const dateArchivage = new Date()

    const updatedDossier = await prisma.dossierExplicatif.update({
      where: { id: dossier.id },
      data: {
        statut: 'ARCHIVE',
        date_archivage: dateArchivage,
        archive_par_rh_id: currentUser.userId,
      },
      select: {
        id: true,
        statut: true,
        date_archivage: true,
      },
    })

    return NextResponse.json({
      message: 'Dossier archive avec succes',
      dossier_id: updatedDossier.id,
      statut: updatedDossier.statut,
      date_archivage: updatedDossier.date_archivage,
    })
  } catch (error) {
    console.error('Erreur lors de l archivage du dossier:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
