import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// GET - Historique des congés pour le dashboard
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const serviceId = searchParams.get('service_id')
    const typeCongeId = searchParams.get('type_conge_id')
    const dateDebut = searchParams.get('date_debut')
    const dateFin = searchParams.get('date_fin')
    const nomComplet = searchParams.get('nom_complet')
    const ppr = searchParams.get('ppr')

    const maintenant = new Date()

    // Construire les conditions WHERE
    let whereClause = {}
    const professeurFilters = {}

    // Filtre par service
    if (serviceId) {
      professeurFilters.service_id = parseInt(serviceId, 10)
    }

    // Filtre par nom complet (recherche dans nom, prenom et titre) ou PPR
    const nameFilters = []
    if (nomComplet) {
      // Rechercher dans nom, prenom ou titre
      nameFilters.push({
        OR: [
          { nom: { contains: nomComplet, mode: 'insensitive' } },
          { prenom: { contains: nomComplet, mode: 'insensitive' } },
          { titre: { nom: { contains: nomComplet, mode: 'insensitive' } } },
        ],
      })
    }
    if (ppr) {
      nameFilters.push({ ppr: { contains: ppr, mode: 'insensitive' } })
    }

    if (nameFilters.length > 0) {
      professeurFilters.AND = nameFilters
    }

    // Ajouter les filtres professeur si nécessaire
    if (Object.keys(professeurFilters).length > 0) {
      whereClause.professeur = professeurFilters
    }

    // Filtre par type de congé
    if (typeCongeId) {
      whereClause.type_conge_id = parseInt(typeCongeId, 10)
    }

    // Filtre par période
    if (dateDebut || dateFin) {
      whereClause.date_debut = {}
      if (dateDebut) {
        whereClause.date_debut.gte = new Date(dateDebut)
      }
      if (dateFin) {
        const dateFinObj = new Date(dateFin)
        dateFinObj.setHours(23, 59, 59, 999) // Fin de journée
        whereClause.date_debut.lte = dateFinObj
      }
    }

    // Limiter à 1000 résultats pour améliorer les performances
    // Utiliser les index sur date_debut pour un tri rapide
    const conges = await prisma.conge.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      take: 1000, // Limiter le nombre de résultats
      include: {
        professeur: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            ppr: true,
            titre: {
              select: {
                id: true,
                nom: true,
              },
            },
            service: {
              select: {
                nom: true,
              },
            },
            grade: {
              select: {
                nom: true,
              },
            },
            soldes: {
              where: {
                expire_le: { gte: maintenant }, // Seulement les soldes non expirés
                jours_restants: { gt: 0 }, // Seulement ceux avec des jours restants
              },
              orderBy: { annee: 'asc' }, // Plus ancien en premier
              select: {
                id: true,
                annee: true,
                jours_restants: true,
                jours_total: true,
                expire_le: true,
              },
            },
          },
        },
        type_conge: {
          select: {
            nom: true,
          },
        },
      },
      orderBy: { date_debut: 'desc' },
    })

    // Formater les données pour le tableau
    const historique = conges.map((conge) => {
      const soldesNonExpires = conge.professeur.soldes || []
      const totalJoursRestants = soldesNonExpires.reduce(
        (sum, solde) => sum + solde.jours_restants,
        0
      )

      return {
        id: conge.id,
        nom: conge.professeur.nom,
        prenom: conge.professeur.prenom,
        titre: conge.professeur.titre?.nom || null,
        ppr: conge.professeur.ppr,
        service: conge.professeur.service?.nom || '-',
        grade: conge.professeur.grade?.nom || '-',
        type_conge: conge.type_conge.nom,
        date_debut: conge.date_debut,
        date_fin: conge.date_fin,
        duree_jours: conge.duree_jours,
        nom_interim: conge.nom_interim,
        prenom_interim: conge.prenom_interim,
        soldes: soldesNonExpires.map((solde) => ({
          annee: solde.annee,
          jours_restants: solde.jours_restants,
          jours_total: solde.jours_total,
          expire_le: solde.expire_le,
        })),
        solde_restant_total: totalJoursRestants,
        reference_doc: conge.reference_doc,
      }
    })

    return NextResponse.json(historique)
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des congés:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

