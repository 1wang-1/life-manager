import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'

export default defineConfig(() => {
  const root = path.resolve(__dirname, 'src/renderer')

  return {
    root,
    publicDir: path.resolve(__dirname, 'public'),
    plugins: [
      react(),
      electron({
        main: {
          entry: path.join(__dirname, 'electron/main.ts'),
          vite: {
            build: {
              outDir: path.resolve(__dirname, 'dist-electron'),
              emptyOutDir: false
            }
          }
        },
        preload: {
          input: path.join(__dirname, 'electron/preload.ts'),
          vite: {
            build: {
              outDir: path.resolve(__dirname, 'dist-electron'),
              emptyOutDir: false,
              rollupOptions: {
                output: {
                  format: 'cjs',
                  entryFileNames: '[name].cjs'
                }
              }
            }
          }
        },
        // Renderer integration is not needed as we use contextBridge and don't import Node modules in renderer
        renderer: undefined
      })
    ],
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-icons': ['lucide-react']
          }
        }
      }
    }
  }
})
