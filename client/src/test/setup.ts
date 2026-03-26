import '@testing-library/jest-dom';

// Polyfill ResizeObserver for jsdom (used by @radix-ui/react-scroll-area)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
