import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import * as XLSX from 'xlsx'

/**
 * GET - Exporte tous les soldes de congé des professeurs en Excel
 * Colonnes : Nom, Prénom, PPR, Grade, Spécialité, Congé Administratif 2024, Congé Exceptionnel 2024, ...
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const professeurs = await prisma.professeur.findMany({
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
      include: {
        grade: { select: { nom: true } },
        specialite: { select: { nom: true } },
        soldes: {
          orderBy: [{ annee: 'asc' }, { type_conge_id: 'asc' }],
          include: { type_conge: { select: { nom: true } } },
        },
      },
    })

    // Construire la liste des colonnes de solde (type + année) triées
    const soldeKeysSet = new Set()
    professeurs.forEach((p) => {
      p.soldes.forEach((s) => {
        soldeKeysSet.add(`${s.type_conge.nom}|${s.annee}`)
      })
    })
    const soldeColumns = Array.from(soldeKeysSet)
      .map((key) => {
        const [typeNom, annee] = key.split('|')
        return { typeNom, annee: parseInt(annee, 10) }
      })
      .sort((a, b) => {
        const nameCmp = (a.typeNom || '').localeCompare(b.typeNom || '')
        if (nameCmp !== 0) return nameCmp
        return a.annee - b.annee
      })

    const headerRow = [
      'Nom',
      'Prénom',
      'PPR',
      'Grade',
      'Spécialité',
      ...soldeColumns.map((c) => `${c.typeNom} ${c.annee}`),
    ]

    const rows = [headerRow]

    const getJoursRestants = (soldes, typeNom, annee) => {
      const s = soldes.find(
        (x) => x.type_conge.nom === typeNom && x.annee === annee
      )
      return s != null ? s.jours_restants : ''
    }

    professeurs.forEach((p) => {
      const row = [
        p.nom,
        p.prenom,
        p.ppr,
        p.grade?.nom ?? '',
        p.specialite?.nom ?? '',
        ...soldeColumns.map((c) => getJoursRestants(p.soldes, c.typeNom, c.annee)),
      ]
      rows.push(row)
    })

    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Soldes congés')

    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      bookSST: false,
    })

    const filename = `soldes-conges-${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Erreur lors de l\'export Excel des soldes:', error)
    return NextResponse.json(
      { error: `Erreur serveur: ${error.message}` },
      { status: 500 }
    )
  }
}
