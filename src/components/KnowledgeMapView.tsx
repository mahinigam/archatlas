import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  ArrowUpRight,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Play,
  Layers,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { MODULES, CASE_BLUEPRINTS, KnowledgeModule } from '../data/systemDesignData';
import {
  SWIMLANE_POS,
  SWIMLANE_EDGES,
  SWIMLANE_LANES,
  MODULE_SUPPLEMENTS,
  FLASHCARD_DECK,
  EIGHT_WEEK_PLAN,
  HLD_INTERVIEW_LOOP,
  REFERENCE_LIBRARY,
} from '../data/courseExtras';
import { calculateCapacityEstimates } from '../utils/systemPhysics';

interface KnowledgeMapViewProps {
  completedIds: number[];
  onToggleComplete: (id: number) => void;
  onLaunchPresetInWhiteboard: (presetId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterPart: number | 'all' | 'done';
  onFilterPartChange: (f: number | 'all' | 'done') => void;
}

export const KnowledgeMapView: React.FC<KnowledgeMapViewProps> = ({
  completedIds,
  onToggleComplete,
  onLaunchPresetInWhiteboard,
  searchQuery,
  onSearchChange,
  filterPart,
  onFilterPartChange,
}) => {
  const [selectedId, setSelectedId] = useState<number>(1);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('archatlas_checks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  // Flashcard state
  const [flashIndex, setFlashIndex] = useState(0);
  const [flashFlipped, setFlashFlipped] = useState(false);

  // Back-of-the-envelope calculator state
  const [dauMillions, setDauMillions] = useState<number>(50);
  const [readsPerUser, setReadsPerUser] = useState<number>(40);
  const [writesPerUser, setWritesPerUser] = useState<number>(5);
  const [payloadKB, setPayloadKB] = useState<number>(25);

  const lessonRef = useRef<HTMLElement | null>(null);

  const activeModule: KnowledgeModule = useMemo(
    () => MODULES.find((m) => m.id === selectedId) || MODULES[0],
    [selectedId]
  );

  const activeSupplement = useMemo(
    () => MODULE_SUPPLEMENTS[activeModule.id] || MODULE_SUPPLEMENTS[1],
    [activeModule.id]
  );

  const focusNodeId = hoveredId ?? selectedId;

  const { upstreamIds, downstreamIds } = useMemo(() => {
    const up = new Set<number>();
    const down = new Set<number>();
    SWIMLANE_EDGES.forEach(([from, to]) => {
      if (to === focusNodeId) up.add(from);
      if (from === focusNodeId) down.add(to);
    });
    return { upstreamIds: up, downstreamIds: down };
  }, [focusNodeId]);

  const filteredModules = useMemo(() => {
    return MODULES.filter((m) => {
      const matchesFilter =
        filterPart === 'all' ||
        (filterPart === 'done' ? completedIds.includes(m.id) : m.cat === filterPart);
      if (!matchesFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        m.catName.toLowerCase().includes(q) ||
        m.mental.toLowerCase().includes(q) ||
        m.signal.toLowerCase().includes(q) ||
        m.points.some((p) => p.label.toLowerCase().includes(q) || p.text.toLowerCase().includes(q))
      );
    });
  }, [filterPart, searchQuery, completedIds]);

  const estimation = useMemo(
    () =>
      calculateCapacityEstimates(
        dauMillions,
        readsPerUser,
        writesPerUser,
        payloadKB
      ),
    [dauMillions, readsPerUser, writesPerUser, payloadKB]
  );

  const openModuleLesson = (id: number, shouldScroll = true) => {
    setSelectedId(id);
    if (shouldScroll && lessonRef.current) {
      setTimeout(() => {
        lessonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    }
  };

  const toggleCheckItem = (key: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('archatlas_checks', JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const completionPercent = Math.round((completedIds.length / MODULES.length) * 100);
  const currentFlashcard = FLASHCARD_DECK[flashIndex] || FLASHCARD_DECK[0];

  return (
    <div className="space-y-14">
      {/* 00 / HERO SECTION: orient the learner before the graph */}
      <section
        id="overview"
        className="pt-8 pb-6 grid grid-cols-1 lg:grid-cols-[1.35fr_0.65fr] gap-10 items-end border-b border-(--line)"
      >
        <div>
          <div className="eyebrow-line">A visual course · 25 connected modules · Interactive labs</div>
          <h1 className="font-display font-bold text-[clamp(42px,6.5vw,88px)] leading-[0.93] tracking-[-0.06em] text-(--ink) mt-5 mb-5">
            Think in <span className="text-(--lime)">systems.</span>
            <br />
            Design for scale.
          </h1>
          <p className="max-w-162.5 text-[15px] leading-[1.78] text-(--muted)">
            A practical engineering field guide and interactive workbench for building software that survives{' '}
            <strong className="text-(--ink) font-semibold">
              real traffic, partial failures, messy data, and changing requirements.
            </strong>{' '}
            Learn the primitives, test failure modes in the live simulators, and defend every trade-off.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <button
              type="button"
              onClick={() => openModuleLesson(1, true)}
              className="px-4 py-2.5 rounded-[10px] bg-(--lime) text-(--lime-ink) font-semibold text-xs tracking-tight hover:opacity-95 transition-opacity cursor-pointer"
            >
              Start the learning path ↘
            </button>
            <button
              type="button"
              onClick={() => {
                const nextIncomplete = MODULES.find((m) => !completedIds.includes(m.id)) || MODULES[0];
                openModuleLesson(nextIncomplete.id, true);
              }}
              className="px-4 py-2.5 rounded-[10px] border border-(--line) bg-(--panel) text-(--ink) font-semibold text-xs hover:border-(--lime) transition-colors cursor-pointer"
            >
              Continue where I left off (M{String((MODULES.find((m) => !completedIds.includes(m.id)) || MODULES[0]).id).padStart(2, '0')})
            </button>
            <button
              type="button"
              onClick={() => onLaunchPresetInWhiteboard('whatsapp')}
              className="px-4 py-2.5 rounded-[10px] border border-(--line) bg-(--p2) text-(--cyan) font-mono text-xs hover:border-(--cyan) transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Open Live Whiteboard Simulator
            </button>
          </div>
        </div>

        <div className="lg:border-l border-t lg:border-t-0 border-(--line) pt-5 lg:pt-3 lg:pl-7">
          <p className="font-display font-medium text-[17px] leading-normal text-(--ink) mb-5">
            “A good design is not a collection of technologies. It is a set of{' '}
            <span className="text-(--lime)">defensible decisions</span> tied to requirements.”
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
            <div className="border-t border-(--line) pt-3">
              <b className="font-display font-bold text-2xl sm:text-[28px] block text-(--ink)">25</b>
              <small className="font-mono text-[10px] text-(--muted) uppercase tracking-widest">
                Core modules
              </small>
            </div>
            <div className="border-t border-(--line) pt-3">
              <b className="font-display font-bold text-2xl sm:text-[28px] block text-(--ink)">04</b>
              <small className="font-mono text-[10px] text-(--muted) uppercase tracking-widest">
                Learning tracks
              </small>
            </div>
            <div className="border-t border-(--line) pt-3">
              <b className="font-display font-bold text-2xl sm:text-[28px] block text-(--ink)">08</b>
              <small className="font-mono text-[10px] text-(--muted) uppercase tracking-widest">
                Week plan
              </small>
            </div>
            <div className="border-t border-(--line) pt-3">
              <b className="font-display font-bold text-2xl sm:text-[28px] block text-(--lime)">
                {completionPercent}%
              </b>
              <small className="font-mono text-[10px] text-(--muted) uppercase tracking-widest">
                Completed ({completedIds.length}/25)
              </small>
            </div>
          </div>
        </div>
      </section>

      {/* 01 / THE BIG PICTURE: HORIZONTAL SWIMLANE KNOWLEDGE MAP */}
      <section id="knowledge-map" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
              01 · The big picture
            </div>
            <h2 className="font-display font-bold text-[clamp(24px,3vw,36px)] leading-[1.1] tracking-[-0.04em] text-(--ink) mt-1.5">
              Your system design knowledge map
            </h2>
          </div>
          <p className="max-w-117.5 text-xs text-(--muted) leading-relaxed">
            Follow the dependency lines from fundamentals to architecture and interview practice. Select any numbered node to inspect its deep-dive lesson below.
          </p>
        </div>

        <div className="border border-(--line) rounded-[20px] bg-(--panel) overflow-hidden shadow-(--shadow)">
          <div className="flex flex-wrap justify-between items-center gap-3 px-5 py-4 border-b border-(--line)">
            <div>
              <b className="font-display font-bold text-[13px] text-(--ink) block">
                THE LEARNING GRAPH · 25 CONNECTED PRIMITIVES
              </b>
              <small className="text-[11px] text-(--muted)">
                Concepts build on one another. Hover or click any node to highlight upstream prerequisites & downstream dependents.
              </small>
            </div>
            <span className="font-mono text-[10px] text-(--lime) uppercase tracking-wider">
              ACTIVE: M{String(selectedId).padStart(2, '0')} · {activeModule.title} ↗
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 1200 770"
              className="block w-full min-w-215 h-auto map-radial-bg select-none"
              role="group"
              aria-label="System design knowledge map with 25 connected modules"
            >
              {/* Swimlane backgrounds */}
              {SWIMLANE_LANES.map((lane) => (
                <g key={lane.id}>
                  <rect
                    x={28}
                    y={lane.y}
                    width={1144}
                    height={lane.h}
                    rx={18}
                    fill="var(--p2)"
                    stroke="var(--line)"
                    strokeWidth={1}
                  />
                  <text
                    x={46}
                    y={lane.y + 21}
                    fill="var(--muted)"
                    className="font-mono text-[10px] tracking-[2px]"
                  >
                    {lane.label}
                  </text>
                </g>
              ))}

              {/* Dependency Bezier Edges */}
              {SWIMLANE_EDGES.map(([from, to]) => {
                const [x1, y1] = SWIMLANE_POS[from];
                const [x2, y2] = SWIMLANE_POS[to];
                const dx = x2 - x1;
                const dy = y2 - y1;
                const isUpstream = to === focusNodeId;
                const isDownstream = from === focusNodeId;
                const isHighlighted = isUpstream || isDownstream;

                return (
                  <path
                    key={`${from}-${to}`}
                    d={`M ${x1} ${y1} C ${x1 + dx * 0.42} ${y1 + dy * 0.18}, ${x2 - dx * 0.42} ${y2 - dy * 0.18}, ${x2} ${y2}`}
                    fill="none"
                    stroke={
                      isUpstream
                        ? 'var(--cyan)'
                        : isDownstream
                        ? 'var(--lime)'
                        : 'var(--soft)'
                    }
                    strokeWidth={isHighlighted ? 2.4 : 1.3}
                    opacity={isHighlighted ? 0.95 : 0.55}
                  />
                );
              })}

              {/* 25 Numbered Circular Nodes */}
              {MODULES.map((m) => {
                const [x, y] = SWIMLANE_POS[m.id];
                const isSelected = m.id === selectedId;
                const isDone = completedIds.includes(m.id);
                const isUpstream = upstreamIds.has(m.id);
                const isDownstream = downstreamIds.has(m.id);

                let strokeColor = 'var(--soft)';
                let fillColor = 'var(--p3)';
                let fillOpacity = 1;
                let numColor = 'var(--ink)';

                if (isSelected) {
                  strokeColor = 'var(--lime)';
                  fillColor = 'var(--lime)';
                  fillOpacity = 0.24;
                  numColor = 'var(--lime)';
                } else if (isDone) {
                  strokeColor = 'var(--lime)';
                  fillColor = 'var(--lime)';
                  fillOpacity = 0.16;
                  numColor = 'var(--lime)';
                } else if (isUpstream) {
                  strokeColor = 'var(--cyan)';
                  numColor = 'var(--cyan)';
                } else if (isDownstream) {
                  strokeColor = 'var(--orange)';
                  numColor = 'var(--orange)';
                }

                const labelText =
                  m.title.length > 19 ? m.title.slice(0, 18) + '…' : m.title;

                return (
                  <g
                    key={m.id}
                    onClick={() => openModuleLesson(m.id, true)}
                    onMouseEnter={() => setHoveredId(m.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="cursor-pointer outline-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openModuleLesson(m.id, true);
                      }
                    }}
                  >
                    {isSelected && (
                      <circle
                        cx={x}
                        cy={y}
                        r={24}
                        fill="none"
                        stroke="var(--lime)"
                        strokeWidth={1.2}
                        strokeDasharray="3 3"
                        opacity={0.8}
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={18}
                      fill={fillColor}
                      fillOpacity={fillOpacity}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 2.5 : 1.6}
                    />
                    <text
                      x={x}
                      y={y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={numColor}
                      className="font-mono font-bold text-[11px]"
                    >
                      {String(m.id).padStart(2, '0')}
                    </text>
                    <text
                      x={x}
                      y={y + 34}
                      textAnchor="middle"
                      fill={isSelected ? 'var(--ink)' : 'var(--muted)'}
                      className="font-sans font-semibold text-[9.5px]"
                    >
                      {labelText}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t border-(--line) font-mono text-[10px] text-(--muted)">
            <div className="flex flex-wrap items-center gap-5">
              <span className="flex items-center gap-2">
                <i className="inline-block w-2 h-2 rounded-full bg-(--lime)" /> Selected / Completed
              </span>
              <span className="flex items-center gap-2">
                <i className="inline-block w-2 h-2 rounded-full bg-(--cyan)" /> Upstream Prerequisite
              </span>
              <span className="flex items-center gap-2">
                <i className="inline-block w-2 h-2 rounded-full bg-(--orange)" /> Downstream Dependent
              </span>
              <span className="flex items-center gap-2">
                <i className="inline-block w-2 h-2 rounded-full bg-(--soft)" /> Not started
              </span>
            </div>
            <span>Lines = architectural learning dependencies</span>
          </div>
        </div>

        {/* 4 Learning Track Cards with decorative corner rings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {SWIMLANE_LANES.map((track) => {
            const isActiveTrack = filterPart === track.id;
            return (
              <article
                key={track.id}
                onClick={() => onFilterPartChange(isActiveTrack ? 'all' : track.id)}
                className={`track-rings border rounded-[15px] bg-(--panel) p-4 min-h-37 cursor-pointer transition-all hover:-translate-y-0.5 ${
                  isActiveTrack
                    ? 'border-(--lime) shadow-(--shadow)'
                    : 'border-(--line) hover:border-(--soft)'
                }`}
              >
                <span className="font-mono text-[10px] text-(--lime) tracking-[0.14em] uppercase">
                  TRACK 0{track.id}
                </span>
                <span className="float-right font-mono text-[10px] text-(--muted)">
                  {track.range}
                </span>
                <h3 className="font-display font-bold text-base text-(--ink) mt-3 mb-1">
                  {track.title}
                </h3>
                <p className="text-[11px] text-(--muted) leading-relaxed max-w-55">
                  {track.desc}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      {/* 02 / THE CURRICULUM GRID & INTERACTIVE LESSON STUDIO */}
      <section id="curriculum" className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
              02 · The curriculum
            </div>
            <h2 className="font-display font-bold text-[clamp(24px,3vw,36px)] leading-[1.1] tracking-[-0.04em] text-(--ink) mt-1.5">
              Build the mental models
            </h2>
          </div>
          <p className="max-w-117.5 text-xs text-(--muted) leading-relaxed">
            Each lesson includes the mental model, mechanics, ASCII blueprint, trade-off matrix, Staff interview signal, and an interactive concept checkpoint.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: 'All modules' },
                { id: 1, label: '01 · Foundations' },
                { id: 2, label: '02 · Building blocks' },
                { id: 3, label: '03 · Architecture' },
                { id: 4, label: '04 · Interview' },
                { id: 'done', label: `Completed (${completedIds.length})` },
              ] as const
            ).map((btn) => {
              const active = filterPart === btn.id;
              return (
                <button
                  key={String(btn.id)}
                  type="button"
                  onClick={() => onFilterPartChange(btn.id)}
                  className={`px-3 py-1.5 rounded-full font-mono text-[10px] border transition-colors cursor-pointer ${
                    active
                      ? 'border-(--lime) text-(--lime) bg-(--p2)'
                      : 'border-(--line) bg-(--panel) text-(--muted) hover:border-(--lime) hover:text-(--lime)'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-(--muted) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Filter 25 modules..."
                aria-label="Filter modules"
                className="pl-8 pr-3 py-1.5 rounded-[10px] border border-(--line) bg-(--panel) text-xs text-(--ink) placeholder:text-(--muted) focus:outline-none focus:border-(--lime) w-48 sm:w-60"
              />
            </div>
            <span className="font-mono text-[10px] text-(--muted) hidden sm:inline">
              {filteredModules.length} MODULE{filteredModules.length === 1 ? '' : 'S'} · {completedIds.length}/25 COMPLETE
            </span>
          </div>
        </div>

        {/* 25-Module Responsive Grid */}
        {filteredModules.length === 0 ? (
          <div className="p-8 border border-dashed border-(--line) rounded-[14px] text-center text-xs text-(--muted)">
            No matching modules. Try clearing your search or selecting "All modules".
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredModules.map((m) => {
              const isDone = completedIds.includes(m.id);
              const isSelected = m.id === selectedId;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openModuleLesson(m.id, true)}
                  className={`min-h-43 border rounded-[15px] p-4 text-left flex flex-col transition-all relative overflow-hidden cursor-pointer hover:-translate-y-0.5 ${
                    isSelected
                      ? 'border-(--lime) bg-(--p2) shadow-(--shadow)'
                      : isDone
                      ? 'border-(--lime)/70 bg-(--panel)'
                      : 'border-(--line) bg-(--panel) hover:border-(--soft)'
                  }`}
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] text-(--muted) w-full">
                    <span className="text-(--lime) font-bold">
                      {m.code}
                    </span>
                    <span>·</span>
                    <span className="truncate">0{m.cat} · {m.catName}</span>
                    {isDone && (
                      <span className="ml-auto text-(--lime) font-mono text-xs">✓</span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-[18px] leading-[1.15] tracking-[-0.03em] text-(--ink) mt-4 mb-1.5">
                    {m.title}
                  </h3>
                  <p className="text-[11px] leading-[1.55] text-(--muted) line-clamp-3">
                    {m.mental}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-4 font-mono text-[9.5px] text-(--muted) w-full">
                    <span>{m.points.length} CORE PILLARS</span>
                    <b className="font-medium text-(--cyan)">OPEN LESSON ↗</b>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* INTERACTIVE LESSON STUDIO (DEEP DIVE DRAWER) */}
        <article
          ref={lessonRef}
          id="lesson-studio"
          className="border border-(--line) rounded-[20px] bg-(--panel) overflow-hidden shadow-(--shadow) mt-7"
        >
          {/* Lesson Header */}
          <div className="p-6 sm:p-9 border-b border-(--line) bg-linear-to-br from-(--p2) to-(--panel)">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-[10px] text-(--lime) uppercase tracking-[0.16em]">
                MODULE {activeModule.code} / TRACK 0{activeModule.cat} · {activeModule.catName}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleComplete(activeModule.id)}
                  className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold border transition-colors cursor-pointer ${
                    completedIds.includes(activeModule.id)
                      ? 'bg-(--lime) text-(--lime-ink) border-(--lime)'
                      : 'bg-(--p3) text-(--ink) border-(--line) hover:border-(--lime)'
                  }`}
                >
                  {completedIds.includes(activeModule.id)
                    ? '✓ Completed · Undo'
                    : 'Mark module complete ✓'}
                </button>
              </div>
            </div>

            <h2 className="font-display font-bold text-[clamp(28px,3.8vw,44px)] leading-[1.08] tracking-[-0.04em] text-(--ink) mt-2">
              {activeModule.title}
            </h2>
            <p className="max-w-205 text-[13px] text-(--muted) mt-2.5 leading-relaxed">
              {activeModule.mental}
            </p>

            {/* Unboxed Metadata Bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-(--line)/60 font-mono text-[10px] text-(--muted)">
              <span>
                Track: <strong className="text-(--ink)">0{activeModule.cat} · {activeModule.catName}</strong>
              </span>
              <span>
                Core Pillars: <strong className="text-(--ink)">{activeModule.points.length}</strong>
              </span>
              {activeModule.deps.length > 0 && (
                <span>
                  Prerequisites:{' '}
                  {activeModule.deps.map((preId, i) => (
                    <button
                      key={preId}
                      type="button"
                      onClick={() => openModuleLesson(preId, false)}
                      className="text-(--cyan) hover:underline ml-1 cursor-pointer"
                    >
                      M{String(preId).padStart(2, '0')}
                      {i < activeModule.deps.length - 1 ? ',' : ''}
                    </button>
                  ))}
                </span>
              )}
            </div>
          </div>

          {/* Lesson Body */}
          <div className="p-6 sm:p-9 space-y-7">
            {/* Mental Model Box */}
            <div className="grid grid-cols-1 md:grid-cols-[170px_1fr] gap-4 bg-(--p2) border border-(--line) rounded-[14px] p-4 sm:p-5">
              <small className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--lime)">
                Mental model
              </small>
              <p className="font-display font-semibold text-[15px] leading-[1.55] text-(--ink) m-0">
                {activeModule.mental}
              </p>
            </div>

            {/* Core Concepts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {activeModule.points.map((pt, idx) => (
                <article
                  key={idx}
                  className="border border-(--line) rounded-[14px] p-4 sm:p-5 bg-(--bg) flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span className="w-6 h-6 rounded-[7px] bg-(--p3) grid place-items-center font-mono text-[10px] text-(--cyan)">
                        0{idx + 1}
                      </span>
                      <h3 className="font-display font-bold text-base text-(--ink)">
                        {pt.label}
                      </h3>
                    </div>
                    <p className="text-xs text-(--muted) leading-relaxed">
                      {pt.text}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            {/* Mental Flow Row */}
            <div className="bg-(--p2) border border-(--line) rounded-[14px] p-4 sm:p-5">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--muted) mb-3">
                A useful mental flow · Request & State Lifecycle
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {activeSupplement.flow.map((step, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && (
                      <span className="font-mono text-base text-(--lime)">→</span>
                    )}
                    <div className="px-3 py-2 rounded-lg bg-(--panel) border border-(--soft) font-mono font-semibold text-[10.5px] text-(--ink) text-center min-w-23">
                      {step}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* ASCII Architecture Diagram + Trade-Off Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border border-(--line) rounded-[14px] bg-(--bg) p-4 sm:p-5 overflow-x-auto">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--cyan) mb-2.5">
                  Architecture Blueprint Schematic
                </div>
                <pre className="font-mono text-[11px] leading-[1.45] text-(--ink) overflow-x-auto">
                  {activeModule.diagram}
                </pre>
              </div>

              <div className="border border-(--line) rounded-[14px] bg-(--bg) p-4 sm:p-5 overflow-x-auto">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--lime) mb-2.5">
                  Staff Trade-Off Matrix
                </div>
                {activeModule.table && activeModule.table.length > 1 && (
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-(--line) font-mono text-[10px] text-(--muted)">
                        {activeModule.table[0].map((header, hIdx) => (
                          <th key={hIdx} className="py-2 px-2 first:pl-0 last:pr-0">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-(--line)/60">
                      {activeModule.table.slice(1).map((row, rIdx) => (
                        <tr key={rIdx} className="align-top">
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`py-2.5 px-2 first:pl-0 last:pr-0 text-[11px] ${
                                cIdx === 0
                                  ? 'font-mono font-semibold text-(--ink)'
                                  : cIdx === 1
                                  ? 'text-(--muted)'
                                  : 'text-(--cyan)'
                              }`}
                            >
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Staff Signal Callout (Full 1px border, tinted surface, zero border-l-4) */}
            <div className="p-4 rounded-xl border border-(--cyan)/40 bg-(--cyan)/10 text-xs text-(--muted) leading-relaxed">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-(--cyan) font-semibold mb-1.5">
                <Sparkles className="w-3.5 h-3.5" /> FAANG Staff-Level Interview Signal
              </div>
              <p className="text-(--ink)">“{activeModule.signal}”</p>
            </div>

            {/* Knowledge Checkpoints + Interactive Concept Check Quiz */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {/* Self-Checkboxes */}
              <div className="border border-(--line) rounded-[14px] p-4 sm:p-5 bg-(--p2)">
                <h3 className="font-display font-bold text-lg text-(--ink)">
                  Knowledge checkpoint
                </h3>
                <p className="text-[11px] text-(--muted) mt-0.5 mb-3.5">
                  Tick each prompt after you can explain the trade-off aloud without looking at notes.
                </p>
                <div className="space-y-2">
                  {activeSupplement.checks.map((checkText, idx) => {
                    const key = `${activeModule.id}-${idx}`;
                    const checked = !!checkedItems[key];
                    return (
                      <label
                        key={key}
                        className="flex items-start gap-2.5 p-2.5 rounded-[9px] bg-(--panel) border border-(--line) text-xs text-(--ink) cursor-pointer hover:border-(--soft)"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCheckItem(key)}
                          className="mt-0.5 accent-(--lime)"
                        />
                        <span className={checked ? 'line-through text-(--muted)' : ''}>
                          {checkText}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Multiple-Choice Concept Quiz */}
              <div className="border border-(--line) rounded-[14px] p-4 sm:p-5 bg-(--p2)">
                <h3 className="font-display font-bold text-lg text-(--ink)">
                  Quick concept check
                </h3>
                <p className="text-[11px] text-(--muted) mt-0.5 mb-3">
                  Choose an answer, then verify the architectural explanation.
                </p>
                <div className="font-semibold text-xs text-(--ink) mb-2.5">
                  {activeSupplement.quiz.question}
                </div>
                <div className="space-y-1.5">
                  {activeSupplement.quiz.options.map((opt, idx) => {
                    const picked = quizAnswers[activeModule.id] === idx;
                    const submitted = !!quizSubmitted[activeModule.id];
                    const isCorrect = idx === activeSupplement.quiz.answerIndex;

                    let borderClass = 'border-(--line) bg-(--panel) text-(--muted)';
                    if (submitted && isCorrect) {
                      borderClass = 'border-(--lime) bg-(--lime)/10 text-(--ink)';
                    } else if (submitted && picked && !isCorrect) {
                      borderClass = 'border-(--rose) bg-(--rose)/10 text-(--ink)';
                    } else if (picked) {
                      borderClass = 'border-(--cyan) bg-(--panel) text-(--ink)';
                    }

                    return (
                      <label
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-[9px] border text-xs cursor-pointer transition-colors ${borderClass}`}
                      >
                        <input
                          type="radio"
                          name={`quiz-${activeModule.id}`}
                          checked={picked}
                          onChange={() => {
                            setQuizAnswers((prev) => ({ ...prev, [activeModule.id]: idx }));
                            setQuizSubmitted((prev) => ({ ...prev, [activeModule.id]: false }));
                          }}
                          className="mt-0.5 accent-(--lime)"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5">
                  <span className="text-[11px] text-(--muted) flex-1">
                    {quizSubmitted[activeModule.id] && (
                      <span
                        className={
                          quizAnswers[activeModule.id] === activeSupplement.quiz.answerIndex
                            ? 'text-(--lime)'
                            : 'text-(--rose)'
                        }
                      >
                        {quizAnswers[activeModule.id] === activeSupplement.quiz.answerIndex
                          ? 'Correct. '
                          : 'Not quite. '}
                        {activeSupplement.quiz.explanation}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (quizAnswers[activeModule.id] !== undefined && quizAnswers[activeModule.id] !== null) {
                        setQuizSubmitted((prev) => ({ ...prev, [activeModule.id]: true }));
                      }
                    }}
                    className="px-3 py-1.5 rounded-[9px] border border-(--line) bg-(--panel) text-(--ink) font-semibold text-xs hover:border-(--lime) cursor-pointer"
                  >
                    Check answer
                  </button>
                </div>
              </div>
            </div>

            {/* Lesson Footer Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-(--line)">
              <button
                type="button"
                disabled={activeModule.id === 1}
                onClick={() => openModuleLesson(Math.max(1, activeModule.id - 1), false)}
                className="px-3.5 py-2 rounded-[9px] border border-(--line) bg-(--p2) text-(--ink) text-xs font-bold disabled:opacity-40 hover:border-(--lime) cursor-pointer flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous module
              </button>

              <button
                type="button"
                onClick={() => onToggleComplete(activeModule.id)}
                className={`px-4 py-2 rounded-[9px] text-xs font-bold border cursor-pointer ${
                  completedIds.includes(activeModule.id)
                    ? 'border-(--line) bg-(--p2) text-(--ink)'
                    : 'border-(--lime) bg-(--lime) text-(--lime-ink)'
                }`}
              >
                {completedIds.includes(activeModule.id)
                  ? '✓ Completed · undo'
                  : 'Mark module complete ✓'}
              </button>

              <button
                type="button"
                disabled={activeModule.id === 25}
                onClick={() => openModuleLesson(Math.min(25, activeModule.id + 1), false)}
                className="px-3.5 py-2 rounded-[9px] border border-(--line) bg-(--p2) text-(--ink) text-xs font-bold disabled:opacity-40 hover:border-(--lime) cursor-pointer flex items-center gap-1.5"
              >
                Next module <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </article>
      </section>

      {/* BACK-OF-THE-ENVELOPE CAPACITY ESTIMATOR + CANONICAL BLUEPRINTS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Capacity Calculator */}
        <div className="lg:col-span-5 border border-(--line) rounded-[18px] bg-(--panel) p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--lime)">
                Interactive Estimator · Module 03
              </span>
              <Calculator className="w-4 h-4 text-(--lime)" />
            </div>
            <h3 className="font-display font-bold text-xl text-(--ink)">
              Back-of-the-Envelope Physics Calculator
            </h3>
            <p className="text-xs text-(--muted) mt-1 mb-5">
              Slide DAU, read/write ratios, and payload size to compute real QPS, peak concurrency, and annual storage footprint.
            </p>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-(--muted)">Daily Active Users (DAU)</span>
                  <span className="font-mono font-bold text-(--lime)">{dauMillions}M users</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={dauMillions}
                  onChange={(e) => setDauMillions(Number(e.target.value))}
                  aria-label="Daily Active Users in Millions"
                  className="w-full accent-(--lime)"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-(--muted)">Reads / User / Day</span>
                    <span className="font-mono text-(--cyan)">{readsPerUser}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={200}
                    value={readsPerUser}
                    onChange={(e) => setReadsPerUser(Number(e.target.value))}
                    aria-label="Reads per user per day"
                    className="w-full accent-(--cyan)"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-(--muted)">Writes / User / Day</span>
                    <span className="font-mono text-(--orange)">{writesPerUser}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={writesPerUser}
                    onChange={(e) => setWritesPerUser(Number(e.target.value))}
                    aria-label="Writes per user per day"
                    className="w-full accent-(--orange)"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-(--muted)">Record Payload Size</span>
                  <span className="font-mono text-(--ink)">{payloadKB} KB</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={500}
                  value={payloadKB}
                  onChange={(e) => setPayloadKB(Number(e.target.value))}
                  aria-label="Payload size in kilobytes"
                  className="w-full accent-(--lime)"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-(--line)">
            <div className="p-3 rounded-[10px] bg-(--p2) border border-(--line)">
              <span className="font-mono text-[10px] text-(--muted) uppercase">Avg Read / Write QPS</span>
              <div className="font-mono font-bold text-sm text-(--ink) mt-0.5">
                {estimation.readQps.toLocaleString()} / {estimation.writeQps.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-[10px] bg-(--p2) border border-(--line)">
              <span className="font-mono text-[10px] text-(--muted) uppercase">Peak Total QPS (3×)</span>
              <div className="font-mono font-bold text-sm text-(--lime) mt-0.5">
                {estimation.peakQps.toLocaleString()} req/s
              </div>
            </div>
            <div className="p-3 rounded-[10px] bg-(--p2) border border-(--line)">
              <span className="font-mono text-[10px] text-(--muted) uppercase">Ingress / Egress BW</span>
              <div className="font-mono font-bold text-sm text-(--cyan) mt-0.5">
                {estimation.ingressBandwidthMBps} / {estimation.egressBandwidthMBps} MB/s
              </div>
            </div>
            <div className="p-3 rounded-[10px] bg-(--p2) border border-(--line)">
              <span className="font-mono text-[10px] text-(--muted) uppercase">Annual New Storage</span>
              <div className="font-mono font-bold text-sm text-(--orange) mt-0.5">
                {estimation.yearlyStorageFormatted}
              </div>
            </div>
          </div>
        </div>

        {/* Canonical System Blueprints Quick Launcher */}
        <div className="lg:col-span-7 border border-(--line) rounded-[18px] bg-(--panel) p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--cyan)">
              Canonical Case Studies · Module 22
            </span>
            <Layers className="w-4 h-4 text-(--cyan)" />
          </div>
          <h3 className="font-display font-bold text-xl text-(--ink)">
            FAANG Production Architecture Blueprints
          </h3>
          <p className="text-xs text-(--muted) mt-1 mb-4">
            Inspect the critical invariant, scale math, and Staff-level trade-offs for 8 canonical interviews, or launch a live topology in the Whiteboard Lab.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-92.5 overflow-y-auto pr-1">
            {CASE_BLUEPRINTS.map((bp, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-(--line) bg-(--p2) flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-(--ink)">
                      {bp.name}
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-(--cyan) mt-0.5">
                    {bp.scale}
                  </div>
                  <p className="text-[11px] text-(--muted) mt-2 line-clamp-2">
                    <strong className="text-(--ink)">{bp.decisions[0]?.title}:</strong>{' '}
                    {bp.decisions[0]?.detail}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-(--line)/60 font-mono text-[10px]">
                  <span className="text-(--muted) truncate max-w-45">
                    {bp.decisions[1]?.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onLaunchPresetInWhiteboard('whatsapp')}
                    className="text-(--lime) hover:underline shrink-0 cursor-pointer"
                  >
                    Simulate ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 / DELIBERATE PRACTICE: 8-WEEK PLAN & 45-MIN HLD OPERATING SYSTEM */}
      <section id="practice" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
              03 · Deliberate practice
            </div>
            <h2 className="font-display font-bold text-[clamp(24px,3vw,36px)] leading-[1.1] tracking-[-0.04em] text-(--ink) mt-1.5">
              Turn knowledge into design skill
            </h2>
          </div>
          <p className="max-w-117.5 text-xs text-(--muted) leading-relaxed">
            The objective is not to memorise 25 diagrams. Recognise constraints, choose the right primitive, and explain what your choice costs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 8-Week Progression */}
          <div className="border border-(--line) rounded-[15px] bg-(--panel) p-5 sm:p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
              An eight-week progression
            </div>
            <h3 className="font-display font-bold text-lg text-(--ink) mt-1 mb-1">
              From first principles to full designs
            </h3>
            <p className="text-xs text-(--muted) mb-4">
              Use this sequence as a default. Spend longer where you cannot yet explain the trade-off without notes.
            </p>
            <div className="divide-y divide-(--line)">
              {EIGHT_WEEK_PLAN.map((item) => (
                <div key={item.wk} className="grid grid-cols-[54px_1fr] gap-3 py-3">
                  <div className="font-mono text-[10px] text-(--lime) pt-0.5">{item.wk}</div>
                  <div>
                    <strong className="text-xs text-(--ink) block">{item.title}</strong>
                    <p className="text-[11px] text-(--muted) mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 45-Minute Interview Operating System */}
          <div className="border border-(--line) rounded-[15px] bg-(--panel) p-5 sm:p-6 flex flex-col justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
                The interview operating system
              </div>
              <h3 className="font-display font-bold text-lg text-(--ink) mt-1 mb-1">
                A repeatable 45-minute HLD loop
              </h3>
              <p className="text-xs text-(--muted) mb-4">
                Adapt the time to the interviewer and prompt. This is scaffolding, not a rigid script.
              </p>
              <div className="divide-y divide-(--line)">
                {HLD_INTERVIEW_LOOP.map((item) => (
                  <div key={item.step} className="grid grid-cols-[54px_1fr] gap-3 py-3">
                    <div className="font-mono text-[10px] text-(--cyan) pt-0.5">{item.step}</div>
                    <div>
                      <strong className="text-xs text-(--ink) block">{item.title}</strong>
                      <p className="text-[11px] text-(--muted) mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-[11px] border border-(--orange)/40 bg-(--orange)/10 text-xs text-(--muted)">
              <strong className="text-(--orange) font-semibold">Senior signal:</strong> Do not add Kafka, Redis, Kubernetes, or microservices because they sound impressive. Introduce a component when a requirement or measured bottleneck justifies it.
            </div>
          </div>
        </div>
      </section>

      {/* 04 / ACTIVE RECALL: 3D FLIP FLASHCARDS */}
      <section id="flashcards" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
              04 · Active recall
            </div>
            <h2 className="font-display font-bold text-[clamp(24px,3vw,36px)] leading-[1.1] tracking-[-0.04em] text-(--ink) mt-1.5">
              Quick revision deck
            </h2>
          </div>
          <p className="max-w-117.5 text-xs text-(--muted) leading-relaxed">
            Try to answer aloud before flipping. Retrieval practice exposes architectural gaps more honestly than rereading.
          </p>
        </div>

        <div
          onClick={() => setFlashFlipped((f) => !f)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setFlashFlipped((f) => !f);
            }
          }}
          tabIndex={0}
          role="button"
          className="flash-perspective cursor-pointer outline-none"
        >
          <div className={`flash-inner ${flashFlipped ? 'is-flipped' : ''}`}>
            {/* Front Face */}
            <div
              aria-hidden={flashFlipped}
              className="flash-face border border-(--line) rounded-2xl bg-(--panel) p-6 sm:p-8 flex flex-col justify-center"
            >
              <small className="font-mono text-[10px] text-(--lime) tracking-[0.14em] uppercase">
                CONCEPT · {String(flashIndex + 1).padStart(2, '0')} / {FLASHCARD_DECK.length}
              </small>
              <strong className="font-display font-bold text-xl sm:text-2xl text-(--ink) mt-2.5">
                {currentFlashcard[0]}
              </strong>
              <div className="font-mono text-[10px] text-(--muted) uppercase tracking-[0.15em] mt-5">
                CLICK TO REVEAL ANSWER ↗
              </div>
            </div>

            {/* Back Face */}
            <div
              aria-hidden={!flashFlipped}
              className="flash-face flash-back border border-(--lime)/60 rounded-2xl bg-(--p2) p-6 sm:p-8 flex flex-col justify-center"
            >
              <small className="font-mono text-[10px] text-(--cyan) tracking-[0.14em] uppercase">
                THE CORE ARCHITECTURAL IDEA
              </small>
              <p className="text-sm sm:text-[15px] text-(--ink) leading-relaxed mt-2.5">
                {currentFlashcard[1]}
              </p>
              <div className="font-mono text-[10px] text-(--muted) uppercase tracking-[0.15em] mt-4">
                CLICK TO FLIP BACK
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setFlashFlipped(false);
              setFlashIndex((i) => (i - 1 + FLASHCARD_DECK.length) % FLASHCARD_DECK.length);
            }}
            className="px-3.5 py-2 rounded-[9px] border border-(--line) bg-(--panel) text-xs text-(--ink) hover:border-(--lime) cursor-pointer"
          >
            ← Previous
          </button>
          <span className="font-mono text-xs text-(--muted)">
            {String(flashIndex + 1).padStart(2, '0')} / {FLASHCARD_DECK.length}
          </span>
          <button
            type="button"
            onClick={() => {
              setFlashFlipped(false);
              setFlashIndex((i) => (i + 1) % FLASHCARD_DECK.length);
            }}
            className="px-3.5 py-2 rounded-[9px] border border-(--line) bg-(--panel) text-xs text-(--ink) hover:border-(--lime) cursor-pointer"
          >
            Next →
          </button>
        </div>
      </section>

      {/* 05 / GO DEEPER: REFERENCE LIBRARY */}
      <section id="resources" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-(--muted)">
              05 · Go deeper
            </div>
            <h2 className="font-display font-bold text-[clamp(24px,3vw,36px)] leading-[1.1] tracking-[-0.04em] text-(--ink) mt-1.5">
              Reference library
            </h2>
          </div>
          <p className="max-w-117.5 text-xs text-(--muted) leading-relaxed">
            Use primary documentation and engineering books to validate details. Treat summaries as maps; read the source when a production design depends on it.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REFERENCE_LIBRARY.map((res) => (
            <a
              key={res.url}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-(--line) bg-(--panel) rounded-[13px] p-4 hover:-translate-y-0.5 hover:border-(--cyan) transition-all flex flex-col justify-between"
            >
              <div>
                <small className="font-mono text-[9px] text-(--cyan) uppercase tracking-[0.13em]">
                  {res.tag}
                </small>
                <h3 className="font-display font-bold text-[15px] text-(--ink) mt-2 mb-1.5 flex items-center justify-between">
                  {res.title}
                  <ArrowUpRight className="w-3.5 h-3.5 text-(--muted)" />
                </h3>
                <p className="text-[11px] text-(--muted) leading-relaxed">{res.desc}</p>
              </div>
              <span className="font-mono text-[9px] text-(--muted) mt-3 pt-2 border-t border-(--line)/50 truncate">
                {res.domain}
              </span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
};
