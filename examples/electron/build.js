const fs = require('node:fs');
const path = require('node:path');
const { build, createServer } = require('vite');

const isDev = process.argv.includes('--dev');

fs.rmSync(path.join(__dirname, 'dist'), { recursive: true, force: true });

; (async () => {
  if (isDev) {
    serve();
  } else {
    await build({ configFile: 'renderer/vite.config.ts' });
    await build({ configFile: 'preload/vite.config.ts' });
    await build({ configFile: 'main/vite.config.ts' });
  }
})();

async function serve() {
  // Renderer
  const server = await createServer({ configFile: 'renderer/vite.config.ts' });
  server.httpServer?.once('listening', () => {
    const address = server.httpServer.address();
    process.env.VITE_DEV_SERVER_URL = `http://${address.address}:${address.port}`;
  });
  await server.listen();
  server.printUrls();

  // Preload
  await build({
    configFile: 'preload/vite.config.ts',
    build: {
      watch: {},
    },
    plugins: [isDev && {
      closeBundle() {
        server.ws.send({ type: 'full-reload' });
      },
    }],
  });

  // Main
  await build({
    configFile: 'main/vite.config.ts',
    build: {
      watch: {},
    },
    plugins: [isDev && electronStart()],
  });
}

/** @type {() => import('vite').Plugin} */
function electronStart() {
  /** @type {import('vite').ResolvedConfig} */
  let config

  return {
    name: 'vite-plugin-electron-start',
    configResolved(_config) {
      config = _config
    },
    closeBundle() {
      if (config.build.watch) {
        startup()
      }
    },
  }
}

async function startup(argv = ['.', '--no-sandbox']) {
  const { spawn } = await import('node:child_process')
  const electron = await import('electron')
  const electronPath = (electron.default ?? electron)

  startup.exit()
  // Start Electron.app
  process.electronApp = spawn(electronPath, argv, { stdio: 'inherit' })
  // Exit command after Electron.app exits
  process.electronApp.once('exit', process.exit)

  if (!startup.hookProcessExit) {
    startup.hookProcessExit = true
    process.once('exit', startup.exit)
  }
}
startup.hookProcessExit = false
startup.exit = () => {
  if (process.electronApp) {
    process.electronApp.removeAllListeners()
    process.electronApp.kill()
  }
}
