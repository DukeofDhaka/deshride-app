import '@testing-library/jest-dom';
import { beforeEach, afterEach } from 'vitest';

class MockStorage implements Storage {
  private store: Record<string, string> = {};

  get length(): number {
    return Object.keys(this.store).length;
  }

  clear(): void {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] !== undefined ? this.store[key] : null;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] !== undefined ? keys[index] : null;
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
}

const mockLocalStorage = new MockStorage();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true
});

// Mock window.scrollTo
window.scrollTo = () => {};

// Clear localStorage before and after each test
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});
