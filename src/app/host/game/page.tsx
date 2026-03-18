'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useHostPeer } from '@/contexts/HostPeerContext';
import { getHostSession, saveHostSession, Question, TIMER_DURATION } from '@/lib/game';

const CIRCUMFERENCE = 2 * Math.PI * 78;

export default function HostGamePage() {
  const router = useRouter();
  const { broadcast, onPlayerMessage, connStatus, sessionId, onConnection } = useHostPeer();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState({ left: 0, right: 0 });
  const [phase, setPhase] = useState<'idle' | 'running' | 'buzzed' | 'revealed' | 'ended'>('idle');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [buzzedTeam, setBuzzedTeam] = useState<'left' | 'right' | null>(null);
  const [phaseLabel, setPhaseLabel] = useState('🎯 Ready — click START TIMER');
  const [showScoring, setShowScoring] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  const buzzedRef = useRef(buzzedTeam);

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { buzzedRef.current = buzzedTeam; }, [buzzedTeam]);

  // ── Restore state from localStorage ──
  useEffect(() => {
    const session = getHostSession();
    if (!session?.questions?.length) {
      router.push('/host');
      return;
    }
    setQuestions(session.questions);
    setCurrentIndex(session.currentIndex || 0);
    setScores(session.scores || { left: 0, right: 0 });
  }, [router]);

  // ── Send current question to players when they join ──
  useEffect(() => {
    onConnection.current = (team) => {
      if (questions.length === 0) return;
      const q = questions[currentIndex];
      if (!q) return;
      // The broadcast here is intentional — sends to ALL connected
      broadcast({
        type: 'question', index: currentIndex,
        question: q.question, options: q.options, total: questions.length,
      });
      broadcast({ type: 'scored', team: null, scores });
    };
  }, [questions, currentIndex, scores, broadcast, onConnection]);

  // ── Handle incoming buzz ──
  useEffect(() => {
    onPlayerMessage.current = (team, data) => {
      if (data.type !== 'buzz') return;
      if (phaseRef.current !== 'running' && phaseRef.current !== 'buzzed') return;
      if (buzzedRef.current !== null) return;

      setBuzzedTeam(team);
      setPhase('buzzed');
      setShowScoring(true);
      playBuzzSound();
      broadcast({ type: 'buzzAck', team });
      setPhaseLabel(`🔔 Team ${team === 'left' ? 'RED' : 'BLUE'} buzzed!`);
    };
  }, [broadcast, onPlayerMessage]);

  // ── Persist state ──
  const persistState = useCallback((idx: number, sc: typeof scores, ph: string) => {
    saveHostSession({ currentIndex: idx, scores: sc, phase: ph as 'idle' });
  }, []);

  // ── Timer ──
  const startTimer = () => {
    if (phase !== 'idle') return;
    setPhase('running');
    setTimeLeft(TIMER_DURATION);
    broadcastQuestion();
    broadcast({ type: 'timerStart', seconds: TIMER_DURATION });

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        broadcast({ type: 'timer', seconds: next });
        if (next <= 0) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          if (phaseRef.current === 'running') {
            setPhase('buzzed');
            setPhaseLabel('⏰ Time\'s up!');
            setShowScoring(true);
          }
        }
        return next;
      });
    }, 1000);
  };

  const broadcastQuestion = () => {
    const q = questions[currentIndex];
    if (!q) return;
    broadcast({
      type: 'question', index: currentIndex,
      question: q.question, options: q.options, total: questions.length,
    });
  };

  // ── Show Answer ──
  const showAnswer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setPhase('revealed');
    const correct = questions[currentIndex]?.correctAnswer;
    broadcast({ type: 'answer', correctIndex: correct });
    setPhaseLabel('✅ Correct answer revealed!');
    setShowScoring(true);
  };

  // ── Scoring ──
  const awardPoint = (team: 'left' | 'right') => {
    setScores(prev => {
      const next = { ...prev, [team]: prev[team] + 1 };
      persistState(currentIndex, next, 'buzzed');
      broadcast({ type: 'scored', team, scores: next });
      return next;
    });
    setShowScoring(false);
    setPhaseLabel(`🏅 +1 point to Team ${team === 'left' ? 'RED' : 'BLUE'}!`);
  };

  const noPoint = () => {
    setShowScoring(false);
    setPhaseLabel('➡ No point.');
  };

  // ── Next Question ──
  const nextQuestion = () => {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= questions.length) {
      endGame();
      return;
    }
    setCurrentIndex(nextIdx);
    setBuzzedTeam(null);
    setPhase('idle');
    setShowScoring(false);
    setTimeLeft(TIMER_DURATION);
    persistState(nextIdx, scores, 'idle');
    broadcast({ type: 'nextQuestion', index: nextIdx });
    setPhaseLabel('🎯 Ready — click START TIMER');
  };

  // ── End Game ──
  const endGame = () => {
    broadcast({ type: 'gameOver', scores });
    saveHostSession({ scores, phase: 'ended' });
    router.push('/host/results');
  };

  // ── Audio ──
  const playBuzzSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  // ── Derived values ──
  const q = questions[currentIndex];
  const timerPct = timeLeft / TIMER_DURATION;
  const timerOffset = CIRCUMFERENCE * (1 - timerPct);
  const isUrgent = timeLeft <= 5 && timeLeft > 0;
  const letters = ['A', 'B', 'C', 'D'];

  if (!q) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading game…</div>;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0f1a', fontFamily: "'Space Grotesk', sans-serif", color: '#F0F4F8' }}>
      {/* Header */}
      <header className="px-8 py-4 flex justify-between items-center border-b border-white/10">
        <div className="flex items-center gap-4">
          <span className="font-bold text-lg tracking-tight">SMASH<span className="text-red-500">BUZZER</span></span>
          <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest text-gray-400 uppercase">{sessionId}</span>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className={`conn-dot ${connStatus.left ? 'connected' : 'error'}`}></span>
            <span className="text-gray-400">Red</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`conn-dot ${connStatus.right ? 'connected' : 'error'}`}></span>
            <span className="text-gray-400">Blue</span>
          </div>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-5xl mx-auto w-full">

        {/* Phase Label */}
        <div className="text-center text-sm font-semibold text-gray-400">{phaseLabel}</div>

        {/* Question + Timer Row */}
        <div className="w-full grid grid-cols-[1fr_auto_1fr] gap-6 items-start">

          {/* Panel Red */}
          <div className={`team-card rounded-2xl p-6 text-center border border-white/10 bg-white/5 ${buzzedTeam === 'left' ? 'buzzed' : ''}`}>
            <div className="text-[10px] font-bold text-red-400 tracking-widest uppercase mb-2">Team Red</div>
            <div className="text-5xl font-black text-red-500" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{scores.left}</div>
            <div className={`mt-4 w-20 h-20 mx-auto rounded-full border-4 flex items-center justify-center text-sm font-bold transition-all ${buzzedTeam === 'left' ? 'buzzer-active-red border-red-500 bg-red-500/20 text-white' : 'border-red-500/30 text-red-400/60 bg-red-500/5'}`}>
              <span>{buzzedTeam === 'left' ? 'BUZZ!' : 'READY'}</span>
            </div>
          </div>

          {/* Center: Timer + Question */}
          <div className="flex flex-col items-center gap-6 min-w-[320px]">
            {/* Timer SVG */}
            <div className="relative flex items-center justify-center">
              <svg width="180" height="180" viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle cx="90" cy="90" r="78" fill="none"
                  stroke={isUrgent ? '#FF3B30' : '#22C55E'}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={timerOffset}
                  className="timer-ring-fill"
                />
              </svg>
              <span className={`absolute text-4xl font-black ${isUrgent ? 'text-red-500' : 'text-white'}`} style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                {Math.max(0, timeLeft)}
              </span>
            </div>

            {/* Question Card */}
            <div className="glass-effect rounded-2xl p-6 w-full text-center">
              <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">
                Question {currentIndex + 1} / {questions.length}
              </p>
              <h2 className="text-lg font-bold text-gray-900 mb-4">{q.question}</h2>
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt, i) => (
                  <div key={i} className={`option-btn flex items-center gap-3 py-3 px-4 rounded-xl border border-gray-200 bg-white text-gray-800 text-sm font-semibold ${phase === 'revealed' && i === q.correctAnswer ? 'correct' : ''} ${phase === 'revealed' && i !== q.correctAnswer ? 'reveal-wrong' : ''}`}>
                    <span className="opt-key flex items-center justify-center w-7 h-7 bg-gray-100 rounded-lg font-black text-xs text-gray-400 shrink-0">{letters[i]}</span>
                    <span>{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Buzz Alert */}
            {buzzedTeam && (
              <div className={`px-6 py-3 rounded-full text-sm font-bold animate-buzz-flash ${buzzedTeam === 'left' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                🔔 Team {buzzedTeam === 'left' ? 'RED' : 'BLUE'} BUZZED FIRST!
              </div>
            )}
          </div>

          {/* Panel Blue */}
          <div className={`team-card rounded-2xl p-6 text-center border border-white/10 bg-white/5 ${buzzedTeam === 'right' ? 'buzzed' : ''}`}>
            <div className="text-[10px] font-bold text-blue-400 tracking-widest uppercase mb-2">Team Blue</div>
            <div className="text-5xl font-black text-blue-500" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{scores.right}</div>
            <div className={`mt-4 w-20 h-20 mx-auto rounded-full border-4 flex items-center justify-center text-sm font-bold transition-all ${buzzedTeam === 'right' ? 'buzzer-active-blue border-blue-500 bg-blue-500/20 text-white' : 'border-blue-500/30 text-blue-400/60 bg-blue-500/5'}`}>
              <span>{buzzedTeam === 'right' ? 'BUZZ!' : 'READY'}</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <button onClick={startTimer} disabled={phase !== 'idle'} className="px-6 py-3 bg-green-600 text-white rounded-full font-bold text-sm hover:bg-green-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
            ▶ Start Timer
          </button>
          <button onClick={showAnswer} disabled={phase === 'idle' || phase === 'revealed'} className="px-6 py-3 bg-amber-500 text-white rounded-full font-bold text-sm hover:bg-amber-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
            👁 Reveal Answer
          </button>
          <button onClick={nextQuestion} disabled={phase === 'idle' || phase === 'running'} className="px-6 py-3 bg-white/10 text-white rounded-full font-bold text-sm hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer">
            ➡ Next Question
          </button>
        </div>

        {/* Scoring Controls */}
        {showScoring && (
          <div className="flex items-center gap-3 animate-slide-up">
            <button onClick={() => awardPoint('left')} className="px-5 py-2 bg-red-500 text-white rounded-full font-bold text-sm hover:bg-red-600 transition-all cursor-pointer">
              🔴 Point Red
            </button>
            <button onClick={noPoint} className="px-5 py-2 bg-white/10 text-gray-300 rounded-full font-bold text-sm hover:bg-white/20 transition-all cursor-pointer">
              No Point
            </button>
            <button onClick={() => awardPoint('right')} className="px-5 py-2 bg-blue-500 text-white rounded-full font-bold text-sm hover:bg-blue-600 transition-all cursor-pointer">
              🔵 Point Blue
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
