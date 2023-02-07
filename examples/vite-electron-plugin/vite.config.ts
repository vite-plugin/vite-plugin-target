import { defineConfig } from 'vite'
import target from 'vite-plugin-target'
import electron from 'vite-electron-plugin'

export default defineConfig({
  plugins: [
    target({
      'electron-renderer': {
        nodeIntegration: true,
      },
    }),
    electron({
      include: ['electron'],
    }),
  ],
  build: {
    minify: false,
  },
})
