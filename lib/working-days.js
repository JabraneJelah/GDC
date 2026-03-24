function startOfLocalDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
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
