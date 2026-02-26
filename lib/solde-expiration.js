/**
 * Règles d'expiration des soldes de congé :
 * - Congé exceptionnel : expire après 1 an (31/12 de l'année du solde → expiré au 01/01 année suivante)
 * - Congé administratif / annuel / autres : expire après 2 ans (31/12 année+1 → expiré au 01/01 année+2)
 *
 * @param {number} annee - Année du solde (ex: 2024)
 * @param {object|string} typeCongeOrName - Type de congé { nom: string } ou nom du type en chaîne
 * @returns {Date} Date d'expiration (dernier jour de validité, minuit)
 */
export function getExpireLe(annee, typeCongeOrName) {
  const nom = typeof typeCongeOrName === 'string'
    ? typeCongeOrName
    : (typeCongeOrName?.nom || '')
  const nomLower = nom.toLowerCase().trim()
  const isExceptionnel = nomLower.includes('exceptionnel') || nomLower.includes('excepcionel')

  if (isExceptionnel) {
    // 1 an : expire au 31/12 de l'année du solde → le 01/01 année suivante c'est expiré
    return new Date(annee, 11, 31)
  }
  // 2 ans : expire au 31/12 de l'année suivante → le 01/01 deux ans après le solde c'est expiré (ex: solde 2024 → expiré 01/01/2026)
  return new Date(annee + 1, 11, 31)
}
