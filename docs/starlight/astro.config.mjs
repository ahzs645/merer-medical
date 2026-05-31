import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://meremedical.co',
  base: '/docs',
  integrations: [
    mermaid({
      autoTheme: true,
    }),
    starlight({
      title: 'Mere Medical Documentation',
      description:
        'Developer and implementation docs for Mere Medical architecture, data portability, portal sync, terminology, and local-first storage.',
      social: [],
      sidebar: [
        {
          label: 'General',
          autogenerate: { directory: 'general' },
        },
        {
          label: 'Architecture',
          autogenerate: { directory: 'architecture' },
        },
        {
          label: 'Data Portability',
          autogenerate: { directory: 'data-portability' },
        },
        {
          label: 'Clinical Domains',
          autogenerate: { directory: 'clinical-domains' },
        },
        {
          label: 'Operations',
          autogenerate: { directory: 'operations' },
        },
      ],
    }),
  ],
});
