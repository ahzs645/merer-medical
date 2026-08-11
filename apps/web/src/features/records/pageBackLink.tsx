import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * Whether the page currently mounted inside the Records shell draws its own
 * "back to …" link.
 *
 * The shell adds a generic "All records" bar above every sub-page on narrow
 * viewports. Detail pages — a lab, a condition, a document — also carry a
 * specific back link in their banner ("All lab results"), so a phone showed two
 * stacked back links pointing at two different places, one above the other,
 * before the page said anything. The specific one wins; this is how the shell
 * finds out to stand down.
 */
const PageBackLinkContext = createContext<{
  hasPageBackLink: boolean;
  setHasPageBackLink: (has: boolean) => void;
}>({
  hasPageBackLink: false,
  setHasPageBackLink: () => undefined,
});

export function PageBackLinkProvider({ children }: { children: ReactNode }) {
  const [hasPageBackLink, setHasPageBackLink] = useState(false);
  const value = useMemo(
    () => ({ hasPageBackLink, setHasPageBackLink }),
    [hasPageBackLink],
  );

  return (
    <PageBackLinkContext.Provider value={value}>
      {children}
    </PageBackLinkContext.Provider>
  );
}

export function usePageBackLink() {
  return useContext(PageBackLinkContext).hasPageBackLink;
}

/**
 * Called by the shared record banner. Registers on mount when the page passes a
 * `backLink`, and clears on unmount so the next page starts from nothing.
 */
export function useRegisterPageBackLink(hasBackLink: boolean) {
  const { setHasPageBackLink } = useContext(PageBackLinkContext);

  useEffect(() => {
    setHasPageBackLink(hasBackLink);
    return () => setHasPageBackLink(false);
  }, [hasBackLink, setHasPageBackLink]);
}
