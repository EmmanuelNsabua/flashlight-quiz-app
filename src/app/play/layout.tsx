'use client';

import { PlayerPeerProvider } from '@/contexts/PlayerPeerContext';

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <PlayerPeerProvider>
      {children}
    </PlayerPeerProvider>
  );
}
