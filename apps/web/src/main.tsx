// No blanket polyfills. `core-js/stable` was imported whole here — 174 KB of
// the first script every visitor downloads — for the browsers in
// `.browserslistrc` (current Chrome, Edge and Firefox ESR, the last two Safari
// and iOS majors), which ship all of it. A build without it was searched for
// every newer built-in: `withResolvers` and `Float16Array` are feature-tested
// before use, and `structuredClone`, `Object.hasOwn` and `Array.prototype.at`
// have been in all of those browsers since 2022. Supporting something older
// means importing the specific `core-js/actual/...` module it lacks, not all
// of them.
import * as ReactDOM from 'react-dom/client';
import App from './app/App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);
root.render(<App />);

serviceWorkerRegistration.register();
