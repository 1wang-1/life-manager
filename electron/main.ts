import { app, BrowserWindow, Menu, ipcMain, shell, dialog } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { registerTimerIpc } from '../src/main/ipc/timer-ipc'
import { getDataDir } from '../src/main/data/db'

const isDev = !app.isPackaged
const __dirname = path.dirname(fileURLToPath(import.meta.url))

let mainWindow: BrowserWindow | null = null

// Disable GPU Acceleration and force software rendering
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('use-gl', 'swiftshader')
app.commandLine.appendSwitch('use-angle', 'swiftshader')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')
app.commandLine.appendSwitch('no-sandbox')

// Fix for "Unable to move the cache: Access Denied"
// We point userData to a new directory to bypass locked/corrupted cache files
const userDataPath = app.getPath('userData')
app.setPath('userData', path.join(userDataPath, 'clean-cache'))

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
      webSecurity: true, // Enabled for security
      allowRunningInsecureContent: false,
      backgroundThrottling: false // Prevent timer throttling when minimized
    }
  })

  // 1. Bypass CSP and CORS restrictions
  const permissiveCsp = "default-src * data: blob: 'unsafe-inline' 'unsafe-eval'";
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [permissiveCsp],
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['*'],
        'Access-Control-Allow-Headers': ['*']
      }
    })
  })

  // 2. Mock request headers to bypass source checks (GitHub/Music APIs)
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['http://*/*', 'https://*/*'] },
    (details, callback) => {
      const { url, requestHeaders } = details
      // If remote request, remove origin/referer to avoid 403 Forbidden
      if (url.startsWith('http') && !url.includes('localhost')) {
        delete requestHeaders['Origin']
        delete requestHeaders['Referer']
        // Some music APIs require specific User-Agent, but generic one usually works better than Electron's default
        requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
      callback({ requestHeaders })
    }
  )

  let miniWindow: BrowserWindow | null = null
  let petWindow: BrowserWindow | null = null
  type TimerStatePayload = {
    status?: 'idle' | 'running' | 'paused' | string
  }
  let lastTimerState: TimerStatePayload | null = null
  let miniWindowBounds: { width: number; height: number; x?: number; y?: number } | null = null

  const createPetWindow = () => {
    if (petWindow) {
      petWindow.show()
      return
    }

    petWindow = new BrowserWindow({
      width: 150,
      height: 150,
      resizable: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        sandbox: false,
        backgroundThrottling: false
      }
    })

    petWindow.setAlwaysOnTop(true, 'screen-saver')
    petWindow.setVisibleOnAllWorkspaces(true)

    petWindow.on('closed', () => {
      petWindow = null
    })

    petWindow.webContents.on('did-finish-load', () => {
      if (lastTimerState) {
        petWindow?.webContents.send('timer:state', lastTimerState)
      }
    })

    if (isDev && process.env['VITE_DEV_SERVER_URL']) {
      petWindow.loadURL(process.env['VITE_DEV_SERVER_URL'] + '#/pet')
    } else {
      petWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/pet' })
    }
  }

  const createMiniWindow = () => {
    if (miniWindow) {
      miniWindow.show()
      return
    }

    const width = miniWindowBounds?.width || 180
    const height = miniWindowBounds?.height || 220
    const x = miniWindowBounds?.x
    const y = miniWindowBounds?.y

    miniWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      minWidth: 150,
      minHeight: 180,
      resizable: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000', // Ensure transparent background
      hasShadow: false, // Let CSS handle shadow
      skipTaskbar: true,
      alwaysOnTop: true,
      maximizable: false, // Prevent double-click maximize
      fullscreenable: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        sandbox: false,
        backgroundThrottling: false
      }
    })

    miniWindow.setAlwaysOnTop(true, 'screen-saver')
    miniWindow.setVisibleOnAllWorkspaces(true)

    miniWindow.on('close', () => {
      if (miniWindow) {
        miniWindowBounds = miniWindow.getBounds()
      }
    })

    miniWindow.on('closed', () => {
      miniWindow = null
    })

    miniWindow.webContents.on('did-finish-load', () => {
      if (lastTimerState) {
        miniWindow?.webContents.send('timer:state', lastTimerState)
      }
    })

    if (isDev && process.env['VITE_DEV_SERVER_URL']) {
      miniWindow.loadURL(process.env['VITE_DEV_SERVER_URL'] + '#/mini')
    } else {
      miniWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '/mini' })
    }
  }

  // Open DevTools for debugging
  mainWindow.webContents.openDevTools()

  // Show menu bar for debugging
  mainWindow.setMenuBarVisibility(true)

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    console.log('Loading URL:', process.env['VITE_DEV_SERVER_URL'])
    mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL'])
  } else {
    console.log('Loading File:', path.join(__dirname, '../dist/index.html'))
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('minimize', () => {
    if (!lastTimerState) return
    if (lastTimerState.status === 'running' || lastTimerState.status === 'paused') {
      createMiniWindow()
    }
  })

  const closeMini = () => {
    if (miniWindow) {
      miniWindow.close()
      miniWindow = null
    }
  }

  mainWindow.on('restore', closeMini)
  mainWindow.on('show', closeMini)
  mainWindow.on('focus', closeMini)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  ipcMain.on('timer:state', (_event, state: TimerStatePayload) => {
    lastTimerState = state
    if (miniWindow) {
      miniWindow.webContents.send('timer:state', state)
    }
    if (petWindow) {
      petWindow.webContents.send('timer:state', state)
    }
    if (state?.status === 'idle') {
      closeMini()
    }
  })

  ipcMain.on('timer:command', (event, command: { type: 'toggle' | 'stop' | 'showMain' | 'togglePet' | 'clearSummary' | 'extendBreak'; show?: boolean; minutes?: number; fromMini?: boolean }) => {
    if (command.type === 'togglePet') {
      if (command.show) {
        createPetWindow()
      } else {
        if (petWindow) {
          petWindow.close()
          petWindow = null
        }
      }
      return
    }

    if (command.type === 'showMain') {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
      closeMini()
      return
    }

    // Identify if the command came from the Mini Window
    const isFromMini = miniWindow && event.sender.id === miniWindow.webContents.id
    
    // Inject source info
    const commandWithSource = { ...command, fromMini: !!isFromMini }

    if (mainWindow) {
      mainWindow.webContents.send('timer:command', commandWithSource)
    }
  })
}

ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false
  if (!mainWindow.isMaximized()) {
    mainWindow.maximize()
    return true
  }
  return false
})

