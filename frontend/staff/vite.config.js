import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared':      path.resolve(__dirname, '../shared'),
      'react':        path.resolve(__dirname, 'node_modules/react'),
      'react-dom':    path.resolve(__dirname, 'node_modules/react-dom'),
      'lucide-react': path.resolve(__dirname, 'node_modules/lucide-react'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5176,
  },
})
