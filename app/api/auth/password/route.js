import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword, verifyPassword } from '@/lib/auth'

// PUT - Mettre à jour le mot de passe
export async function PUT(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { mot_de_passe_actuel, nouveau_mot_de_passe } = body

    if (!mot_de_passe_actuel || !nouveau_mot_de_passe) {
      return NextResponse.json(
        { error: 'Le mot de passe actuel et le nouveau mot de passe sont requis' },
        { status: 400 }
      )
    }

    if (nouveau_mot_de_passe.length < 6) {
      return NextResponse.json(
        { error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur avec le mot de passe
    const utilisateur = await prisma.utilisateurRH.findUnique({
      where: { id: currentUser.userId },
    })

    if (!utilisateur) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier le mot de passe actuel
    const isValid = await verifyPassword(mot_de_passe_actuel, utilisateur.mot_de_passe)

    if (!isValid) {
      return NextResponse.json(
        { error: 'Mot de passe actuel incorrect' },
        { status: 400 }
      )
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await hashPassword(nouveau_mot_de_passe)

    // Mettre à jour le mot de passe
    await prisma.utilisateurRH.update({
      where: { id: currentUser.userId },
      data: { mot_de_passe: hashedPassword },
    })

    return NextResponse.json({ message: 'Mot de passe mis à jour avec succès' })
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

