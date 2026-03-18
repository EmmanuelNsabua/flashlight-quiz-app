'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerPeer } from '@/contexts/PlayerPeerContext';
import { getPlayerSession, TIMER_DURATION } from '@/lib/game';

const CIRCUMFERENCE = 2 * Math.PI * 54;

interface QuestionData {
  question: string;
  options: string[];
  index: number;
  total: number;
}

export default function PlayerGamePage() {
  const router = useRouter();
  const { isConnected, statusText, onMessage, sendData } = usePlayerPeer();
  const [team, setTeam] = useState<'left' | 'right'>('left');
  const [sessionId, setSessionId] = useState('——');
  const [buzzSent, setBuzzSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [status, setStatus] = useState('⏳ Connecting…');
  const [statusCls, setStatusCls] = useState('status-waiting');
  const [revealedCorrect, setRevealedCorrect] = useState<number | null>(null);
  const [showEnd, setShowEnd] = useState(false);
  const [endMsg, setEndMsg] = useState('');
  const [endScores, setEndScores] = useState({ left: 0, right: 0 });

  useEffect(() => {
    const saved = getPlayerSession();
    if (!saved?.sessionId || !saved?.team) {
      router.push('/');
      return;
    }
    setTeam(saved.team);
    setSessionId(saved.sessionId);
  }, [router]);

  useEffect(() => {
    if (isConnected) {
      setStatus('✅ Connected! Wait for the question.');
      setStatusCls('status-connected');
    } else {
      setStatus(`⏳ ${statusText}`);
      setStatusCls('status-waiting');
    }
  }, [isConnected, statusText]);

  // ── Handle messages from host ──
  useEffect(() => {
    onMessage.current = (data: Record<string, unknown>) => {
      switch (data.type) {
        case 'question':
          setQuestion({
            question: data.question as string,
            options: data.options as string[],
            index: data.index as number,
            total: data.total as number,
          });
          setBuzzSent(false);
          setRevealedCorrect(null);
          setTimeLeft(TIMER_DURATION);
          setStatus('🎯 Get ready to buzz!');
          setStatusCls('status-waiting');
          break;
        case 'timerStart':
          setStatus('⏱ Timer started!');
          setStatusCls('status-waiting');
          break;
        case 'timer':
          setTimeLeft(data.seconds as number);
          if ((data.seconds as number) <= 0 && !buzzSent) {
            setStatus('⏰ Time\'s up!');
            setStatusCls('status-waiting');
          }
          break;
        case 'buzzAck':
          if (data.team === team) {
            setStatus('🔔 YOU BUZZED FIRST! Answer now!');
            setStatusCls('status-first');
          } else {
            setStatus('😔 Other team buzzed first.');
            setStatusCls('status-late');
          }
          break;
        case 'answer':
          setRevealedCorrect(data.correctIndex as number);
          setStatus('✅ Answer revealed!');
          setStatusCls('status-connected');
          break;
        case 'nextQuestion':
          setBuzzSent(false);
          setRevealedCorrect(null);
          setStatus('➡ Next question incoming…');
          setStatusCls('status-waiting');
          break;
        case 'gameOver':
          showEndScreen(data.scores as { left: number; right: number });
          break;
      }
    };
  }, [team, buzzSent, onMessage]);

  const sendBuzz = useCallback(() => {
    if (buzzSent || !isConnected) return;
    setBuzzSent(true);
    playBuzzSound();
    sendData({ type: 'buzz', team });
    setStatus('🔴 Buzz sent!');
    setStatusCls('status-sent');
  }, [buzzSent, isConnected, team, sendData]);

  const showEndScreen = (scores: { left: number; right: number }) => {
    setEndScores(scores);
    let winner: 'left' | 'right' | null = null;
    if (scores.left > scores.right) winner = 'left';
    else if (scores.right > scores.left) winner = 'right';

    const isWin = winner === team;
    const msg = isWin ? '🏆 Victory!' : (winner === null ? '🤝 It\'s a Tie!' : '😔 Nice try!');
    setEndMsg(msg);
    setShowEnd(true);
  };

  const playBuzzSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  const isRed = team === 'left';
  const brandColor = isRed ? '#FF3B30' : '#007AFF';
  const timerPct = Math.max(0, timeLeft) / TIMER_DURATION;
  const timerOffset = CIRCUMFERENCE * (1 - timerPct);
  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const letters = ['A', 'B', 'C', 'D'];
  const teamLabel = isRed ? 'TEAM RED' : 'TEAM BLUE';

  return (
    <div className={`min-h-screen flex flex-col ${isRed ? 'team-left' : 'team-right'}`}
         style={{ background: isRed ? 'radial-gradient(circle at center, #ffffff 0%, #fff5f5 100%)' : 'radial-gradient(circle at center, #ffffff 0%, #f0f7ff 100%)', fontFamily: "'Poppins', sans-serif" }}>

      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center bg-white/50 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="text-[10px] font-black tracking-[0.2em] uppercase" style={{ color: brandColor }}>{teamLabel}</span>
          <span className="text-xs text-gray-400 font-mono tracking-widest mt-0.5">{sessionId}</span>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: isConnected ? '#22C55E' : '#9CA3AF' }}></div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{isConnected ? 'Connected' : 'Offline'}</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center px-6 py-10 max-w-4xl mx-auto w-full gap-12">

        {/* Status Banner */}
        <div className={`status-banner px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-center w-full max-w-md shadow-sm ${statusCls}`}>
          {status}
        </div>

        {/* Buzzer + Timer Container */}
        <div className="relative flex flex-col items-center justify-center">
          
          {/* Timer Ring (SVG) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: 'scale(1.4)' }}>
            <svg width="200" height="200" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="54" fill="none" stroke="#E5E7EB" strokeWidth="2" strokeOpacity="0.2" />
              <circle cx="65" cy="65" r="54" fill="none" stroke={isUrgent ? '#FF3B30' : brandColor} strokeWidth="4"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={timerOffset} strokeLinecap="round" className="timer-ring-fill" />
            </svg>
          </div>

          {/* Buzzer Button */}
          <button onClick={sendBuzz} disabled={buzzSent || !isConnected || !question}
            className="btn-buzz z-10"
            style={{ 
              background: buzzSent ? '#D1D5DB' : brandColor, 
              boxShadow: buzzSent ? 'none' : `0 20px 60px ${isRed ? 'rgba(255,59,48,0.5)' : 'rgba(0,122,255,0.5)'}`,
              width: '160px',
              height: '160px',
              fontSize: '1.5rem'
            }}>
            BUZZ
          </button>
        </div>

        {/* Countdown Info */}
        <div className="flex flex-col items-center gap-1">
          <span className={`text-6xl font-black italic tracking-tighter ${isUrgent ? 'text-red-500 animate-pulse' : 'text-gray-900'}`} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            {Math.max(0, timeLeft)}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Seconds Remaining</span>
        </div>

      </main>

      {/* End Overlay */}
      {showEnd && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-10 text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${isRed ? 'bg-red-50' : 'bg-blue-50'}`}>
            <div className="w-12 h-12 rounded-full" style={{ background: brandColor }}></div>
          </div>
          <h1 className="text-4xl font-black text-gray-900 uppercase italic mb-4 tracking-tighter">{endMsg}</h1>
          <div className="flex gap-4 mb-10">
            <span className="text-red-500 font-bold">Red: {endScores.left}</span>
            <span className="text-gray-300">|</span>
            <span className="text-blue-500 font-bold">Blue: {endScores.right}</span>
          </div>
          <a href="/" className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-gray-800 transition-all">
            Back to Lobby
          </a>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full py-8 text-center mt-auto">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">© 2026 SMASHBUZZER. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}
