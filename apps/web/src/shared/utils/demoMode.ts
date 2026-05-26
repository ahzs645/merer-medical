/**
 * Demo mode can be activated two ways:
 *
 *  1. Build time — a dedicated build with `IS_DEMO=enabled` (the whole site is
 *     the demo, served from the deployment root).
 *  2. Runtime — visiting the `/demo` route on a normal build (e.g.
 *     https://emr.ahmadjalil.com/demo). The app boots a read-only, in-memory
 *     database seeded from the bundled demo fixture and namespaces every inner page
 *     under `/demo/*` so the demo session stays isolated from the real app.
 */

/** Path segment that activates the runtime demo experience. */
export const DEMO_PATH_SEGMENT = '/demo';

/**
 * Deployment base path derived from the `<base href>` in index.html. Returns
 * "" for a root deploy (custom domain) and "/repo-name" for a project page, so
 * it can be concatenated safely.
 */
export function getDeploymentBasePath(): string {
  if (typeof document === 'undefined') {
    return '';
  }
  return new URL(document.baseURI).pathname.replace(/\/$/, '');
}

/**
 * Current pathname relative to the deployment base (leading slash kept), so
 * demo detection works whether the app is served from "/" or "/repo-name/".
 */
function getRelativePathname(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const base = getDeploymentBasePath();
  const path = window.location.pathname;
  if (base && path.startsWith(base)) {
    return path.slice(base.length) || '/';
  }
  return path;
}

/** True when the build-time demo flag is set. */
export function isBuildTimeDemo(): boolean {
  return typeof IS_DEMO !== 'undefined' && IS_DEMO === 'enabled';
}

/**
 * True when the app should run as a read-only demo populated from
 * the bundled demo fixture — either a build-time demo or the `/demo` runtime route.
 */
export function isDemoMode(): boolean {
  if (isBuildTimeDemo()) {
    return true;
  }
  const rel = getRelativePathname();
  return rel === DEMO_PATH_SEGMENT || rel.startsWith(`${DEMO_PATH_SEGMENT}/`);
}

/**
 * react-router basename for the current session: the deployment base, plus the
 * `/demo` segment when running the runtime demo (the build-time demo serves
 * from the root, so it gets no extra segment).
 */
export function getRouterBasename(): string | undefined {
  const base = getDeploymentBasePath();
  const demoSegment =
    isDemoMode() && !isBuildTimeDemo() ? DEMO_PATH_SEGMENT : '';
  const full = `${base}${demoSegment}`;
  return full === '' ? undefined : full;
}
