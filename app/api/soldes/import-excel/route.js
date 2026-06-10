import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { rejectIfLecteur } from '@/lib/roles'
import { getExpireLe } from '@/lib/solde-expiration'
import * as XLSX from 'xlsx'

/** Correspondance tolérante (insensible à la casse / accents) pour grade, spécialité, etc. */
function matchReferentielName(input, candidates) {
  if (!input || !candidates?.length) return null
  const raw = input.toString().trim()
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\./g, '')
      .replace(/\s+/g, ' ')
      .trim()
  const nInput = norm(raw)
  for (const c of candidates) {
    const n = norm(c.nom)
    if (n === nInput || n.includes(nInput) || nInput.includes(n)) return c
  }
  return null
}

/** Message court et compréhensible pour l'utilisateur */
function messageErreurUtilisateur(err) {
  const msg = err?.message || String(err)
  if (/prisma|invocation|ECONNREFUSED|database|connect/i.test(msg)) {
    return 'Base de données inaccessible. Vérifiez que le serveur est démarré.'
  }
  if (/unique|duplicate|exists already/i.test(msg)) {
    return 'Cette donnée existe déjà (doublon).'
  }
  if (/foreign key|constraint|reference/i.test(msg)) {
    return 'Référence invalide (spécialité, catégorie ou titre manquant dans l\'application).'
  }
  if (msg.length > 120) return 'Erreur lors de l\'opération. Vérifiez les données du fichier.'
  return msg
}

