'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getHostSession, saveHostSession, FL_HOST_KEY } from '@/lib/game';

export default function HostResultsPage() {
  const router = useRouter();
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [winner, setWinner] = useState<'left' | 'right' | 'tie'>('tie');

  useEffect(() => {
    const session = getHostSession();
    if (!session) { router.push('/'); return; }
    const s = session.scores || { left: 0, right: 0 };
    setScores(s);
    if (s.left > s.right) setWinner('left');
    else if (s.right > s.left) setWinner('right');
    else setWinner('tie');
  }, [router]);

  const playAgain = () => {
    localStorage.removeItem(FL_HOST_KEY);
    router.push('/');
  };

  const winnerText = winner === 'left' ? '🏆 TEAM RED WINS!' : winner === 'right' ? '🏆 TEAM BLUE WINS!' : '🤝 IT\'S A TIE!';
  const winnerColor = winner === 'left' ? 'text-red-500' : winner === 'right' ? 'text-blue-500' : 'text-gray-800';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: '#F8F9FA', fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-[480px] w-full bg-white rounded-3xl p-12 text-center shadow-xl border border-gray-100">

        {/* Header */}
        <div className="flex justify-center items-center mb-6">
          <span className="font-black text-lg tracking-tight uppercase text-gray-900">SMASH</span>
          <span className="font-black text-lg tracking-tight uppercase text-red-500">BUZZER</span>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-5">Game Over</p>

        {/* Winner Text */}
        <div className={`text-4xl font-black ${winnerColor} mb-8`} style={{ fontFamily: "'Bebas Neue', sans-serif", animation: 'winnerEntrance 0.8s cubic-bezier(0.175,0.885,0.32,1.275)' }}>
          {winnerText}
        </div>

        {/* Score Cards */}
        <div className="flex gap-4 justify-center mb-8">
          <div className="py-5 px-7 rounded-2xl min-w-[110px]" style={{ background: 'rgba(255,59,48,0.06)', border: '2px solid rgba(255,59,48,0.2)' }}>
            <p className="text-[10px] font-bold text-red-500 mb-2">⬅ TEAM RED</p>
            <p className="text-5xl font-black text-red-500" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{scores.left}</p>
          </div>
          <div className="py-5 px-7 rounded-2xl min-w-[110px]" style={{ background: 'rgba(0,122,255,0.06)', border: '2px solid rgba(0,122,255,0.2)' }}>
            <p className="text-[10px] font-bold text-blue-500 mb-2">TEAM BLUE ➡</p>
            <p className="text-5xl font-black text-blue-500" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{scores.right}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button onClick={playAgain} className="w-full py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-black transition-all shadow-lg cursor-pointer">
            🔄 Play Again
          </button>
          <a href="/" className="block w-full py-3 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors text-center">
            ← Back to Lobby
          </a>
        </div>
      </div>
    </div>
  );
}
