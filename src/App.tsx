import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { KnowledgeMapView } from './components/KnowledgeMapView';
import { WhiteboardLabView } from './components/WhiteboardLabView';
import { InternalsWorkbenchView } from './components/InternalsWorkbenchView';
import { InterviewLabView } from './components/InterviewLabView';
import {
  Search,
  RotateCcw,
  Sun,
  Moon,
  CheckCircle2,
  X,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

type ActiveWorkspace = 'map' | 'whiteboard' | 'internals' | 'interview';

const STORAGE_KEY_COMPLETED = 'archatlas_completed_modules_v2';
const STORAGE_KEY_THEME = 'archatlas_theme_v1';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class WorkspaceErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Workspace boundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 my-6 rounded-2xl border border-(--rose)/50 bg-(--rose)/10 text-(--ink) space-y-4 text-center">
          <AlertTriangle className="w-8 h-8 text-(--rose) mx-auto" />
          <h2 className="font-display text-xl font-bold">
            {this.props.fallbackTitle || 'Workspace Encountered an Error'}
          </h2>
          <p className="text-xs text-(--muted) max-w-lg mx-auto leading-relaxed">
            {this.state.error?.message ||
              'A runtime error occurred in this workspace view. You can retry rendering or return to the overview.'}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--rose) text-[#10150c] font-mono text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reload Workspace View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
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
    }, 1600);
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
        exists
          ? `Module ${String(id).padStart(2, '0')} unmarked`
          : `Module ${String(id).padStart(2, '0')} marked complete`
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
    <div className="min-h-screen bg-(--bg) text-(--ink) flex flex-col">
      {/* Skip to Content for Keyboard Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 px-4 py-2 rounded-lg bg-(--lime) text-(--lime-ink) font-mono text-xs font-bold shadow-lg focus-visible:outline-none"
      >
        Skip to main content
      </a>

      {/* FIXED LEFT SIDEBAR (Reference Architecture) */}
      <aside
        aria-label="Application Sidebar"
        className="hidden md:flex fixed inset-y-0 left-0 w-57.5 lg:w-62.5 px-4 py-6 border-r border-(--line) bg-(--bg) flex-col z-30 select-none"
      >
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2.5 pb-7">
          <div className="w-9 h-9 rounded-[11px] bg-(--lime) text-(--lime-ink) grid place-items-center font-display font-bold text-[17px] -rotate-6 shrink-0 shadow-sm">
            S
          </div>
          <div>
            <b className="font-display font-bold text-[15px] tracking-tight text-(--ink) block leading-tight">
              SYSTEMS / MAP
            </b>
            <small className="font-mono text-[10px] text-(--muted) uppercase tracking-[0.13em] block mt-0.5">
              Engineering field guide
            </small>
          </div>
        </div>

        <div className="px-2.5 font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
          Navigate
        </div>

        <nav
          aria-label="Primary System Design Workspaces"
          className="grid gap-1.5 mt-3"
        >
          <button
            type="button"
            aria-current={activeNavKey === '00' ? 'page' : undefined}
            onClick={() => navigateSection('00', 'map', 'overview')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
              activeNavKey === '00'
                ? 'bg-(--p2) text-(--ink)'
                : 'text-(--muted) hover:bg-(--p2) hover:text-(--ink)'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '00' ? 'text-(--lime)' : 'text-(--soft)'
              }`}
            >
              00
            </i>
            <span>Knowledge Map</span>
          </button>

          <button
            type="button"
            aria-current={activeNavKey === '01' ? 'page' : undefined}
            onClick={() => navigateSection('01', 'map', 'curriculum')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
              activeNavKey === '01'
                ? 'bg-(--p2) text-(--ink)'
                : 'text-(--muted) hover:bg-(--p2) hover:text-(--ink)'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '01' ? 'text-(--lime)' : 'text-(--soft)'
              }`}
            >
              01
            </i>
            <span>Curriculum · 25</span>
          </button>

          <button
            type="button"
            aria-current={activeNavKey === '02' ? 'page' : undefined}
            onClick={() => navigateSection('02', 'whiteboard')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
              activeNavKey === '02'
                ? 'bg-(--p2) text-(--ink)'
                : 'text-(--muted) hover:bg-(--p2) hover:text-(--ink)'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '02' ? 'text-(--lime)' : 'text-(--soft)'
              }`}
            >
              02
            </i>
            <span>Whiteboard Lab</span>
          </button>

          <button
            type="button"
            aria-current={activeNavKey === '03' ? 'page' : undefined}
            onClick={() => navigateSection('03', 'internals')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
              activeNavKey === '03'
                ? 'bg-(--p2) text-(--ink)'
                : 'text-(--muted) hover:bg-(--p2) hover:text-(--ink)'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '03' ? 'text-(--lime)' : 'text-(--soft)'
              }`}
            >
              03
            </i>
            <span>Storage & Raft Lab</span>
          </button>

          <button
            type="button"
            aria-current={activeNavKey === '04' ? 'page' : undefined}
            onClick={() => navigateSection('04', 'interview')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
              activeNavKey === '04'
                ? 'bg-(--p2) text-(--ink)'
                : 'text-(--muted) hover:bg-(--p2) hover:text-(--ink)'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '04' ? 'text-(--lime)' : 'text-(--soft)'
              }`}
            >
              04
            </i>
            <span>Interview & LLD Vault</span>
          </button>

          <button
            type="button"
            aria-current={activeNavKey === '05' ? 'page' : undefined}
            onClick={() => navigateSection('05', 'map', 'practice')}
            className={`w-full text-left px-3 py-2.5 rounded-[11px] flex items-center gap-3 text-xs font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
              activeNavKey === '05'
                ? 'bg-(--p2) text-(--ink)'
                : 'text-(--muted) hover:bg-(--p2) hover:text-(--ink)'
            }`}
          >
            <i
              className={`font-mono text-[11px] not-italic w-5 ${
                activeNavKey === '05' ? 'text-(--lime)' : 'text-(--soft)'
              }`}
            >
              05
            </i>
            <span>Practice & Flashcards</span>
          </button>
        </nav>

        {/* Bottom Learning Progress Card */}
        <div className="mt-auto border border-(--line) bg-(--panel) rounded-[15px] p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--muted)">
              Your learning progress
            </span>
            {completedIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetProgress}
                title="Reset completed modules"
                aria-label="Reset completed modules"
                className="text-(--muted) hover:text-(--rose) cursor-pointer p-0.5 rounded focus-visible:ring-2 focus-visible:ring-(--rose) focus-visible:outline-none"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="h-1.25 bg-(--p3) rounded-full my-2.5 overflow-hidden">
            <span
              className="block h-full bg-(--lime) transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <strong className="font-display font-bold text-xl text-(--ink) block">
            {completedIds.length} / 25
          </strong>
          <p className="text-[11px] text-(--muted) mt-0.5">
            Modules marked complete
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="md:ml-57.5 lg:ml-62.5 min-h-screen flex flex-col">
        {/* Sticky Glass Topbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-8 lg:px-12 py-3.5 bg-(--bg)/90 backdrop-blur-xl border-b border-(--line)">
          {/* Mobile Brand */}
          <div className="flex md:hidden items-center gap-2 font-display font-bold text-xs text-(--ink)">
            <div className="w-7 h-7 rounded-[9px] bg-(--lime) text-(--lime-ink) grid place-items-center font-display font-bold text-xs -rotate-6">
              S
            </div>
            <span>SYSTEMS / MAP</span>
          </div>

          {/* Desktop Breadcrumb */}
          <div className="hidden md:block font-mono text-[11px] uppercase tracking-widest text-(--muted)">
            Learning system <span className="text-(--lime)">/</span> System design{' '}
            <span className="text-(--lime)">/</span>{' '}
            <span className="text-(--ink) font-medium">
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
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-(--muted) absolute left-3 pointer-events-none" />
              <input
                id="global-search"
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
                className="w-40 sm:w-62.5 lg:w-72.5 border border-(--line) rounded-[10px] bg-(--panel) text-(--ink) placeholder:text-(--muted) pl-8 pr-7 py-2 text-xs focus-visible:outline-none focus-visible:border-(--lime) focus-visible:ring-1 focus-visible:ring-(--lime)"
              />
              {searchQuery.length > 0 && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-(--muted) hover:text-(--ink) p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const nextFilter = filterPart === 'done' ? 'all' : 'done';
                setFilterPart(nextFilter);
                navigateSection('01', 'map', 'curriculum');
              }}
              title={
                filterPart === 'done'
                  ? 'Showing completed modules (click to show all)'
                  : 'Filter to completed modules'
              }
              aria-label="Filter completed modules"
              aria-pressed={filterPart === 'done'}
              className={`w-9 h-9 rounded-[10px] border grid place-items-center cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
                filterPart === 'done'
                  ? 'bg-(--lime) text-(--lime-ink) border-(--lime)'
                  : 'bg-(--panel) border-(--line) text-(--muted) hover:text-(--lime) hover:border-(--lime)'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() =>
                setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
              }
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              className="w-9 h-9 rounded-[10px] border border-(--line) bg-(--panel) text-(--muted) hover:text-(--lime) hover:border-(--lime) grid place-items-center cursor-pointer transition-colors focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-(--lime)" />
              ) : (
                <Moon className="w-4 h-4 text-(--ink)" />
              )}
            </button>
          </div>
        </header>

        {/* Main Workspace Container */}
        <main
          id="main-content"
          tabIndex={-1}
          className="w-full max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pb-24 flex-1 outline-none"
        >
          <WorkspaceErrorBoundary fallbackTitle="System Workspace Exception">
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
          </WorkspaceErrorBoundary>

          {/* Footer */}
          <footer className="border-t border-(--line) mt-16 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-[10px] text-(--muted)">
            <span>SYSTEMS / MAP · INTERACTIVE ARCHITECTURE & FAANG FIELD GUIDE</span>
            <span>Understand the constraint → choose the primitive → defend the trade-off.</span>
          </footer>
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Mobile Navigation"
        className="flex md:hidden fixed bottom-0 inset-x-0 z-30 bg-(--bg)/95 backdrop-blur-xl border-t border-(--line) px-3 py-2 justify-around"
      >
        <button
          type="button"
          aria-current={activeWorkspace === 'map' ? 'page' : undefined}
          onClick={() => navigateSection('00', 'map', 'overview')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeWorkspace === 'map' ? 'text-(--lime) font-bold' : 'text-(--muted)'
          }`}
        >
          <span className="text-sm">⌘</span>
          <span>MAP</span>
        </button>
        <button
          type="button"
          aria-current={activeWorkspace === 'whiteboard' ? 'page' : undefined}
          onClick={() => navigateSection('02', 'whiteboard')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeWorkspace === 'whiteboard' ? 'text-(--lime) font-bold' : 'text-(--muted)'
          }`}
        >
          <span className="text-sm">▤</span>
          <span>LAB</span>
        </button>
        <button
          type="button"
          aria-current={activeWorkspace === 'internals' ? 'page' : undefined}
          onClick={() => navigateSection('03', 'internals')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeWorkspace === 'internals' ? 'text-(--lime) font-bold' : 'text-(--muted)'
          }`}
        >
          <span className="text-sm">◈</span>
          <span>STORAGE</span>
        </button>
        <button
          type="button"
          aria-current={activeWorkspace === 'interview' ? 'page' : undefined}
          onClick={() => navigateSection('04', 'interview')}
          className={`flex flex-col items-center gap-0.5 font-mono text-[9px] cursor-pointer p-1 rounded focus-visible:ring-2 focus-visible:ring-(--lime) focus-visible:outline-none ${
            activeWorkspace === 'interview' ? 'text-(--lime) font-bold' : 'text-(--muted)'
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
        className={`fixed bottom-16 md:bottom-6 right-6 z-50 px-3.5 py-2 rounded-[9px] bg-(--lime) text-(--lime-ink) font-mono font-bold text-[11px] shadow-lg transition-all duration-200 pointer-events-none ${
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
