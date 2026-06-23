import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Routes as AppRoutes } from '../../Routes';

export function TabButton({
  route,
  title,
  smallTitle = '',
  icon,
  trailing,
}: {
  route: AppRoutes;
  title: string;
  smallTitle?: string;
  icon: JSX.Element;
  // Optional node rendered on top of (and visually inside) the highlighted
  // button area, e.g. a quick "add" action that lives on its own link.
  trailing?: React.ReactNode;
}) {
  const location = useLocation()?.pathname;
  const isActive =
    route === AppRoutes.Records
      ? location.startsWith(AppRoutes.Records)
      : route === AppRoutes.Utilities
        ? location.startsWith(AppRoutes.Utilities)
        : location === route;

  const linkClassName = `flex w-24 flex-col items-center justify-center p-2 text-white duration-75 active:scale-90 sm:active:scale-95 md:w-auto md:flex-row md:justify-start md:rounded-md md:p-4 ${
    isActive
      ? 'bg-gray-0 md:bg-primary-700 border-primary border-t-2 md:border-t-0'
      : ''
  }`;

  const inner = (
    <>
      <p
        className={`font-xs h-5 w-5 text-base md:mr-4 md:h-8 md:w-8 md:text-white ${
          isActive ? 'text-primary font-bold' : 'text-slate-800'
        }`}
      >
        {icon}
      </p>
      {smallTitle ? (
        <>
          <p
            className={`hidden md:block pt-1 text-[11px] md:pt-0 md:text-base md:text-white ${
              isActive ? 'text-primary font-bold' : 'text-slate-800'
            }`}
          >
            {title}
          </p>
          <p
            className={`${!smallTitle ? '' : 'md:hidden'} pt-1 text-[11px] md:pt-0 md:text-base md:text-white ${
              isActive ? 'text-primary font-bold' : 'text-slate-800'
            }`}
          >
            {smallTitle}
          </p>
        </>
      ) : (
        <p
          className={`pt-1 text-[11px] md:pt-0 md:text-base md:text-white ${
            isActive ? 'text-primary font-bold' : 'text-slate-800'
          }`}
        >
          {title}
        </p>
      )}
    </>
  );

  if (trailing) {
    // The whole button (including the area beneath the trailing action) is a
    // single Link that highlights as one; the trailing action is overlaid on
    // top so it stays independently clickable without nesting anchors.
    return (
      <div className="relative flex w-24 md:m-1 md:w-auto">
        <Link
          to={route}
          className={`${linkClassName} w-full pr-9 md:w-full md:pr-12`}
        >
          {inner}
        </Link>
        <div className="absolute right-1 top-1 z-10 md:bottom-1 md:right-2 md:top-1 md:flex md:items-center">
          {trailing}
        </div>
      </div>
    );
  }

  return (
    <Link to={route} className={`${linkClassName} md:m-1`}>
      {inner}
    </Link>
  );
}
