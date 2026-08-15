import React, { PropsWithChildren, useRef } from 'react';

import { useScrollRestoration } from '../hooks/useScrollRestoration';

type AppPageProps = PropsWithChildren<{
  banner: React.ReactNode;
  contentClassName?: string;
}>;

export function AppPage(props: AppPageProps) {
  const content = useRef<HTMLDivElement>(null);
  // Every page that wears this shell gets its place back on Back. The scroller
  // is usually a div inside `children` rather than this one, so the hook looks
  // it up rather than being handed a ref.
  useScrollRestoration(content);

  return (
    <div className="flex h-full flex-col overflow-y-hidden">
      {props.banner}
      <div
        ref={content}
        className={`min-h-0 flex-1 flex-grow overflow-x-hidden ${
          props.contentClassName ?? ''
        }`}
      >
        {props.children}
      </div>
    </div>
  );
}
