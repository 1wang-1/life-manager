// @ts-expect-error better-sqlite3 type resolution differs across bundlers
import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'

let db: Database.Database | null = null

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

export function closeDb(): void {
  if (!db) return
  try {
    db.close()
  } finally {
    db = null
  }
}

export function createSchemaSql(): string {
  return `
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      category_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `
}

export function getDb(): Database.Database {
  if (db) return db

  const dataDir = getDataDir()
  const dbPath = path.join(dataDir, 'life-manager.db')
  const dbDir = path.dirname(dbPath)

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  console.log('Opening database at:', dbPath)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  
  // Initialize schema
  db.exec(createSchemaSql())

  return db
}
