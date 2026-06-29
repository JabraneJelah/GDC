import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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

    let body = {}
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Corps de la requête invalide' }, { status: 400 })
    }

    const motif = typeof body.motif_annulation === 'string' ? body.motif_annulation.trim() : ''
    if (!motif) {
      return NextResponse.json(
        { error: 'سبب الإلغاء مطلوب' },
        { status: 400 }
      )
    }

    const dossier = await prisma.dossierExplicatif.findUnique({
      where: { id },
      select: { id: true, statut: true },
    })

    if (!dossier) {
      return NextResponse.json({ error: 'Dossier explicatif non trouve' }, { status: 404 })
    }

    if (dossier.statut === 'ARCHIVE' || dossier.statut === 'ANNULE') {
      return NextResponse.json(
        { error: 'لا يمكن إلغاء ملف مؤرشف أو ملغى بالفعل' },
        { status: 400 }
      )
    }

    const ancienStatut = dossier.statut

    await prisma.$transaction(async (tx) => {
      await tx.dossierExplicatif.update({
        where: { id },
        data: {
          statut: 'ANNULE',
          motif_annulation: motif,
        },
      })

      await tx.dossierHistory.create({
        data: {
          dossier_id: id,
          action: 'ANNULATION',
          description: motif,
          ancien_statut: ancienStatut,
          nouveau_statut: 'ANNULE',
          effectue_par_rh_id: currentUser.userId,
        },
      })
    })

    return NextResponse.json({
      message: 'تم إلغاء الملف بنجاح',
      dossier_id: id,
      statut: 'ANNULE',
    })
  } catch (error) {
    console.error('Erreur lors de l annulation du dossier:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
