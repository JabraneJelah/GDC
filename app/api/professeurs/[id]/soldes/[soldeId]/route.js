import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT - Mettre à jour un solde
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const soldeId = resolvedParams?.soldeId

    if (!soldeId) {
      return NextResponse.json(
        { error: 'ID du solde manquant' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { annee, jours_total, jours_restants, type_conge_id } = body

    // Vérifier si le solde existe
    const existingSolde = await prisma.soldeConge.findUnique({
      where: { id: soldeId },
    })

    if (!existingSolde) {
      return NextResponse.json(
        { error: 'Solde non trouvé' },
        { status: 404 }
      )
    }

    const updateData = {}

    if (annee !== undefined) {
      const anneeInt = parseInt(annee, 10)
      if (isNaN(anneeInt) || anneeInt < 2000 || anneeInt > 2100) {
        return NextResponse.json(
          { error: 'Année invalide' },
          { status: 400 }
        )
      }

      // Vérifier si un autre solde existe déjà pour cette année + type
      if (anneeInt !== existingSolde.annee) {
        const duplicateSolde = await prisma.soldeConge.findUnique({
          where: {
            professeur_id_annee_type_conge_id: {
              professeur_id: existingSolde.professeur_id,
              annee: anneeInt,
              type_conge_id: existingSolde.type_conge_id,
            },
          },
        })

        if (duplicateSolde) {
          return NextResponse.json(
            { error: `Un solde existe déjà pour l'année ${anneeInt} et ce type de congé` },
            { status: 400 }
          )
        }
      }

      updateData.annee = anneeInt
      // Recalculer la date d'expiration
      updateData.expire_le = new Date(anneeInt + 2, 11, 31)
    }

    if (jours_total !== undefined) {
      const joursTotalInt = parseInt(jours_total, 10)
      if (isNaN(joursTotalInt) || joursTotalInt <= 0) {
        return NextResponse.json(
          { error: 'Nombre de jours total invalide' },
          { status: 400 }
        )
      }
      updateData.jours_total = joursTotalInt

      // Si jours_restants n'est pas fourni, ajuster automatiquement
      if (jours_restants === undefined) {
        const difference = joursTotalInt - existingSolde.jours_total
        updateData.jours_restants = Math.max(0, existingSolde.jours_restants + difference)
      }
    }

    if (type_conge_id !== undefined) {
      const typeCongeIdInt = parseInt(type_conge_id, 10)
      if (isNaN(typeCongeIdInt)) {
        return NextResponse.json(
          { error: 'Type de congé invalide' },
          { status: 400 }
        )
      }

      const typeConge = await prisma.typeConge.findUnique({
        where: { id: typeCongeIdInt },
      })

      if (!typeConge) {
        return NextResponse.json(
          { error: 'Type de congé non trouvé' },
          { status: 404 }
        )
      }

      // Vérifier l'unicité si on change le type
      if (typeCongeIdInt !== existingSolde.type_conge_id) {
        const duplicateByType = await prisma.soldeConge.findUnique({
          where: {
            professeur_id_annee_type_conge_id: {
              professeur_id: existingSolde.professeur_id,
              annee: updateData.annee || existingSolde.annee,
              type_conge_id: typeCongeIdInt,
            },
          },
        })

        if (duplicateByType) {
          return NextResponse.json(
            { error: 'Un solde existe déjà pour cette année et ce type de congé' },
            { status: 400 }
          )
        }
      }

      updateData.type_conge_id = typeCongeIdInt
    }

    if (jours_restants !== undefined) {
      const joursRestantsInt = parseInt(jours_restants, 10)
      if (isNaN(joursRestantsInt) || joursRestantsInt < 0) {
        return NextResponse.json(
          { error: 'Nombre de jours restants invalide' },
          { status: 400 }
        )
      }
      // Vérifier que jours_restants ne dépasse pas jours_total
      const joursTotal = updateData.jours_total || existingSolde.jours_total
      if (joursRestantsInt > joursTotal) {
        return NextResponse.json(
          { error: 'Les jours restants ne peuvent pas dépasser le total de jours' },
          { status: 400 }
        )
      }
      updateData.jours_restants = joursRestantsInt
    }

    const solde = await prisma.soldeConge.update({
      where: { id: soldeId },
      data: updateData,
      include: { type_conge: true },
    })

    return NextResponse.json(solde)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du solde:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un solde
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const soldeId = resolvedParams?.soldeId

    if (!soldeId) {
      return NextResponse.json(
        { error: 'ID du solde manquant' },
        { status: 400 }
      )
    }

    // Vérifier si le solde existe
    const existingSolde = await prisma.soldeConge.findUnique({
      where: { id: soldeId },
    })

    if (!existingSolde) {
      return NextResponse.json(
        { error: 'Solde non trouvé' },
        { status: 404 }
      )
    }

    await prisma.soldeConge.delete({
      where: { id: soldeId },
    })

    return NextResponse.json({ message: 'Solde supprimé avec succès' })
  } catch (error) {
    console.error('Erreur lors de la suppression du solde:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

