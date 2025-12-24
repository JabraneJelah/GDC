import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// PUT - Mettre à jour un congé
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du congé manquant' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      professeur_id,
      type_conge_id,
      date_debut,
      date_fin,
      duree_jours,
      reference_doc,
      nom_interim,
      prenom_interim,
    } = body

    // Vérifier si le congé existe
    const existingConge = await prisma.conge.findUnique({
      where: { id },
      include: {
        professeur: true,
        type_conge: true,
      },
    })

    if (!existingConge) {
      return NextResponse.json(
        { error: 'Congé non trouvé' },
        { status: 404 }
      )
    }

    // Validation des champs obligatoires
    if (
      !professeur_id ||
      !type_conge_id ||
      !date_debut ||
      !date_fin ||
      !duree_jours
    ) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Convertir type_conge_id et duree_jours en entiers
    const typeCongeIdInt = parseInt(type_conge_id, 10)
    const dureeJoursInt = parseInt(duree_jours, 10)

    if (isNaN(typeCongeIdInt)) {
      return NextResponse.json(
        { error: 'Type de congé invalide' },
        { status: 400 }
      )
    }

    if (isNaN(dureeJoursInt) || dureeJoursInt <= 0) {
      return NextResponse.json(
        { error: 'Durée en jours invalide' },
        { status: 400 }
      )
    }

    // Vérifier que le professeur existe
    if (professeur_id !== existingConge.professeur_id) {
      const professeur = await prisma.professeur.findUnique({
        where: { id: professeur_id },
      })

      if (!professeur) {
        return NextResponse.json(
          { error: 'Professeur non trouvé' },
          { status: 404 }
        )
      }
    }

    // Vérifier que le type de congé existe
    if (typeCongeIdInt !== existingConge.type_conge_id) {
      const typeConge = await prisma.typeConge.findUnique({
        where: { id: typeCongeIdInt },
      })

      if (!typeConge) {
        return NextResponse.json(
          { error: 'Type de congé non trouvé' },
          { status: 404 }
        )
      }
    }

    // Mettre à jour le congé
    const conge = await prisma.conge.update({
      where: { id },
      data: {
        professeur_id,
        type_conge_id: typeCongeIdInt,
        date_debut: new Date(date_debut),
        date_fin: new Date(date_fin),
        duree_jours: dureeJoursInt,
        reference_doc: reference_doc || null,
        nom_interim: nom_interim || null,
        prenom_interim: prenom_interim || null,
      },
      include: {
        professeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            ppr: true,
          },
        },
        type_conge: true,
        cree_par_rh: {
          select: {
            nom_complet: true,
          },
        },
      },
    })

    return NextResponse.json(conge)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du congé:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un congé
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Handle both sync and async params (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json(
        { error: 'ID du congé manquant' },
        { status: 400 }
      )
    }

    // Récupérer le congé avec toutes les informations nécessaires
    const existingConge = await prisma.conge.findUnique({
      where: { id },
      include: {
        professeur: true,
        type_conge: true,
      },
    })

    if (!existingConge) {
      return NextResponse.json(
        { error: 'Congé non trouvé' },
        { status: 404 }
      )
    }

    // Calculer l'année du congé
    const annee = new Date(existingConge.date_debut).getFullYear()
    const dureeJours = existingConge.duree_jours

    // Restaurer les jours dans le solde de congé
    // D'abord, essayer de trouver le solde de l'année du congé
    let solde = await prisma.soldeConge.findUnique({
      where: {
        professeur_id_annee_type_conge_id: {
          professeur_id: existingConge.professeur_id,
          annee: annee,
          type_conge_id: existingConge.type_conge_id,
        },
      },
    })

    // Restaurer les jours dans le solde de congé
    // Stratégie : restaurer dans le solde de l'année du congé en priorité,
    // si ce solde est plein, augmenter son jours_total ou restaurer dans un autre solde
    
    const maintenant = new Date()
    
    // Chercher le solde de l'année du congé
    let soldeAnnee = await prisma.soldeConge.findUnique({
      where: {
        professeur_id_annee_type_conge_id: {
          professeur_id: existingConge.professeur_id,
          annee: annee,
          type_conge_id: existingConge.type_conge_id,
        },
      },
    })

    if (soldeAnnee) {
      // Le solde existe, vérifier s'il peut accepter les jours
      const capaciteRestante = soldeAnnee.jours_total - soldeAnnee.jours_restants
      
      if (capaciteRestante >= dureeJours) {
        // Le solde peut accepter tous les jours
        await prisma.soldeConge.update({
          where: { id: soldeAnnee.id },
          data: {
            jours_restants: soldeAnnee.jours_restants + dureeJours,
          },
        })
      } else {
        // Le solde est plein ou presque plein, augmenter le total pour pouvoir restaurer
        await prisma.soldeConge.update({
          where: { id: soldeAnnee.id },
          data: {
            jours_total: soldeAnnee.jours_total + dureeJours,
            jours_restants: soldeAnnee.jours_restants + dureeJours,
          },
        })
      }
    } else {
      // Le solde de l'année n'existe pas, le créer avec les jours restaurés
      const expireLe = new Date(annee + 2, 11, 31) // 31 décembre de l'année + 2
      
      // Chercher un solde de référence pour déterminer le jours_total par défaut
      const soldeReference = await prisma.soldeConge.findFirst({
        where: {
          professeur_id: existingConge.professeur_id,
          type_conge_id: existingConge.type_conge_id,
        },
        orderBy: { annee: 'desc' },
      })

      const joursTotal = soldeReference?.jours_total || 22

      await prisma.soldeConge.create({
        data: {
          professeur_id: existingConge.professeur_id,
          annee: annee,
          type_conge_id: existingConge.type_conge_id,
          jours_total: Math.max(joursTotal, dureeJours), // Au moins assez pour les jours restaurés
          jours_restants: dureeJours,
          expire_le: expireLe,
        },
      })
    }

    // Supprimer le congé
    await prisma.conge.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Congé supprimé avec succès et jours restaurés dans le solde' })
  } catch (error) {
    console.error('Erreur lors de la suppression du congé:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

