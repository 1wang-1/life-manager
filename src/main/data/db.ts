import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

type StorageConfig = {
  dataDir?: string
}

function getStorageConfigPath(): string {
  return path.join(app.getPath('userData'), 'storage.json')
}

function readStorageConfig(): StorageConfig {
  try {
    const configPath = getStorageConfigPath()
    if (!fs.existsSync(configPath)) return {}
    const raw = fs.readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw) as StorageConfig
    if (!parsed || typeof parsed !== 'object') return {}
    if (typeof parsed.dataDir === 'string' && parsed.dataDir.trim()) {
      return { dataDir: parsed.dataDir }
    }
    return {}
  } catch {
    return {}
  }
}

export function getDataDir(): string {
  const config = readStorageConfig()
  return config.dataDir ?? app.getPath('userData')
}
