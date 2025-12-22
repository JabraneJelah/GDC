import { prisma } from '../lib/prisma.js'

async function applyMigration() {
  try {
    console.log('Creating services table...')
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" SERIAL NOT NULL,
        "nom" TEXT NOT NULL,
        CONSTRAINT "services_pkey" PRIMARY KEY ("id")
      );
    `)
    
    console.log('Creating unique index...')
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "services_nom_key" ON "services"("nom");
    `)
    
    console.log('Inserting default service...')
    await prisma.$executeRawUnsafe(`
      INSERT INTO "services" ("nom") 
      SELECT 'Service Général' 
      WHERE NOT EXISTS (SELECT 1 FROM "services" WHERE "nom" = 'Service Général');
    `)
    
    console.log('Adding service_id column...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "professeurs" 
      ADD COLUMN IF NOT EXISTS "service_id" INTEGER;
    `)
    
    console.log('Updating existing professeurs...')
    await prisma.$executeRawUnsafe(`
      UPDATE "professeurs" 
      SET "service_id" = (SELECT "id" FROM "services" WHERE "nom" = 'Service Général' LIMIT 1)
      WHERE "service_id" IS NULL;
    `)
    
    console.log('Making service_id required...')
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "professeurs" 
      ALTER COLUMN "service_id" SET NOT NULL;
    `)
    
    console.log('Adding foreign key constraint...')
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'professeurs_service_id_fkey'
        ) THEN
          ALTER TABLE "professeurs" 
          ADD CONSTRAINT "professeurs_service_id_fkey" 
          FOREIGN KEY ("service_id") 
          REFERENCES "services"("id") 
          ON DELETE RESTRICT 
          ON UPDATE CASCADE;
        END IF;
      END $$;
    `)
    
    console.log('\n✓ Migration applied successfully!')
  } catch (error) {
    console.error('Error applying migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

applyMigration()
