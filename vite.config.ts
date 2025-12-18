import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Declare process to bypass type checking in absence of @types/node
declare const process: any;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': process.cwd(),
      },
    },
    define: {
      // Expose API_KEY to client side as process.env.API_KEY
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY)
    },
    build: {
      rollupOptions: {
        input: {
          main: 'index.html',
        },
      },
    },
  }
})