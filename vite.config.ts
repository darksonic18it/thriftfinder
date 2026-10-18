import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(
      // React Compiler only for production builds (slow to run in dev).
      command === 'build'
        ? { babel: { plugins: [['babel-plugin-react-compiler', {}]] } }
        : undefined,
    ),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    // Pre-bundle the heavy packages up front instead of mid-load.
    include: [
      '@hugeicons/react',
      '@hugeicons/core-free-icons',
      'lucide-react',
      'gsap',
      'ogl',
      '@supabase/supabase-js',
    ],
  },
  server: {
    // Pre-transform the files every first load needs.
    warmup: {
      clientFiles: [
        './src/main.tsx',
        './src/App.tsx',
        './src/pages/*.tsx',
        './src/components/*.tsx',
      ],
    },
    // Don't watch the data-prep folder or build output.
    watch: {
      ignored: ['**/items-near-me-prep/**', '**/dist/**'],
    },
  },
}))