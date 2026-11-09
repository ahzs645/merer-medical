import React, { PropsWithChildren } from 'react';

type AppPageProps = PropsWithChildren<{
  banner: React.ReactNode;
  contentClassName?: string;
  /** Let a tall header scroll away when short screens need room for content. */
  allowHeaderScroll?: boolean;
}>;

/**
 * Scroll restoration deliberately does **not** live here, even though this is
 * the shell every page wears: `AppLoadingSkeleton` renders an `AppPage` while
 * the database boots, which is before `RouterProvider` mounts. A router hook in
 * this component throws there, and the root error boundary turns that into
 * "Something went wrong" for the whole app. It hangs off `TabWrapper`'s `main`
 * instead, which is only ever rendered inside the router.
 */
export function AppPage(props: AppPageProps) {
  return (
    <div
      className={`flex h-full flex-col ${props.allowHeaderScroll ? 'overflow-y-auto' : 'overflow-y-hidden'}`}
    >
      {/* `hide-on-scroll`: on a phone the banner — title, search, filters —
          slides away while the reader scrolls down the list and returns on
          the way back up. At enlarged text it was 400px of an 844px screen
          that never moved. */}
      <div className="hide-on-scroll shrink-0">{props.banner}</div>
      <div
        className={`${props.allowHeaderScroll ? 'min-h-[128px]' : 'min-h-0'} flex-1 flex-grow overflow-x-hidden ${
          props.contentClassName ?? ''
        }`}
      >
        {props.children}
      </div>
    </div>
  );
}
