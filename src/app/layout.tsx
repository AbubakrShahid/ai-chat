import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Chat",
  description: "A production-quality AI chat application",
};

/**
 * RootLayout — Server Component owned by the App Router.
 * Provides the shared document shell (fonts, global styles, metadata) and the
 * persistent app chrome (header). Route-specific content is composed by the
 * matching `page.tsx` and injected through `children`.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <AppHeader />
        {children}
        <footer className="border-t border-zinc-200 py-6 dark:border-zinc-800">
          <p className="mx-auto max-w-5xl px-4 text-center text-xs text-zinc-500 sm:px-6 dark:text-zinc-400">
            AI Chat — chat interface (work in progress).
          </p>
        </footer>
      </body>
    </html>
  );
}
