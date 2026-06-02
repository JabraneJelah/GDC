import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'

// PUT - Mettre à jour un grade
export async function PUT(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'معرف غير صالح' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nom } = body

    const existing = await prisma.grade.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'الدرجة غير موجودة' },
        { status: 404 }
      )
    }

    if (nom && nom !== existing.nom) {
      const nomExists = await prisma.grade.findFirst({
        where: {
          nom: { equals: nom, mode: 'insensitive' },
          NOT: { id },
        },
      })

      if (nomExists) {
        return NextResponse.json(
          { error: 'هذه الدرجة موجودة مسبقاً' },
          { status: 400 }
        )
      }
    }

    const grade = await prisma.grade.update({
      where: { id },
      data: { nom: nom || existing.nom },
    })

    return NextResponse.json(grade)
  } catch (error) {
    console.error('Erreur lors de la mise à jour du grade:', error)
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}

// DELETE - Supprimer un grade
export async function DELETE(request, { params }) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const resolvedParams = params instanceof Promise ? await params : params
    const id = parseInt(resolvedParams?.id)

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { error: 'معرف غير صالح' },
        { status: 400 }
      )
    }

    const existing = await prisma.grade.findUnique({
      where: { id },
      include: {
        _count: {
          select: { professeurs: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'الدرجة غير موجودة' },
        { status: 404 }
      )
    }

    if (existing._count.professeurs > 0) {
      return NextResponse.json(
        {
          error: `هذه الدرجة مستعملة من طرف ${existing._count.professeurs} أستاذ ولا يمكن حذفها`,
        },
        { status: 400 }
      )
    }

    await prisma.grade.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'تم حذف الدرجة بنجاح' })
  } catch (error) {
    console.error('Erreur lors de la suppression du grade:', error)
    return NextResponse.json(
      { error: 'خطأ في الخادم' },
      { status: 500 }
    )
  }
}

