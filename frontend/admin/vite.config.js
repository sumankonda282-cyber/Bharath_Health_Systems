import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'android-192x192.png'],
      manifest: {
        name: 'BH Admin',
        short_name: 'BH Admin',
        description: 'Platform administration portal',
        theme_color: '#0F2557',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/android-48x48.png',   sizes: '48x48',   type: 'image/png' },
          { src: '/android-72x72.png',   sizes: '72x72',   type: 'image/png' },
          { src: '/android-96x96.png',   sizes: '96x96',   type: 'image/png' },
          { src: '/android-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/android-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-192x192.png',sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/maskable-512x512.png',sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/apple-touch-icon.png',sizes: '180x180', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
  },
})
