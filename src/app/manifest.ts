import type { MetadataRoute } from 'next'

/**
 * PWA Manifest - Native Next.js implementation
 * 
 * This file generates the web app manifest at /manifest.webmanifest
 * No external packages required - built into Next.js App Router
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Three Chicks Admin',
    short_name: 'TC Admin',
    description: 'Admin dashboard for Three Chicks & A Wick candle business',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#d4a574', // Your warm gold/amber brand color
    orientation: 'portrait-primary',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/icons/screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'Dashboard view',
      },
      {
        src: '/icons/screenshot-narrow.png',
        sizes: '750x1334',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Mobile dashboard',
      },
    ],
  }
}
