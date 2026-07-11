// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://omphalos.ruinouspileofcrap.com',
  publicDir: './static',
  server: {
    port: 3000
  },
  integrations: [
    starlight({
      title: 'Omphalos',
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
