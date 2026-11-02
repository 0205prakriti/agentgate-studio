'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Re-reads the server page every few seconds while a background job is active. */
export function AutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => router.refresh(), 2500);
    return () => clearInterval(timer);
  }, [active, router]);
  return null;
}
