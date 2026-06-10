import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error(' DATABASE_URL is not set in .env')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const TYPES_CONGE = [
  { nom: 'Annuel', document_obligatoire: false },
  { nom: 'Maladie', document_obligatoire: true },
  { nom: 'Exceptionnel', document_obligatoire: false },
  { nom: 'Congé de Maternité', document_obligatoire: true },
  { nom: 'Congé de Paternité', document_obligatoire: true },
  { nom: 'Congé Administratif', document_obligatoire: false },
]

const DEFAULT_RH_USER = {
  username: 'admin',
  email: 'admin@example.com',
  nom_complet: 'Administrateur RH',
  mot_de_passe: 'admin123',
}

const TYPES_FAUTE = [
  {
    code: 'RETARD',
    nom: 'Retard',
    description: "Retard répété ou significatif à la prise de service.",
    actif: true,
  },
  {
    code: 'ABSENCE_NON_JUSTIFIEE',
    nom: 'Absence non justifiée',
    description: "Absence sans justification valable ou sans autorisation préalable.",
    actif: true,
  },
  {
    code: 'DEPART_AVANT_HEURE',
    nom: "Départ avant l'heure",
    description: "Quitter le service avant l'heure réglementaire sans autorisation.",
    actif: true,
  },
  {
    code: 'NON_RESPECT_PAUSE',
    nom: 'Non-respect des horaires de pause',
    description: 'Dépassement ou non-respect des temps de pause autorisés.',
    actif: true,
  },
  {
    code: 'MAUVAISE_CONDUITE_PATIENTS',
    nom: 'Mauvaise conduite avec patients/usagers',
    description: 'Comportement inadapté envers les patients, usagers ou accompagnants.',
    actif: true,
  },
  {
    code: 'NON_RESPECT_COLLEGUES',
    nom: 'Non-respect envers responsables/collègues',
    description: "Attitude irrespectueuse envers la hiérarchie ou les collègues.",
    actif: true,
  },
  {
    code: 'ALTERCATION_TRAVAIL',
    nom: 'Altercation au travail',
    description: 'Conflit verbal ou comportement agressif sur le lieu de travail.',
    actif: true,
  },
  {
    code: 'NON_RESPECT_ETHIQUE',
    nom: "Non-respect de l'éthique professionnelle",
    description: "Manquement aux règles d'éthique, de confidentialité ou de déontologie.",
    actif: true,
  },
  {
    code: 'TENUE_PROFESSIONNELLE',
    nom: 'Tenue professionnelle',
    description: 'Non-respect des exigences liées à la tenue professionnelle.',
    actif: true,
  },
  {
    code: 'ABANDON_POSTE',
    nom: 'Abandon de poste',
    description: 'Abandon du poste ou interruption non autorisée du service.',
    actif: true,
  },
  {
    code: 'CERTIFICAT_MEDICAL_HORS_DELAI',
    nom: 'الإدلاء بشهادة طبية خارج الآجال',
    description: 'Présentation d\'un certificat médical hors des délais réglementaires.',
    actif: true,
  },
  {
    code: 'CONGE_MALADIE_NON_JUSTIFIE',
    nom: 'عطلة مرضية غير مبررة',
    description: 'Congé maladie non justifié par un certificat médical valide.',
    actif: true,
  },
]

function buildTemplatePath(identifiant, formatSource) {
  const extension = formatSource.toLowerCase()
  return `templates/dossiers-explicatifs/${identifiant}.${extension}`
}

function buildTemplatesForTypeFaute(typeFauteCode) {
  return [
    {
      identifiant: `${typeFauteCode}_LETTRE_EXPLICATIVE`,
      nom: 'Lettre explicative',
      code: 'LETTRE_EXPLICATIVE',
      usage: 'LETTRE_EXPLICATIVE',
      description: "Modèle initial de lettre explicative pour le dossier.",
      format_source: 'DOCX',
      version: 1,
      actif: true,
    },
    {
      identifiant: `${typeFauteCode}_BORDEREAU_NOTIFICATION`,
      nom: "Bordereau / notification d'envoi",
      code: 'BORDEREAU_NOTIFICATION',
      usage: 'BORDEREAU_NOTIFICATION',
      description: "Bordereau ou fiche de notification pour remise de la demande d'explication.",
      format_source: 'PDF',
      version: 1,
      actif: true,
    },
  ].map((template) => ({
    ...template,
    chemin_fichier: buildTemplatePath(template.identifiant, template.format_source),
  }))
}

async function seedTypesConge() {
  for (const type of TYPES_CONGE) {
    const existing = await prisma.typeConge.findFirst({
      where: { nom: type.nom },
      select: { id: true },
    })

    if (existing) {
      await prisma.typeConge.update({
        where: { id: existing.id },
        data: {
          document_obligatoire: type.document_obligatoire,
        },
      })
    } else {
      await prisma.typeConge.create({
        data: type,
      })
    }

    console.log(`Type de congé prêt: ${type.nom}`)
  }
}

async function seedDefaultRhUser() {
  const hashedPassword = await bcrypt.hash(DEFAULT_RH_USER.mot_de_passe, 10)

  await prisma.utilisateurRH.upsert({
    where: { username: DEFAULT_RH_USER.username },
    update: {
      email: DEFAULT_RH_USER.email,
      nom_complet: DEFAULT_RH_USER.nom_complet,
      actif: true,
    },
    create: {
      username: DEFAULT_RH_USER.username,
      email: DEFAULT_RH_USER.email,
      mot_de_passe: hashedPassword,
      nom_complet: DEFAULT_RH_USER.nom_complet,
      actif: true,
    },
  })

  console.log(`Utilisateur RH prêt: ${DEFAULT_RH_USER.username}`)
}

async function seedDossiersExplicatifsReferential() {
  for (const typeFauteData of TYPES_FAUTE) {
    const typeFaute = await prisma.typeFaute.upsert({
      where: { code: typeFauteData.code },
      update: {
        nom: typeFauteData.nom,
        description: typeFauteData.description,
        actif: true,
      },
      create: typeFauteData,
    })

    console.log(`Type de faute prêt: ${typeFaute.code}`)

    const templates = buildTemplatesForTypeFaute(typeFaute.code)
    for (const templateData of templates) {
      await prisma.documentTemplate.upsert({
        where: { identifiant: templateData.identifiant },
        update: {
          nom: templateData.nom,
          code: templateData.code,
          usage: templateData.usage,
          description: templateData.description,
          format_source: templateData.format_source,
          chemin_fichier: templateData.chemin_fichier,
          version: templateData.version,
          actif: true,
          type_faute_id: typeFaute.id,
        },
        create: {
          ...templateData,
          type_faute_id: typeFaute.id,
        },
      })

      console.log(`Template prêt: ${templateData.identifiant}`)
    }
  }
}

async function main() {
  console.log('Seeding database...')

  await seedTypesConge()
  await seedDefaultRhUser()
  await seedDossiersExplicatifsReferential()

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
