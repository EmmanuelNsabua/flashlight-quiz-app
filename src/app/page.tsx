'use client';

import { useRouter } from 'next/navigation';
import { generateSessionCode, saveHostSession } from '@/lib/game';

export default function LandingPage() {
  const router = useRouter();

  const startHost = () => {
    const sessionId = generateSessionCode();
    saveHostSession({
      sessionId,
      currentIndex: 0,
      scores: { left: 0, right: 0 },
      phase: 'idle',
    });
    router.push('/host');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900" style={{ fontFamily: "'Inter', 'Poppins', sans-serif" }}>
      {/* Header */}
      <header className="pt-16 pb-12 text-center">
        <h1 className="text-5xl md:text-6xl title-logo mb-4">
          <span className="text-smash">Smash</span><span className="text-buzzer">Buzzer</span>
        </h1>
        <p className="text-gray-500 text-lg font-medium tracking-wide">
          CHOOSE YOUR ROLE TO JOIN THE GAME
        </p>
      </header>

      {/* Role Cards */}
      <main className="flex-grow container mx-auto px-4 pb-20 max-w-6xl flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">

          {/* Host Card */}
          <div className="glass-card neutral-glow-hover rounded-3xl p-10 flex flex-col items-center justify-between text-center cursor-pointer shadow-sm"
               onClick={startHost}>
            <div className="mb-8">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <svg className="h-12 w-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Host</h2>
              <p className="text-gray-500">Control the game flow, questions, and scoring.</p>
            </div>
            <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-wider hover:bg-black transition-colors cursor-pointer">
              Start as Host
            </button>
          </div>

          {/* Team Red Card */}
          <div className="glass-card red-glow-hover rounded-3xl p-10 flex flex-col items-center justify-between text-center cursor-pointer shadow-sm"
               onClick={() => router.push('/join/red')}>
            <div className="mb-8">
              <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6 mx-auto shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <div className="w-16 h-16 bg-buzzer-red rounded-full"></div>
              </div>
              <h2 className="text-3xl font-bold text-buzzer-red mb-2">Team Red</h2>
              <p className="text-gray-500">Join the red squad and dominate the arena.</p>
            </div>
            <button className="w-full py-4 bg-buzzer-red text-white rounded-2xl font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg shadow-red-200 cursor-pointer">
              Join Red
            </button>
          </div>

          {/* Team Blue Card */}
          <div className="glass-card blue-glow-hover rounded-3xl p-10 flex flex-col items-center justify-between text-center cursor-pointer shadow-sm"
               onClick={() => router.push('/join/blue')}>
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 mx-auto shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                <div className="w-16 h-16 bg-buzzer-blue rounded-full"></div>
              </div>
              <h2 className="text-3xl font-bold text-buzzer-blue mb-2">Team Blue</h2>
              <p className="text-gray-500">Join the blue squad and outsmart the competition.</p>
            </div>
            <button className="w-full py-4 bg-buzzer-blue text-white rounded-2xl font-bold uppercase tracking-wider hover:bg-blue-600 transition-colors shadow-lg shadow-blue-200 cursor-pointer">
              Join Blue
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 text-center border-t border-gray-100">
        <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">
          © 2026 SMASHBUZZER. ALL RIGHTS RESERVED.
        </p>
      </footer>
    </div>
  );
}
