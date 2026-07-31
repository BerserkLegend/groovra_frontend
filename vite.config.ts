import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png'],
      manifest: {
        name: 'Groovra — Музичний стримінг з AI',
        short_name: 'Groovra',
        description: 'Слухайте музику, відкривайте тренди та насолоджуйтесь AI-підібраними мікшами.',
        theme_color: '#121414',
        background_color: '#121414',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'favicon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: 'favicon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5178,
    proxy: {
      '/music': {
        target: 'http://localhost:5274',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          if (req.headers.accept?.includes('html')) return '/index.html'
        },
      },
      '/auth': {
        target: 'http://localhost:5274',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          if (req.headers.accept?.includes('html')) return '/index.html'
        },
      },
      '/profile': {
        target: 'http://localhost:5274',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          if (req.headers.accept?.includes('html')) return '/index.html'
        },
      },
      '/media': {
        target: 'http://localhost:5274',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          if (req.headers.accept?.includes('html')) return '/index.html'
        },
      },
      '/api': {
        target: 'http://localhost:5274',
        changeOrigin: true,
        secure: false,
        bypass(req) {
          if (req.headers.accept?.includes('html')) return '/index.html'
        },
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor'
            }
            if (id.includes('react-router-dom') || id.includes('react-router')) {
              return 'router'
            }
            if (id.includes('lucide-react')) {
              return 'icons-vendor'
            }
            if (id.includes('framer-motion') || id.includes('motion')) {
              return 'motion-vendor'
            }
            if (id.includes('@reduxjs') || id.includes('react-redux')) {
              return 'redux-vendor'
            }
            if (id.includes('@microsoft/signalr')) {
              return 'signalr-vendor'
            }
            if (id.includes('@react-oauth')) {
              return 'google-oauth'
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'i18n'
            }
          }
        },
      },
    },
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@react-oauth/google'],
  },
})
