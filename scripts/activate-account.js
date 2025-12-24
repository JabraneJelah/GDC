// Script d'urgence pour réactiver un compte désactivé
// Usage: node scripts/activate-account.js <username>

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function activateAccount() {
  try {
    const username = process.argv[2]
    
    if (!username) {
      console.error('❌ Erreur: Veuillez fournir un username')
      console.log('Usage: node scripts/activate-account.js <username>')
      process.exit(1)
    }

    console.log(`🔍 Recherche de l'utilisateur avec username: ${username}...`)

    const utilisateur = await prisma.utilisateurRH.findUnique({
      where: { username },
    })

    if (!utilisateur) {
      console.error(`❌ Utilisateur avec username "${username}" non trouvé`)
      process.exit(1)
    }

    console.log(`✅ Utilisateur trouvé: ${utilisateur.nom_complet}`)
    console.log(`📊 Statut actuel: ${utilisateur.actif ? 'Actif' : 'Inactif'}`)

    if (utilisateur.actif) {
      console.log('ℹ️  Le compte est déjà actif')
      process.exit(0)
    }

    // Réactiver le compte
    await prisma.utilisateurRH.update({
      where: { id: utilisateur.id },
      data: {
        actif: true,
      },
    })

    console.log('✅ Compte réactivé avec succès!')
    console.log(`👤 Vous pouvez maintenant vous connecter avec: ${username}`)
  } catch (error) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

activateAccount()

