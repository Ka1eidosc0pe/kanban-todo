import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui";
import { RegisterSW } from "@/components/RegisterSW";
import { ThemeSync } from "@/components/ThemeSync";
import "./globals.css";

// Runs during HTML parsing (before first paint) so the right theme class is on <html> with no flash.
const NO_FLASH = `(function(){var d=document.documentElement,t="system";try{var s=JSON.parse(localStorage.getItem("kanban-todo:v1"));var v=s&&s.prefs&&s.prefs.theme;if(v==="light"||v==="dark")t=v}catch(e){}var m=false;try{m=matchMedia("(prefers-color-scheme: dark)").matches}catch(e){}var k=t==="dark"||(t==="system"&&m);d.classList.toggle("dark",k);d.style.colorScheme=k?"dark":"light"})()`;

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kanban To-Do",
  description: "A kanban to-do board with drag-and-drop, status and category views, and subtasks. Saved in your browser.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#4f46e5" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="flex min-h-full flex-col">
        <RegisterSW />
        {/* StoreProvider seeds with Date.now(); Suspense keeps that out of the prerender. */}
        <Suspense fallback={<p className="p-8 text-sm text-slate-400">Loading…</p>}>
          <StoreProvider>
            <ThemeSync />
            <ToastProvider>{children}</ToastProvider>
          </StoreProvider>
        </Suspense>
      </body>
    </html>
  );
}
