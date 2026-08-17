import type { CSSProperties } from 'react';

import grainImage from '../../../assets/img/grain.svg';

const bannerStyle: CSSProperties & { '--image-url': string } = {
  background: 'rgb(199 210 254 / 0.4)',
  '--image-url': `url(${grainImage})`,
  WebkitBackdropFilter: 'blur(10px)',
  backdropFilter: 'blur(10px)',
};

export function ExperimentalBanner() {
  return (
    <div
      style={bannerStyle}
      className={`absolute top-0 start-0 bg-[backdrop-filter:var(--tw-backdrop-blur)] w-full text-indigo-700 text-xs sm:text-sm font-bold p-1 px-2 bg-opacity-40 text-center`}
    >
      Experimental
    </div>
  );
}
