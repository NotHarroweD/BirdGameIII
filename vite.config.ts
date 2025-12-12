import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    define: {
      // This shim allows your existing code (process.env.API_KEY) to read the key
      // from a .env file or Vercel environment variables.
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  }
})