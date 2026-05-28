"use client";

import React from "react";
import { formatTime } from "./timer-format";

type Props = {
  mode: "focus" | "break";
  started: boolean;
  running: boolean;
  statusLabel: string;
  displayTime: number;
  displayFraction: string;
  cyclesTarget: number;
  cyclesRemaining: number;
  completedMessage: string;
  onStartOrResume: () => void;
  onPause: () => void;
  onReset: () => void;
};

export default function TimerMainCard({
  mode,
  started,
  running,
  statusLabel,
  displayTime,
  displayFraction,
  cyclesTarget,
  cyclesRemaining,
  completedMessage,
  onStartOrResume,
  onPause,
  onReset,
}: Props) {
  const action = !started
    ? { label: "Start", onClick: onStartOrResume, ariaLabel: "Start timer" }
    : running
    ? { label: "Pause", onClick: onPause, ariaLabel: "Pause timer" }
    : { label: "Resume", onClick: onStartOrResume, ariaLabel: "Resume timer" };

  return (
    <div className={`glass-card session-main ${mode === "focus" ? "focus" : "break"}${started && !running ? " paused" : ""}`}>
      <div className="status-header">
        <div className="audiowide-regular timer-label glossy-status">{statusLabel}</div>
        <div className="cycle-meter" role="group" aria-label="Cycle meter">
          {Array.from({ length: cyclesTarget }, (_, i) => (
            <span
              key={i}
              className={`meter-dot ${i < cyclesRemaining ? "on" : "off"}`}
              role="img"
              aria-label={`Cycle ${i + 1} of ${cyclesTarget}: ${i < cyclesRemaining ? "completed" : "pending"}`}
            />
          ))}
        </div>
      </div>

      <div className="timer-display" aria-live="polite" aria-atomic="true">
        <div className="timer-value bitcount-grid-single bitcount-weight-700">{formatTime(displayTime)}</div>
        <div className="sub-seconds">{displayFraction} s</div>
      </div>

      <div className="controls" style={{ justifyContent: "center", flexWrap: "wrap" }}>
        <button onClick={action.onClick} style={buttonStyle} aria-label={action.ariaLabel}>{action.label}</button>
        <button onClick={onReset} style={{ ...buttonStyle, background: "#374151" }} aria-label="Reset timer">Reset</button>
      </div>

      {completedMessage && (
        <div className="completion-toast" role="status" aria-live="polite">
          {completedMessage}
        </div>
      )}

      <div style={{ marginTop: 10, opacity: 0.86, fontSize: 13, textAlign: "center" }}>
        Space = start/pause/resume, R = reset
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  background: "#111827",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  border: 0,
  cursor: "pointer",
};
