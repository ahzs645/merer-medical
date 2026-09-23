import { useEffect, useState } from 'react';

/**
 * Whether a media query matches, kept current.
 *
 * Same contract as `useIsDesktop`: for rendering different state rather than
 * different classes, and false on the first paint.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}

/**
 * A phone held sideways: wide enough for the desktop rail, too short for it.
 * Mirrors the `short:` screen in tailwind.config.js.
 */
export const SHORT_VIEWPORT_QUERY = '(max-height: 500px)';
