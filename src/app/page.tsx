import { Suspense } from "react";
import { BoardPage } from "@/components/BoardPage";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-400">Loading…</p>}>
      <BoardPage />
    </Suspense>
  );
}
