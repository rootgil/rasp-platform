"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NotificationBannerProps {
  count: number;
}

export function NotificationBanner({ count }: NotificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Re-show banner whenever count changes (new notifications arrived)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (count > 0) setDismissed(false); }, [count]);

  if (count === 0 || dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5">
        <AlertTriangle size={16} className="text-amber-600 shrink-0" />
        <p className="text-sm font-medium text-amber-900">
          {count === 1
            ? "1 new security rule is available in the catalogue"
            : `${count} new security rules are available in the catalogue`}
          {" - "}
          <span className="text-amber-800">
            Review and activate them to keep your protection up to date.
          </span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button asChild size="sm" variant="outline" className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100">
          <Link href="/dashboard/rules">Review rules</Link>
        </Button>
        <button
          onClick={() => setDismissed(true)}
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-amber-100 transition-colors"
          aria-label="Dismiss banner"
        >
          <X size={14} className="text-amber-600" />
        </button>
      </div>
    </div>
  );
}
