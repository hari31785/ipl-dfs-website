'use client';

import { useEffect, useState } from 'react';

export default function DbStatusBanner() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!cancelled) setDown(!res.ok);
      } catch {
        if (!cancelled) setDown(true);
      }
    };

    check();

    // Re-check every 60 seconds — auto-dismisses when DB recovers
    const interval = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!down) return null;

  return (
    <div className="w-full bg-red-600 text-white text-center px-4 py-2.5 text-sm font-medium z-50 sticky top-0">
      ⚠️ We&apos;re experiencing a temporary database issue. Login and other features may be unavailable — please try again after sometime.
    </div>
  );
}
