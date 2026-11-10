import React, { useState, useEffect } from 'react';
import {
  MOCK_INTERVIEWS,
  CODE_VAULT,
  GAUNTLET_QUESTIONS,
} from '../data/systemDesignData';
import { Copy, Check, Timer, Play, Pause, RotateCcw } from 'lucide-react';

export const InterviewLabView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'simulator' | 'vault' | 'gauntlet'
  >('simulator');

  // 45-Min Countdown Timer
  const [secondsLeft, setSecondsLeft] = useState<number>(45 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Mock Interview Simulator State
  const [mockIdx, setMockIdx] = useState<number>(0);
  const [phaseIdx, setPhaseIdx] = useState<number>(0);
  const [activeChaosAns, setActiveChaosAns] = useState<string | null>(null);

  const activeMock = MOCK_INTERVIEWS[mockIdx];
  const activePhase = activeMock.phases[phaseIdx] || activeMock.phases[0];

  // Code Vault State
  const [vaultIdx, setVaultIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const activeCode = CODE_VAULT[vaultIdx];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  // Staff Trade-Off Gauntlet State
  const [gauntletIdx, setGauntletIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);

  const activeQuestion = GAUNTLET_QUESTIONS[gauntletIdx];

  const handleSelectOption = (idx: number, isCorrect: boolean) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    setAnsweredCount((prev) => prev + 1);
    if (isCorrect) setScore((prev) => prev + 1);
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setGauntletIdx((prev) => (prev + 1) % GAUNTLET_QUESTIONS.length);
  };

  return (
    <div className="space-y-8 pt-4">
      {/* Header + 45-Min Mock Timer */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-[var(--line)]">
        <div>
          <div className="eyebrow-line">
            45-Minute Mock Transcripts · Production Concurrency Code Vault · Staff Trade-Off Gauntlet
          </div>
          <h1 className="font-display font-bold text-[clamp(28px,3.6vw,44px)] leading-[1.06] tracking-[-0.04em] text-[var(--ink)] mt-3">
            FAANG Interview Simulator & LLD Concurrency Vault
          </h1>
        </div>

        {/* Live 45-Minute Interview Timer Control */}
        <div className="flex items-center gap-2 bg-[var(--panel)] border border-[var(--line)] rounded-[12px] p-1.5 w-fit">
          <div className="flex items-center gap-1.5 px-3 py-1 font-mono text-sm font-bold text-[var(--ink)]">
            <Timer className="w-4 h-4 text-[var(--lime)]" />
            <span>{formatTimer(secondsLeft)}</span>
          </div>
          <button
            type="button"
            onClick={() => setTimerRunning((v) => !v)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[8px] whitespace-nowrap cursor-pointer"
          >
            {timerRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Start Mock Timer
              </>
            )}
          </button>
          <button
            type="button"
            aria-label="Reset 45 minute timer"
            onClick={() => {
              setTimerRunning(false);
              setSecondsLeft(45 * 60);
            }}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] rounded-[8px] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 3-Pillar Segmented Mode Switcher */}
      <div
        role="tablist"
        aria-label="Interview execution lab modes"
        className="flex flex-wrap gap-2 p-1.5 bg-[var(--panel)] border border-[var(--line)] rounded-[12px] w-fit"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'simulator'}
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 text-xs font-mono font-semibold rounded-[9px] transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'simulator'
              ? 'bg-[var(--p2)] text-[var(--lime)] border border-[var(--lime)]/50'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          01. 45-Min Mock Interview Simulator
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'vault'}
          onClick={() => setActiveSubTab('vault')}
          className={`px-4 py-2 text-xs font-mono font-semibold rounded-[9px] transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'vault'
              ? 'bg-[var(--p2)] text-[var(--lime)] border border-[var(--lime)]/50'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          02. LLD & Concurrency Code Vault (6)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'gauntlet'}
          onClick={() => setActiveSubTab('gauntlet')}
          className={`px-4 py-2 text-xs font-mono font-semibold rounded-[9px] transition-colors whitespace-nowrap cursor-pointer ${
            activeSubTab === 'gauntlet'
              ? 'bg-[var(--p2)] text-[var(--lime)] border border-[var(--lime)]/50'
              : 'text-[var(--muted)] hover:text-[var(--ink)]'
          }`}
        >
          03. Staff Trade-Off Gauntlet ({score}/{answeredCount})
        </button>
      </div>

      {/* PILLAR 1: 45-MINUTE MOCK INTERVIEW SIMULATOR */}
      {activeSubTab === 'simulator' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-[var(--muted)]">
              Select Interview Prompt:
            </span>
            {MOCK_INTERVIEWS.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMockIdx(idx);
                  setPhaseIdx(0);
                  setActiveChaosAns(null);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-[9px] border transition-colors whitespace-nowrap cursor-pointer ${
                  mockIdx === idx
                    ? 'bg-[var(--lime)] text-[var(--lime-ink)] border-[var(--lime)]'
                    : 'bg-[var(--panel)] text-[var(--muted)] border-[var(--line)] hover:border-[var(--lime)]'
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 4 Cols: Timeline Phases */}
            <div className="lg:col-span-4 bg-[var(--panel)] border border-[var(--line)] rounded-[16px] overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--line)] text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
                Interview Phases
              </div>
              <div className="divide-y divide-[var(--line)]">
                {activeMock.phases.map((p, idx) => (
                  <button
                    key={p.time}
                    type="button"
                    onClick={() => {
                      setPhaseIdx(idx);
                      setActiveChaosAns(null);
                    }}
                    className={`w-full text-left p-4 transition-colors cursor-pointer ${
                      phaseIdx === idx
                        ? 'bg-[var(--p2)]'
                        : 'hover:bg-[var(--p2)]/50'
                    }`}
                  >
                    <div className="text-xs font-mono font-semibold text-[var(--lime)]">
                      {p.time}
                    </div>
                    <div className="font-display text-sm font-bold text-[var(--ink)] mt-0.5">
                      {p.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right 8 Cols: Active Phase Transcript & Chaos Probe */}
            <div className="lg:col-span-8 bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
                <span className="text-xs font-mono font-bold text-[var(--ink)]">
                  {activePhase.time} · {activePhase.name}
                </span>
                <span className="text-xs font-mono text-[var(--cyan)]">
                  Signal: {activePhase.signal}
                </span>
              </div>

              <div className="p-4 rounded-[12px] bg-[var(--p2)] border border-[var(--line)] text-sm">
                <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[var(--orange)] mb-1">
                  FAANG Interviewer
                </div>
                <p className="text-[var(--ink)]">“{activePhase.interviewer}”</p>
              </div>

              <div className="p-4 rounded-[12px] bg-[var(--lime)]/10 border border-[var(--lime)]/40 text-sm">
                <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-[var(--lime)] mb-1">
                  Staff Candidate Response
                </div>
                <p className="text-[var(--ink)] leading-relaxed">
                  “{activePhase.candidate}”
                </p>
              </div>

              <pre className="p-4 rounded-[12px] bg-[var(--bg)] text-[var(--cyan)] font-mono text-xs leading-relaxed overflow-x-auto border border-[var(--line)]">
                {activePhase.diagram}
              </pre>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-[var(--muted)]">
                  Follow-Up Stress Probes:
                </span>
                {activePhase.chaos.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveChaosAns(c.ans)}
                    className="px-3 py-1.5 text-xs font-mono font-bold bg-[var(--rose)] text-[#10150c] rounded-[9px] whitespace-nowrap cursor-pointer"
                  >
                    {c.btn}
                  </button>
                ))}
              </div>

              {activeChaosAns && (
                <div className="p-4 rounded-[12px] bg-[var(--rose)]/10 border border-[var(--rose)]/40 text-xs leading-relaxed">
                  <div className="font-mono font-bold text-[var(--rose)] mb-1">
                    Staff-Level Architectural Defense
                  </div>
                  <p className="text-[var(--ink)]">{activeChaosAns}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 2: LLD & CONCURRENCY PRODUCTION CODE VAULT */}
      {activeSubTab === 'vault' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-4 bg-[var(--panel)] border border-[var(--line)] rounded-[16px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--line)] text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--muted)]">
              Production Code Patterns (6)
            </div>
            <div className="divide-y divide-[var(--line)]">
              {CODE_VAULT.map((item, idx) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setVaultIdx(idx)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    vaultIdx === idx
                      ? 'bg-[var(--p2)]'
                      : 'hover:bg-[var(--p2)]/50'
                  }`}
                >
                  <div className="text-[10px] font-mono font-semibold text-[var(--lime)]">
                    {item.tag}
                  </div>
                  <div className="font-display text-sm font-bold text-[var(--ink)] mt-0.5">
                    {item.title}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 bg-[var(--panel)] border border-[var(--line)] rounded-[16px] p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--line)]">
              <div>
                <span className="text-[10px] font-mono text-[var(--lime)] uppercase tracking-wider">
                  {activeCode.tag}
                </span>
                <h2 className="font-display text-lg font-bold text-[var(--ink)]">
                  {activeCode.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-[var(--p2)] text-[var(--ink)] border border-[var(--line)] rounded-[9px] hover:border-[var(--lime)] whitespace-nowrap cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--lime)]" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">
              <strong className="text-[var(--ink)]">
                Why Interviewers Test This:
              </strong>{' '}
              {activeCode.why}
            </p>

            <pre className="p-4 rounded-[12px] bg-[var(--bg)] text-[var(--cyan)] font-mono text-xs leading-relaxed overflow-x-auto border border-[var(--line)]">
              {activeCode.code}
            </pre>
          </div>
        </div>
      )}

      {/* PILLAR 3: STAFF TRADE-OFF GAUNTLET */}
      {activeSubTab === 'gauntlet' && (
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[18px] p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 text-xs font-mono">
            <span className="text-[var(--muted)]">
              Architectural Dilemma {gauntletIdx + 1} of{' '}
              {GAUNTLET_QUESTIONS.length}
            </span>
            <span className="font-semibold text-[var(--lime)]">
              Score: {score} / {answeredCount}
            </span>
          </div>

          <h2 className="font-display text-xl font-bold text-[var(--ink)] leading-snug">
            {activeQuestion.q}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activeQuestion.opts.map((opt, idx) => {
              const isRevealed = selectedOption !== null;
              const isSelected = selectedOption === idx;
              return (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => handleSelectOption(idx, opt.ok)}
                  className={`text-left p-4 rounded-[14px] border transition-all cursor-pointer ${
                    !isRevealed
                      ? 'bg-[var(--p2)] border-[var(--line)] hover:border-[var(--lime)]'
                      : opt.ok
                      ? 'bg-[var(--lime)]/10 border-[var(--lime)]'
                      : isSelected
                      ? 'bg-[var(--rose)]/10 border-[var(--rose)]'
                      : 'bg-[var(--p2)] border-[var(--line)] opacity-60'
                  }`}
                >
                  <div className="font-mono text-sm font-bold text-[var(--ink)] mb-1.5">
                    {opt.title}
                  </div>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="p-4 rounded-[14px] bg-[var(--p2)] border border-[var(--line)] space-y-3">
              <div className="text-xs font-mono font-bold text-[var(--cyan)]">
                Principal / Staff Rubric Critique
              </div>
              <p className="text-sm text-[var(--ink)] leading-relaxed">
                {activeQuestion.verdict}
              </p>
              <button
                type="button"
                onClick={handleNextQuestion}
                className="px-4 py-2 text-xs font-mono font-bold bg-[var(--lime)] text-[var(--lime-ink)] rounded-[9px] cursor-pointer"
              >
                Next Scenario →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
