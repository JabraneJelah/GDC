import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Route temporaire pour appliquer les index - PAS DE PROTECTION D'AUTHENTIFICATION
export async function POST() {
  try {
    console.log('Creating performance indexes...')
    
    // Indexes for Professeurs
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "professeurs_nom_idx" ON "professeurs"("nom");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "professeurs_prenom_idx" ON "professeurs"("prenom");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "professeurs_cin_idx" ON "professeurs"("cin");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "professeurs_nom_prenom_idx" ON "professeurs"("nom", "prenom");
    `)
    
    // Indexes for Conges
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "conges_professeur_id_idx" ON "conges"("professeur_id");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "conges_date_debut_idx" ON "conges"("date_debut");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "conges_date_fin_idx" ON "conges"("date_fin");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "conges_type_conge_id_idx" ON "conges"("type_conge_id");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "conges_date_debut_date_fin_idx" ON "conges"("date_debut", "date_fin");
    `)
    
    // Indexes for SoldesConge
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "soldes_conge_professeur_id_annee_idx" ON "soldes_conge"("professeur_id", "annee");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "soldes_conge_annee_idx" ON "soldes_conge"("annee");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "soldes_conge_expire_le_idx" ON "soldes_conge"("expire_le");
    `)
    
    // Indexes for UtilisateurRH
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "utilisateurs_rh_actif_idx" ON "utilisateurs_rh"("actif");
    `)
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "utilisateurs_rh_username_actif_idx" ON "utilisateurs_rh"("username", "actif");
    `)
    
    console.log('\n✓ Performance indexes created successfully!')
    return NextResponse.json({ success: true, message: 'Performance indexes created successfully!' })
  } catch (error) {
    console.error('Error creating indexes:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

