import type { ChatMessage as ChatMessageType } from "@/features/chat/types";
import { ChatMessage } from "@/features/chat/components/chat-message";
import { ChatEmptyState } from "@/features/chat/components/chat-empty-state";
import { ChatInput } from "@/features/chat/components/chat-input";

interface ChatWindowProps {
  messages: readonly ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  canRetry: boolean;
  onSend: (content: string) => void;
  onRetry: () => void;
  onClear: () => void;
}

/**
 * ChatWindow — composes the chat interface.
 *
 * Rendered from ChatContainer (a Client Component), so this component runs in
 * the client component graph — but it stays purely presentational: it owns no
 * state and contains no logic beyond conditional rendering. Messages, loading,
 * errors, and submission are wired to it through props.
 *
 * It composes the message history and the input area with clear visual
 * separation, renders the loading ("typing") indicator while the parent is
 * processing a message, and presents the accessible error banner plus a
 * "Try again" action for retryable failures, and a Clear Chat control that
 * resets the conversation (wired to the container).
 */
export function ChatWindow({
  messages,
  isLoading,
  error,
  canRetry,
  onSend,
  onRetry,
  onClear,
}: ChatWindowProps) {
  return (
    <section
      aria-label="Chat"
      className="flex h-[60vh] flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-900"
    >
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-4 py-2.5 sm:px-6 dark:border-zinc-800">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Conversation
        </span>
        <button
          type="button"
          onClick={onClear}
          disabled={isLoading}
          className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:disabled:hover:bg-transparent dark:disabled:hover:text-zinc-400"
        >
          Clear Chat
        </button>
      </div>

      <div aria-live="polite" className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <ChatEmptyState />
        ) : (
          messages.map((message) => <ChatMessage key={message.id} message={message} />)
        )}

        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
              Assistant is typing…
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-red-200 bg-red-50 px-4 py-3 sm:px-6 dark:border-red-900/50 dark:bg-red-950/40"
        >
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isLoading}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:bg-transparent dark:text-red-300 dark:hover:bg-red-900/30"
            >
              Try again
            </button>
          )}
        </div>
      )}

      <ChatInput onSubmit={onSend} disabled={isLoading} />
    </section>
  );
}
