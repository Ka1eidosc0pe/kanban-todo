import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kanban To-Do",
  description: "A kanban to-do board with drag-and-drop, status and category views, and subtasks. Saved in your browser.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* StoreProvider seeds with Date.now(); Suspense keeps that out of the prerender. */}
        <Suspense fallback={<p className="p-8 text-sm text-slate-400">Loading…</p>}>
          <StoreProvider>
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
