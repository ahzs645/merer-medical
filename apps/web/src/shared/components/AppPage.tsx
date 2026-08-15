import React, { PropsWithChildren } from 'react';

type AppPageProps = PropsWithChildren<{
  banner: React.ReactNode;
  contentClassName?: string;
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
    <div className="flex h-full flex-col overflow-y-hidden">
      {props.banner}
      <div
        className={`min-h-0 flex-1 flex-grow overflow-x-hidden ${
          props.contentClassName ?? ''
        }`}
      >
        {props.children}
      </div>
    </div>
  );
}
