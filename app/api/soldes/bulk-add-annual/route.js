import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getExpireLe } from '@/lib/solde-expiration'

/**
 * POST - Ajouter en masse les soldes annuels (22 j. administratif + 10 j. exceptionnel)
 * à tous les professeurs existants pour une année donnée.
 * Utile quand une nouvelle année commence : l'admin peut en un clic ajouter
 * ces soldes à tous les professeurs sans passer par chacun individuellement.
 */
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { annee } = body

    if (!annee) {
      return NextResponse.json(
        { error: "L'année est obligatoire" },
        { status: 400 }
      )
    }

    const anneeInt = parseInt(annee, 10)
    if (isNaN(anneeInt) || anneeInt < 2000 || anneeInt > 2100) {
      return NextResponse.json(
        { error: "L'année doit être comprise entre 2000 et 2100" },
        { status: 400 }
      )
    }

    // Trouver les types de congé : Congé Administratif et Exceptionnel
    const typesConge = await prisma.typeConge.findMany()
    const typeAdministratif = typesConge.find((t) =>
      t.nom.toLowerCase().includes('administratif')
    )
    const typeExceptionnel = typesConge.find(
      (t) =>
        t.nom.toLowerCase().includes('exceptionnel') ||
        t.nom.toLowerCase().includes('excepcionel')
    )

    if (!typeAdministratif) {
      return NextResponse.json(
        {
          error:
            "Type de congé 'Congé Administratif' introuvable. Vérifiez le référentiel des types de congé.",
        },
        { status: 400 }
      )
    }
    if (!typeExceptionnel) {
      return NextResponse.json(
        {
          error:
            "Type de congé 'Exceptionnel' introuvable. Vérifiez le référentiel des types de congé.",
        },
        { status: 400 }
      )
    }

    const JOURS_ADMINISTRATIF = 22
    const JOURS_EXCEPTIONNEL = 10

    // Récupérer tous les professeurs
    const professeurs = await prisma.professeur.findMany({
      select: { id: true, nom: true, prenom: true },
    })

    if (professeurs.length === 0) {
      return NextResponse.json({
        message: 'Aucun professeur dans la base.',
        summary: {
          professeursTotal: 0,
          soldesCrees: 0,
          soldesIgnores: 0,
          professeursMisAJour: 0,
        },
        details: [],
      })
    }

    const details = []
    let soldesCrees = 0
    let soldesIgnores = 0
    let professeursMisAJour = 0

    for (const professeur of professeurs) {
      const professeurDetails = {
        professeur: `${professeur.prenom} ${professeur.nom}`,
        administratif: null,
        exceptionnel: null,
      }

      // Congé Administratif (22 jours)
      const existingAdmin = await prisma.soldeConge.findUnique({
        where: {
          professeur_id_annee_type_conge_id: {
            professeur_id: professeur.id,
            annee: anneeInt,
            type_conge_id: typeAdministratif.id,
          },
        },
      })

      if (!existingAdmin) {
        const expireLeAdmin = getExpireLe(anneeInt, typeAdministratif)
        await prisma.soldeConge.create({
          data: {
            professeur_id: professeur.id,
            annee: anneeInt,
            type_conge_id: typeAdministratif.id,
            jours_total: JOURS_ADMINISTRATIF,
            jours_restants: JOURS_ADMINISTRATIF,
            expire_le: expireLeAdmin,
          },
        })
        professeurDetails.administratif = 'créé'
        soldesCrees++
      } else {
        professeurDetails.administratif = 'existant'
        soldesIgnores++
      }

      // Congé Exceptionnel (10 jours)
      const existingExcept = await prisma.soldeConge.findUnique({
        where: {
          professeur_id_annee_type_conge_id: {
            professeur_id: professeur.id,
            annee: anneeInt,
            type_conge_id: typeExceptionnel.id,
          },
        },
      })

      if (!existingExcept) {
        const expireLeExcept = getExpireLe(anneeInt, typeExceptionnel)
        await prisma.soldeConge.create({
          data: {
            professeur_id: professeur.id,
            annee: anneeInt,
            type_conge_id: typeExceptionnel.id,
            jours_total: JOURS_EXCEPTIONNEL,
            jours_restants: JOURS_EXCEPTIONNEL,
            expire_le: expireLeExcept,
          },
        })
        professeurDetails.exceptionnel = 'créé'
        soldesCrees++
      } else {
        professeurDetails.exceptionnel = 'existant'
        soldesIgnores++
      }

      if (
        professeurDetails.administratif === 'créé' ||
        professeurDetails.exceptionnel === 'créé'
      ) {
        professeursMisAJour++
      }

      details.push(professeurDetails)
    }

    return NextResponse.json({
      message: `Soldes annuels ajoutés pour l'année ${anneeInt}.`,
      summary: {
        professeursTotal: professeurs.length,
        soldesCrees,
        soldesIgnores,
        professeursMisAJour,
        administratif: { jours: JOURS_ADMINISTRATIF, type: typeAdministratif.nom },
        exceptionnel: { jours: JOURS_EXCEPTIONNEL, type: typeExceptionnel.nom },
      },
      details,
    })
  } catch (error) {
    console.error('Erreur lors de l\'ajout en masse des soldes annuels:', error)
    return NextResponse.json(
      { error: `Erreur serveur: ${error.message}` },
      { status: 500 }
    )
  }
}
