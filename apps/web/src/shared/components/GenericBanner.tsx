import { type ReactNode } from 'react';

export function GenericBanner({
  text = '',
  uppercase = false,
  action,
}: {
  text?: string;
  uppercase?: boolean;
  // Optional control rendered on the right side of the banner (e.g. an Add button).
  action?: ReactNode;
}) {
  return (
    <div className="bg-primary-800 px-3 py-4 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1
          className={`text-2xl font-bold sm:text-3xl ${
            uppercase ? 'uppercase' : ''
          }`}
        >
          {text}
        </h1>
        {action}
      </div>
    </div>
  );
}
