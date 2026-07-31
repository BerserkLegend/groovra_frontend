import '@testing-library/jest-dom';
import { randomUUID } from 'crypto';

if (typeof window !== 'undefined') {
  if (!window.crypto) {
    Object.defineProperty(window, 'crypto', {
      value: {},
      writable: true,
    });
  }
  if (!window.crypto.randomUUID) {
    Object.defineProperty(window.crypto, 'randomUUID', {
      value: () => randomUUID(),
      writable: true,
    });
  }
}
