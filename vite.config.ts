import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Declare process as any to avoid TS errors in the build script
declare const process: any;

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': process.cwd(),
      },
    },
    define: {
      // This shim allows your existing code (process.env.API_KEY) to read the key
      // from a .env file or Vercel environment variables.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})
