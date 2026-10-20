import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Automatically unmount React trees after each test so tests never leak DOM nodes.
afterEach(() => {
  cleanup();
});
