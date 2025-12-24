import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des congés
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const professeurId = searchParams.get('professeur_id')

    const conges = await prisma.conge.findMany({
      where: professeurId ? { professeur_id: professeurId } : undefined,
      select: {
        id: true,
        professeur_id: true,
        type_conge_id: true,
        date_debut: true,
        date_fin: true,
        duree_jours: true,
        reference_doc: true,
        nom_interim: true,
        prenom_interim: true,
        cree_le: true,
        professeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            ppr: true,
          },
        },
        type_conge: {
          select: {
            id: true,
            nom: true,
            document_obligatoire: true,
          },
        },
        cree_par_rh: {
          select: {
            nom_complet: true,
          },
        },
      },
      orderBy: { date_debut: 'desc' },
    })

    return NextResponse.json(conges)
  } catch (error) {
    console.error('Erreur lors de la récupération des congés:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau congé
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
    const professeur = await prisma.professeur.findUnique({
      where: { id: professeur_id },
    })

    if (!professeur) {
      return NextResponse.json(
        { error: 'Professeur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le type de congé existe
    const typeConge = await prisma.typeConge.findUnique({
      where: { id: typeCongeIdInt },
    })

    if (!typeConge) {
      return NextResponse.json(
        { error: 'Type de congé non trouvé' },
        { status: 404 }
      )
    }

    // Gestion des soldes : consommer d'abord les soldes de l'année la plus ancienne (non expirés)
    const maintenant = new Date()
    const annee = new Date(date_debut).getFullYear()
    
    // Récupérer tous les soldes non expirés, triés par année (plus ancien en premier)
    const soldesDisponibles = await prisma.soldeConge.findMany({
      where: {
        professeur_id: professeur_id,
        type_conge_id: typeCongeIdInt,
        expire_le: { gte: maintenant }, // Non expirés
        jours_restants: { gt: 0 }, // Avec des jours restants
      },
      orderBy: { annee: 'asc' }, // Plus ancien en premier
    })

    // Calculer le total des jours disponibles
    const totalJoursDisponibles = soldesDisponibles.reduce(
      (sum, solde) => sum + solde.jours_restants,
      0
    )

    if (totalJoursDisponibles < dureeJoursInt) {
      return NextResponse.json(
        {
          error: `Solde insuffisant. Jours restants: ${totalJoursDisponibles}`,
        },
        { status: 400 }
      )
    }

    // Consommer les jours en commençant par le solde le plus ancien
    let joursRestantsAConsommer = dureeJoursInt
    for (const solde of soldesDisponibles) {
      if (joursRestantsAConsommer <= 0) break

      if (solde.jours_restants >= joursRestantsAConsommer) {
        // Ce solde peut couvrir tout le reste
        await prisma.soldeConge.update({
          where: { id: solde.id },
          data: {
            jours_restants: solde.jours_restants - joursRestantsAConsommer,
          },
        })
        joursRestantsAConsommer = 0
      } else {
        // Consommer tout ce solde et passer au suivant
        joursRestantsAConsommer -= solde.jours_restants
        await prisma.soldeConge.update({
          where: { id: solde.id },
          data: {
            jours_restants: 0,
          },
        })
      }
    }

    // Si aucun solde n'existe pour l'année et ce type de congé, en créer un automatiquement
    const soldeAnneeActuelle = await prisma.soldeConge.findUnique({
      where: {
        professeur_id_annee_type_conge_id: {
          professeur_id: professeur_id,
          annee: annee,
          type_conge_id: typeCongeIdInt,
        },
      },
    })

    if (!soldeAnneeActuelle) {
      // Récupérer un solde de référence pour ce type (sinon défaut 22)
      const soldeInitial = await prisma.soldeConge.findFirst({
        where: { professeur_id: professeur_id, type_conge_id: typeCongeIdInt },
        orderBy: { annee: 'desc' },
      })

      const joursTotal = soldeInitial?.jours_total || 22
      const expireLe = new Date(annee + 2, 11, 31) // 31 décembre de l'année + 2

      await prisma.soldeConge.create({
        data: {
          professeur_id: professeur_id,
          annee: annee,
          jours_total: joursTotal,
          jours_restants: joursTotal, // Le solde de l'année actuelle n'a pas encore été consommé
          expire_le: expireLe,
          type_conge_id: typeCongeIdInt,
        },
      })
    }

    // Créer le congé
    const conge = await prisma.conge.create({
      data: {
        professeur_id,
        type_conge_id: typeCongeIdInt,
        date_debut: new Date(date_debut),
        date_fin: new Date(date_fin),
        duree_jours: dureeJoursInt,
        reference_doc: reference_doc || null,
        nom_interim: nom_interim || null,
        prenom_interim: prenom_interim || null,
        cree_par_rh_id: currentUser.userId,
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

    return NextResponse.json(conge, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du congé:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

