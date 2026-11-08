import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export function useScrollToHash({ ready = true }: { ready?: boolean } = {}) {
  const { pathname, hash, key } = useLocation();
  const finishedNavigation = useRef<string>();

  useEffect(() => {
    if (!hash || finishedNavigation.current === key) return;
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
      finishedNavigation.current = key;
      stop();
      return true;
    };

    // Records arrive asynchronously. A single attempt after 100ms often ran
    // before the target card existed, silently losing a search-result handoff.
    // A mounted timeline may still contain records from its previous search.
    // Wait for the new query's dataset, even if the old DOM has this id.
    if (ready && !scrollToTarget()) {
      observer = new MutationObserver(() => scrollToTarget());
      observer.observe(document.body, { childList: true, subtree: true });
      timer = setTimeout(stop, 6000);
    }

    // Stop if the reader takes over before a delayed target arrives.
    const cancelForReader = () => {
      finishedNavigation.current = key;
      stop();
    };
    window.addEventListener('wheel', cancelForReader, { passive: true });
    window.addEventListener('touchstart', cancelForReader, { passive: true });
    return () => {
      stop();
      window.removeEventListener('wheel', cancelForReader);
      window.removeEventListener('touchstart', cancelForReader);
    };
  }, [pathname, hash, key, ready]);
}
