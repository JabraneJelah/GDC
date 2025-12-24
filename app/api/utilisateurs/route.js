import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des utilisateurs RH
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const utilisateurs = await prisma.utilisateurRH.findMany({
      orderBy: { cree_le: 'desc' },
    })

    return NextResponse.json(utilisateurs)
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs RH:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Créer un utilisateur RH
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await request.json()
    const { username, nom_complet } = body

    if (!username || !nom_complet) {
      return NextResponse.json(
        { error: 'Nom d\'utilisateur et nom complet sont requis' },
        { status: 400 }
      )
    }

    const existing = await prisma.utilisateurRH.findUnique({
      where: { username },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Un utilisateur avec ce nom d\'utilisateur existe déjà' },
        { status: 400 }
      )
    }

    const defaultPassword = '123456'
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    const user = await prisma.utilisateurRH.create({
      data: {
        username,
        mot_de_passe: hashedPassword,
        nom_complet,
        actif: true,
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création de l’utilisateur RH:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}


