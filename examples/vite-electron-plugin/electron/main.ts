process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

import path from 'node:path'
import { app, BrowserWindow } from 'electron'

let win: BrowserWindow | null = null

app.whenReady().then(() => {
  win = new BrowserWindow({
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
})
