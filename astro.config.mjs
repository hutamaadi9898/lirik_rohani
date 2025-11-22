// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://lirikrohani.com',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      // Persist local D1/KV state so dev env matches prod bindings structure.
      persist: {
        path: './.wrangler/state/v3',
      },
    },
    imageService: 'cloudflare',
    // Use existing KV binding for Astro sessions so the Worker doesn't require
    // an extra `SESSION` namespace. Without this, Cloudflare will crash the
    // runtime with “Invalid binding `SESSION`”, which breaks /api/stats and
    // /api/search in production.
    sessionKVBindingName: 'LYRICS_CACHE',
  }),
  integrations: [
    react({
      include: ['**/components/**/*.{tsx,jsx}'],
    }),
    tailwind({
      applyBaseStyles: true,
    }),
  ],
});
