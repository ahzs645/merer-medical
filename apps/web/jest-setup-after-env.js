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
