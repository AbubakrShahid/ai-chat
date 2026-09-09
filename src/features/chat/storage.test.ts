import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CHAT_STORAGE_KEY,
  clearMessages,
  loadMessages,
  saveMessages,
} from "@/features/chat/storage";
import type { ChatMessage } from "@/features/chat/types";

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "1",
  role: "user",
  content: "Hello",
  ...overrides,
});

describe("storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saveMessages() stores a valid conversation", () => {
    const conversation = [message(), message({ id: "2", role: "assistant", content: "Hi" })];
    saveMessages(conversation);
    expect(JSON.parse(window.localStorage.getItem(CHAT_STORAGE_KEY) ?? "[]")).toEqual(conversation);
  });

  it("loadMessages() returns the previously stored conversation", () => {
    const conversation = [message(), message({ id: "2", role: "assistant", content: "Hi" })];
    saveMessages(conversation);
    expect(loadMessages()).toEqual(conversation);
  });

  it("clearMessages() removes the stored conversation", () => {
    saveMessages([message()]);
    clearMessages();
    expect(window.localStorage.getItem(CHAT_STORAGE_KEY)).toBeNull();
    expect(loadMessages()).toBeNull();
  });

  it("loadMessages() returns null when nothing is stored", () => {
    expect(window.localStorage.getItem(CHAT_STORAGE_KEY)).toBeNull();
    expect(loadMessages()).toBeNull();
  });

  it("loadMessages() returns null instead of throwing on invalid JSON", () => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, "{not valid json");
    expect(() => loadMessages()).not.toThrow();
    expect(loadMessages()).toBeNull();
  });

  it("rejects stored data with the wrong shape", () => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages: [] }));
    expect(loadMessages()).toBeNull();

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([]));
    expect(loadMessages()).toBeNull();
  });

  it("rejects invalid message objects", () => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([{ id: "1", role: "user" }]));
    expect(loadMessages()).toBeNull();

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(["nope"]));
    expect(loadMessages()).toBeNull();
  });

  it("rejects invalid role values", () => {
    window.localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([{ id: "1", role: "system", content: "Hello" }])
    );
    expect(loadMessages()).toBeNull();
  });

  it("rejects missing or invalid ids", () => {
    window.localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify([{ role: "user", content: "Hello" }])
    );
    expect(loadMessages()).toBeNull();

    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([message({ id: "" })]));
    expect(loadMessages()).toBeNull();
  });

  it("accepts empty string content (matches the existing validator)", () => {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify([message({ content: "" })]));
    expect(loadMessages()).toEqual([message({ content: "" })]);
  });

  it("does not crash and returns null when reading LocalStorage fails", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => loadMessages()).not.toThrow();
    expect(loadMessages()).toBeNull();
    warn.mockRestore();
  });

  it("does not crash when LocalStorage writes fail", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => saveMessages([message()])).not.toThrow();
    warn.mockRestore();
  });
});
