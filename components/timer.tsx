"use client";

import React from "react";
import Settings from "./settings";
import TimerHistoryCard from "./timer-history-card";
import TimerMainCard from "./timer-main-card";
import { usePomodoroTimer } from "./usePomodoroTimer";

export default function Timer() {
  const t = usePomodoroTimer();

  return (
    <div className="session-shell">
      <div className="session-row">
        <TimerMainCard
          mode={t.mode}
          started={t.started}
          running={t.running}
          statusLabel={t.statusLabel}
          displayTime={t.displayTime}
          displayFraction={t.displayFraction}
          cyclesTarget={t.cyclesTarget}
          cyclesRemaining={t.cyclesRemaining}
          onStartOrResume={t.startOrResume}
          onPause={t.pause}
          onReset={t.reset}
        />

        <div className="right-col">
          <Settings
            focusM={t.focusM}
            breakM={t.breakM}
            cyclesTarget={t.cyclesTarget}
            setFocusM={t.setFocusM}
            setBreakM={t.setBreakM}
            setCyclesTarget={t.setCyclesTarget}
          />
        </div>
      </div>

      <TimerHistoryCard history={t.history} currentDateTime={t.currentDateTime} />
    </div>
  );
}
