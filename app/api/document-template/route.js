import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const VALID_FORMATS = ['DOCX', 'PDF']

// GET - Liste des templates de documents
export async function GET() {
  try {
    const templates = await prisma.documentTemplate.findMany({
      include: {
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
          },
        },
      },
      orderBy: { cree_le: 'desc' },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Erreur lors de la récupération des templates de document:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// POST - Créer un nouveau template de document
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      identifiant,
      nom,
      code,
      description,
      format_source,
      chemin_fichier,
      version,
      type_faute_id: typeFauteIdRaw,
      cree_par_rh_id,
      actif,
    } = body

    const type_faute_id =
      typeFauteIdRaw != null && typeFauteIdRaw !== ''
        ? (typeof typeFauteIdRaw === 'number' ? typeFauteIdRaw : parseInt(typeFauteIdRaw, 10))
        : null
    const parsedVersion =
      version != null && version !== ''
        ? (typeof version === 'number' ? version : parseInt(version, 10))
        : 1

    if (!identifiant || !nom || !format_source || !chemin_fichier || type_faute_id == null || isNaN(type_faute_id)) {
      return NextResponse.json(
        { error: "L'identifiant, le nom, le format, le chemin du fichier et le type de faute sont obligatoires" },
        { status: 400 }
      )
    }

    if (!VALID_FORMATS.includes(format_source)) {
      return NextResponse.json(
        { error: 'Format source invalide' },
        { status: 400 }
      )
    }

    if (isNaN(parsedVersion) || parsedVersion < 1) {
      return NextResponse.json(
        { error: 'Version invalide' },
        { status: 400 }
      )
    }

    const typeFaute = await prisma.typeFaute.findUnique({
      where: { id: type_faute_id },
    })

    if (!typeFaute) {
      return NextResponse.json(
        { error: 'Type de faute non trouvé' },
        { status: 404 }
      )
    }

    if (cree_par_rh_id) {
      const utilisateur = await prisma.utilisateurRH.findUnique({
        where: { id: cree_par_rh_id },
      })

      if (!utilisateur) {
        return NextResponse.json(
          { error: 'Utilisateur RH non trouvé' },
          { status: 404 }
        )
      }
    }

    const existingIdentifiant = await prisma.documentTemplate.findFirst({
      where: {
        identifiant: { equals: identifiant, mode: 'insensitive' },
      },
    })

    if (existingIdentifiant) {
      return NextResponse.json(
        { error: 'Cet identifiant de template existe déjà' },
        { status: 400 }
      )
    }

    const template = await prisma.documentTemplate.create({
      data: {
        identifiant,
        nom,
        code: code || null,
        description: description || null,
        format_source,
        chemin_fichier,
        version: parsedVersion,
        type_faute_id,
        cree_par_rh_id: cree_par_rh_id || null,
        actif: typeof actif === 'boolean' ? actif : true,
      },
      include: {
        type_faute: {
          select: {
            id: true,
            code: true,
            nom: true,
            actif: true,
          },
        },
      },
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Erreur lors de la création du template de document:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
