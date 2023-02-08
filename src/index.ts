import { builtinModules } from 'node:module'
import type { Plugin, PluginOption, UserConfig } from 'vite'
import libEsm from 'lib-esm'

const builtins = builtinModules.filter(m => !m.startsWith('_')); builtins.push(...builtins.map(m => `node:${m}`))
const electronBuiltins = ['electron', ...builtins]

function withExternalBuiltins(config: UserConfig, externals: string[]) {
  config.build ??= {}
  config.build.rollupOptions ??= {}

  let external = config.build.rollupOptions.external
  if (
    Array.isArray(external) ||
    typeof external === 'string' ||
    external instanceof RegExp
  ) {
    external = externals.concat(external as string[])
  } else if (typeof external === 'function') {
    const original = external
    external = function (source, importer, isResolved) {
      if (externals.includes(source)) {
        return true
      }
      return original(source, importer, isResolved)
    }
  } else {
    external = externals
  }
  config.build.rollupOptions.external = external

  return config
}

function excludeOptimizeDeps(config: UserConfig, exclude: string[]) {
  config.optimizeDeps ??= {}
  config.optimizeDeps.exclude ??= []
  config.optimizeDeps.exclude.push(...exclude)
}

// At present, Electron can only support CommonJs
function setOutputFormatToCjs(config: UserConfig) {
  config.build ??= {}
  config.build.rollupOptions ??= {}
  config.build.rollupOptions.output ??= {}

  if (Array.isArray(config.build.rollupOptions.output)) {
    for (const o of config.build.rollupOptions.output) {
      o.format ??= 'cjs'
    }
  } else {
    config.build.rollupOptions.output.format ??= 'cjs'
  }
}

function loadRendererNativeModule(modules = electronBuiltins): Plugin {
  const electron = `
/**
 * All exports module see https://www.electronjs.org -> API -> Renderer Process Modules
 */
const electron = require("electron");

// Proxy in Worker
let _ipcRenderer;
if (typeof document === 'undefined') {
  _ipcRenderer = {};
  const keys = [
    'invoke',
    'postMessage',
    'send',
    'sendSync',
    'sendTo',
    'sendToHost',
    // propertype
    'addListener',
    'emit',
    'eventNames',
    'getMaxListeners',
    'listenerCount',
    'listeners',
    'off',
    'on',
    'once',
    'prependListener',
    'prependOnceListener',
    'rawListeners',
    'removeAllListeners',
    'removeListener',
    'setMaxListeners',
  ];
  for (const key of keys) {
    _ipcRenderer[key] = () => {
      throw new Error(
        'ipcRenderer doesn\\'t work in a Web Worker.\\n' +
        'You can see https://github.com/electron-vite/vite-plugin-electron/issues/69'
      );
    };
  }
} else {
  _ipcRenderer = electron.ipcRenderer;
}

export { electron as default };
export const clipboard = electron.clipboard;
export const contextBridge = electron.contextBridge;
export const crashReporter = electron.crashReporter;
export const ipcRenderer = _ipcRenderer;
export const nativeImage = electron.nativeImage;
export const shell = electron.shell;
export const webFrame = electron.webFrame;
export const deprecate = electron.deprecate;
`.trim()
  const PREFIX = '\0'

  return {
    name: 'vite-plugin-target:electron-renderer-native-module',
    // Bypassing Vite's builtin 'vite:resolve' plugin
    enforce: 'pre',
    resolveId(source) {
      if (modules.includes(source)) {
        return PREFIX + source
      }
    },
    async load(id) {
      id = id.replace(PREFIX, '')
      if (id === 'electron') {
        return electron
      }
      if (modules.includes(id)) {
        const { exports } = libEsm({ exports: Object.keys(await import(id)) })
        return `const _M_ = require("${id}");\n${exports}`
      }
    },
  }
}

// ----------------------------------------------------------------------

export interface NodeOptions {
  /**
   * Pass to `config.esbuild.target`
   */
  version?: string
}

export interface ElectronOptions extends NodeOptions {
  nodeIntegration?: boolean
}

export type Options =
  | { node: NodeOptions }
  | { 'electron-main': NodeOptions }
  | { 'electron-preload': ElectronOptions }
  | { 'electron-renderer': ElectronOptions }

export default function target(options: Options): PluginOption {
  const [target, targetOptions = {}] = Object.entries(options ?? {})[0]
  const electronOptions = targetOptions as ElectronOptions

  return [
    {
      name: 'vite-plugin-target',
      config(config) {
        if (target === 'electron') {
          setOutputFormatToCjs(config)
        } if (target === 'electron-preload') {
          if (electronOptions.nodeIntegration) {
            setOutputFormatToCjs(config)
          }
        } else if (target === 'electron-renderer') {
          // Make sure that Electron can be loaded into the local file using `loadFile` after packaging.
          config.base ??= './'
          config.build ??= {}
          config.build.assetsDir ??= ''
          config.build.cssCodeSplit ??= false

          if (electronOptions.nodeIntegration) {
            setOutputFormatToCjs(config)
          }
        }

        if (targetOptions.version) {
          config.esbuild ??= {}
          config.esbuild.target ??= targetOptions.version // Use `import()` with node<=13
        }

        // Pre-Bundling avoid native modules.
        if (target === 'node') {
          excludeOptimizeDeps(config, builtins)
          withExternalBuiltins(config, builtins)
        } else if (target.startsWith('electron-')) {
          excludeOptimizeDeps(config, electronBuiltins)
          withExternalBuiltins(config, electronBuiltins)
        }
      },
    },
    electronOptions.nodeIntegration && loadRendererNativeModule(),
  ]
}