ipcMain.handle('window:restore', () => {
  if (!mainWindow) return false
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false)
    return true
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
    return true
  }
  return false
})

ipcMain.handle('window:flash', (_event, flag: boolean) => {
  if (mainWindow) {
    mainWindow.flashFrame(flag)
    return true
  }
  return false
})

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  ipcMain.handle('log:append', async (_event, message: string) => {
    try {
      if (typeof message !== 'string') return false
      const logFilePath = path.join(getDataDir(), 'logs', 'lx-debug.txt')
      await fs.mkdir(path.dirname(logFilePath), { recursive: true })
      await fs.appendFile(logFilePath, message + '\n', 'utf8')
      return true
    } catch (error) {
      console.error('[log:append] failed', error)
      return false
    }
  })
  ipcMain.handle('app:openExternal', async (_event, url: string) => {
    if (typeof url !== 'string') return false
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return false
    }
    if (parsed.protocol !== 'lxmusic:') return false
    return shell.openExternal(url)
  })
  ipcMain.handle('app:getUserDataPath', () => {
    return app.getPath('userData')
  })

  ipcMain.handle('app:getDataDir', () => {
    return getDataDir()
  })

  ipcMain.handle('app:pickDataDir', async () => {
    const currentDir = getDataDir()

    const result = await dialog.showOpenDialog({
      title: '选择数据存储位置',
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const nextDir = result.filePaths[0]
    if (!nextDir || nextDir === currentDir) {
      return currentDir
    }

    await fs.mkdir(nextDir, { recursive: true })

    // closeDb() - removed as we are not using sqlite

    const dbFiles = ['life-manager.db', 'life-manager.db-wal', 'life-manager.db-shm']
    for (const filename of dbFiles) {
      const src = path.join(currentDir, filename)
      const dest = path.join(nextDir, filename)
      try {
        await fs.copyFile(src, dest)
      } catch (e) {
        void e
      }
    }

    const srcLogs = path.join(currentDir, 'logs')
    const destLogs = path.join(nextDir, 'logs')
    try {
      await fs.cp(srcLogs, destLogs, { recursive: true, force: true })
    } catch (e) {
      void e
    }

    const configPath = path.join(app.getPath('userData'), 'storage.json')
    await fs.writeFile(configPath, JSON.stringify({ dataDir: nextDir }, null, 2), 'utf8')

    return nextDir
  })

  ipcMain.handle('design:openFile', async (_event, relPath: string) => {
    try {
      const root = path.resolve(__dirname, '..')
      const abs = path.join(root, relPath)
      await fs.access(abs)
      await shell.openPath(abs)
      return true
    } catch (e) {
      console.error('[design:openFile] failed', e)
      return false
    }
  })

  ipcMain.handle('design:readDesign', async () => {
    try {
      const root = path.resolve(__dirname, '..')
      const designPath = path.join(root, 'pencil.design.json')
      return await fs.readFile(designPath, 'utf8')
    } catch (e) {
      console.error('[design:readDesign] failed', e)
      return null
    }
  })

  ipcMain.handle('design:syncTokensFromCss', async () => {
    try {
      const root = path.resolve(__dirname, '..')
      const designPath = path.join(root, 'pencil.design.json')
      const cssPath = path.join(root, 'src', 'renderer', 'src', 'styles', 'tokens.css')
      const designText = await fs.readFile(designPath, 'utf8')
      const cssText = await fs.readFile(cssPath, 'utf8')

      const parseCssVariables = (text: string) => {
        const vars = new Map<string, string>()
        const re = /--([a-zA-Z0-9-_]+)\s*:\s*([^;]+);/g
        let m: RegExpExecArray | null
        while ((m = re.exec(text)) !== null) {
          vars.set(m[1].trim(), m[2].trim())
        }
        return vars
      }
      const toCamelCase = (s: string) => s.replace(/[-_]+([a-zA-Z0-9])/g, (_,_c) => String(_c).toUpperCase())
      const parsePxNumber = (v: string) => {
        const m = /^(-?\d+(?:\.\d+)?)px$/i.exec(String(v).trim())
        return m ? Number(m[1]) : null
      }
      const parseNumberish = (v: string) => {
        const n = Number(String(v).trim())
        return Number.isFinite(n) ? n : null
      }

      const design = JSON.parse(designText)
      const cssVars = parseCssVariables(cssText)
      const structuredCloneFn = (globalThis as typeof globalThis & {
        structuredClone?: <T>(value: T) => T
      }).structuredClone
      const next = typeof structuredCloneFn === 'function' ? structuredCloneFn(design) : JSON.parse(JSON.stringify(design))
      next.tokens ??= {}
      next.tokens.color ??= {}
      next.tokens.typography ??= {}
      next.tokens.spacing ??= {}
      next.tokens.radii ??= {}
      next.tokens.shadows ??= {}

      for (const [name, value] of cssVars.entries()) {
        if (name.startsWith('color-')) {
          const key = toCamelCase(name.slice('color-'.length))
          next.tokens.color[key] = value
          continue
        }
        if (name.startsWith('font-')) {
          const rest = name.slice('font-'.length)
          const parts = rest.split('-')
          if (parts.length >= 2) {
            const groupKey = toCamelCase(parts[0])
            const prop = parts.slice(1).join('-')
            next.tokens.typography[groupKey] ??= {}
            if (prop === 'size') {
              const n = parsePxNumber(value) ?? parseNumberish(value)
              if (n !== null) next.tokens.typography[groupKey].size = n
            } else if (prop === 'height' || prop === 'line' || prop === 'line-height') {
              const n = parsePxNumber(value) ?? parseNumberish(value)
              if (n !== null) next.tokens.typography[groupKey].line = n
            } else if (prop === 'weight') {
              const n = parseNumberish(value)
              if (n !== null) next.tokens.typography[groupKey].weight = n
            }
          }
          continue
        }
        if (name.startsWith('space-')) {
          const idx = name.slice('space-'.length)
          const n = parsePxNumber(value)
          if (n !== null) {
            next.tokens.spacing.scale ??= []
            next.tokens.spacing.scale.push({ idx, px: n })
          }
          continue
        }
        if (name.startsWith('radius-')) {
          const key = toCamelCase(name.slice('radius-'.length))
          const n = parsePxNumber(value) ?? parseNumberish(value)
          if (n !== null) next.tokens.radii[key] = n
          continue
        }
        if (name.startsWith('shadow-')) {
          const key = toCamelCase(name.slice('shadow-'.length))
          next.tokens.shadows[key] = value
          continue
        }
      }
      type SpacingEntry = { idx: string; px: number }
      const isSpacingEntry = (v: unknown): v is SpacingEntry => {
        if (!v || typeof v !== 'object') return false
        const rec = v as Record<string, unknown>
        return typeof rec.idx === 'string' && typeof rec.px === 'number' && Number.isFinite(rec.px)
      }

      if (Array.isArray(next.tokens.spacing.scale) && next.tokens.spacing.scale.length > 0) {
        const byIdx = new Map<string, number>()
        for (const entry of next.tokens.spacing.scale as unknown[]) {
          if (isSpacingEntry(entry)) byIdx.set(entry.idx, entry.px)
        }
        const ordered = Array.from(byIdx.entries()).sort(([a],[b]) => Number(a) - Number(b)).map(([,px]) => px)
        next.tokens.spacing.scale = ordered
        if (!('unit' in next.tokens.spacing) && ordered.length > 0) next.tokens.spacing.unit = ordered[0]
      }

      await fs.writeFile(designPath, JSON.stringify(next, null, 2) + '\n', 'utf8')
      return true
    } catch (e) {
      console.error('[design:syncTokensFromCss] failed', e)
      return false
    }
  })

  ipcMain.handle('design:writeDesign', async (_event, jsonText: string) => {
    try {
      const root = path.resolve(__dirname, '..')
      const designPath = path.join(root, 'pencil.design.json')
      const parsed = JSON.parse(String(jsonText))
      const pretty = JSON.stringify(parsed, null, 2) + '\n'
      await fs.writeFile(designPath, pretty, 'utf8')
      return true
    } catch (e) {
      console.error('[design:writeDesign] failed', e)
      return false
    }
  })
  // registerTaskIpc() - removed
  registerTimerIpc()
  createWindow()
  console.log('[LX] Log file:', path.join(getDataDir(), 'logs', 'lx-debug.txt'))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
