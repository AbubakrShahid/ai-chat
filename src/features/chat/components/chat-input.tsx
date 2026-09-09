"use client";

import { useState, type KeyboardEvent, type FormEvent } from "react";
import { MAX_MESSAGE_LENGTH } from "@/features/chat/types";

interface ChatInputProps {
  /**
   * Callback fired with the trimmed message content when the user submits.
   * No application state is managed here — the parent owns that state and
   * decides what to do with the content.
   */
  onSubmit?: (content: string) => void;
  /**
   * Disables the input controls while the parent is processing a message.
   */
  disabled?: boolean;
}

/**
 * ChatInput — input controls for the chat (Client Component).
 *
 * It is marked "use client" because it manages local UI state (the textarea
 * value) and handles browser interaction (typing and form submission). It
 * deliberately holds no application-level chat state — messages and loading
 * live in ChatContainer — and it never calls an API.
 *
 * Client-side validation mirrors the server's rules: empty/whitespace-only
 * content is never submitted, content is trimmed before sending, and the
 * message length is capped (with a counter near the limit) while the server
 * stays the authoritative validation boundary.
 */
export function ChatInput({ onSubmit, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = value.trim();
    if (!content) return;
    onSubmit?.(content);
    setValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const showLengthHint = value.length > 0 && value.length >= MAX_MESSAGE_LENGTH - 100;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 border-t border-zinc-200 bg-white p-3 sm:p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <label htmlFor="chat-input" className="sr-only">
        Message
      </label>
      <div className="relative flex-1">
        <textarea
          id="chat-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Type your message…"
          disabled={disabled}
          aria-describedby={showLengthHint ? "chat-input-length" : undefined}
          className={`max-h-40 w-full resize-none rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-500 dark:focus:ring-zinc-700 ${
            showLengthHint ? "pr-14" : ""
          }`}
        />
        {showLengthHint && (
          <span
            id="chat-input-length"
            className="pointer-events-none absolute bottom-2 right-3 text-xs text-zinc-400 dark:text-zinc-500"
          >
            {value.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Send
      </button>
    </form>
  );
}
