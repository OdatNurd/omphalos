// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import { remarkOmphalosLinks } from './src/remarkOmphalosLinks.js';
import net from 'node:net';

// Get the port that the development server should run on. We have a standard
// port that we want to use (the primary), but since that port is used by all
// servers, and we might run the doc server in parallel with the application
// during local development, this does an intelligent fallback to the port that
// is used by the actual application when it's in development mode.
async function getDevServerPort(primaryPort = 3000, fallbackPort = 4000) {
  return new Promise((resolve) => {
    const server = net.createServer();

    // If, when the server is fired up, we get an error of any sort, then use
    // the fallback port. This could be because the port is in use, or some
    // other error.
    server.once('error', (err) => {
      resolve(fallbackPort);
    });

    // If the server actually ends up listening, then we want to shut it down,
    // but we know that our port is safe to use, so we can resolve to the
    // primary port.
    server.once('listening', () => {
      server.close(() => {
        resolve(primaryPort);
      });
    });

    // Start up the server.
    server.listen(primaryPort);
  });
}

// https://astro.build/config
export default defineConfig({
  site: 'https://omphalos.ruinouspileofcrap.com',
  publicDir: './static',
  server: {
    port: await getDevServerPort(3000, 4000)
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
