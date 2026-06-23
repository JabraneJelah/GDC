// Dry-run script: detect and (optionally) fix swapped nom_ar / prenom_ar values.
//
// Run dry-run (no DB writes):
//   node scripts/fix-arabic-names-swap.js
//
// Apply the swap (only after reviewing dry-run output):
//   node scripts/fix-arabic-names-swap.js --apply

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const APPLY = process.argv.includes('--apply')

async function main() {
  // Only touch rows where BOTH nom_ar and prenom_ar are non-empty.
  // Rows with only one field populated are partial/ambiguous — leave them alone.
  const affected = await prisma.professeur.findMany({
    where: {
      AND: [
        { nom_ar: { not: null } },
        { nom_ar: { not: '' } },
        { prenom_ar: { not: null } },
        { prenom_ar: { not: '' } },
      ],
    },
    select: {
      id: true,
      nom: true,
      prenom: true,
      nom_ar: true,
      prenom_ar: true,
    },
    orderBy: { nom: 'asc' },
  })

  if (affected.length === 0) {
    console.log('✅ No professeurs found with both nom_ar and prenom_ar populated. Nothing to do.')
    await prisma.$disconnect()
    return
  }

  const sep = '─'.repeat(100)
  console.log(`\n${sep}`)
  console.log(
    APPLY
      ? `⚠️  APPLY MODE — will swap nom_ar ↔ prenom_ar for ${affected.length} row(s)`
      : `📋 DRY-RUN — ${affected.length} row(s) would be swapped (no DB writes)`
  )
  console.log(`${sep}\n`)

  const col = (s, w) => (s ?? '').toString().substring(0, w).padEnd(w)

  console.log(
    `${col('nom (FR)', 16)} ${col('prenom (FR)', 16)} | ${col('nom_ar NOW', 18)} ${col('prenom_ar NOW', 18)} | ${col('nom_ar AFTER', 18)} ${col('prenom_ar AFTER', 18)}`
  )
  console.log(sep)

  for (const p of affected) {
    const newNomAr = p.prenom_ar   // swap: current prenom_ar → nom_ar
    const newPrenomAr = p.nom_ar   // swap: current nom_ar → prenom_ar

    console.log(
      `${col(p.nom, 16)} ${col(p.prenom, 16)} | ${col(p.nom_ar, 18)} ${col(p.prenom_ar, 18)} | ${col(newNomAr, 18)} ${col(newPrenomAr, 18)}`
    )

    if (APPLY) {
      await prisma.professeur.update({
        where: { id: p.id },
        data: { nom_ar: newNomAr, prenom_ar: newPrenomAr },
      })
    }
  }

  console.log(`\n${sep}`)

  if (APPLY) {
    console.log(`✅ Done. Swapped nom_ar ↔ prenom_ar for ${affected.length} row(s).`)
    console.log('   nom, prenom, and all other fields were NOT touched.')
  } else {
    console.log(`ℹ️  Dry-run complete. ${affected.length} row(s) shown above would be modified.`)
    console.log('   Review the table above, then run with --apply to write changes:')
    console.log('   node scripts/fix-arabic-names-swap.js --apply')
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('Error:', e.message)
  prisma.$disconnect()
  process.exit(1)
})
