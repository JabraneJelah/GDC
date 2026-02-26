import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getExpireLe } from '@/lib/solde-expiration'
import * as XLSX from 'xlsx'

// POST - Importer les soldes depuis un fichier Excel
export async function POST(request) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier fourni' },
        { status: 400 }
      )
    }

    // Vérifier le type de fichier
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Le fichier doit être un fichier Excel (.xlsx ou .xls)' },
        { status: 400 }
      )
    }

    // Lire le fichier
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: false, cellNF: false, cellText: false })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Lire les données en mode range pour avoir toutes les cellules
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
    
    // Convertir en tableau 2D
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
      return NextResponse.json(
        { error: 'Le fichier Excel est vide' },
        { status: 400 }
      )
    }

    // Trouver la ligne d'en-têtes (chercher la première ligne qui contient "nom" ou "prénom")
    let headerRowIndex = -1
    let headerRow = null
    
    const normalizeHeader = (h) => {
      if (!h) return ''
      return h.toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
        .replace(/\s+/g, '') // Enlever les espaces
        .trim()
    }
    
    // Chercher la ligne d'en-têtes dans les 10 premières lignes
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i]
      if (!row || !Array.isArray(row)) continue
      
      // Ignorer les lignes complètement vides
      const hasAnyValue = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
      if (!hasAnyValue) continue
      
      // Vérifier si cette ligne contient "nom" et "prénom"
      const hasNom = row.some(cell => {
        const normalized = normalizeHeader(cell)
        return normalized === 'nom' || (normalized.includes('nom') && !normalized.includes('prenom'))
      })
      
      const hasPrenom = row.some(cell => {
        const normalized = normalizeHeader(cell)
        return normalized === 'prenom' || normalized === 'prénom' || normalized.includes('prenom') || normalized.includes('prénom')
      })
      
      if (hasNom && hasPrenom) {
        headerRowIndex = i
        headerRow = row
        break
      }
    }
    
    // Si pas trouvé, utiliser la première ligne non vide
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
              values: row?.map(cell => String(cell || '')).slice(0, 10) || []
            }))
          }
        },
        { status: 400 }
      )
    }

    // Nettoyer les données: enlever les lignes vides après les en-têtes
    const cleanedData = []
    cleanedData.push(headerRow) // Ajouter la ligne d'en-têtes
    
    // Ajouter les lignes de données (après la ligne d'en-têtes)
    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const row = data[i]
      if (!row || !Array.isArray(row)) continue
      // Garder seulement les lignes qui ont au moins une valeur non vide
      if (row.some(cell => cell !== null && cell !== undefined && cell !== '' && String(cell).trim() !== '')) {
        cleanedData.push(row)
      }
    }

    if (cleanedData.length < 2) {
      return NextResponse.json(
        { 
          error: 'Le fichier Excel ne contient pas de données valides',
          debug: {
            totalRows: data.length,
            headerRowIndex,
            headerRow: headerRow?.map(h => String(h || '')),
          }
        },
        { status: 400 }
      )
    }

    // Récupérer les types de congé
    const typesConge = await prisma.typeConge.findMany()
    const typeCongeMap = {}
    // Mapping des jours totaux par type de congé (par défaut)
    const joursTotalParType = {
      'administratif': 22, // 22 jours par an pour congé administratif
      'exceptionnel': 10,  // 10 jours par an pour congé exceptionnel
    }
    typesConge.forEach((type) => {
      const typeNomLower = type.nom.toLowerCase()
      // Mapping flexible pour "Administratif" -> "Congé Administratif"
      if (typeNomLower.includes('administratif')) {
        typeCongeMap['administratif'] = type.id
        typeCongeMap['administrative'] = type.id // Variante anglaise
      }
      // Mapping flexible pour "Exceptionnel" / "Excepcionel" (gérer les fautes d'orthographe)
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
      const typeNomNoAccent = typeNomLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      typeCongeMap[typeNomNoAccent] = type.id
      if (typeNomNoAccent.includes('exceptionnel') || typeNomNoAccent.includes('excepcionel')) {
        typeCongeMap['exceptionnel'] = type.id
        typeCongeMap['excepcionel'] = type.id
      }
    })

    // Si "Exceptionnel" n'a pas de type en base mais qu'on a 2 types (ex: Administratif + un autre), utiliser l'autre pour Exceptionnel
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

    // Si toujours pas de type "Exceptionnel", le créer automatiquement pour que l'import fonctionne
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

    // Debug: logger les types de congé trouvés
    console.log('Types de congé disponibles:', typesConge.map(t => t.nom))
    console.log('TypeCongeMap:', typeCongeMap)
    
    // Debug: afficher toutes les colonnes trouvées
    const foundColumns = headerRow.map((h, idx) => ({
      index: idx,
      original: h ? String(h).trim() : '',
      normalized: normalizeHeader(h),
    }))
    
    // Recherche flexible pour "Nom" (peut être "Nom", "NOM", "nom", "NOM DE FAMILLE", etc.)
    const nomIndex = headerRow.findIndex((h) => {
      const normalized = normalizeHeader(h)
      return normalized === 'nom' || 
             (normalized.includes('nom') && !normalized.includes('prenom') && !normalized.includes('prénom'))
    })
    
    // Recherche flexible pour "Prénom" (peut être "Prénom", "Prenom", "PRENOM", "Prénom", etc.)
    const prenomIndex = headerRow.findIndex((h) => {
      const normalized = normalizeHeader(h)
      return normalized === 'prenom' || 
             normalized === 'prénom' || 
             normalized.includes('prenom') || 
             normalized.includes('prénom') ||
             normalized === 'prenom' ||
             normalized.includes('firstname')
    })
    
    const gradeIndex = headerRow.findIndex((h) => 
      normalizeHeader(h).includes('grade')
    )
    const specialiteIndex = headerRow.findIndex((h) => 
      normalizeHeader(h).includes('specialite') || normalizeHeader(h).includes('spécialité')
    )
    const pprIndex = headerRow.findIndex((h) => 
      normalizeHeader(h) === 'ppr' || normalizeHeader(h).includes('ppr')
    )

    if (nomIndex === -1 || prenomIndex === -1) {
      return NextResponse.json(
        { 
          error: 'Les colonnes "Nom" et "Prénom" sont requises',
          foundColumns: foundColumns.map(c => c.original),
          details: {
            nomFound: nomIndex !== -1,
            prenomFound: prenomIndex !== -1,
            nomIndex,
            prenomIndex,
            allColumns: foundColumns,
          }
        },
        { status: 400 }
      )
    }

    // Helper: retrouver l'id du type "exceptionnel" ou "administratif" depuis la base
    const getTypeIdByKeyword = (keyword) => {
      const k = keyword.toLowerCase()
      const found = typesConge.find((t) => t.nom.toLowerCase().includes(k))
      return found ? found.id : null
    }

    // Trouver les colonnes de soldes (format: "Type Année" ou "TypeAnnee")
    const soldeColumns = []
    headerRow.forEach((header, index) => {
      if (!header) return
      // Remplacer espaces insécables et caractères spéciaux par un espace normal
      const headerStr = header.toString().replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim()
      if (!headerStr) return
      
      // Normaliser l'en-tête pour la recherche (sans espaces pour TypeAnnee)
      const headerNormalized = normalizeHeader(headerStr)
      
      // Chercher les patterns comme "Administratif 2024", "Exceptionnel 2025", etc.
      // Pattern 1: "Type Année" avec un ou plusieurs espaces (y compris espaces insécables)
      let match = headerStr.match(/(administratif|exceptionnel|excepcionel|administrative)\s+(\d{4})/i)
      
      // Pattern 2: "TypeAnnee" sans espace (ex: "Administratif2024", "Exceptionnel2025")
      if (!match) {
        match = headerNormalized.match(/(administratif|exceptionnel|excepcionel|administrative)(\d{4})/)
      }
      
      // Pattern 3: type puis n'importe quoi puis 4 chiffres
      if (!match) {
        const normalizedMatch = headerNormalized.match(/(administratif|exceptionnel|excepcionel|administrative).*?(\d{4})/)
        if (normalizedMatch) {
          match = [normalizedMatch[0], normalizedMatch[1], normalizedMatch[2]]
        }
      }
      
      if (match) {
        const typeRaw = match[1].toLowerCase()
        const type = typeRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const annee = parseInt(match[2], 10)
        
        let typeCongeId = typeCongeMap[type] || typeCongeMap[typeRaw]
        if (!typeCongeId && (type === 'exceptionnel' || typeRaw === 'exceptionnel')) {
          typeCongeId = typeCongeMap['exceptionnel'] || typeCongeMap['excepcionel']
        }
        if (!typeCongeId && (type === 'excepcionel' || typeRaw === 'excepcionel')) {
          typeCongeId = typeCongeMap['excepcionel'] || typeCongeMap['exceptionnel']
        }
        // Fallback: chercher dans la base par mot-clé si le map n'a pas le type (ex: "Exceptionnel" dans le nom du type)
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
          console.log(`Type de congé non trouvé pour: "${typeRaw}" (header: "${headerStr}"). Types en base: ${typesConge.map(t => t.nom).join(', ')}`)
        }
      }
    })
    
    // Debug: logger les colonnes de solde trouvées
    console.log('Colonnes de solde trouvées:', soldeColumns.map(c => ({ header: c.header, type: c.type, annee: c.annee })))

    if (soldeColumns.length === 0) {
      // Trouver toutes les colonnes qui pourraient être des soldes (contiennent un nombre à 4 chiffres)
      const potentialSoldeColumns = headerRow
        .map((h, idx) => ({ index: idx, header: h ? String(h).trim() : '' }))
        .filter(col => {
          if (!col.header) return false
          // Chercher un nombre à 4 chiffres (année)
          return /\d{4}/.test(col.header)
        })
      
      return NextResponse.json(
        { 
          error: 'Aucune colonne de solde trouvée. Format attendu: "Administratif 2024", "Exceptionnel 2025", etc.',
          debug: {
            availableTypes: typesConge.map(t => t.nom),
            typeCongeMap,
            allHeaders: foundColumns.map(c => c.original),
            potentialSoldeColumns: potentialSoldeColumns.map(c => c.header),
            searchedPatterns: ['Administratif YYYY', 'Exceptionnel YYYY', 'Administrative YYYY']
          }
        },
        { status: 400 }
      )
    }

    // Traiter les données
    const results = {
      success: [],
      errors: [],
      skipped: [],
    }

    // Récupérer tous les professeurs pour le matching
    let professeurs = await prisma.professeur.findMany({
      select: {
        id: true,
        nom: true,
        prenom: true,
        ppr: true,
      },
    })

    // Récupérer les options pour créer des professeurs (champs obligatoires + optionnels)
    const [grades, specialites, categories, titres] = await Promise.all([
      gradeIndex !== -1 ? prisma.grade.findMany() : Promise.resolve([]),
      prisma.specialite.findMany(),
      prisma.categoriePersonnel.findMany(),
      prisma.titre.findMany(),
    ])
    const defaultSpecialiteId = specialites.length > 0 ? specialites[0].id : null
    const defaultCategorieId = categories.length > 0 ? categories[0].id : null
    const defaultTitreId = titres.length > 0 ? titres[0].id : null

    // Fonction pour trouver un professeur par nom et prénom ou PPR
    const findProfesseur = (nom, prenom, pprValue) => {
      const nomNormalized = nom?.toString().trim().toLowerCase() || ''
      const prenomNormalized = prenom?.toString().trim().toLowerCase() || ''
      const pprNormalized = pprValue?.toString().trim() || ''
      
      // D'abord chercher par PPR si fourni
      if (pprNormalized) {
        const byPpr = professeurs.find((p) => p.ppr === pprNormalized)
        if (byPpr) return byPpr
      }
      
      // Sinon chercher par nom et prénom
      return professeurs.find((p) => {
        const pNom = p.nom?.toString().trim().toLowerCase() || ''
        const pPrenom = p.prenom?.toString().trim().toLowerCase() || ''
        return pNom === nomNormalized && pPrenom === prenomNormalized
      })
    }

    // Fonction pour créer un professeur
    const createProfesseur = async (nom, prenom, pprValue, gradeValue, specialiteValue) => {
      // Générer un PPR unique si non fourni
      let ppr = pprValue?.toString().trim() || ''
      if (!ppr) {
        // Générer un PPR basé sur nom et prénom + timestamp
        const timestamp = Date.now().toString().slice(-6)
        const initials = (nom?.charAt(0) || '') + (prenom?.charAt(0) || '')
        ppr = `${initials}${timestamp}`
        
        // Vérifier l'unicité
        let counter = 1
        while (professeurs.some(p => p.ppr === ppr)) {
          ppr = `${initials}${timestamp}${counter}`
          counter++
        }
      } else {
        // Vérifier que le PPR n'existe pas déjà
        if (professeurs.some(p => p.ppr === ppr)) {
          throw new Error(`Le PPR ${ppr} existe déjà`)
        }
      }

      // Essayer de trouver et connecter le grade si fourni
      let gradeId = null
      if (gradeValue && gradeIndex !== -1) {
        const gradeStr = gradeValue.toString().trim().toLowerCase()
        const grade = grades.find(g => g.nom.toLowerCase() === gradeStr)
        if (grade) {
          gradeId = grade.id
        }
      }

      // Essayer de trouver la spécialité si fournie, sinon utiliser la première par défaut
      let specialiteId = defaultSpecialiteId
      if (specialiteValue && specialiteIndex !== -1) {
        const specialiteStr = specialiteValue.toString().trim().toLowerCase()
        const specialite = specialites.find(s => s.nom.toLowerCase() === specialiteStr)
        if (specialite) {
          specialiteId = specialite.id
        }
      }

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
      }

      const newProfesseur = await prisma.professeur.create({ data })
      
      // Ajouter au cache local
      professeurs.push({
        id: newProfesseur.id,
        nom: newProfesseur.nom,
        prenom: newProfesseur.prenom,
        ppr: newProfesseur.ppr,
      })

      return newProfesseur
    }

    // Traiter chaque ligne (en commençant à l'index 1 pour sauter l'en-tête)
    for (let i = 1; i < cleanedData.length; i++) {
      const row = cleanedData[i]
      if (!row || row.length === 0) continue

      const nom = row[nomIndex]?.toString().trim()
      const prenom = row[prenomIndex]?.toString().trim()
      const pprValue = pprIndex !== -1 ? row[pprIndex]?.toString().trim() : null
      const gradeValue = gradeIndex !== -1 ? row[gradeIndex]?.toString().trim() : null
      const specialiteValue = specialiteIndex !== -1 ? row[specialiteIndex]?.toString().trim() : null

      if (!nom || !prenom) {
        results.skipped.push({
          row: i + 1,
          reason: 'Nom ou prénom manquant',
          nom,
          prenom,
        })
        continue
      }

      let professeur = findProfesseur(nom, prenom, pprValue)

      // Si le professeur n'existe pas, le créer automatiquement
      if (!professeur) {
        try {
          professeur = await createProfesseur(nom, prenom, pprValue, gradeValue, specialiteValue)
          results.success.push({
            row: i + 1,
            action: 'professeur_created',
            professeur: `${prenom} ${nom}`,
            ppr: professeur.ppr,
          })
        } catch (error) {
          results.errors.push({
            row: i + 1,
            reason: `Erreur lors de la création du professeur: ${error.message}`,
            nom,
            prenom,
          })
          continue
        }
      }

      // Traiter chaque colonne de solde
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

        if (jours === 0) {
          // Ignorer les soldes à zéro
          continue
        }

        try {
          // Calculer la date d'expiration : 1 an pour exceptionnel, 2 ans pour administratif
          const expireLe = getExpireLe(soldeCol.annee, soldeCol.type || 'administratif')

          // Vérifier si un solde existe déjà
          const existingSolde = await prisma.soldeConge.findUnique({
            where: {
              professeur_id_annee_type_conge_id: {
                professeur_id: professeur.id,
                annee: soldeCol.annee,
                type_conge_id: soldeCol.typeCongeId,
              },
            },
          })

          // Déterminer les jours totaux selon le type de congé
          // La valeur Excel représente les jours RESTANTS, pas les jours totaux
          let joursTotal = joursTotalParType[soldeCol.type] || 22 // Par défaut 22 si type non trouvé

          if (existingSolde) {
            // Mettre à jour le solde existant
            // Conserver les jours totaux existants, mettre à jour seulement les jours restants
            await prisma.soldeConge.update({
              where: { id: existingSolde.id },
              data: {
                jours_restants: jours, // Seulement les jours restants depuis l'Excel
                expire_le: expireLe,
                // Ne pas modifier jours_total, garder la valeur existante
              },
            })

            results.success.push({
              row: i + 1,
              action: 'updated',
              professeur: `${prenom} ${nom}`,
              solde: soldeCol.header,
              jours_restants: jours,
              jours_total: existingSolde.jours_total, // Afficher les jours totaux conservés
            })
          } else {
            // Créer un nouveau solde
            // Utiliser les jours totaux par défaut selon le type, et les jours restants depuis l'Excel
            await prisma.soldeConge.create({
              data: {
                professeur_id: professeur.id,
                annee: soldeCol.annee,
                jours_total: joursTotal, // Jours totaux selon le type de congé
                jours_restants: jours, // Jours restants depuis l'Excel
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
            reason: `Erreur lors de la création/mise à jour du solde: ${error.message}`,
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
      },
      details: results,
    })
  } catch (error) {
    console.error('Erreur lors de l\'import Excel:', error)
    return NextResponse.json(
      { error: `Erreur serveur: ${error.message}` },
      { status: 500 }
    )
  }
}

