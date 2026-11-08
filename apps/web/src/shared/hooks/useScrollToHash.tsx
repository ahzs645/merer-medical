import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollToHash() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    let observer: MutationObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      observer?.disconnect();
      if (timer) clearTimeout(timer);
    };
    const scrollToTarget = () => {
      const element = document.getElementById(id);
      if (!element) return false;
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
      stop();
      return true;
    };

    // Records arrive asynchronously. A single attempt after 100ms often ran
    // before the target card existed, silently losing a search-result handoff.
    if (!scrollToTarget()) {
      observer = new MutationObserver(() => scrollToTarget());
      observer.observe(document.body, { childList: true, subtree: true });
      timer = setTimeout(stop, 6000);
    }

    // Stop if the reader takes over before a delayed target arrives.
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    return () => {
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
    };
  }, [pathname, hash, key]); // do this on route change
}
