'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHostPeer } from '@/contexts/HostPeerContext';
import { getHostSession, saveHostSession, loadQuestions, Question } from '@/lib/game';

export default function HostSetupPage() {
  const router = useRouter();
  const { isReady, sessionId, connStatus } = useHostPeer();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [status, setStatus] = useState('⏳ Loading questions…');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadQuestions()
      .then(qs => {
        setQuestions(qs);
        const session = getHostSession();
        if (session) {
          saveHostSession({ ...session, questions: qs });
        }
        setStatus(`✅ ${qs.length} questions loaded. Ready to launch!`);
      })
      .catch(err => setStatus(`⚠️ Error: ${err.message}`));
  }, []);

  const handleLaunch = () => {
    if (!questions) return;
    router.push('/host/game');
  };

  const handleCopy = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F9FA', fontFamily: "'Poppins', sans-serif", color: '#1C1C1E' }}>
      {/* Header */}
      <header className="w-full px-8 py-5 flex justify-between items-center bg-white border-b border-gray-100">
        <div className="flex items-center">
          <span className="font-black text-xl tracking-tight uppercase text-gray-900">SMASH</span>
          <span className="font-black text-xl tracking-tight uppercase" style={{ color: '#FF3B30' }}>BUZZER</span>
        </div>
        <div className="bg-gray-100 rounded-full px-4 py-1.5">
          <span className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Host Mode</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-8">
        <section className="max-w-[520px] w-full bg-white rounded-3xl p-14 text-center shadow-xl border border-gray-100">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Launch Game</h1>
          <p className="text-gray-400 text-sm mb-10">Generate a session code and invite your teams.</p>

          {/* Code Box */}
          <div className="mb-8">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Session Code</label>
            <div className="relative flex items-center">
              <div className="w-full py-5 px-16 bg-white border-2 border-gray-200 rounded-2xl hover:border-gray-300 transition-colors" style={{ fontFamily: "'Bebas Neue', monospace", fontSize: '2.25rem', letterSpacing: '0.25em', color: '#1C1C1E', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '74px' }}>
                {sessionId || '——'}
              </div>
              <button onClick={handleCopy} className="absolute right-3 p-2.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400" title="Copy code">
                {copied ? (
                  <svg className="w-5 h-5" fill="none" stroke="#22C55E" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                )}
              </button>
            </div>
            <p className="mt-3 text-sm text-gray-400">{status}</p>
          </div>

          {/* Connection Status */}
          {isReady && (
            <div className="mb-6 py-4 px-5 bg-gray-50 border border-gray-100 rounded-xl">
              <div className="flex justify-center gap-10 text-sm">
                <div className="flex items-center gap-2">
                  <span className={`conn-dot ${connStatus.left ? 'connected' : ''}`}></span>
                  <span className="text-gray-500">Team Red</span>
                  <span className="text-gray-400 text-xs">{connStatus.left ? 'Joined ✓' : 'Offline'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`conn-dot ${connStatus.right ? 'connected' : ''}`}></span>
                  <span className="text-gray-500">Team Blue</span>
                  <span className="text-gray-400 text-xs">{connStatus.right ? 'Joined ✓' : 'Offline'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {questions && (
              <button onClick={handleLaunch} className="w-full py-4 bg-gray-900 text-white rounded-full font-bold text-base hover:bg-black transition-all shadow-lg cursor-pointer">
                🚀 Launch Game
              </button>
            )}
            <a href="/" className="block w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors text-center">
              ← Back to Lobby
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p className="text-[10px] font-bold text-gray-300 tracking-[0.2em] uppercase">© 2026 SMASHBUZZER. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
