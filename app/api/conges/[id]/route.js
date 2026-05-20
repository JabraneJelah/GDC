import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getWorkingDaysBetween, isWorkingDay } from '@/lib/working-days'
import { getAppSettings } from '@/lib/app-settings'

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
      hors_solde: horsSoldeBody,
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

    if (horsSoldeBody !== undefined && horsSoldeBody !== null) {
      const requested = horsSoldeBody === true
      if (requested !== existingConge.hors_solde) {
        return NextResponse.json(
          { error: 'Le mode solde / hors solde ne peut pas être modifié. Supprimez ce congé et recréez-le si nécessaire.' },
          { status: 400 }
        )
      }
    }

    if (!professeur_id || !type_conge_id || !date_debut || !date_fin) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    const appSettings = getAppSettings()
    if (appSettings.block_holiday_selection || appSettings.block_weekend_selection) {
      if (!await isWorkingDay(date_debut, prisma)) {
        return NextResponse.json(
          { error: 'لا يمكن اختيار يوم عطلة رسمية أو غير مفتوح كتاريخ مغادرة.' },
          { status: 400 }
        )
      }
      if (!await isWorkingDay(date_fin, prisma)) {
        return NextResponse.json(
          { error: 'لا يمكن اختيار يوم عطلة رسمية أو غير مفتوح كتاريخ نهاية الرخصة.' },
          { status: 400 }
        )
      }
    }

    const dureeJoursInt = await getWorkingDaysBetween(date_debut, date_fin, prisma)
    if (dureeJoursInt <= 0) {
      return NextResponse.json(
        { error: 'Aucun jour ouvrable dans cette période (vérifiez les dates et les jours fériés)' },
        { status: 400 }
      )
    }

    const typeCongeIdInt = parseInt(type_conge_id, 10)
    if (isNaN(typeCongeIdInt)) {
      return NextResponse.json(
        { error: 'Type de congé invalide' },
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

    // Calculer la différence de durée pour ajuster le solde
    const ancienneDuree = existingConge.duree_jours
    const nouvelleDuree = dureeJoursInt
    const differenceDuree = nouvelleDuree - ancienneDuree

    // Calculer les années (ancienne et nouvelle)
    const ancienneAnnee = new Date(existingConge.date_debut).getFullYear()
    const nouvelleAnnee = new Date(date_debut).getFullYear()

    // Si la durée, le type de congé, le professeur ou l'année a changé, ajuster les soldes
    const professeurAChange = professeur_id !== existingConge.professeur_id
    const typeCongeAChange = typeCongeIdInt !== existingConge.type_conge_id
    const anneeAChange = nouvelleAnnee !== ancienneAnnee

    if (!existingConge.hors_solde && (differenceDuree !== 0 || professeurAChange || typeCongeAChange || anneeAChange)) {
      // ÉTAPE 1: Restaurer les jours de l'ancien congé
      // Utiliser la même logique que DELETE pour restaurer correctement
      if (ancienneDuree > 0) {
        const maintenant = new Date()
        
        // Récupérer tous les soldes non expirés pour l'ancien congé
        const anciensSoldesDisponibles = await prisma.soldeConge.findMany({
          where: {
            professeur_id: existingConge.professeur_id,
            type_conge_id: existingConge.type_conge_id,
            expire_le: { gte: maintenant },
          },
          orderBy: [{ annee: 'desc' }],
        })

        // Chercher d'abord le solde de l'année de l'ancien congé
        let ancienSoldeAnnee = anciensSoldesDisponibles.find(s => s.annee === ancienneAnnee)
        let joursARestaurer = ancienneDuree

        if (ancienSoldeAnnee) {
          const capaciteRestante = ancienSoldeAnnee.jours_total - ancienSoldeAnnee.jours_restants
          
          if (capaciteRestante >= joursARestaurer) {
            await prisma.soldeConge.update({
              where: { id: ancienSoldeAnnee.id },
              data: {
                jours_restants: ancienSoldeAnnee.jours_restants + joursARestaurer,
              },
            })
            joursARestaurer = 0
          } else if (capaciteRestante > 0) {
            await prisma.soldeConge.update({
              where: { id: ancienSoldeAnnee.id },
              data: {
                jours_restants: ancienSoldeAnnee.jours_total,
              },
            })
            joursARestaurer -= capaciteRestante
          }
        }

        // Si des jours restent à restaurer, les restaurer dans d'autres soldes
        if (joursARestaurer > 0) {
          for (const solde of anciensSoldesDisponibles) {
            if (joursARestaurer <= 0) break
            if (solde.annee === ancienneAnnee) continue

            const capaciteRestante = solde.jours_total - solde.jours_restants
            
            if (capaciteRestante >= joursARestaurer) {
              await prisma.soldeConge.update({
                where: { id: solde.id },
                data: {
                  jours_restants: solde.jours_restants + joursARestaurer,
                },
              })
              joursARestaurer = 0
            } else if (capaciteRestante > 0) {
              await prisma.soldeConge.update({
                where: { id: solde.id },
                data: {
                  jours_restants: solde.jours_total,
                },
              })
              joursARestaurer -= capaciteRestante
            }
          }
        }
      }

      // ÉTAPE 2: Consommer les jours du nouveau congé
      // Utiliser la même logique que POST pour consommer correctement
      if (nouvelleDuree > 0) {
        const maintenant = new Date()
        
        // Récupérer tous les soldes non expirés pour le nouveau congé
        const nouveauxSoldesDisponibles = await prisma.soldeConge.findMany({
          where: {
            professeur_id: professeur_id,
            type_conge_id: typeCongeIdInt,
            expire_le: { gte: maintenant },
            jours_restants: { gt: 0 },
          },
          orderBy: [{ annee: 'asc' }], // Plus ancien en premier (comme dans POST)
        })

        // Calculer le total des jours disponibles
        const totalJoursDisponibles = nouveauxSoldesDisponibles.reduce(
          (sum, solde) => sum + solde.jours_restants,
          0
        )

        if (totalJoursDisponibles < nouvelleDuree) {
          return NextResponse.json(
            {
              error: `Solde insuffisant pour la nouvelle durée. Jours disponibles: ${totalJoursDisponibles}, Jours requis: ${nouvelleDuree}`,
            },
            { status: 400 }
          )
        }

        // Priorité : chercher d'abord le solde de l'année du nouveau congé
        let nouveauSoldeAnnee = nouveauxSoldesDisponibles.find(s => s.annee === nouvelleAnnee)
        let joursRestantsAConsommer = nouvelleDuree

        if (nouveauSoldeAnnee && nouveauSoldeAnnee.jours_restants >= joursRestantsAConsommer) {
          await prisma.soldeConge.update({
            where: { id: nouveauSoldeAnnee.id },
            data: {
              jours_restants: nouveauSoldeAnnee.jours_restants - joursRestantsAConsommer,
            },
          })
          joursRestantsAConsommer = 0
        } else if (nouveauSoldeAnnee && nouveauSoldeAnnee.jours_restants > 0) {
          joursRestantsAConsommer -= nouveauSoldeAnnee.jours_restants
          await prisma.soldeConge.update({
            where: { id: nouveauSoldeAnnee.id },
            data: {
              jours_restants: 0,
            },
          })
        }

        // Si des jours restent à consommer, utiliser les autres soldes
        if (joursRestantsAConsommer > 0) {
          for (const solde of nouveauxSoldesDisponibles) {
            if (joursRestantsAConsommer <= 0) break
            if (solde.annee === nouvelleAnnee) continue

            if (solde.jours_restants >= joursRestantsAConsommer) {
              await prisma.soldeConge.update({
                where: { id: solde.id },
                data: {
                  jours_restants: solde.jours_restants - joursRestantsAConsommer,
                },
              })
              joursRestantsAConsommer = 0
            } else {
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
        nom_interim: nom_interim || null,
        reference_doc: reference_doc || null,
        hors_solde: existingConge.hors_solde,
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

    if (existingConge.hors_solde) {
      await prisma.conge.delete({ where: { id } })
      return NextResponse.json({ message: 'Congé supprimé avec succès' })
    }

    // Restaurer les jours dans le solde de congé
    // Stratégie : restaurer dans les soldes existants, en priorité le solde de l'année du congé
    // Si ce solde n'existe pas ou est plein, restaurer dans d'autres soldes (plus récent en premier)
    // NE JAMAIS créer un nouveau solde lors de la suppression d'un congé
    
    const maintenant = new Date()
    
    // Récupérer tous les soldes non expirés pour ce professeur et ce type de congé
    const soldesDisponibles = await prisma.soldeConge.findMany({
      where: {
        professeur_id: existingConge.professeur_id,
        type_conge_id: existingConge.type_conge_id,
        expire_le: { gte: maintenant }, // Non expirés
      },
      orderBy: [
        { annee: 'desc' }, // Plus récent en premier
      ],
    })

    // Chercher d'abord le solde de l'année du congé
    let soldeAnnee = soldesDisponibles.find(s => s.annee === annee)
    
    let joursARestaurer = dureeJours

    if (soldeAnnee) {
      // Le solde de l'année existe, vérifier s'il peut accepter les jours
      const capaciteRestante = soldeAnnee.jours_total - soldeAnnee.jours_restants
      
      if (capaciteRestante >= joursARestaurer) {
        // Le solde peut accepter tous les jours
        await prisma.soldeConge.update({
          where: { id: soldeAnnee.id },
          data: {
            jours_restants: soldeAnnee.jours_restants + joursARestaurer,
          },
        })
        joursARestaurer = 0
      } else if (capaciteRestante > 0) {
        // Le solde peut accepter une partie des jours
        await prisma.soldeConge.update({
          where: { id: soldeAnnee.id },
          data: {
            jours_restants: soldeAnnee.jours_total, // Remplir jusqu'au maximum
          },
        })
        joursARestaurer -= capaciteRestante
      }
    }

    // Si des jours restent à restaurer, les restaurer dans d'autres soldes (plus récent en premier)
    if (joursARestaurer > 0) {
      for (const solde of soldesDisponibles) {
        if (joursARestaurer <= 0) break
        
        // Ignorer le solde de l'année du congé car déjà traité
        if (solde.annee === annee) continue

        const capaciteRestante = solde.jours_total - solde.jours_restants
        
        if (capaciteRestante >= joursARestaurer) {
          // Ce solde peut accepter tout le reste
          await prisma.soldeConge.update({
            where: { id: solde.id },
            data: {
              jours_restants: solde.jours_restants + joursARestaurer,
            },
          })
          joursARestaurer = 0
        } else if (capaciteRestante > 0) {
          // Consommer tout ce solde et passer au suivant
          await prisma.soldeConge.update({
            where: { id: solde.id },
            data: {
              jours_restants: solde.jours_total, // Remplir jusqu'au maximum
            },
          })
          joursARestaurer -= capaciteRestante
        }
      }
    }

    // Si après avoir restauré dans tous les soldes disponibles il reste des jours,
    // cela signifie que le solde était supérieur à ce qui peut être restauré
    // Dans ce cas, on ne crée PAS de nouveau solde - on accepte la perte
    // car créer un solde lors de la suppression serait incorrect

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

