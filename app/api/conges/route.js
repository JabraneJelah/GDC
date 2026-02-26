import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * Calcule le nombre de jours ouvrables entre deux dates (exclut samedi, dimanche et jours fériés actifs).
 */
async function getWorkingDaysBetween(dateDebutStr, dateFinStr, prismaClient) {
  const start = new Date(dateDebutStr + 'T00:00:00')
  const end = new Date(dateFinStr + 'T00:00:00')
  if (end < start) return 0

  const joursFeries = await prismaClient.jourFerie.findMany({
    where: {
      actif: true,
      date: { gte: start, lte: end },
    },
    select: { date: true },
  })
  const ferieSet = new Set(
    joursFeries.map((j) => j.date.toISOString().slice(0, 10))
  )

  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const ymd = current.toISOString().slice(0, 10)
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isFerie = ferieSet.has(ymd)
    if (!isWeekend && !isFerie) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

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
        cree_le: true,
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
      type_conge_id: typeCongeIdRaw,
      date_debut,
      date_fin,
      duree_jours,
      reference_doc,
      nom_interim,
      prenom_interim,
    } = body

    // Accepter type_conge_id en nombre ou chaîne (évite erreur si le front envoie "1" ou 1)
    const type_conge_id = typeCongeIdRaw != null && typeCongeIdRaw !== ''
      ? (typeof typeCongeIdRaw === 'number' ? typeCongeIdRaw : parseInt(typeCongeIdRaw, 10))
      : null

    const missing = []
    if (!professeur_id) missing.push('professeur')
    if (type_conge_id == null || isNaN(type_conge_id)) missing.push('type de congé')
    if (!date_debut) missing.push('date de départ')
    if (!date_fin) missing.push('date de fin / date de retour')
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Champs obligatoires manquants : ${missing.join(', ')}. Vérifiez que vous avez sélectionné un professeur, un type de congé, une date de départ et une durée (la date de fin est calculée automatiquement).` },
        { status: 400 }
      )
    }

    // Calculer la durée en jours ouvrables (exclut samedi, dimanche et jours fériés)
    const dureeJoursInt = await getWorkingDaysBetween(date_debut, date_fin, prisma)
    if (dureeJoursInt <= 0) {
      return NextResponse.json(
        { error: 'Aucun jour ouvrable dans cette période (vérifiez les dates et les jours fériés)' },
        { status: 400 }
      )
    }

    const typeCongeIdInt = type_conge_id

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

    // Gestion des soldes : consommer d'abord depuis le solde de l'année du congé
    const maintenant = new Date()
    const anneeConge = new Date(date_debut).getFullYear()
    
    // Récupérer tous les soldes non expirés pour ce type de congé, triés par année (plus ancien en premier)
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

    // Vérifier qu'il existe au moins un solde de congé pour ce type
    if (soldesDisponibles.length === 0) {
      return NextResponse.json(
        {
          error: `Aucun solde de congé pour ce professeur et le type « ${typeConge.nom} ». Allez dans la fiche du professeur > « Gestion des Soldes de Congé » > « Ajouter un solde » et créez un solde pour l’année concernée et le type « ${typeConge.nom} ».`,
        },
        { status: 400 }
      )
    }

    if (totalJoursDisponibles < dureeJoursInt) {
      return NextResponse.json(
        {
          error: `Solde insuffisant. Jours restants: ${totalJoursDisponibles}`,
        },
        { status: 400 }
      )
    }

    // Priorité : chercher d'abord le solde de l'année du congé
    let soldeAnneeConge = soldesDisponibles.find(solde => solde.annee === anneeConge)
    
    // Si le solde de l'année du congé existe et a assez de jours, l'utiliser en priorité
    let joursRestantsAConsommer = dureeJoursInt
    
    if (soldeAnneeConge && soldeAnneeConge.jours_restants >= joursRestantsAConsommer) {
      // Le solde de l'année du congé peut couvrir tout le congé
      await prisma.soldeConge.update({
        where: { id: soldeAnneeConge.id },
        data: {
          jours_restants: soldeAnneeConge.jours_restants - joursRestantsAConsommer,
        },
      })
      joursRestantsAConsommer = 0
    } else if (soldeAnneeConge && soldeAnneeConge.jours_restants > 0) {
      // Le solde de l'année du congé existe mais n'a pas assez de jours, consommer ce qu'il a
      joursRestantsAConsommer -= soldeAnneeConge.jours_restants
      await prisma.soldeConge.update({
        where: { id: soldeAnneeConge.id },
        data: {
          jours_restants: 0,
        },
      })
    }

    // Si des jours restent à consommer, utiliser les autres soldes (plus ancien en premier)
    if (joursRestantsAConsommer > 0) {
      for (const solde of soldesDisponibles) {
        if (joursRestantsAConsommer <= 0) break
        
        // Ignorer le solde de l'année du congé car déjà traité
        if (solde.annee === anneeConge) continue

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
    }

    // Créer le congé (nom_interim/prenom_interim retirés du schéma)
    const conge = await prisma.conge.create({
      data: {
        professeur_id,
        type_conge_id: typeCongeIdInt,
        date_debut: new Date(date_debut),
        date_fin: new Date(date_fin),
        duree_jours: dureeJoursInt,
        reference_doc: reference_doc || null,
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

