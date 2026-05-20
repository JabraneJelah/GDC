import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'app-settings.json')

export const APP_SETTINGS_DEFAULTS = {
  block_holiday_selection: false,
  block_weekend_selection: false,
}

export function getAppSettings() {
  try {
    if (!existsSync(SETTINGS_PATH)) return { ...APP_SETTINGS_DEFAULTS }
    return { ...APP_SETTINGS_DEFAULTS, ...JSON.parse(readFileSync(SETTINGS_PATH, 'utf8')) }
  } catch {
    return { ...APP_SETTINGS_DEFAULTS }
  }
}

export function saveAppSettings(updates) {
  const next = { ...getAppSettings(), ...updates }
  const dir = path.dirname(SETTINGS_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf8')
  return next
}
