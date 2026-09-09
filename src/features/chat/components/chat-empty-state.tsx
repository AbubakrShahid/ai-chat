/**
 * ChatEmptyState — friendly placeholder shown when there are no messages
 * (Server Component). Purely presentational with no state or logic.
 */
export function ChatEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-xl dark:bg-zinc-800"
        aria-hidden="true"
      >
        💬
      </div>
      <h2 className="text-lg font-semibold tracking-tight">Start the conversation</h2>
      <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        Ask a question below and the assistant will respond here.
      </p>
    </div>
  );
}
