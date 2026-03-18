'use client';

import { HostPeerProvider } from '@/contexts/HostPeerContext';

export default function HostLayout({ children }: { children: React.ReactNode }) {
  return (
    <HostPeerProvider>
      {children}
    </HostPeerProvider>
  );
}
