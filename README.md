# vite-plugin-target

Make Vite support Electron, Node.js, etc.

[![NPM version](https://img.shields.io/npm/v/vite-plugin-target.svg)](https://npmjs.com/package/vite-plugin-target)
[![NPM Downloads](https://img.shields.io/npm/dm/vite-plugin-target.svg)](https://npmjs.com/package/vite-plugin-target)

## Install

```sh
npm i -D vite-plugin-target
```

## Examples

- [electron](https://github.com/vite-plugin/vite-plugin-target/tree/main/examples/electron) - with [Vite](https://vitejs.dev/).
- [electron-forge](https://github.com/vite-plugin/vite-plugin-target/tree/main/examples/electron-forge) - with Electron's official [forge](https://www.electronforge.io/) scaffold.
- [vite-electron-plugin](https://github.com/vite-plugin/vite-plugin-target/tree/main/examples/vite-electron-plugin) - with [vite-electron-plugin](https://github.com/electron-vite/vite-electron-plugin).

## Usage

```js
import target from 'vite-plugin-target'

// Electron Renderer
export default {
  plugins: [
    target({
      'electron-renderer': {},
    }),
  ],
}

// Electron Preload
export default {
  plugins: [
    target({
      'electron-preload': {},
    }),
  ],
}

// Electron Main
export default {
  plugins: [
    target({
      'electron-main': {},
    }),
  ],
}

// Node.js
export default {
  plugins: [
    target({
      node: {},
    }),
  ],
}
```

## API <sub><sup>(Define)</sup></sub>

`target(options: Options)`

```ts
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
```


## How to work?

- For `node` `electron-main` `electron-preload`, the plugin only changes a few preset configurations.

- `electron-renderer` with `nodeIntegration`.

  ```
  ┏————————————————————————————————————————┓                    ┏—————————————————┓
  │ import { ipcRenderer } from 'electron' │                    │ Vite dev server │
  ┗————————————————————————————————————————┛                    ┗—————————————————┛
                     │                                                   │
                     │ 1. HTTP(Request): electron module                 │
                     │ ————————————————————————————————————————————————> │
                     │                                                   │
                     │                                                   │
                     │ 2. Intercept in load-hook(Plugin)                 │
                     │ 3. Generate a virtual ESM module(electron)        │
                     │    ↓                                              │
                     │    const { ipcRenderer } = require('electron')    │
                     │    export { ipcRenderer }                         │
                     │                                                   │
                     │                                                   │
                     │ 4. HTTP(Response): electron module                │
                     │ <———————————————————————————————————————————————— │
                     │                                                   │
  ┏————————————————————————————————————————┓                    ┏—————————————————┓
  │ import { ipcRenderer } from 'electron' │                    │ Vite dev server │
  ┗————————————————————————————————————————┛                    ┗—————————————————┛
  ```
