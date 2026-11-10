import React, { useState, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { KnowledgeMapView } from './components/KnowledgeMapView';
import { WhiteboardLabView } from './components/WhiteboardLabView';
import { InternalsWorkbenchView } from './components/InternalsWorkbenchView';
import { InterviewLabView } from './components/InterviewLabView';
import { Search, RotateCcw } from 'lucide-react';

type ActiveWorkspace = 'map' | 'whiteboard' | 'internals' | 'interview';

const STORAGE_KEY_COMPLETED = 'archatlas_completed_modules_v1';
const STORAGE_KEY_THEME = 'archatlas_theme_v1';

export default function App() {
  const [activeWorkspace, setActiveWorkspace] = useState<ActiveWorkspace>('map');
  const [activeNavKey, setActiveNavKey] = useState<string>('00');
  const [whiteboardPreset, setWhiteboardPreset] = useState<string>('whatsapp');

  // Shared search & filter state for KnowledgeMapView
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterPart, setFilterPart] = useState<number | 'all' | 'done'>('all');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [completedIds, setCompletedIds] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COMPLETED);
      if (!raw) return [1, 2, 3];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [1, 2, 3];
    } catch {
      return [1, 2, 3];
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_THEME);
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_THEME, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 1400);
  };

  const handleToggleComplete = (id: number) => {
    setCompletedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      triggerToast(
        exists ? `Module ${String(id).padStart(2, '0')} unmarked` : `Module ${String(id).padStart(2, '0')} marked complete`
      );
      return next;
    });
  };

  const handleResetProgress = () => {
    setCompletedIds([]);
    try {
      localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([]));
    } catch {
      // ignore
    }
    triggerToast('Learning progress reset');
  };

  const handleLaunchPresetInWhiteboard = (presetId: string) => {
    setWhiteboardPreset(presetId);
    setActiveWorkspace('whiteboard');
    setActiveNavKey('02');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateSection = (
    navKey: string,
    workspace: ActiveWorkspace,
    scrollTargetId?: string
  ) => {
    setActiveNavKey(navKey);
    setActiveWorkspace(workspace);
    if (scrollTargetId) {
      setTimeout(() => {
        const el = document.getElementById(scrollTargetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 45);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const progressPercent = Math.round((completedIds.length / 25) * 100);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col">
      {/* FIXED LEFT SIDEBAR (Reference Architecture) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[230px] lg:w-[250px] px-4 py-6 border-r border-[var(--line)] bg-[var(--bg)] flex-col z-30 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2.5 pb-7">
          <div className="w-9 h-9 rounded-[11px] bg-[var(--lime)] text-[#10150c] grid place-items-center font-display font-bold text-[17px] -rotate-6 shrink-0 shadow-sm">
            S
          </div>
          <div>
            <b className="font-display font-bold text-[15px] tracking-tight text-[var(--ink)] block leading-tight">
              SYSTEMS / MAP
            </b>
            <small className="font-mono text-[10px] text-[var(--muted)] uppercase tracking-[0.13em] block mt-0.5">
              Engineering field guide
            </small>
          </div>
        </div>

        <div className="px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--muted)]">
          Navigate
        </div>

        <nav
          aria-label="Primary System Design Workspaces"
          className="grid gap-1.5 mt-3"
        >
          <button
            type="button"
            onClick={() => navigateSection('00', 'map', 'overview')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer ${
              activeNavKey === '00'
                ? 'bg-[var(--p2)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--p2)] hover:text-[var(--ink)]'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '00' ? 'text-[var(--lime)]' : 'text-[var(--soft)]'
              }`}
            >
              00
            </i>
            <span>Knowledge Map</span>
          </button>

          <button
            type="button"
            onClick={() => navigateSection('01', 'map', 'curriculum')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer ${
              activeNavKey === '01'
                ? 'bg-[var(--p2)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--p2)] hover:text-[var(--ink)]'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '01' ? 'text-[var(--lime)]' : 'text-[var(--soft)]'
              }`}
            >
              01
            </i>
            <span>Curriculum · 25</span>
          </button>

          <button
            type="button"
            onClick={() => navigateSection('02', 'whiteboard')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer ${
              activeNavKey === '02'
                ? 'bg-[var(--p2)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--p2)] hover:text-[var(--ink)]'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '02' ? 'text-[var(--lime)]' : 'text-[var(--soft)]'
              }`}
            >
              02
            </i>
            <span>Whiteboard Lab</span>
          </button>

          <button
            type="button"
            onClick={() => navigateSection('03', 'internals')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer ${
              activeNavKey === '03'
                ? 'bg-[var(--p2)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--p2)] hover:text-[var(--ink)]'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '03' ? 'text-[var(--lime)]' : 'text-[var(--soft)]'
              }`}
            >
              03
            </i>
            <span>Storage & Raft Lab</span>
          </button>

          <button
            type="button"
            onClick={() => navigateSection('04', 'interview')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer ${
              activeNavKey === '04'
                ? 'bg-[var(--p2)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--p2)] hover:text-[var(--ink)]'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '04' ? 'text-[var(--lime)]' : 'text-[var(--soft)]'
              }`}
            >
              04
            </i>
            <span>Interview & LLD Vault</span>
          </button>

          <button
            type="button"
            onClick={() => navigateSection('05', 'map', 'practice')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer ${
              activeNavKey === '05'
                ? 'bg-[var(--p2)] text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--p2)] hover:text-[var(--ink)]'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '05' ? 'text-[var(--lime)]' : 'text-[var(--soft)]'
              }`}
            >
              05
            </i>
            <span>Practice & Flashcards</span>
          </button>
        </nav>

        {/* Bottom Learning Progress Card */}
        <div className="mt-auto border border-[var(--line)] bg-[var(--panel)] rounded-[15px] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Your learning progress
            </span>
            {completedIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetProgress}
                title="Reset completed modules"
                className="text-[var(--muted)] hover:text-[var(--rose)] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="h-[5px] bg-[var(--p3)] rounded-full my-2.5 overflow-hidden">
            <span
              className="block h-full bg-[var(--lime)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <strong className="font-display font-bold text-xl text-[var(--ink)] block">
            {completedIds.length} / 25
          </strong>
          <p className="text-[11px] text-[var(--muted)] mt-0.5">
            Modules marked complete
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="md:ml-[230px] lg:ml-[250px] min-h-screen flex flex-col">
        {/* Sticky Glass Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-12 py-3.5 bg-[var(--bg)]/88 backdrop-blur-xl border-b border-[var(--line)]">
          {/* Mobile Brand */}
          <div className="flex md:hidden items-center gap-2 font-display font-bold text-xs text-[var(--ink)]">
            <div className="w-7 h-7 rounded-[9px] bg-[var(--lime)] text-[#10150c] grid place-items-center font-display font-bold text-xs -rotate-6">
              S
            </div>
            <span>SYSTEMS / MAP</span>
          </div>

          {/* Desktop Breadcrumb */}
          <div className="hidden md:block font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]">
            Learning system <span className="text-[var(--lime)]">/</span> System design{' '}
            <span className="text-[var(--lime)]">/</span>{' '}
            <span className="text-[var(--ink)]">
              {activeWorkspace === 'map'
                ? 'Knowledge Map & Curriculum'
                : activeWorkspace === 'whiteboard'
                ? 'Architecture Whiteboard Lab'
                : activeWorkspace === 'internals'
                ? 'Storage & Consensus Workbench'
                : 'FAANG Interview & Code Vault'}
            </span>
          </div>

          {/* Right Actions: Global Search, Completed Filter, Theme Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim() && activeWorkspace !== 'map') {
                    setActiveWorkspace('map');
                    setActiveNavKey('01');
                  }
                }}
                placeholder="Search concepts, modules…"
                aria-label="Search concepts and modules"
                className="w-[175px] sm:w-[250px] lg:w-[290px] border border-[var(--line)] rounded-[10px] bg-[var(--panel)] text-[var(--ink)] placeholder:text-[var(--muted)] pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-[var(--lime)]"
              />
            </div>

            <button
              type="button"
              onClick={() =>
                setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
              }
              title="Toggle light/dark theme"
              aria-label="Toggle color theme"
              className="w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--lime)] hover:border-[var(--lime)] grid place-items-center text-sm cursor-pointer transition-colors"
            >
              ◐
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterPart('done');
                navigateSection('01', 'map', 'curriculum');
              }}
              title="Show completed modules"
              aria-label="Show completed modules"
              className="w-9 h-9 rounded-[10px] border border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:text-[var(--lime)] hover:border-[var(--lime)] grid place-items-center text-xs font-mono cursor-pointer transition-colors"
            >
              ↗
            </button>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main className="w-full max-w-[1380px] mx-auto px-4 sm:px-8 lg:px-12 pb-24 flex-1">
          {activeWorkspace === 'map' && (
            <KnowledgeMapView
              completedIds={completedIds}
              onToggleComplete={handleToggleComplete}
              onLaunchPresetInWhiteboard={handleLaunchPresetInWhiteboard}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterPart={filterPart}
              onFilterPartChange={setFilterPart}
            />
          )}

          {activeWorkspace === 'whiteboard' && (
            <WhiteboardLabView initialPresetId={whiteboardPreset} />
          )}

          {activeWorkspace === 'internals' && <InternalsWorkbenchView />}

          {activeWorkspace === 'interview' && <InterviewLabView />}

          {/* Footer */}
          <footer className="border-t border-[var(--line)] mt-16 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[10px] text-[var(--muted)]">
            <span>SYSTEMS / MAP · INTERACTIVE ARCHITECTURE & FAANG FIELD GUIDE</span>
            <span>Understand the constraint → choose the primitive → defend the trade-off.</span>
          </footer>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--bg)]/94 backdrop-blur-xl border-t border-[var(--line)] px-3 py-2 justify-around"
      >
        <button
          type="button"
          onClick={() => navigateSection('00', 'map', 'overview')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] ${
            activeWorkspace === 'map' ? 'text-[var(--lime)]' : 'text-[var(--muted)]'
          }`}
        >
          <span className="text-sm">⌘</span>
          <span>MAP</span>
        </button>
        <button
          type="button"
          onClick={() => navigateSection('02', 'whiteboard')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] ${
            activeWorkspace === 'whiteboard' ? 'text-[var(--lime)]' : 'text-[var(--muted)]'
          }`}
        >
          <span className="text-sm">▤</span>
          <span>LAB</span>
        </button>
        <button
          type="button"
          onClick={() => navigateSection('03', 'internals')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] ${
            activeWorkspace === 'internals' ? 'text-[var(--lime)]' : 'text-[var(--muted)]'
          }`}
        >
          <span className="text-sm">◈</span>
          <span>STORAGE</span>
        </button>
        <button
          type="button"
          onClick={() => navigateSection('04', 'interview')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] ${
            activeWorkspace === 'interview' ? 'text-[var(--lime)]' : 'text-[var(--muted)]'
          }`}
        >
          <span className="text-sm">↗</span>
          <span>INTERVIEW</span>
        </button>
      </nav>

      {/* TOAST NOTIFICATION */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-16 md:bottom-6 right-6 z-50 px-3.5 py-2 rounded-[9px] bg-[var(--lime)] text-[#10150c] font-mono font-bold text-[11px] shadow-lg transition-all duration-200 pointer-events-none ${
          toastMessage
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2.5'
        }`}
      >
        {toastMessage || 'Progress saved'}
      </div>

      {/* VERCEL WEB ANALYTICS & CORE WEB VITALS */}
      <Analytics />
      <SpeedInsights />
    </div>
  );
}
