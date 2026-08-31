// Mock window.crypto.randomUUID for all tests
global.window = global.window || {};
global.window.crypto = global.window.crypto || {};
global.window.crypto.randomUUID = jest.fn(() => {
  // Generate a unique UUID for each call to avoid conflicts in tests
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
});

// Headless UI's Dialog watches its panel with an IntersectionObserver, which
// jsdom does not implement — without this, every test that opens a dialog dies
// on `IntersectionObserver is not defined`. Three spec files had grown their
// own copy of this stub; the next one should not have to.
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

global.IntersectionObserver =
  global.IntersectionObserver || NoopIntersectionObserver;
if (global.window) {
  global.window.IntersectionObserver =
    global.window.IntersectionObserver || NoopIntersectionObserver;
}

// jsdom implements no media queries at all, so any component that branches on
// one — a bottom sheet against a panel, a modal against a drawer — throws on
// render. Reports the phone layout, which is the first-paint default the
// components already assume, and stays live-updatable in case a test wants to
// flip it.
if (global.window && typeof global.window.matchMedia !== 'function') {
  global.window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}
