import React, { useState, useEffect } from 'react';
import {
  MOCK_INTERVIEWS,
  CODE_VAULT,
  GAUNTLET_QUESTIONS,
} from '../data/systemDesignData';
import {
  Copy,
  Check,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Award,
  X,
} from 'lucide-react';

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

  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const tabs: ('simulator' | 'vault' | 'gauntlet')[] = [
      'simulator',
      'vault',
      'gauntlet',
    ];
    const curIdx = tabs.indexOf(activeSubTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveSubTab(tabs[(curIdx + 1) % tabs.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveSubTab(tabs[(curIdx - 1 + tabs.length) % tabs.length]);
    }
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

  const handleResetGauntlet = () => {
    setSelectedOption(null);
    setGauntletIdx(0);
    setScore(0);
    setAnsweredCount(0);
  };

  // Number key shortcuts (1, 2, 3) for Gauntlet options
  useEffect(() => {
    if (activeSubTab !== 'gauntlet' || selectedOption !== null) return;
    const handleNumberKey = (e: KeyboardEvent) => {
      if (['1', '2', '3'].includes(e.key)) {
        const optionIndex = parseInt(e.key, 10) - 1;
        if (activeQuestion.opts[optionIndex]) {
          handleSelectOption(optionIndex, activeQuestion.opts[optionIndex].ok);
        }
      }
    };
    window.addEventListener('keydown', handleNumberKey);
    return () => window.removeEventListener('keydown', handleNumberKey);
  }, [activeSubTab, selectedOption, activeQuestion]);

  const isTimeCritical = secondsLeft <= 300 && secondsLeft > 0;
  const isTimeUp = secondsLeft === 0;

  return (
    <div className="space-y-8 pt-4">
      {/* Header + 45-Min Mock Timer */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-(--line)">
        <div>
          <div className="eyebrow-line">
            45-Minute Mock Transcripts · Production Concurrency Code Vault · Staff Trade-Off Gauntlet
          </div>
          <h1 className="font-display font-bold text-[clamp(28px,3.6vw,44px)] leading-[1.06] tracking-[-0.04em] text-(--ink) mt-3">
            FAANG Interview Simulator & LLD Concurrency Vault
          </h1>
        </div>

        {/* Live 45-Minute Interview Timer Control */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {isTimeUp && (
            <span className="px-2.5 py-1 rounded-md bg-(--rose)/20 border border-(--rose)/50 text-(--rose) font-mono text-xs font-bold animate-pulse">
              Time Expired! Conclude Design
            </span>
          )}
          <div className="flex items-center gap-2 bg-(--panel) border border-(--line) rounded-xl p-1.5 w-fit shadow-xs">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 font-mono text-sm font-bold ${
                isTimeUp
                  ? 'text-(--rose)'
                  : isTimeCritical
                  ? 'text-(--orange) animate-pulse'
                  : 'text-(--ink)'
              }`}
            >
              <Timer
                className={`w-4 h-4 ${
                  isTimeUp
                    ? 'text-(--rose)'
                    : isTimeCritical
                    ? 'text-(--orange)'
                    : 'text-(--lime)'
                }`}
              />
              <span>{formatTimer(secondsLeft)}</span>
            </div>
            <button
              type="button"
              onClick={() => setTimerRunning((v) => !v)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-lg whitespace-nowrap cursor-pointer hover:opacity-95 focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none"
            >
              {timerRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> Start Timer
                </>
              )}
            </button>
            <button
              type="button"
              title="Reset 45-minute timer"
              aria-label="Reset 45-minute timer"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft(45 * 60);
              }}
              className="p-1.5 text-(--muted) hover:text-(--ink) rounded-lg cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 3-Pillar Segmented Mode Switcher */}
      <div
        role="tablist"
        aria-label="Interview execution lab modes"
        onKeyDown={handleTabKeyDown}
        className="flex flex-wrap gap-2 p-1.5 bg-(--panel) border border-(--line) rounded-xl w-fit shadow-xs"
      >
        <button
          type="button"
          id="tab-simulator"
          role="tab"
          aria-selected={activeSubTab === 'simulator'}
          aria-controls="panel-simulator"
          tabIndex={activeSubTab === 'simulator' ? 0 : -1}
          onClick={() => setActiveSubTab('simulator')}
          className={`px-4 py-2 text-xs font-mono font-semibold rounded-[9px] transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeSubTab === 'simulator'
              ? 'bg-(--p2) text-(--lime) border border-(--lime)/50'
              : 'text-(--muted) hover:text-(--ink)'
          }`}
        >
          01. 45-Min Mock Interview Simulator
        </button>
        <button
          type="button"
          id="tab-vault"
          role="tab"
          aria-selected={activeSubTab === 'vault'}
          aria-controls="panel-vault"
          tabIndex={activeSubTab === 'vault' ? 0 : -1}
          onClick={() => setActiveSubTab('vault')}
          className={`px-4 py-2 text-xs font-mono font-semibold rounded-[9px] transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeSubTab === 'vault'
              ? 'bg-(--p2) text-(--lime) border border-(--lime)/50'
              : 'text-(--muted) hover:text-(--ink)'
          }`}
        >
          02. LLD & Concurrency Code Vault (6)
        </button>
        <button
          type="button"
          id="tab-gauntlet"
          role="tab"
          aria-selected={activeSubTab === 'gauntlet'}
          aria-controls="panel-gauntlet"
          tabIndex={activeSubTab === 'gauntlet' ? 0 : -1}
          onClick={() => setActiveSubTab('gauntlet')}
          className={`px-4 py-2 text-xs font-mono font-semibold rounded-[9px] transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeSubTab === 'gauntlet'
              ? 'bg-(--p2) text-(--lime) border border-(--lime)/50'
              : 'text-(--muted) hover:text-(--ink)'
          }`}
        >
          03. Staff Trade-Off Gauntlet ({score}/{answeredCount})
        </button>
      </div>

      {/* PILLAR 1: 45-MINUTE MOCK INTERVIEW SIMULATOR */}
      {activeSubTab === 'simulator' && (
        <section
          id="panel-simulator"
          role="tabpanel"
          aria-labelledby="tab-simulator"
          className="space-y-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-(--muted)">
              Select Interview Prompt:
            </span>
            {MOCK_INTERVIEWS.map((m, idx) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={mockIdx === idx}
                onClick={() => {
                  setMockIdx(idx);
                  setPhaseIdx(0);
                  setActiveChaosAns(null);
                }}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-[9px] border transition-colors whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
                  mockIdx === idx
                    ? 'bg-(--lime) text-(--lime-ink) border-(--lime)'
                    : 'bg-(--panel) text-(--muted) border-(--line) hover:border-(--lime)'
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 4 Cols: Timeline Phases */}
            <div className="lg:col-span-4 bg-(--panel) border border-(--line) rounded-2xl overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-(--line) text-[10px] font-mono uppercase tracking-[0.14em] text-(--muted) flex items-center justify-between">
                <span>Interview Phases</span>
                <span className="text-(--cyan)">{activePhase.time}</span>
              </div>
              <div className="divide-y divide-(--line)">
                {activeMock.phases.map((p, idx) => {
                  const isCurrent = phaseIdx === idx;
                  return (
                    <button
                      key={p.time}
                      type="button"
                      aria-current={isCurrent ? 'step' : undefined}
                      onClick={() => {
                        setPhaseIdx(idx);
                        setActiveChaosAns(null);
                      }}
                      className={`w-full text-left p-4 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
                        isCurrent
                          ? 'bg-(--p2) border-l-3 border-(--lime)'
                          : 'hover:bg-(--p2)/50'
                      }`}
                    >
                      <div className="text-xs font-mono font-semibold text-(--lime) flex items-center justify-between">
                        <span>{p.time}</span>
                        {isCurrent && (
                          <span className="text-[10px] uppercase tracking-wider text-(--cyan)">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="font-display text-sm font-bold text-(--ink) mt-0.5">
                        {p.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 8 Cols: Active Phase Transcript & Chaos Probe */}
            <div className="lg:col-span-8 bg-(--panel) border border-(--line) rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-(--line)">
                <span className="text-xs font-mono font-bold text-(--ink)">
                  {activePhase.time} · {activePhase.name}
                </span>
                <span className="text-xs font-mono text-(--cyan) flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Signal: {activePhase.signal}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-(--p2) border border-(--line) text-sm">
                <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-(--orange) mb-1">
                  FAANG Principal Interviewer
                </div>
                <p className="text-(--ink)">“{activePhase.interviewer}”</p>
              </div>

              <div className="p-4 rounded-xl bg-(--lime)/10 border border-(--lime)/40 text-sm">
                <div className="text-[10px] font-mono uppercase tracking-wider font-semibold text-(--lime) mb-1">
                  Staff Candidate Architecture Response
                </div>
                <p className="text-(--ink) leading-relaxed">
                  “{activePhase.candidate}”
                </p>
              </div>

              <pre
                tabIndex={0}
                aria-label="Interview architecture diagram"
                className="p-4 rounded-xl bg-(--bg) text-(--cyan) font-mono text-xs leading-relaxed overflow-x-auto border border-(--line) focus-visible:ring-1 focus-visible:ring-(--cyan) focus-visible:outline-none"
              >
                {activePhase.diagram}
              </pre>

              <div className="pt-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono text-(--muted)">
                  Interviewer Stress Probes:
                </span>
                {activePhase.chaos.map((c, idx) => {
                  const isActive = activeChaosAns === c.ans;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        setActiveChaosAns((prev) => (prev === c.ans ? null : c.ans))
                      }
                      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-[9px] transition-all whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-(--rose) focus-visible:outline-none ${
                        isActive
                          ? 'bg-(--rose) text-[#10150c] shadow-sm'
                          : 'bg-(--rose)/15 text-(--rose) border border-(--rose)/40 hover:bg-(--rose) hover:text-[#10150c]'
                      }`}
                    >
                      {c.btn}
                    </button>
                  );
                })}
              </div>

              {activeChaosAns && (
                <div className="p-4 rounded-xl bg-(--rose)/10 border border-(--rose)/40 text-xs leading-relaxed relative">
                  <div className="flex items-center justify-between font-mono font-bold text-(--rose) mb-1">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Staff-Level Architectural Defense
                    </span>
                    <button
                      type="button"
                      aria-label="Close probe answer"
                      onClick={() => setActiveChaosAns(null)}
                      className="text-(--rose) hover:text-(--ink) p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-(--ink)">{activeChaosAns}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* PILLAR 2: LLD & CONCURRENCY PRODUCTION CODE VAULT */}
      {activeSubTab === 'vault' && (
        <section
          id="panel-vault"
          role="tabpanel"
          aria-labelledby="tab-vault"
          className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
        >
          <div className="lg:col-span-4 bg-(--panel) border border-(--line) rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-(--line) text-[10px] font-mono uppercase tracking-[0.14em] text-(--muted) flex items-center justify-between">
              <span>Production Code Patterns (6)</span>
              <span className="text-(--lime)">TypeScript</span>
            </div>
            <div className="divide-y divide-(--line)">
              {CODE_VAULT.map((item, idx) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setVaultIdx(idx)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
                    vaultIdx === idx
                      ? 'bg-(--p2) border-l-3 border-(--lime)'
                      : 'hover:bg-(--p2)/50'
                  }`}
                >
                  <div className="text-[10px] font-mono font-semibold text-(--lime)">
                    {item.tag}
                  </div>
                  <div className="font-display text-sm font-bold text-(--ink) mt-0.5">
                    {item.title}
                  </div>
                  <div className="text-xs text-(--muted) mt-0.5">
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 bg-(--panel) border border-(--line) rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-(--line)">
              <div>
                <span className="text-[10px] font-mono text-(--lime) uppercase tracking-wider">
                  {activeCode.tag} · Production Concurrency Primitive
                </span>
                <h2 className="font-display text-lg font-bold text-(--ink)">
                  {activeCode.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-(--p2) text-(--ink) border border-(--line) rounded-[9px] hover:border-(--lime) whitespace-nowrap cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-(--lime)" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
            </div>

            <p className="text-xs sm:text-sm text-(--muted) leading-relaxed">
              <strong className="text-(--ink)">
                Why Interviewers Test This:
              </strong>{' '}
              {activeCode.why}
            </p>

            <pre
              tabIndex={0}
              aria-label={`Concurrency implementation for ${activeCode.title}`}
              className="p-4 rounded-xl bg-(--bg) text-(--cyan) font-mono text-xs leading-relaxed overflow-x-auto border border-(--line) focus-visible:ring-1 focus-visible:ring-(--cyan) focus-visible:outline-none"
            >
              {activeCode.code}
            </pre>
          </div>
        </section>
      )}

      {/* PILLAR 3: STAFF TRADE-OFF GAUNTLET */}
      {activeSubTab === 'gauntlet' && (
        <section
          id="panel-gauntlet"
          role="tabpanel"
          aria-labelledby="tab-gauntlet"
          className="bg-(--panel) border border-(--line) rounded-[18px] p-6 space-y-5 shadow-xs"
        >
          {/* Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--line) pb-3 text-xs font-mono">
            <span className="text-(--muted)">
              Architectural Dilemma {gauntletIdx + 1} of{' '}
              {GAUNTLET_QUESTIONS.length}{' '}
              <span className="text-(--soft)">(Press 1, 2, or 3)</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-(--lime)">
                Score: {score} / {answeredCount}
              </span>
              {answeredCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetGauntlet}
                  className="text-(--muted) hover:text-(--rose) text-[11px] underline cursor-pointer"
                >
                  Restart
                </button>
              )}
            </div>
          </div>

          <h2 className="font-display text-xl font-bold text-(--ink) leading-snug">
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
                  aria-pressed={isSelected}
                  onClick={() => handleSelectOption(idx, opt.ok)}
                  className={`text-left p-4 rounded-[14px] border transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
                    !isRevealed
                      ? 'bg-(--p2) border-(--line) hover:border-(--lime)'
                      : opt.ok
                      ? 'bg-(--lime)/10 border-(--lime)'
                      : isSelected
                      ? 'bg-(--rose)/10 border-(--rose)'
                      : 'bg-(--p2) border-(--line) opacity-60'
                  }`}
                >
                  <div className="font-mono text-sm font-bold text-(--ink) mb-1.5 flex items-center justify-between">
                    <span>{opt.title}</span>
                    <span className="text-[10px] text-(--muted) border border-(--line) px-1.5 py-0.5 rounded">
                      [{idx + 1}]
                    </span>
                  </div>
                  <p className="text-xs text-(--muted) leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedOption !== null && (
            <div className="p-5 rounded-[14px] bg-(--p2) border border-(--line) space-y-3">
              <div className="text-xs font-mono font-bold text-(--cyan) flex items-center gap-1.5">
                <Award className="w-4 h-4 text-(--cyan)" />
                Principal / Staff Rubric Critique
              </div>
              <p className="text-sm text-(--ink) leading-relaxed">
                {activeQuestion.verdict}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="px-4 py-2 text-xs font-mono font-bold bg-(--lime) text-(--lime-ink) rounded-[9px] hover:opacity-95 transition-opacity cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none"
                >
                  {gauntletIdx === GAUNTLET_QUESTIONS.length - 1
                    ? 'Complete Assessment & Loop →'
                    : 'Next Scenario →'}
                </button>
                {answeredCount >= GAUNTLET_QUESTIONS.length && (
                  <span className="text-xs font-mono text-(--lime) font-semibold">
                    {score >= Math.ceil(GAUNTLET_QUESTIONS.length * 0.75)
                      ? '★ Staff Systems Architect Calibration Achieved'
                      : 'Solid Attempt · Revisit Failure Modes'}
                  </span>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