// POST - Importer les soldes depuis un fichier Excel
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }
    const deny = rejectIfLecteur(currentUser)
    if (deny) return deny

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Le fichier doit être un fichier Excel (.xlsx ou .xls)' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, cellNF: false, cellText: false })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    const data = []
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const row = []
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
        const cell = worksheet[cellAddress]
        row.push(cell ? (cell.w || cell.v || '') : '')
      }
      data.push(row)
    }

    if (data.length < 1) {
      return NextResponse.json({ error: 'Le fichier Excel est vide' }, { status: 400 })
    }

    const normalizeHeader = (h) => {
      if (!h) return ''
      return h.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '')
        .trim()
    }

    // Find header row (first 30 rows, looking for nom + prenom)
    let headerRowIndex = -1
    let headerRow = null

    for (let i = 0; i < Math.min(30, data.length); i++) {
      const row = data[i]
      if (!row || !Array.isArray(row)) continue
      const hasAnyValue = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      if (!hasAnyValue) continue

      const hasNom = row.some(cell => {
        const n = normalizeHeader(cell)
        const raw = cell?.toString().trim() ?? ''
        return n === 'nom' ||
          (n.includes('nom') && !n.includes('prenom') && !n.includes('prénom')) ||
          raw === 'النسب' || raw.includes('النسب')
      })

      const hasPrenom = row.some(cell => {
        const n = normalizeHeader(cell)
        const raw = cell?.toString().trim() ?? ''
        return n === 'prenom' || n === 'prénom' || n.includes('prenom') || n.includes('prénom') ||
          n.includes('firstname') || raw === 'الاسم' || raw.includes('الاسم')
      })

      if (hasNom && hasPrenom) {
        headerRowIndex = i
        headerRow = row
        break
      }
    }

    if (headerRowIndex === -1) {
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        if (row && Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) {
          headerRowIndex = i
          headerRow = row
          break
        }
      }
    }

    if (!headerRow || headerRowIndex === -1) {
      return NextResponse.json(
        {
          error: 'Impossible de trouver la ligne d\'en-têtes dans le fichier Excel. Vérifiez que votre fichier contient des colonnes "Nom" et "Prénom".',
          debug: {
            totalRows: data.length,
            firstFewRows: data.slice(0, 5).map((row, idx) => ({
              rowIndex: idx,
              values: row?.map(cell => String(cell || '')).slice(0, 10) || [],
            })),
          },
        },
        { status: 400 }
      )
    }

    // Clean data
    const cleanedData = [headerRow]
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || !Array.isArray(row)) continue
      if (row.some(cell => cell !== null && cell !== undefined && cell !== '' && String(cell).trim() !== '')) {
        cleanedData.push(row)
      }
    }

    if (cleanedData.length < 2) {
      return NextResponse.json(
        {
          error: 'Le fichier Excel ne contient pas de données valides',
          debug: { totalRows: data.length, headerRowIndex, headerRow: headerRow?.map(h => String(h || '')) },
        },
        { status: 400 }
      )
    }

    // ── Type de congé setup (unchanged) ───────────────────────────────────────
    const typesConge = await prisma.typeConge.findMany()
    const typeCongeMap = {}
    const joursTotalParType = { 'administratif': 22, 'exceptionnel': 10 }
    typesConge.forEach((type) => {
      const typeNomLower = type.nom.toLowerCase()
      if (typeNomLower.includes('administratif')) {
        typeCongeMap['administratif'] = type.id
        typeCongeMap['administrative'] = type.id
      }
      if (typeNomLower.includes('exceptionnel') || typeNomLower.includes('excepcionel')) {
        typeCongeMap['exceptionnel'] = type.id
        typeCongeMap['excepcionel'] = type.id
        const normalized = typeNomLower.replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/congé\s*/g, '').replace(/conge\s*/g, '').trim()
        if (normalized.includes('exceptionnel') || normalized.includes('excepcionel')) {
          typeCongeMap['exceptionnel'] = type.id
          typeCongeMap['excepcionel'] = type.id
        }
      }
      typeCongeMap[typeNomLower] = type.id
      const typeNomNoAccent = typeNomLower.normalize('NFD').replace(/[̀-ͯ]/g, '')
      typeCongeMap[typeNomNoAccent] = type.id
      if (typeNomNoAccent.includes('exceptionnel') || typeNomNoAccent.includes('excepcionel')) {
        typeCongeMap['exceptionnel'] = type.id
        typeCongeMap['excepcionel'] = type.id
      }
    })

    if (!typeCongeMap['exceptionnel'] && typesConge.length >= 2) {
      const typeExceptionnel = typesConge.find((t) => {
        const n = t.nom.toLowerCase()
        return !n.includes('administratif') && !n.includes('administrative')
      })
      if (typeExceptionnel) {
        typeCongeMap['exceptionnel'] = typeExceptionnel.id
        typeCongeMap['excepcionel'] = typeExceptionnel.id
      }
    }

    if (!typeCongeMap['exceptionnel']) {
      const existing = await prisma.typeConge.findFirst({
        where: {
          OR: [
            { nom: { contains: 'exceptionnel', mode: 'insensitive' } },
            { nom: { contains: 'excepcionel', mode: 'insensitive' } },
          ],
        },
      })
      if (existing) {
        typeCongeMap['exceptionnel'] = existing.id
        typeCongeMap['excepcionel'] = existing.id
      } else {
        const created = await prisma.typeConge.create({
          data: { nom: 'Congé exceptionnel', document_obligatoire: false },
        })
        typeCongeMap['exceptionnel'] = created.id
        typeCongeMap['excepcionel'] = created.id
        typesConge.push(created)
      }
    }

    console.log('Types de congé disponibles:', typesConge.map(t => t.nom))
    console.log('TypeCongeMap:', typeCongeMap)

    // ── Column index detection ────────────────────────────────────────────────
    const foundColumns = headerRow.map((h, idx) => ({
      index: idx,
      original: h ? String(h).trim() : '',
      normalized: normalizeHeader(h),
    }))

    const nomIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n === 'nom' ||
        (n.includes('nom') && !n.includes('prenom') && !n.includes('prénom')) ||
        raw === 'النسب' || raw.includes('النسب')
    })

    const prenomIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n === 'prenom' || n === 'prénom' || n.includes('prenom') || n.includes('prénom') ||
        n.includes('firstname') || raw === 'الاسم' || raw.includes('الاسم')
    })

    const pprIndex = headerRow.findIndex((h) =>
      normalizeHeader(h) === 'ppr' || normalizeHeader(h).includes('ppr')
    )

    const cinIndex = headerRow.findIndex((h) =>
      normalizeHeader(h) === 'cin' || normalizeHeader(h).includes('cin')
    )

    const telephoneIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      return n === 'gsm' || n === 'telephone' || n === 'tel' || n.includes('gsm') || n.includes('portable')
    })

    const gradeIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n.includes('grade') || raw === 'الدرجة' || raw.includes('الدرجة')
    })

    const specialiteIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n.includes('specialite') || n.includes('spécialité') || n.includes('specialite') ||
        raw === 'تخصص' || raw.includes('تخصص')
    })

    const serviceIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n.includes('service') || n.includes('département') || n.includes('departement') ||
        n.includes('affectation') || raw === 'المصلحة' || raw.includes('المصلحة')
    })

    const hopitalIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n.includes('hopital') || n.includes('hôpital') ||
        raw === 'مستشفى' || raw.includes('مستشفى') || raw.toUpperCase().includes('HOPITAL')
    })

    const adresseIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n.includes('adresse') || raw === 'العنوان' || raw.includes('العنوان')
    })

    const sexeIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n === 'sexe' || n.includes('sexe') || raw === 'الجنس' || raw.includes('الجنس')
    })

    const lieuNaissanceIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n.includes('lieunaissance') || n.includes('lieu') || raw === 'مكان الازدياد' || raw.includes('مكان الازدياد') || raw.includes('مكانالازدياد')
    })

    const villeIndex = headerRow.findIndex((h) => {
      const n = normalizeHeader(h)
      const raw = h?.toString().trim() ?? ''
      return n === 'ville' || n.includes('ville') || raw === 'المدينة' || raw.includes('المدينة')
    })

    if (nomIndex === -1 || prenomIndex === -1) {
      return NextResponse.json(
        {
          error: 'Les colonnes "Nom" et "Prénom" sont requises',
          foundColumns: foundColumns.map(c => c.original),
          details: { nomFound: nomIndex !== -1, prenomFound: prenomIndex !== -1, nomIndex, prenomIndex, allColumns: foundColumns },
        },
        { status: 400 }
      )
    }

    // ── Detect unsupported columns (reported in summary but not imported) ─────
    const UNSUPPORTED_PATTERNS = [
      { key: 'fonction', label: 'Fonction' },
    ]
    const ignoredUnsupportedColumns = []
    headerRow.forEach((h) => {
      if (!h) return
      const n = normalizeHeader(h)
      const raw = h.toString().trim()
      for (const p of UNSUPPORTED_PATTERNS) {
        if (n.includes(p.key) || raw.includes(p.label)) {
          if (!ignoredUnsupportedColumns.includes(raw)) {
            ignoredUnsupportedColumns.push(raw)
          }
          break
        }
      }
    })

    // ── Solde column detection (unchanged) ───────────────────────────────────
    const getTypeIdByKeyword = (keyword) => {
      const k = keyword.toLowerCase()
      const found = typesConge.find((t) => t.nom.toLowerCase().includes(k))
      return found ? found.id : null
    }

    const soldeColumns = []
    headerRow.forEach((header, index) => {
      if (!header) return
      const headerStr = header.toString().replace(/\s+/g, ' ').replace(/ /g, ' ').trim()
      if (!headerStr) return

      const headerNormalized = normalizeHeader(headerStr)

      let match = headerStr.match(/(administratif|exceptionnel|excepcionel|administrative)\s+(\d{4})/i)
      if (!match) {
        match = headerNormalized.match(/(administratif|exceptionnel|excepcionel|administrative)(\d{4})/)
      }
      if (!match) {
        const normalizedMatch = headerNormalized.match(/(administratif|exceptionnel|excepcionel|administrative).*?(\d{4})/)
        if (normalizedMatch) match = [normalizedMatch[0], normalizedMatch[1], normalizedMatch[2]]
      }

      if (match) {
        const typeRaw = match[1].toLowerCase()
        const type = typeRaw.normalize('NFD').replace(/[̀-ͯ]/g, '')
        const annee = parseInt(match[2], 10)

        let typeCongeId = typeCongeMap[type] || typeCongeMap[typeRaw]
        if (!typeCongeId && (type === 'exceptionnel' || typeRaw === 'exceptionnel')) {
          typeCongeId = typeCongeMap['exceptionnel'] || typeCongeMap['excepcionel']
        }
        if (!typeCongeId && (type === 'excepcionel' || typeRaw === 'excepcionel')) {
          typeCongeId = typeCongeMap['excepcionel'] || typeCongeMap['exceptionnel']
        }
        if (!typeCongeId) {
          if (typeRaw.includes('exceptionnel') || typeRaw.includes('excepcionel')) {
            typeCongeId = getTypeIdByKeyword('exceptionnel') || getTypeIdByKeyword('excepcionel')
          } else if (typeRaw.includes('administratif') || typeRaw.includes('administrative')) {
            typeCongeId = getTypeIdByKeyword('administratif') || getTypeIdByKeyword('administrative')
          }
        }

        if (typeCongeId && annee >= 2000 && annee <= 2100) {
          soldeColumns.push({
            index,
            type: typeRaw.includes('exceptionnel') || typeRaw.includes('excepcionel') ? 'exceptionnel' : 'administratif',
            annee,
            typeCongeId,
            header: headerStr,
          })
        } else if (annee >= 2000 && annee <= 2100) {
          console.log(`Type de congé non trouvé pour: "${typeRaw}" (header: "${headerStr}")`)
        }
      }
    })

    console.log('Colonnes de solde trouvées:', soldeColumns.map(c => ({ header: c.header, type: c.type, annee: c.annee })))

    const importSansColonneSolde = soldeColumns.length === 0
    if (importSansColonneSolde) {
      console.log('Import Excel: aucune colonne de solde détectée — import des professeurs uniquement.')
    }

    // ── Result tracking ───────────────────────────────────────────────────────
    const results = {
      success: [],
      errors: [],
      skipped: [],
      warnings: [],
    }

    // ── Fetch reference data ─────────────────────────────────────────────────
    let professeurs = await prisma.professeur.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        ppr: true,
        cin: true,
        telephone: true,
        service_id: true,
        hopital_id: true,
        grade_id: true,
        specialite_id: true,
      },
    })

    const [grades, specialites, categories, titres, services, hopitaux] = await Promise.all([
      prisma.grade.findMany(),
      prisma.specialite.findMany(),
      prisma.categoriePersonnel.findMany(),
      prisma.titre.findMany(),
      prisma.service.findMany(),
      prisma.hopital.findMany(),
    ])
    const defaultSpecialiteId = specialites.length > 0 ? specialites[0].id : null
    const defaultCategorieId = categories.length > 0 ? categories[0].id : null
    const defaultTitreId = titres.length > 0 ? titres[0].id : null

    // ── findProfesseur: PPR → CIN → name (with dupe check) ───────────────────
    const findProfesseur = (nom, prenom, pprValue, cinValue) => {
      const nomNorm = nom?.toString().trim().toLowerCase() || ''
      const prenomNorm = prenom?.toString().trim().toLowerCase() || ''
      const pprNorm = pprValue?.toString().trim() || ''
      const cinNorm = cinValue?.toString().trim().toLowerCase() || ''

      if (pprNorm) {
        const byPpr = professeurs.find((p) => p.ppr === pprNorm)
        if (byPpr) return { prof: byPpr, matchType: 'ppr' }
      }

      if (cinNorm) {
        const byCin = professeurs.find((p) => p.cin && p.cin.trim().toLowerCase() === cinNorm)
        if (byCin) return { prof: byCin, matchType: 'cin' }
      }

      if (nomNorm && prenomNorm) {
        const byName = professeurs.filter((p) => {
          const pNom = p.nom?.trim().toLowerCase() || ''
          const pPrenom = p.prenom?.trim().toLowerCase() || ''
          return pNom === nomNorm && pPrenom === prenomNorm
        })
        if (byName.length === 1) return { prof: byName[0], matchType: 'name' }
        if (byName.length > 1) return { prof: null, matchType: 'ambiguous' }
      }

      return { prof: null, matchType: null }
    }

    // ── createProfesseur ──────────────────────────────────────────────────────
    const createProfesseur = async (nom, prenom, pprValue, gradeValue, specialiteValue, serviceValue, hopitalValue, cinValue, telephoneValue, adresseValue, sexeValue, lieuNaissanceValue, villeValue, rowNumForLog) => {
      const ppr = pprValue != null && String(pprValue).trim() !== '' ? String(pprValue).trim() : null

      if (ppr && professeurs.some((p) => p.ppr === ppr)) {
        throw new Error(`Le PPR ${ppr} existe déjà`)
      }

      let gradeId = null
      if (gradeValue != null && String(gradeValue).trim() !== '') {
        const grade = matchReferentielName(gradeValue, grades)
        if (grade) {
          gradeId = grade.id
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Grade non reconnu : « ${String(gradeValue).trim()} » (ignoré)` })
        }
      }

      let specialiteId = defaultSpecialiteId
      if (specialiteValue != null && String(specialiteValue).trim() !== '') {
        const specialite = matchReferentielName(specialiteValue, specialites)
        if (specialite) {
          specialiteId = specialite.id
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Spécialité non reconnue : « ${String(specialiteValue).trim()} » — utilisation de la spécialité par défaut` })
        }
      }

      let serviceId = null
      if (serviceValue != null && String(serviceValue).trim() !== '') {
        const service = matchReferentielName(serviceValue, services)
        if (service) {
          serviceId = service.id
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Service non reconnu : « ${String(serviceValue).trim()} » (ignoré)` })
        }
      }

      let hopitalId = null
      if (hopitalValue != null && String(hopitalValue).trim() !== '') {
        const hopital = matchReferentielName(hopitalValue, hopitaux)
        if (hopital) {
          hopitalId = hopital.id
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Hôpital non reconnu : « ${String(hopitalValue).trim()} » (ignoré)` })
        }
      }

      const cin = cinValue != null && String(cinValue).trim() !== '' ? String(cinValue).trim() : null
      const telephone = telephoneValue != null && String(telephoneValue).trim() !== '' ? String(telephoneValue).trim() : null
      const adresse = adresseValue != null && String(adresseValue).trim() !== '' ? String(adresseValue).trim() : null
      const sexe = sexeValue != null && String(sexeValue).trim() !== '' ? String(sexeValue).trim() : null
      const lieu_naissance = lieuNaissanceValue != null && String(lieuNaissanceValue).trim() !== '' ? String(lieuNaissanceValue).trim() : null
      const ville = villeValue != null && String(villeValue).trim() !== '' ? String(villeValue).trim() : null

      if (!defaultSpecialiteId || !defaultCategorieId || !defaultTitreId) {
        throw new Error(
          'Impossible de créer un professeur : il manque des données de référence (spécialité, catégorie ou titre). Créez-en au moins une de chaque dans l\'application.'
        )
      }

      const data = {
        nom: nom.trim(),
        prenom: prenom.trim(),
        ppr,
        specialite_id: specialiteId,
        categorie_personnel_id: defaultCategorieId,
        titre_id: defaultTitreId,
        ...(gradeId !== null && { grade_id: gradeId }),
        ...(serviceId !== null && { service_id: serviceId }),
        ...(hopitalId !== null && { hopital_id: hopitalId }),
        ...(cin !== null && { cin }),
        ...(telephone !== null && { telephone }),
        ...(adresse !== null && { adresse }),
        ...(sexe !== null && { sexe }),
        ...(lieu_naissance !== null && { lieu_naissance }),
        ...(ville !== null && { ville }),
      }

      const newProfesseur = await prisma.professeur.create({ data })

      professeurs.push({
        id: newProfesseur.id,
        nom: newProfesseur.nom,
        prenom: newProfesseur.prenom,
        ppr: newProfesseur.ppr ?? null,
        cin: newProfesseur.cin ?? null,
        telephone: newProfesseur.telephone ?? null,
        adresse: newProfesseur.adresse ?? null,
        sexe: newProfesseur.sexe ?? null,
        lieu_naissance: newProfesseur.lieu_naissance ?? null,
        ville: newProfesseur.ville ?? null,
        service_id: newProfesseur.service_id ?? null,
        hopital_id: newProfesseur.hopital_id ?? null,
        grade_id: newProfesseur.grade_id ?? null,
        specialite_id: newProfesseur.specialite_id ?? null,
      })

      return newProfesseur
    }

    // ── updateExistingProfesseur: fill only empty fields ──────────────────────
    const updateExistingProfesseur = async (professeur, { gradeValue, specialiteValue, serviceValue, hopitalValue, cinValue, telephoneValue, adresseValue, sexeValue, lieuNaissanceValue, villeValue }, rowNumForLog) => {
      const cached = professeurs.find((p) => p.id === professeur.id)
      const fieldsToUpdate = {}
      const updatedFields = []

      if (cinValue?.trim() && !cached?.cin) {
        fieldsToUpdate.cin = cinValue.trim()
        updatedFields.push('CIN')
      }

      if (telephoneValue?.trim() && !cached?.telephone) {
        fieldsToUpdate.telephone = telephoneValue.trim()
        updatedFields.push('téléphone')
      }

      if (adresseValue?.trim() && !cached?.adresse) {
        fieldsToUpdate.adresse = adresseValue.trim()
        updatedFields.push('adresse')
      }

      if (sexeValue?.trim() && !cached?.sexe) {
        fieldsToUpdate.sexe = sexeValue.trim()
        updatedFields.push('sexe')
      }

      if (lieuNaissanceValue?.trim() && !cached?.lieu_naissance) {
        fieldsToUpdate.lieu_naissance = lieuNaissanceValue.trim()
        updatedFields.push('lieu de naissance')
      }

      if (villeValue?.trim() && !cached?.ville) {
        fieldsToUpdate.ville = villeValue.trim()
        updatedFields.push('ville')
      }

      if (gradeValue?.trim() && !cached?.grade_id) {
        const grade = matchReferentielName(gradeValue, grades)
        if (grade) {
          fieldsToUpdate.grade_id = grade.id
          updatedFields.push(`grade (${grade.nom})`)
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Grade non reconnu : « ${gradeValue.trim()} » (ignoré)` })
        }
      }

      if (hopitalValue?.trim() && !cached?.hopital_id) {
        const hopital = matchReferentielName(hopitalValue, hopitaux)
        if (hopital) {
          fieldsToUpdate.hopital_id = hopital.id
          updatedFields.push(`hôpital (${hopital.nom})`)
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Hôpital non reconnu : « ${hopitalValue.trim()} » (ignoré)` })
        }
      }

      if (serviceValue?.trim() && !cached?.service_id) {
        const service = matchReferentielName(serviceValue, services)
        if (service) {
          fieldsToUpdate.service_id = service.id
          updatedFields.push(`service (${service.nom})`)
        } else {
          results.warnings.push({ row: rowNumForLog, message: `Service non reconnu : « ${serviceValue.trim()} » (ignoré)` })
        }
      }

      if (Object.keys(fieldsToUpdate).length === 0) return null

      await prisma.professeur.update({ where: { id: professeur.id }, data: fieldsToUpdate })

      if (cached) Object.assign(cached, fieldsToUpdate)

      return updatedFields
    }

    // ── Row processing ────────────────────────────────────────────────────────
    for (let i = 1; i < cleanedData.length; i++) {
      const row = cleanedData[i]
      if (!row || row.length === 0) continue

      const nom = row[nomIndex]?.toString().trim()
      const prenom = row[prenomIndex]?.toString().trim()
      const pprValue = pprIndex !== -1 ? row[pprIndex]?.toString().trim() : null
      const cinValue = cinIndex !== -1 ? row[cinIndex]?.toString().trim() : null
      const telephoneValue = telephoneIndex !== -1 ? row[telephoneIndex]?.toString().trim() : null
      const gradeValue = gradeIndex !== -1 ? row[gradeIndex]?.toString().trim() : null
      const specialiteValue = specialiteIndex !== -1 ? row[specialiteIndex]?.toString().trim() : null
      const serviceValue = serviceIndex !== -1 ? row[serviceIndex]?.toString().trim() : null
      const hopitalValue = hopitalIndex !== -1 ? row[hopitalIndex]?.toString().trim() : null
      const adresseValue = adresseIndex !== -1 ? row[adresseIndex]?.toString().trim() : null
      const sexeValue = sexeIndex !== -1 ? row[sexeIndex]?.toString().trim() : null
      const lieuNaissanceValue = lieuNaissanceIndex !== -1 ? row[lieuNaissanceIndex]?.toString().trim() : null
      const villeValue = villeIndex !== -1 ? row[villeIndex]?.toString().trim() : null

      if (!nom || !prenom) {
        results.skipped.push({ row: i + 1, reason: 'Nom ou prénom manquant', nom, prenom })
        continue
      }

      const { prof: foundProf, matchType } = findProfesseur(nom, prenom, pprValue, cinValue)

      if (matchType === 'ambiguous') {
        results.warnings.push({
          row: i + 1,
          message: `Plusieurs employés correspondent au nom « ${prenom} ${nom} » sans PPR ni CIN — ligne ignorée`,
        })
        results.skipped.push({ row: i + 1, reason: 'Correspondance ambiguë (doublons de nom)', nom, prenom })
        continue
      }

      let professeur = foundProf

      if (!professeur) {
        // Create new employee
        try {
          professeur = await createProfesseur(
            nom, prenom, pprValue, gradeValue, specialiteValue, serviceValue,
            hopitalValue, cinValue, telephoneValue, adresseValue, sexeValue, lieuNaissanceValue, villeValue, i + 1
          )
          results.success.push({
            row: i + 1,
            action: 'professeur_created',
            professeur: `${prenom} ${nom}`,
            ppr: professeur.ppr,
          })
        } catch (error) {
          results.errors.push({
            row: i + 1,
            reason: `Création du professeur : ${messageErreurUtilisateur(error)}`,
            nom,
            prenom,
          })
          continue
        }
      } else {
        // Update existing employee: fill empty fields only
        if (matchType === 'name') {
          results.warnings.push({
            row: i + 1,
            message: `Employé « ${prenom} ${nom} » trouvé par nom uniquement (pas de PPR ni CIN) — utilisation avec prudence`,
          })
        }

        try {
          const updatedFields = await updateExistingProfesseur(
            professeur,
            { gradeValue, specialiteValue, serviceValue, hopitalValue, cinValue, telephoneValue, adresseValue, sexeValue, lieuNaissanceValue, villeValue },
            i + 1
          )
          if (updatedFields && updatedFields.length > 0) {
            results.success.push({
              row: i + 1,
              action: 'employee_updated',
              professeur: `${prenom} ${nom}`,
              updatedFields,
            })
          }
        } catch (error) {
          results.warnings.push({
            row: i + 1,
            message: `Mise à jour des champs de l'employé : ${messageErreurUtilisateur(error)}`,
          })
        }
      }

      // ── Process solde columns ─────────────────────────────────────────────
      for (const soldeCol of soldeColumns) {
        const joursValue = row[soldeCol.index]
        const jours = parseInt(joursValue, 10)

        if (isNaN(jours) || jours < 0) {
          results.skipped.push({
            row: i + 1,
            reason: `Valeur invalide pour ${soldeCol.header}: ${joursValue}`,
            nom,
            prenom,
            solde: soldeCol.header,
          })
          continue
        }

        if (jours === 0) continue

        try {
          const expireLe = getExpireLe(soldeCol.annee, soldeCol.type || 'administratif')

          const existingSolde = await prisma.soldeConge.findUnique({
            where: {
              professeur_id_annee_type_conge_id: {
                professeur_id: professeur.id,
                annee: soldeCol.annee,
                type_conge_id: soldeCol.typeCongeId,
              },
            },
          })

          let joursTotal = joursTotalParType[soldeCol.type] || 22

          if (existingSolde) {
            await prisma.soldeConge.update({
              where: { id: existingSolde.id },
              data: { jours_restants: jours, expire_le: expireLe },
            })
            results.success.push({
              row: i + 1,
              action: 'updated',
              professeur: `${prenom} ${nom}`,
              solde: soldeCol.header,
              jours_restants: jours,
              jours_total: existingSolde.jours_total,
            })
          } else {
            await prisma.soldeConge.create({
              data: {
                professeur_id: professeur.id,
                annee: soldeCol.annee,
                jours_total: joursTotal,
                jours_restants: jours,
                expire_le: expireLe,
                type_conge_id: soldeCol.typeCongeId,
              },
            })
            results.success.push({
              row: i + 1,
              action: 'created',
              professeur: `${prenom} ${nom}`,
              solde: soldeCol.header,
              jours_restants: jours,
              jours_total: joursTotal,
            })
          }
        } catch (error) {
          results.errors.push({
            row: i + 1,
            reason: `Solde (${soldeCol.header}) : ${messageErreurUtilisateur(error)}`,
            nom,
            prenom,
            solde: soldeCol.header,
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Import terminé',
      summary: {
        total: results.success.length + results.errors.length + results.skipped.length,
        success: results.success.length,
        errors: results.errors.length,
        skipped: results.skipped.length,
        warnings: results.warnings.length,
        soldeColumnsDetected: soldeColumns.length,
        importSansColonneSolde,
        ignoredUnsupportedColumns: ignoredUnsupportedColumns.length > 0 ? ignoredUnsupportedColumns : undefined,
      },
      details: results,
    })
  } catch (error) {
    console.error('Erreur lors de l\'import Excel:', error)
    const message = /prisma|invocation|ECONNREFUSED|database|connect/i.test(error.message || '')
      ? 'Impossible d\'accéder à la base de données. Vérifiez qu\'elle est démarrée. Le fichier doit au minimum contenir les colonnes Nom et Prénom (colonnes de solde optionnelles).'
      : messageErreurUtilisateur(error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
