import { defineConfig } from 'vite';
import { seoFiles } from './build/seo-files.js';

/**
 * Адрес сайта нужен для canonical, Open Graph, sitemap.xml и robots.txt.
 * 1. SITE_URL — задайте вручную, если у проекта свой домен.
 * 2. VERCEL_PROJECT_PRODUCTION_URL — Vercel подставляет сам при сборке.
 * 3. Иначе локальный адрес, чтобы сборка работала и без настроек.
 */
const siteUrl = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  'http://localhost:4173'
).replace(/\/+$/, '');

export default defineConfig({
  plugins: [seoFiles({ siteUrl })],
  build: {
    target: 'baseline-widely-available',
    rollupOptions: {
      input: { main: 'index.html', notFound: '404.html' },
    },
    // three.js целиком уходит в отдельный файл, который грузится после интерфейса
    chunkSizeWarningLimit: 700,
  },
});
