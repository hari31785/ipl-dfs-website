"use client"

import { LoadingProvider } from '@/contexts/LoadingContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LoadingProvider>
      {children}
    </LoadingProvider>
  )
}