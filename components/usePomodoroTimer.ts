"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatDateTimeWithZone } from "./timer-format";
import { ActiveState, loadActive, loadHistory, Mode, saveActive, saveHistory, SessionEntry } from "./timer-storage";

const AUDIO_FILE = "/mixkit-digital-clock-digital-alarm-buzzer-992.wav";
const FLASH_MS = 4000;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const now = () => new Date().getTime();

export function usePomodoroTimer() {
  const [focusM, setFocusM] = useState(25);
  const [breakM, setBreakM] = useState(5);
  const [cyclesTarget, setCyclesTarget] = useState(4);
  const [cyclesRemaining, setCyclesRemaining] = useState(4);
  const [mode, setMode] = useState<Mode>("focus");
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [fractional, setFractional] = useState("0.00");
  const [history, setHistory] = useState<SessionEntry[]>([]);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [flashActive, setFlashActive] = useState(false);
  const [completedMessage, setCompletedMessage] = useState("");

  const endRef = useRef<number | null>(null);
  const intRef = useRef<number | null>(null);
  const cycleHandledRef = useRef(false);
  const flashTimeoutRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const finishCycleRef = useRef<() => void>(() => {});
  const lastBreakRef = useRef(false);
  const cueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startOrResumeRef = useRef<() => void>(() => {});
  const pauseRef = useRef<() => void>(() => {});
  const resetRef = useRef<() => void>(() => {});
  const persistRef = useRef<(override?: Partial<ActiveState>) => void>(() => {});
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});

  const clearTimer = () => {
    if (intRef.current) clearInterval(intRef.current);
    intRef.current = null;
  };

  const syncTime = () => {
    if (!endRef.current) return;
    const remMs = Math.max(0, endRef.current - now());
    setTimeLeft(Math.max(0, Math.ceil(remMs / 1000)));
    setFractional(((remMs % 1000) / 1000).toFixed(2));
  };

  const persist = (override?: Partial<ActiveState>) => {
    if (!restoredRef.current) return;
    saveActive({ focusM, breakM, cyclesTarget, cyclesRemaining, mode, started, running, timeLeft, endAt: endRef.current, ...override });
  };

  const flashBlue = () => {
    setFlashActive(true);
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashActive(false);
      flashTimeoutRef.current = null;
    }, FLASH_MS);
  };

  const playCue = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
      if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
      cueTimeoutRef.current = setTimeout(() => { audio.pause(); audio.currentTime = 0; }, 2000);
      return;
    }
    try {
      const ctx = audioCtxRef.current!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 180);
    } catch {}
  };

  const finishCycle = () => {
    if (cycleHandledRef.current) return;
    cycleHandledRef.current = true;
    playCue();
    flashBlue();

    if (mode === "focus") {
      const nextHistory = [...history, { dur: focusM * 60, at: now() }];
      setHistory(nextHistory);
      saveHistory(nextHistory);
      const isLast = cyclesRemaining === 1;
      setCyclesRemaining(isLast ? cyclesTarget : cyclesRemaining - 1);
      lastBreakRef.current = isLast;
    }

    if (mode === "break" && lastBreakRef.current) {
      lastBreakRef.current = false;
      // Use the shared reset logic to ensure consistent state cleanup
      reset();
      setCompletedMessage("Successfully completed all cycles!");
      // Try to notify the user via the Notifications API
      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Pomodoro complete", { body: "Successfully completed all cycles!" });
          } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then((perm) => {
              if (perm === "granted") new Notification("Pomodoro complete", { body: "Successfully completed all cycles!" });
            }).catch(() => {});
          }
        }
      } catch {}
      return;
    }

    const nextMode: Mode = mode === "focus" ? "break" : "focus";
    const nextSeconds = (nextMode === "focus" ? focusM : breakM) * 60;
    setMode(nextMode);
    setTimeLeft(nextSeconds);
    setFractional("0.00");
    endRef.current = now() + nextSeconds * 1000;
    setStarted(true);
    setRunning(true);
    persist({ mode: nextMode, timeLeft: nextSeconds, endAt: endRef.current, started: true, running: true });
  };

  const startOrResume = () => {
    const seconds = started ? timeLeft : (mode === "focus" ? focusM : breakM) * 60;
    const a = audioRef.current;
    if (a) {
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
    }
    cycleHandledRef.current = false;
    setCompletedMessage("");
    if (!started) setStarted(true);
    setRunning(true);
    setTimeLeft(seconds);
    setFractional("0.00");
    endRef.current = now() + seconds * 1000;
    persist({ started: true, running: true, timeLeft: seconds, endAt: endRef.current });
  };

  const pause = () => {
    const remainingMs = endRef.current ? Math.max(0, endRef.current - now()) : timeLeft * 1000;
    endRef.current = null;
    setRunning(false);
    setTimeLeft(Math.ceil(remainingMs / 1000));
    setFractional(((remainingMs % 1000) / 1000).toFixed(2));
    clearTimer();
    persist({ running: false, timeLeft: Math.ceil(remainingMs / 1000), endAt: null });
  };

  const reset = () => {
    clearTimer();
    endRef.current = null;
    cycleHandledRef.current = false;
    setCompletedMessage("");
    setMode("focus");
    setStarted(false);
    setRunning(false);
    setTimeLeft(focusM * 60);
    setFractional("0.00");
    setCyclesRemaining(cyclesTarget);
    persist({ mode: "focus", started: false, running: false, timeLeft: focusM * 60, endAt: null, cyclesRemaining: cyclesTarget });
  };

  useEffect(() => { finishCycleRef.current = finishCycle; });
  useEffect(() => { startOrResumeRef.current = startOrResume; });
  useEffect(() => { pauseRef.current = pause; });
  useEffect(() => { resetRef.current = reset; });
  useEffect(() => { persistRef.current = persist; });
  useEffect(() => {
    onKeyRef.current = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "BUTTON" || t.isContentEditable)) return;
      if (e.code === "Space") { e.preventDefault(); if (running) pauseRef.current(); else startOrResumeRef.current(); }
      if (e.key.toLowerCase() === "r") resetRef.current();
    };
  });

  useEffect(() => {
    audioRef.current = new Audio(AUDIO_FILE);
    audioRef.current.preload = "auto";
    try { audioCtxRef.current = new AudioContext(); } catch {}
    setTimeout(() => setHistory(loadHistory()), 0);

    const active = loadActive();
    if (!active) { restoredRef.current = true; return; }
    const f = clamp(Number(active.focusM) || 25, 1, 180);
    const b = clamp(Number(active.breakM) || 5, 1, 60);
    const ct = clamp(Number(active.cyclesTarget) || 4, 1, 4);
    const cr = clamp(Number(active.cyclesRemaining) || ct, 1, ct);
    const m: Mode = active.mode === "break" ? "break" : "focus";
    const tl = Math.max(0, Math.floor(Number(active.timeLeft) || 0));
    const endAt = typeof active.endAt === "number" ? active.endAt : null;
    setTimeout(() => {
      setFocusM(f); setBreakM(b); setCyclesTarget(ct); setCyclesRemaining(cr); setMode(m);
      if (active.running && endAt && endAt > now()) {
        const rem = endAt - now();
        cycleHandledRef.current = false;
        setStarted(true); setRunning(true); setTimeLeft(Math.ceil(rem / 1000));
        setFractional(((rem % 1000) / 1000).toFixed(2));
        endRef.current = endAt;
      } else {
        setStarted(Boolean(active.started)); setRunning(false);
        setTimeLeft(tl || (m === "focus" ? f * 60 : b * 60)); setFractional("0.00");
        endRef.current = null;
      }
      restoredRef.current = true;
    }, 0);
    return () => { if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current); };
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    persistRef.current();
  }, [focusM, breakM, cyclesTarget, cyclesRemaining, mode, started, running]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKeyRef.current(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!endRef.current || !running) return;
      syncTime();
      if (endRef.current - now() <= 0) finishCycleRef.current();
    }, 250);
    intRef.current = id;
    return clearTimer;
  }, [running, mode, history, cyclesRemaining]);

  useEffect(() => {
    const onVis = () => { syncTime(); if (endRef.current && endRef.current - now() <= 0) finishCycleRef.current(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    setTimeout(() => setCurrentDateTime(formatDateTimeWithZone()), 0);
    const id = window.setInterval(() => setCurrentDateTime(formatDateTimeWithZone()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!completedMessage) return;
    const id = setTimeout(() => setCompletedMessage(""), 5000);
    return () => clearTimeout(id);
  }, [completedMessage]);

  const displayTime = !started && !running ? (mode === "focus" ? focusM : breakM) * 60 : timeLeft;
  const displayFraction = !started && !running ? "0.00" : fractional;
  const statusLabel = !started ? "Ready" : running ? (mode === "focus" ? "Focusing" : "Break") : "Paused";

  const setFocusMWrapped = useCallback((v: number) => setFocusM(clamp(v, 1, 180)), []);
  const setBreakMWrapped = useCallback((v: number) => setBreakM(clamp(v, 1, 60)), []);
  const setCyclesTargetWrapped = useCallback((v: number) => {
    const next = clamp(v, 1, 4);
    setCyclesTarget(next);
    setCyclesRemaining((prev) => Math.min(next, prev));
  }, []);

  return {
    focusM, breakM, cyclesTarget, cyclesRemaining, mode, history, currentDateTime,
    statusLabel, displayTime, displayFraction, started, running, flashActive,
    completedMessage, dismissCompleted: () => setCompletedMessage(""),
    setFocusM: setFocusMWrapped,
    setBreakM: setBreakMWrapped,
    setCyclesTarget: setCyclesTargetWrapped,
    startOrResume, pause, reset,
  };
}
