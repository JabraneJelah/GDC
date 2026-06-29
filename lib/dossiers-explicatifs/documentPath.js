import path from 'path'

export const ALLOWED_PREFIXES = [
  '/uploads/generated/',
  'uploads/generated/',
  '/uploads/proofs/',
  'uploads/proofs/',
  '/uploads/responses/',
  'uploads/responses/',
  '/uploads/templates/',
  'uploads/templates/',
  '/uploads/correspondances/',
  'uploads/correspondances/',
]

export function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  const types = {
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  }
  return types[ext] || 'application/octet-stream'
}

export function sanitizeFileName(fileName) {
  return path.basename(fileName || 'document').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
}

export function resolveDocumentFilePath(storedPath) {
  const normalizedStoredPath = storedPath.trim().replace(/\\/g, '/')

  if (!normalizedStoredPath) {
    throw new Error('missing_path')
  }

  if (normalizedStoredPath.startsWith('pending://')) {
    throw new Error('pending_file')
  }

  if (!ALLOWED_PREFIXES.some((prefix) => normalizedStoredPath.startsWith(prefix))) {
    throw new Error('invalid_path')
  }

  const relativePath = normalizedStoredPath.replace(/^\/+/, '')
  const publicDir = path.resolve(process.cwd(), 'public')
  const filePath = path.resolve(publicDir, relativePath)
  const relativeToPublic = path.relative(publicDir, filePath)

  if (relativeToPublic.startsWith('..') || path.isAbsolute(relativeToPublic)) {
    throw new Error('invalid_path')
  }

  return filePath
}
