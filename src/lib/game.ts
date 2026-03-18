export interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface GameSession {
  sessionId: string;
  currentIndex: number;
  scores: { left: number; right: number };
  phase: 'idle' | 'running' | 'buzzed' | 'revealed' | 'ended';
  questions?: Question[];
}

export interface PlayerSession {
  sessionId: string;
  team: 'left' | 'right';
  connected: boolean;
}

// ── LocalStorage Keys ──
export const FL_HOST_KEY = 'fl_quiz_session';
export const FL_PLAYER_KEY = 'fl_quiz_player';

// ── Game Constants ──
export const TIMER_DURATION = 15;

// ── Session Helpers ──
export function getHostSession(): GameSession | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(FL_HOST_KEY)!); } catch { return null; }
}

export function saveHostSession(data: Partial<GameSession>) {
  if (typeof window === 'undefined') return;
  const current = getHostSession() || {} as GameSession;
  localStorage.setItem(FL_HOST_KEY, JSON.stringify({ ...current, ...data }));
}

export function getPlayerSession(): PlayerSession | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(FL_PLAYER_KEY)!); } catch { return null; }
}

export function savePlayerSession(data: PlayerSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FL_PLAYER_KEY, JSON.stringify(data));
}

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return `FL-${code}`;
}

export async function loadQuestions(): Promise<Question[]> {
  const res = await fetch('/data/questions.json');
  if (!res.ok) throw new Error('Failed to load questions');
  const allQuestions: Question[] = await res.json();
  
  // Mélanger et prendre 20 questions
  return [...allQuestions]
    .sort(() => Math.random() - 0.5)
    .slice(0, 20);
}
