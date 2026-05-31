import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://emr.ahmadjalil.com',
  base: '/docs',
  redirects: {
    '/docs/privacy-policy': '/docs/privacy-policy/',
  },
  integrations: [
    mermaid({
      autoTheme: true,
    }),
    starlight({
      title: 'Mere Medical',
      description:
        'Documentation for Mere Medical, a self-hosted personal health record for aggregating and exploring patient portal data.',
      logo: {
        src: './public/img/logo.svg',
        alt: 'Mere Medical',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/cfu288/mere-medical',
        },
      ],
      sidebar: [
        {
          label: 'What is Mere Medical?',
          slug: '',
        },
        {
          label: 'What can Mere Medical do?',
          slug: 'features',
        },
        {
          label: 'Supported Patient Portals',
          slug: 'which-patient-portals-are-supported',
        },
        {
          label: 'Installing Mere Medical as an App',
          slug: 'install-the-app',
        },
        {
          label: 'Getting Started with Self-Hosting',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'FAQ',
          slug: 'faq',
        },
        {
          label: 'Blog',
          autogenerate: { directory: 'blog' },
        },
      ],
    }),
  ],
});
