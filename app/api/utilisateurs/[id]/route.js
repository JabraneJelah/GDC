import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur, VALID_ROLES } from '@/lib/roles'
import bcrypt from 'bcryptjs'

export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = params instanceof Promise ? await params : params
    const id = resolvedParams?.id

    if (!id) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
    }

    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const body = await request.json()
    const { username, nom_complet, actif, reset_password, role } = body

    // Vérifier unicité username si modifié (insensible à la casse)
    if (username) {
      const existing = await prisma.utilisateurRH.findFirst({
        where: {
          username: { equals: username, mode: 'insensitive' },
        },
      })
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: 'Un utilisateur avec ce nom d\'utilisateur existe déjà' },
          { status: 400 }
        )
      }
    }

    const updateData = {
      username: username || undefined,
      nom_complet: nom_complet || undefined,
      actif: typeof actif === 'boolean' ? actif : undefined,
      role: VALID_ROLES.includes(role) ? role : undefined,
    }

    if (reset_password) {
      const defaultPassword = '123456'
      updateData.mot_de_passe = await bcrypt.hash(defaultPassword, 10)
    }

    const updated = await prisma.utilisateurRH.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'utilisateur RH:", error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


