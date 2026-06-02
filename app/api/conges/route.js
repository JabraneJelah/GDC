import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { getDateFinFromDuree, isWorkingDay } from '@/lib/working-days'
import { getAppSettings } from '@/lib/app-settings'

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
        hors_solde: true,
        nom_interim: true,
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
      orderBy: { cree_le: 'desc' },
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
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const body = await request.json()
    const {
      professeur_id,
      type_conge_id: typeCongeIdRaw,
      date_debut,
      duree_jours,
      reference_doc,
      nom_interim,
      prenom_interim,
      hors_solde: horsSoldeRaw,
    } = body

    const hors_solde = horsSoldeRaw === true

    // Accepter type_conge_id en nombre ou chaîne (évite erreur si le front envoie "1" ou 1)
    const type_conge_id = typeCongeIdRaw != null && typeCongeIdRaw !== ''
      ? (typeof typeCongeIdRaw === 'number' ? typeCongeIdRaw : parseInt(typeCongeIdRaw, 10))
      : null

    const dureeJoursInt = parseInt(duree_jours, 10) || 0

    const missing = []
    if (!professeur_id) missing.push('professeur')
    if (type_conge_id == null || isNaN(type_conge_id)) missing.push('type de congé')
    if (!date_debut) missing.push('date de départ')
    if (dureeJoursInt <= 0) missing.push('durée (en jours)')
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Champs obligatoires manquants : ${missing.join(', ')}.` },
        { status: 400 }
      )
    }

    // Valider que date_debut est un jour ouvrable (si blocage activé)
    const appSettings = getAppSettings()
    if (appSettings.block_holiday_selection || appSettings.block_weekend_selection) {
      if (!await isWorkingDay(date_debut, prisma)) {
        return NextResponse.json(
          { error: 'لا يمكن اختيار يوم عطلة رسمية أو غير مفتوح كتاريخ مغادرة.' },
          { status: 400 }
        )
      }
    }

    // Calculer date_fin côté serveur à partir de date_debut + duree_jours (source de vérité)
    const date_fin = await getDateFinFromDuree(date_debut, dureeJoursInt, prisma)
    if (!date_fin) {
      return NextResponse.json(
        { error: 'Impossible de calculer la date de fin (vérifiez les dates et les jours fériés)' },
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

    if (!hors_solde) {
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

    } // fin bloc solde (hors_solde === false)

    const conge = await prisma.conge.create({
      data: {
        professeur_id,
        type_conge_id: typeCongeIdInt,
        date_debut: new Date(date_debut),
        date_fin: new Date(date_fin),
        duree_jours: dureeJoursInt,
        hors_solde,
        nom_interim: nom_interim || null,
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

