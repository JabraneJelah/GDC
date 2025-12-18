// Import directly from generated Prisma 7 client (TypeScript, handled by Node.js with type: module)
import { PrismaClient } from '../.prisma/client/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...')

  // Créer les types de congé
  const typesConge = [
    { nom: 'Annuel', document_obligatoire: false },
    { nom: 'Maladie', document_obligatoire: true },
    { nom: 'Exceptionnel', document_obligatoire: false },
    { nom: 'Congé de Maternité', document_obligatoire: true },
    { nom: 'Congé de Paternité', document_obligatoire: true },
    { nom: 'Congé Administratif', document_obligatoire: false },
  ]

  for (const type of typesConge) {
    const existing = await prisma.typeConge.findFirst({
      where: { nom: type.nom },
    })

    if (!existing) {
      await prisma.typeConge.create({
        data: type,
      })
      console.log(`✅ Type de congé créé: ${type.nom}`)
    } else {
      console.log(`⏭️  Type de congé déjà existant: ${type.nom}`)
    }
  }

  // Créer un utilisateur RH par défaut (pour le développement)
  const defaultEmail = 'admin@example.com'
  const defaultPassword = 'admin123' // À changer en production!

  const existingUser = await prisma.utilisateurRH.findUnique({
    where: { email: defaultEmail },
  })

  if (!existingUser) {
    // Hash du mot de passe
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    await prisma.utilisateurRH.create({
      data: {
        email: defaultEmail,
        mot_de_passe: hashedPassword,
        nom_complet: 'Administrateur RH',
      },
    })
    console.log(`✅ Utilisateur RH créé: ${defaultEmail} / ${defaultPassword}`)
  } else {
    console.log(`⏭️  Utilisateur RH déjà existant: ${defaultEmail}`)
  }

  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

