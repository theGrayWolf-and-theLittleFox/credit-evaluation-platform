import React from "react";

type Props = {
  mode: "live" | "mock";
  onPrimaryAction?: () => void;
};

export function Navbar({ mode, onPrimaryAction }: Props) {
  return (
    <header className="glass nav-shell">
      <div className="nav-brand">
        <div className="nav-mark" aria-hidden="true">O</div>
        <div>
          <div className="nav-title">OpenCredit Commons</div>
          <div className="muted nav-subtitle">Public infrastructure for responsible lending</div>
        </div>
      </div>

      <div className="nav-actions">
        <a className="nav-link" href="#program-roadmap">Roadmap</a>
        <a className="nav-link" href="#governance-center">Governance</a>
        <a className="nav-link" href="#score-workbench">Decision lab</a>
        <span className={`pill ${mode === "live" ? "success" : "warn"}`}>{mode === "live" ? "live" : "mock"}</span>
        <button className="btn" type="button" onClick={onPrimaryAction}>
          Open decision lab
        </button>
      </div>
    </header>
  );
}
