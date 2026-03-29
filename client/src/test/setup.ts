import '@testing-library/jest-dom';

// Polyfill for @radix-ui/react-scroll-area used in ChatMode
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
