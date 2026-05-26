import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { VitePWA } from 'vite-plugin-pwa';
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

function getAppVersion() {
  try {
    return execSync('git describe --tag', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return execSync('git rev-parse --short HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  }
}

function copyWebAssets(): Plugin {
  const files = ['favicon.ico', 'manifest.json'];
  const assetsDir = resolve(__dirname, 'src/assets');
  const contentTypes: Record<string, string> = {
    '.ico': 'image/x-icon',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.ttf': 'font/ttf',
  };

  return {
    name: 'copy-web-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = req.url?.split('?')[0];
        const file = files.find((asset) => pathname === `/${asset}`);

        if (file) {
          const extension = file.slice(file.lastIndexOf('.'));
          res.setHeader(
            'Content-Type',
            contentTypes[extension] || 'text/plain',
          );
          res.end(readFileSync(resolve(__dirname, 'src', file)));
          return;
        }

        if (pathname?.startsWith('/assets/')) {
          const assetPath = resolve(
            assetsDir,
            pathname.slice('/assets/'.length),
          );

          if (assetPath.startsWith(assetsDir) && existsSync(assetPath)) {
            const extension = assetPath.slice(assetPath.lastIndexOf('.'));
            res.setHeader(
              'Content-Type',
              contentTypes[extension] || 'application/octet-stream',
            );
            res.end(readFileSync(assetPath));
            return;
          }
        }

        next();
      });
    },
    closeBundle() {
      const outDir = resolve(__dirname, '../../dist/apps/web');

      for (const file of files) {
        cpSync(resolve(__dirname, 'src', file), resolve(outDir, file));
      }

      if (existsSync(assetsDir)) {
        cpSync(assetsDir, resolve(outDir, 'assets'), { recursive: true });
      }
    },
  };
}

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  const devKeyPath = resolve(__dirname, '../../.dev/certs/localhost-key.pem');
  const devCertPath = resolve(__dirname, '../../.dev/certs/localhost.pem');
  const devHttps =
    command === 'serve' && existsSync(devKeyPath) && existsSync(devCertPath)
      ? {
          key: readFileSync(devKeyPath),
          cert: readFileSync(devCertPath),
        }
      : undefined;

  return {
    root: __dirname,
    cacheDir: '../../node_modules/.vite/apps/web',
    publicDir: false,
    server: {
      host: 'localhost',
      port: 4200,
      strictPort: false,
      https: devHttps,
      proxy: {
        '/api': {
          target: 'https://localhost:4201',
          secure: false,
        },
      },
    },
    preview: {
      host: 'localhost',
      port: 4300,
    },
    define: {
      global: 'globalThis',
      MERE_APP_VERSION: JSON.stringify(getAppVersion()),
      IS_DEMO: JSON.stringify(process.env['IS_DEMO'] || 'disabled'),
      'process.env.NODE_ENV': JSON.stringify(
        isProduction ? 'production' : 'development',
      ),
      'process.env.PUBLIC_URL': JSON.stringify(''),
    },
    resolve: {
      alias: {
        assert: join(__dirname, 'src/empty-module.ts'),
        fs: join(__dirname, 'src/empty-module.ts'),
      },
    },
    build: {
      outDir: '../../dist/apps/web',
      emptyOutDir: true,
      sourcemap: !isProduction,
      reportCompressedSize: true,
    },
    plugins: [
      react(),
      nxViteTsPaths(),
      copyWebAssets(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'service-worker.ts',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
      }),
    ],
    css: {
      postcss: resolve(__dirname, 'postcss.config.js'),
    },
  };
});
