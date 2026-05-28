"use client";

import React from "react";
import { formatClock, formatTime } from "./timer-format";
import { SessionEntry } from "./timer-storage";

type Props = {
  history: SessionEntry[];
  currentDateTime: string;
};

export default function TimerHistoryCard({ history, currentDateTime }: Props) {
  return (
    <div className="session-history">
      <div className="glass-card" style={{ maxWidth: 760 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
          <div className="audiowide-regular" style={{ fontWeight: 400 }}>Today</div>
          <div
            style={{ fontSize: 12, opacity: 0.85, textAlign: "right" }}
            aria-label="Current date and time with time zone"
            suppressHydrationWarning
          >
            {currentDateTime}
          </div>
        </div>

        <div className="today-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {history.length === 0 ? (
            <div style={{ opacity: 0.7 }}>No completed focus sessions yet.</div>
          ) : (
            history.slice().reverse().map((entry, index) => (
              <div key={`${entry.at}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
                <div>✓ {formatTime(entry.dur)} focus — {formatClock(entry.at)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
