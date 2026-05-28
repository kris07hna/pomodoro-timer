"use client";

import { useEffect, useRef, useState } from "react";
import { formatDateTimeWithZone, now } from "./timer-format";
import { ActiveState, loadActive, loadHistory, Mode, saveActive, saveHistory, SessionEntry } from "./timer-storage";

const AUDIO_FILE = "/mixkit-digital-clock-digital-alarm-buzzer-992.wav";
const FLASH_MS = 4000;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

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

  const endRef = useRef<number | null>(null);
  const intRef = useRef<number | null>(null);
  const handledEndRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<number | null>(null);
  const restoredRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const finishCycleRef = useRef<() => void>(() => {});
  const lastBreakRef = useRef(false);

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
    document.body.classList.add("flash-invert");
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
    flashTimeoutRef.current = window.setTimeout(() => {
      document.body.classList.remove("flash-invert");
      flashTimeoutRef.current = null;
    }, FLASH_MS);
  };

  const cueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const ctx = new AudioContext();
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
    const endAt = endRef.current;
    if (!endAt || handledEndRef.current === endAt) return;
    handledEndRef.current = endAt;
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
      clearTimer();
      setMode("focus");
      setStarted(false);
      setRunning(false);
      setTimeLeft(focusM * 60);
      setFractional("0.00");
      endRef.current = null;
      persist({ mode: "focus", started: false, running: false, timeLeft: focusM * 60, endAt: null });
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

  useEffect(() => { finishCycleRef.current = finishCycle; });

  const startOrResume = () => {
    const seconds = started ? timeLeft : (mode === "focus" ? focusM : breakM) * 60;
    const a = audioRef.current;
    if (a) { a.muted = true; a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; }); }
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
    handledEndRef.current = null;
    setMode("focus");
    setStarted(false);
    setRunning(false);
    setTimeLeft(focusM * 60);
    setFractional("0.00");
    setCyclesRemaining(cyclesTarget);
    persist({ mode: "focus", started: false, running: false, timeLeft: focusM * 60, endAt: null, cyclesRemaining: cyclesTarget });
  };

  useEffect(() => {
    audioRef.current = new Audio(AUDIO_FILE);
    audioRef.current.preload = "auto";
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
  }, []);

  useEffect(() => {
    if (!restoredRef.current) return;
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusM, breakM, cyclesTarget, cyclesRemaining, mode, started, running, timeLeft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.isContentEditable)) return;
      if (e.code === "Space") { e.preventDefault(); if (running) pause(); else startOrResume(); }
      if (e.key.toLowerCase() === "r") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, timeLeft, started, mode, cyclesRemaining]);

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

  const displayTime = !started && !running ? (mode === "focus" ? focusM : breakM) * 60 : timeLeft;
  const displayFraction = !started && !running ? "0.00" : fractional;
  const statusLabel = !started ? "Ready" : running ? (mode === "focus" ? "Focusing" : "Break") : "Paused";

  return {
    focusM, breakM, cyclesTarget, cyclesRemaining, mode, history, currentDateTime,
    statusLabel, displayTime, displayFraction, started, running,
    setFocusM: (v: number) => setFocusM(clamp(v, 1, 180)),
    setBreakM: (v: number) => setBreakM(clamp(v, 1, 60)),
    setCyclesTarget: (v: number) => { const next = clamp(v, 1, 4); setCyclesTarget(next); setCyclesRemaining((prev) => Math.min(next, prev)); },
    startOrResume, pause, reset,
  };
}
