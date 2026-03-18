'use client';

import { createContext, useContext, useRef, useState, useEffect, useCallback, ReactNode } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { getPlayerSession } from '@/lib/game';

interface PlayerPeerContextType {
  peer: Peer | null;
  conn: DataConnection | null;
  isConnected: boolean;
  statusText: string;
  onMessage: React.MutableRefObject<((data: Record<string, unknown>) => void) | null>;
  sendData: (data: unknown) => void;
}

const PlayerPeerContext = createContext<PlayerPeerContextType | null>(null);

export function usePlayerPeer() {
  const ctx = useContext(PlayerPeerContext);
  if (!ctx) throw new Error('usePlayerPeer must be inside PlayerPeerProvider');
  return ctx;
}

export function PlayerPeerProvider({ children }: { children: ReactNode }) {
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('Connecting…');
  const onMessage = useRef<((data: Record<string, unknown>) => void) | null>(null);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const session = getPlayerSession();
    if (!session?.sessionId || !session?.team) return;

    const { sessionId, team } = session;

    const initPeer = () => {
      if (peerRef.current && !peerRef.current.destroyed) {
        try { peerRef.current.destroy(); } catch {}
      }

      const p = new Peer(undefined as unknown as string, {
        host: '0.peerjs.com', port: 443, secure: true, path: '/',
      });

      peerRef.current = p;

      p.on('open', () => {
        attemptConnection(p, sessionId, team);
        // Reconnection loop
        reconnectRef.current = setInterval(() => {
          if (!connRef.current?.open) {
            attemptConnection(p, sessionId, team);
          }
        }, 3000);
      });

      p.on('error', () => {
        setStatusText('Peer error, retrying…');
        setIsConnected(false);
        setTimeout(initPeer, 4000);
      });
    };

    const attemptConnection = (p: Peer, sid: string, t: string) => {
      if (connRef.current?.open) return;

      setStatusText('Connecting to host…');
      const c = p.connect(sid, { metadata: { team: t }, reliable: true });

      const timeout = setTimeout(() => {
        if (!c.open) c.close();
      }, 4000);

      c.on('open', () => {
        clearTimeout(timeout);
        connRef.current = c;
        setIsConnected(true);
        setStatusText('Connected');
      });

      c.on('data', (data) => {
        onMessage.current?.(data as Record<string, unknown>);
      });

      c.on('close', () => {
        connRef.current = null;
        setIsConnected(false);
        setStatusText('Host offline. Reconnecting…');
      });

      c.on('error', () => {
        setIsConnected(false);
      });
    };

    initPeer();

    return () => {
      if (reconnectRef.current) clearInterval(reconnectRef.current);
    };
  }, []);

  const sendData = useCallback((data: unknown) => {
    if (connRef.current?.open) {
      try { connRef.current.send(data); } catch {}
    }
  }, []);

  return (
    <PlayerPeerContext.Provider value={{
      peer: peerRef.current,
      conn: connRef.current,
      isConnected,
      statusText,
      onMessage,
      sendData,
    }}>
      {children}
    </PlayerPeerContext.Provider>
  );
}
