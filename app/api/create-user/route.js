import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    const email = 'admin@example.com'
    const password = 'admin123'
    const nomComplet = 'Administrateur RH'
    const existing = await prisma.utilisateurRH.findUnique({
      where: { email },
    })

    if (existing) {
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        credentials: {
          email,
          password,
        },
      })
    }
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.utilisateurRH.create({
      data: {
        email,
        mot_de_passe: hashedPassword,
        nom_complet: nomComplet,
      },
    })
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      credentials: {
        email,
        password,
        nomComplet,
      },
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

