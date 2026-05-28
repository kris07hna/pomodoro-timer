export const HISTORY_KEY = "pomodoro_day";
export const ACTIVE_KEY = "pomodoro_active";

export type Mode = "focus" | "break";

export type SessionEntry = {
  dur: number;
  at: number;
};

export type ActiveState = {
  focusM: number;
  breakM: number;
  cyclesTarget: number;
  cyclesRemaining: number;
  mode: Mode;
  started: boolean;
  running: boolean;
  timeLeft: number;
  endAt: number | null;
};

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const loadHistory = (): SessionEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { date?: string; sessions?: SessionEntry[] };
    if (parsed.date !== todayKey()) return [];
    return Array.isArray(parsed.sessions) ? parsed.sessions : [];
  } catch {
    return [];
  }
};

export const saveHistory = (sessions: SessionEntry[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify({ date: todayKey(), sessions }));
};

export const loadActive = (): Partial<ActiveState> | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<ActiveState>;
  } catch {
    return null;
  }
};

export const saveActive = (state: ActiveState) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(state));
};
