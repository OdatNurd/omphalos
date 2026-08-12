// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { remarkOmphalosLinks } from './src/remarkOmphalosLinks.js';

// https://astro.build/config
export default defineConfig({
  site: 'https://omphalos.ruinouspileofcrap.com',
  publicDir: './static',
  server: {
    port: 3000
  },
  markdown: {
    processor: unified({
      remarkPlugins: [remarkOmphalosLinks],
    }),
  },
  integrations: [
    starlight({
      title: 'Omphalos',
      routeMiddleware: './src/starlightRouteMiddleware.js',
      social: [
        {
          icon: 'github', label: 'GitHub', href: 'https://github.com/OdatNurd/omphalos'
        }
      ],
      sidebar: [
        {
          label: 'Introduction',
          items: [
            { slug: 'intro' },
            { slug: 'name' },
            { slug: 'missing' },
          ],
        },
        {
          label: 'Quick Start',
          items: [{ autogenerate: { directory: 'quickstart' } }],
        },
        {
          label: 'Guides',
          items: [{ autogenerate: { directory: 'guides' } }],
        },
        {
          label: 'API Reference',
          items: [{ autogenerate: { directory: 'api' } }],
        }
      ],
    }),
  ],
});
