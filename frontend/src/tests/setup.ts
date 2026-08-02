import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Unit tests exercise the explicit unconfigured boundary independently of any
// developer-local deployment address in frontend/.env.
vi.stubEnv('VITE_CONTRACT_ADDRESS', '');

if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
