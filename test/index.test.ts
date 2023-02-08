import fs from 'node:fs'
import path from 'node:path'
import { createServer, resolveConfig } from 'vite'
import {
  describe,
  expect,
  it,
} from 'vitest'
import fetch from 'node-fetch'
import target from '../src'

function getFixturesFile(filename: string) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', filename), 'utf8')
}

describe('src/index.ts', async () => {
  it('electron-renderer:config', async () => {
    const config = await resolveConfig({
      configFile: false,
      plugins: [
        target({
          'electron-renderer': {},
        }),
      ],
    }, 'build')

    expect(config.base).eq('./') // serve always starts with `/`
    expect(config.build.assetsDir).eq('')
    expect(config.build.cssCodeSplit).false
  })

  it('electron-renderer:nodeIntegration', async () => {
    const server = await createServer({
      configFile: false,
      plugins: [
        target({
          'electron-renderer': {
            nodeIntegration: true,
          },
        }),
      ],
    })
    await server.listen()
    server.printUrls()

    const electronModule = await (await fetch('http://localhost:5173/@id/__x00__electron')).text()
    const fsModule = await (await fetch('http://localhost:5173/@id/__x00__fs')).text()

    expect(electronModule).eq(getFixturesFile('renderer/electron.js'))
    expect(fsModule).eq(getFixturesFile('renderer/fs.js'))

    server.close()
  })

  // TODO: Refine use cases
})
