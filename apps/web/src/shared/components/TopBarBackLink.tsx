import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * The back link drawn in the phone's top bar, beside the profile name.
 *
 * A phone used to stack three rows before a record page said anything: "Records
 * for …" with search, a white "All records" bar, then the page banner — and
 * detail pages put their own back link inside the banner as well. The back
 * link now sits in the profile row, so the rows above the banner are one.
 *
 * Several components can offer a link at once (the Records shell offers "All
 * records", a lab detail page "All lab results"), so each registers with a
 * priority and the highest one is shown: the most specific place to go back to.
 */
export interface TopBarBackLinkValue {
  to: string;
  label: string;
}

type Entry = TopBarBackLinkValue & { priority: number };

const TopBarBackLinkContext = createContext<{
  register: (id: string, entry: Entry | undefined) => void;
}>({ register: () => undefined });

const TopBarBackLinkValueContext = createContext<
  TopBarBackLinkValue | undefined
>(undefined);

export function TopBarBackLinkProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const register = useMemo(
    () => (id: string, entry: Entry | undefined) =>
      setEntries((current) => {
        const existing = current[id];
        if (
          entry &&
          existing &&
          existing.to === entry.to &&
          existing.label === entry.label &&
          existing.priority === entry.priority
        ) {
          return current;
        }
        if (!entry && !existing) return current;
        const next = { ...current };
        if (entry) next[id] = entry;
        else delete next[id];
        return next;
      }),
    [],
  );
  const active = useMemo(() => {
    const list = Object.values(entries);
    if (list.length === 0) return undefined;
    const top = list.reduce((best, entry) =>
      entry.priority > best.priority ? entry : best,
    );
    return { to: top.to, label: top.label };
  }, [entries]);
  const api = useMemo(() => ({ register }), [register]);

  return (
    <TopBarBackLinkContext.Provider value={api}>
      <TopBarBackLinkValueContext.Provider value={active}>
        {children}
      </TopBarBackLinkValueContext.Provider>
    </TopBarBackLinkContext.Provider>
  );
}

/** The link the top bar should draw, if any page offered one. */
export function useTopBarBackLink() {
  return useContext(TopBarBackLinkValueContext);
}

/**
 * Offer a back link to the top bar while mounted. Pass `undefined` to offer
 * none. A higher `priority` wins: shells use 0, pages 1.
 */
export function useOfferTopBarBackLink(
  link: TopBarBackLinkValue | undefined,
  priority = 1,
) {
  const { register } = useContext(TopBarBackLinkContext);
  const id = useId();
  const to = link?.to;
  const label = link?.label;

  useEffect(() => {
    register(
      id,
      to !== undefined && label !== undefined
        ? { to, label, priority }
        : undefined,
    );
  }, [id, to, label, priority, register]);

  useEffect(() => () => register(id, undefined), [id, register]);
}
