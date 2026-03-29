import '@testing-library/jest-dom';

// Polyfill ResizeObserver (required by @radix-ui/react-scroll-area)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
