"use client";
import React from "react";

type SettingRowProps = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  setter: (n: number) => void;
};

function SettingRow({ label, value, unit, min, max, setter }: SettingRowProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 13 }}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div aria-live="polite" style={{ fontSize: 30, lineHeight: 1 }}>{value}<span style={{ fontSize: 14, opacity: 0.85, marginLeft: 6 }}>{unit}</span></div>
        <div className="incdec">
          <button aria-label={`decrease ${label.toLowerCase()}`} onClick={() => setter(Math.max(min, value - 1))}>-</button>
          <button aria-label={`increase ${label.toLowerCase()}`} onClick={() => setter(Math.min(max, value + 1))}>+</button>
        </div>
      </div>
    </div>
  );
}

type Props = {
  focusM: number;
  breakM: number;
  cyclesTarget: number;
  setFocusM: (n: number) => void;
  setBreakM: (n: number) => void;
  setCyclesTarget: (n: number) => void;
};

export default function Settings({ focusM, breakM, cyclesTarget, setFocusM, setBreakM, setCyclesTarget }: Props) {
  return (
    <div className="glass-card" style={{ maxWidth: "100%" }}>
      <div className="audiowide-regular" style={{ fontWeight: 400, marginBottom: 12 }}>Settings</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <SettingRow label="Focus" value={focusM} unit="min" min={1} max={180} setter={setFocusM} />
        <SettingRow label="Break" value={breakM} unit="min" min={1} max={60} setter={setBreakM} />
        <SettingRow label="Cycles (max 4)" value={cyclesTarget} unit="count" min={1} max={4} setter={setCyclesTarget} />
      </div>
    </div>
  );
}
