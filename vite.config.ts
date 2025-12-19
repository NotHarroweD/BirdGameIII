import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

declare const process: any;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/BirdGameIII/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': process.cwd(),
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    },
    build: {
      outDir: 'doc',
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
  }
})