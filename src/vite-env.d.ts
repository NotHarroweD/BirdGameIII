/// <reference types="vite/client" />

// Explicitly declare global process variable for client-side usage (shimmed by Vite)
// Using var allows merging with existing definitions without block-scope conflicts
declare var process: {
  env: {
    API_KEY: string;
    [key: string]: string | undefined;
  }
};