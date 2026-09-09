import { afterEach, beforeEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Unmount rendered components so each test starts with a clean DOM.
afterEach(() => {
  cleanup();
});

// Isolate tests from each other: LocalStorage state must never leak between
// test files. Tests that need stored data set it explicitly before rendering.
afterEach(() => {
  window.localStorage.clear();
});

// jsdom provides `crypto` from Node's webcrypto, but guarantee `randomUUID`
// exists deterministically regardless of environment (ChatContainer and the
// API route generate message ids with it).
beforeEach(() => {
  if (!("randomUUID" in window.crypto)) {
    Object.defineProperty(window.crypto, "randomUUID", {
      value: () => "00000000-0000-4000-8000-000000000000",
    });
  }
});
