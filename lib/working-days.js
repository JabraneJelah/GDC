function startOfLocalDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/**
 * Retourne true si la date (YYYY-MM-DD) est un jour ouvrable
 * (ni week-end, ni jour férié actif).
 */
export async function isWorkingDay(dateStr, prismaClient) {
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) return false
  const jourFerie = await prismaClient.jourFerie.findFirst({
    where: {
      actif: true,
      date_debut: { lte: date },
      date_fin: { gte: date },
    },
  })
  return jourFerie === null
}

/**
 * Retourne la date YYYY-MM-DD correspondant au N-ième jour ouvrable à partir de date_debut (inclus).
 * Ex : getDateFinFromDuree('2025-05-26', 2) → '2025-05-27' (lun + mar).
 */
export async function getDateFinFromDuree(dateDebutStr, dureeJours, prismaClient) {
  if (!dureeJours || dureeJours <= 0) return null
  const start = new Date(dateDebutStr + 'T00:00:00')

  const estimatedEnd = new Date(start)
  estimatedEnd.setDate(estimatedEnd.getDate() + Math.ceil(dureeJours * 2) + 30)

  const joursFeries = await prismaClient.jourFerie.findMany({
    where: {
      actif: true,
      date_debut: { lte: estimatedEnd },
      date_fin: { gte: start },
    },
    select: { date_debut: true, date_fin: true },
  })

  let count = 0
  const current = new Date(start)
  const maxIter = dureeJours * 3 + 60
  for (let i = 0; i < maxIter; i++) {
    const dayOfWeek = current.getDay()
    const tDay = startOfLocalDay(current)
    const isFerie = joursFeries.some((jf) => {
      const db = startOfLocalDay(jf.date_debut)
      const df = startOfLocalDay(jf.date_fin)
      return tDay >= db && tDay <= df
    })
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isFerie) {
      count++
      if (count === dureeJours) {
        return (
          current.getFullYear() +
          '-' +
          String(current.getMonth() + 1).padStart(2, '0') +
          '-' +
          String(current.getDate()).padStart(2, '0')
        )
      }
    }
    current.setDate(current.getDate() + 1)
  }
  return null
}

/**
 * Nombre de jours ouvrables entre deux dates (exclut samedi, dimanche et jours fériés actifs).
 * Chaque jour férié est une plage [date_debut, date_fin] incluse.
 */
export async function getWorkingDaysBetween(dateDebutStr, dateFinStr, prismaClient) {
  const start = new Date(dateDebutStr + 'T00:00:00')
  const end = new Date(dateFinStr + 'T00:00:00')
  if (end < start) return 0

  const joursFeries = await prismaClient.jourFerie.findMany({
    where: {
      actif: true,
      date_debut: { lte: end },
      date_fin: { gte: start },
    },
    select: { date_debut: true, date_fin: true },
  })

  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const dayOfWeek = current.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const tDay = startOfLocalDay(current)
    const isFerie = joursFeries.some((jf) => {
      const db = startOfLocalDay(jf.date_debut)
      const df = startOfLocalDay(jf.date_fin)
      return tDay >= db && tDay <= df
    })
    if (!isWeekend && !isFerie) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}
