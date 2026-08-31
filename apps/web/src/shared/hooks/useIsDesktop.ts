import { useEffect, useState } from 'react';

/**
 * True at Tailwind's `sm:` breakpoint and above.
 *
 * For the places that need to render *different components* rather than
 * different classes — a modal against a bottom sheet, say, which CSS cannot
 * express because they are different elements with different behaviour.
 * Anything that is only a matter of layout should use a `sm:` class instead.
 *
 * Starts false so the first paint is the phone layout: a sheet appearing and
 * then becoming a panel is a worse first frame than the reverse, and the
 * measurement lands on the first effect either way.
 */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const handleChange = () => setIsDesktop(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}
