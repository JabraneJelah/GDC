import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// GET - Liste des grades
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const grades = await prisma.grade.findMany({
      orderBy: { nom: 'asc' },
    })

    return NextResponse.json(grades)
  } catch (error) {
    console.error('Erreur lors de la récupération des grades:', error)
    const errorMessage = error.message || 'خطأ في الخادم'
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau grade
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const body = await request.json()
    const { nom } = body

    if (!nom) {
      return NextResponse.json(
        { error: 'اسم الدرجة إجباري' },
        { status: 400 }
      )
    }

    // Vérifier si le grade existe déjà
    const existing = await prisma.grade.findFirst({
      where: { nom: { equals: nom, mode: 'insensitive' } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'هذه الدرجة موجودة مسبقاً' },
        { status: 400 }
      )
    }

    const grade = await prisma.grade.create({
      data: { nom },
    })

    return NextResponse.json(grade, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du grade:', error)
    // Provide more detailed error message for debugging
    const errorMessage = error.message || 'خطأ في الخادم'
    return NextResponse.json(
      { error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.stack : undefined },
      { status: 500 }
    )
  }
}

