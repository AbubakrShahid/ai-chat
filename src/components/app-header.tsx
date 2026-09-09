/**
 * AppHeader — shared application header (Server Component).
 * Rendered once by the root layout and shared across all routes.
 */
export function AppHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          aria-hidden="true"
        >
          AI
        </span>
        <span className="text-lg font-semibold tracking-tight">AI Chat</span>
      </div>
    </header>
  );
}
