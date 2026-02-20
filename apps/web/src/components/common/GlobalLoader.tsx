'use client';

import { useEffect, useState } from 'react';

export function GlobalLoader() {
  const [loadingCount, setLoadingCount] = useState(0);

  useEffect(() => {
    const handleStart = () => setLoadingCount(c => c + 1);
    const handleEnd = () => setLoadingCount(c => Math.max(0, c - 1));

    window.addEventListener('apiLoadStart', handleStart);
    window.addEventListener('apiLoadEnd', handleEnd);

    return () => {
      window.removeEventListener('apiLoadStart', handleStart);
      window.removeEventListener('apiLoadEnd', handleEnd);
    };
  }, []);

  if (loadingCount === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-1 bg-slate-900/50 overflow-hidden">
      <div className="h-full bg-sky-500 animate-[loader_1s_ease-in-out_infinite]" />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes loader {
          0% {
            width: 0%;
            transform: translateX(-100%);
          }
          100% {
            width: 100%;
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
}
