import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Liste des types de faute
export async function GET() {
  try {
    const typesFaute = await prisma.typeFaute.findMany({
      orderBy: { id: 'asc' },
    })

    return NextResponse.json(typesFaute)
  } catch (error) {
    console.error('Erreur lors de la récupération des types de faute:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau type de faute
export async function POST(request) {
  try {
    const body = await request.json()
    const { code, nom, description, actif } = body

    if (!code || !nom) {
      return NextResponse.json(
        { error: 'Le code et le nom sont obligatoires' },
        { status: 400 }
      )
    }

    const existingCode = await prisma.typeFaute.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
      },
    })

    if (existingCode) {
      return NextResponse.json(
        { error: 'Ce code de type de faute existe déjà' },
        { status: 400 }
      )
    }

    const typeFaute = await prisma.typeFaute.create({
      data: {
        code,
        nom,
        description: description || null,
        actif: typeof actif === 'boolean' ? actif : true,
      },
    })

    return NextResponse.json(typeFaute, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du type de faute:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
