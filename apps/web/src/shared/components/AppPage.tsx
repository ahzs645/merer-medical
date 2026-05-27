import React, { PropsWithChildren } from 'react';

type AppPageProps = PropsWithChildren<{
  banner: React.ReactNode;
  contentClassName?: string;
}>;

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
