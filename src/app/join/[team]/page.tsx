'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { savePlayerSession } from '@/lib/game';
import Peer from 'peerjs';

export default function JoinTeamPage() {
  const router = useRouter();
  const params = useParams();
  const team = params.team as string;
  const isRed = team === 'red';
  const mappedTeam: 'left' | 'right' = isRed ? 'left' : 'right';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect bad team names
  useEffect(() => {
    if (team !== 'red' && team !== 'blue') {
      router.push('/');
    }
  }, [team, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let normalizedCode = code.trim().toUpperCase();

    if (!normalizedCode) {
      setError('Please enter a game code.');
      return;
    }

    // Auto-format: add FL- prefix if missing
    if (!normalizedCode.startsWith('FL-')) {
      normalizedCode = 'FL-' + normalizedCode;
    }

    setLoading(true);
    setError('');

    // PeerJS validation: connect to host to verify code
    const tempPeer = new Peer(undefined as unknown as string, {
      host: '0.peerjs.com', port: 443, secure: true, path: '/',
    });

    const timeout = setTimeout(() => {
      tempPeer.destroy();
      setError('Host not found. Ensure the game is open on the host device.');
      setLoading(false);
    }, 8000);

    tempPeer.on('open', () => {
      const conn = tempPeer.connect(normalizedCode, { metadata: { team: mappedTeam }, reliable: true });

      conn.on('open', () => {
        clearTimeout(timeout);
        savePlayerSession({
          sessionId: normalizedCode,
          team: mappedTeam,
          connected: true,
        });
        tempPeer.destroy();
        router.push('/play');
      });

      conn.on('error', () => {
        clearTimeout(timeout);
        tempPeer.destroy();
        setError('Session not found. Double check the code.');
        setLoading(false);
      });
    });

    tempPeer.on('error', () => {
      clearTimeout(timeout);
      setError('Network error. Check your internet connection.');
      setLoading(false);
    });
  };

  const brandColor = isRed ? '#FF3B30' : '#007AFF';
  const bgGradient = isRed
    ? 'radial-gradient(circle at center, #ffffff 0%, #fff5f5 100%)'
    : 'radial-gradient(circle at center, #ffffff 0%, #f0f7ff 100%)';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bgGradient, fontFamily: "'Poppins', sans-serif" }}>
      {/* Header */}
      <header className="w-full p-6 md:p-10 flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tighter uppercase">
          <span className="text-gray-900">Smash</span>
          <span style={{ color: brandColor }}>Buzzer</span>
        </h1>
        <div className="hidden md:block">
          <span className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase ${isRed ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
            Team {isRed ? 'Red' : 'Blue'} Portal
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center px-4 pb-20">
        <section className="glass-card w-full max-w-md rounded-[2.5rem] p-10 md:p-12 border border-gray-100 text-center shadow-lg" style={{ borderColor: isRed ? 'rgba(255,59,48,0.1)' : 'rgba(0,122,255,0.1)' }}>
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Join Game</h2>
            <p className="mt-2 text-sm font-medium uppercase tracking-wider" style={{ color: brandColor }}>
              Team {isRed ? 'Red' : 'Blue'}
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-left">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1" htmlFor="game-code">
                Enter the game code
              </label>
              <input
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 text-center text-xl font-bold tracking-widest placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-normal outline-none transition-all"
                style={{ borderColor: code ? brandColor : undefined }}
                id="game-code"
                placeholder="FL-XXXX"
                required
                type="text"
                autoComplete="off"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
              />
              {error && <p className="text-red-500 font-semibold text-xs mt-2 text-center">{error}</p>}
            </div>
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-5 rounded-2xl shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 transition-all duration-200 text-lg uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: brandColor }}
              >
                <span>{loading ? 'Connecting…' : 'Join Game'}</span>
                {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
              </button>
            </div>
          </form>
          <div className="mt-12 flex justify-center opacity-10">
            <div className="w-16 h-16 border-4 rounded-full flex items-center justify-center" style={{ borderColor: brandColor }}>
              <div className="w-2 h-2 rounded-full animate-ping" style={{ background: brandColor }}></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">© 2026 SMASHBUZZER. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
