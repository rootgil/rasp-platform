"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf: number;
    let start = performance.now();

    function tick() {
      const pct = Math.min((performance.now() - start) / intervalMs, 1);
      setProgress(pct * 100);
      if (pct < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        router.refresh();
        start = performance.now();
        raf = requestAnimationFrame(tick);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [router, intervalMs]);

  return (
    <div className="fixed top-16 left-0 lg:left-[260px] right-0 h-0.5 bg-border z-50">
      <div
        className="h-full bg-brand"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
