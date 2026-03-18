'use client';

import { createContext, useContext, useRef, useCallback, useState, useEffect, ReactNode } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { getHostSession } from '@/lib/game';

interface HostPeerContextType {
  peer: Peer | null;
  connections: { left: DataConnection | null; right: DataConnection | null };
  isReady: boolean;
  sessionId: string | null;
  connStatus: { left: boolean; right: boolean };
  broadcast: (data: unknown) => void;
  onPlayerMessage: React.MutableRefObject<((team: 'left' | 'right', data: Record<string, unknown>) => void) | null>;
  onConnection: React.MutableRefObject<((team: 'left' | 'right', conn: DataConnection) => void) | null>;
}

const HostPeerContext = createContext<HostPeerContextType | null>(null);

export function useHostPeer() {
  const ctx = useContext(HostPeerContext);
  if (!ctx) throw new Error('useHostPeer must be inside HostPeerProvider');
  return ctx;
}

export function HostPeerProvider({ children }: { children: ReactNode }) {
  const peerRef = useRef<Peer | null>(null);
  const connsRef = useRef<{ left: DataConnection | null; right: DataConnection | null }>({ left: null, right: null });
  const [isReady, setIsReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connStatus, setConnStatus] = useState({ left: false, right: false });
  const onPlayerMessage = useRef<((team: 'left' | 'right', data: Record<string, unknown>) => void) | null>(null);
  const onConnection = useRef<((team: 'left' | 'right', conn: DataConnection) => void) | null>(null);
  const initCalled = useRef(false);

  useEffect(() => {
    if (initCalled.current) return;
    initCalled.current = true;

    const session = getHostSession();
    if (!session?.sessionId) return;
    
    const id = session.sessionId;
    setSessionId(id);
    
    const initPeer = () => {
      if (peerRef.current && !peerRef.current.destroyed) {
        try { peerRef.current.destroy(); } catch {}
      }

      const p = new Peer(id, {
        host: '0.peerjs.com', port: 443, secure: true, path: '/',
      });

      peerRef.current = p;

      p.on('open', () => {
        setIsReady(true);
      });

      p.on('connection', (conn: DataConnection) => {
        conn.on('open', () => {
          const team = conn.metadata?.team as 'left' | 'right';
          if (team !== 'left' && team !== 'right') return;

          connsRef.current[team] = conn;
          setConnStatus(prev => ({ ...prev, [team]: true }));
          onConnection.current?.(team, conn);

          conn.on('data', (data) => {
            onPlayerMessage.current?.(team, data as Record<string, unknown>);
          });

          conn.on('close', () => {
            connsRef.current[team] = null;
            setConnStatus(prev => ({ ...prev, [team]: false }));
          });
        });
      });

      p.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          setTimeout(initPeer, 2000);
        } else {
          setTimeout(initPeer, 5000);
        }
      });
    };

    initPeer();

    return () => {
      // Don't destroy on unmount — we want the peer to persist across host routes!
      // Only destroy if the browser is closing.
    };
  }, []);

  const broadcast = useCallback((data: unknown) => {
    (['left', 'right'] as const).forEach(t => {
      const conn = connsRef.current[t];
      if (conn?.open) { try { conn.send(data); } catch {} }
    });
  }, []);

  return (
    <HostPeerContext.Provider value={{
      peer: peerRef.current,
      connections: connsRef.current,
      isReady,
      sessionId,
      connStatus,
      broadcast,
      onPlayerMessage,
      onConnection,
    }}>
      {children}
    </HostPeerContext.Provider>
  );
}
