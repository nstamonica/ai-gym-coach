"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/lib/cx";
import { GRADE_LABELS, GRADE_POINTS, GRADES } from "@/lib/grades";
import type { ExerciseProgress } from "@/lib/progress";
import { GradeBadge } from "./grade-badge";

const PLOT_HEIGHT = 220;
const AXIS_BAND = 28; // room for the date labels under the plot
const MARGIN = { top: 16, right: 28, bottom: 8, left: 36 };

const formatDate = (iso: string, withYear = false) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });

/** Grade over time for one lift at a time, with an exercise picker and a table view. */
export function ProgressChart({ exercises }: { exercises: ExerciseProgress[] }) {
  const [selectedKey, setSelectedKey] = useState(exercises[0]?.key);
  const [view, setView] = useState<"chart" | "table">("chart");
  const selected = exercises.find((e) => e.key === selectedKey) ?? exercises[0];
  if (!selected) return null;

  return (
    <section aria-labelledby="progress-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="progress-heading" className="text-lg font-semibold text-white">
            Progress by lift
          </h2>
          <p className="text-sm text-slate-400">Your form grade each time you filmed it.</p>
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          className="ml-auto rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          {view === "chart" ? "Show as table" : "Show as chart"}
        </button>
      </div>

      {/* One filter row above the card it scopes. */}
      {exercises.length > 1 && (
        <div role="group" aria-label="Choose a lift" className="flex flex-wrap gap-2">
          {exercises.map((exercise) => (
            <button
              key={exercise.key}
              type="button"
              aria-pressed={exercise.key === selected.key}
              onClick={() => setSelectedKey(exercise.key)}
              className={cx(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                exercise.key === selected.key
                  ? "border-blue-500/60 bg-blue-500/15 text-white"
                  : "border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white",
              )}
            >
              {exercise.label}
              <span className="ml-1.5 text-slate-400">{exercise.count}</span>
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-[var(--surface-card)] p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold text-white">{selected.label}</h3>
          <p className="text-sm text-slate-400">
            {selected.count} {selected.count === 1 ? "session" : "sessions"}
            {selected.count > 1 && (
              <>
                {" "}
                · {selected.first.grade} → {selected.latest.grade}
              </>
            )}
          </p>
        </div>
        {view === "chart" ? <Chart exercise={selected} /> : <ProgressTable exercise={selected} />}
        {view === "chart" && selected.count === 1 && (
          <p className="mt-2 text-sm text-slate-400">Film this lift again to see your trend.</p>
        )}
      </div>
    </section>
  );
}

function Chart({ exercise }: { exercise: ExerciseProgress }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  // Remember which lift the highlighted point belongs to, so switching lifts clears it.
  const [highlight, setHighlight] = useState<{ key: string; index: number } | null>(null);
  const active = highlight?.key === exercise.key ? highlight.index : null;
  const setActive = (index: number | null) => setHighlight(index === null ? null : { key: exercise.key, index });
  const descriptionId = useId();
  const { points } = exercise;

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const geometry = useMemo(() => {
    if (width === 0) return null;
    const times = points.map((p) => new Date(p.date).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const plotLeft = MARGIN.left;
    const plotRight = width - MARGIN.right;
    const x = (t: number) => (max === min ? (plotLeft + plotRight) / 2 : plotLeft + ((t - min) / (max - min)) * (plotRight - plotLeft));
    const y = (points: number) => MARGIN.top + ((4 - points) / 4) * (PLOT_HEIGHT - MARGIN.top - MARGIN.bottom);
    const xy = points.map((p, i) => ({ x: x(times[i]!), y: y(GRADE_POINTS[p.grade]) }));
    // Date ticks: first and last, plus the middle one when there's room.
    const tickIndexes = [...new Set([0, ...(points.length > 2 && width > 420 ? [Math.floor((points.length - 1) / 2)] : []), points.length - 1])];
    return { xy, y, plotLeft, plotRight, tickIndexes };
  }, [points, width]);

  function nearest(clientX: number) {
    if (!geometry || !containerRef.current) return null;
    const left = containerRef.current.getBoundingClientRect().left;
    let best = 0;
    geometry.xy.forEach((p, i) => {
      if (Math.abs(p.x - (clientX - left)) < Math.abs(geometry.xy[best]!.x - (clientX - left))) best = i;
    });
    return best;
  }

  function onKeyDown(event: KeyboardEvent) {
    const last = points.length - 1;
    const move: Record<string, number> = {
      ArrowRight: Math.min(last, (active ?? -1) + 1),
      ArrowLeft: Math.max(0, (active ?? last + 1) - 1),
      Home: 0,
      End: last,
    };
    if (event.key in move) {
      event.preventDefault();
      setActive(move[event.key]!);
    } else if (event.key === "Enter" && active !== null) {
      router.push(`/analyses/${points[active]!.id}`);
    }
  }

  const activePoint = active !== null ? points[active] : null;
  const activeXY = active !== null ? geometry?.xy[active] : null;
  const latest = geometry?.xy[geometry.xy.length - 1];

  return (
    <div ref={containerRef} className="relative" style={{ height: PLOT_HEIGHT + AXIS_BAND }}>
      {geometry && (
        <svg
          width={width}
          height={PLOT_HEIGHT + AXIS_BAND}
          role="img"
          aria-label={`${exercise.label}: form grade over ${points.length} sessions, from ${exercise.first.grade} to ${exercise.latest.grade}. Use the arrow keys to step through sessions.`}
          aria-describedby={descriptionId}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          onPointerMove={(e: PointerEvent) => setActive(nearest(e.clientX))}
          onPointerLeave={() => setActive(null)}
          onClick={() => activePoint && router.push(`/analyses/${activePoint.id}`)}
          className="cursor-pointer overflow-visible rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400"
        >
          {/* Hairline gridlines and labels, one per grade. */}
          {GRADES.map((grade) => {
            const gy = geometry.y(GRADE_POINTS[grade]);
            return (
              <g key={grade}>
                <line x1={geometry.plotLeft} x2={geometry.plotRight} y1={gy} y2={gy} stroke="var(--chart-grid)" strokeWidth={1} />
                <text x={MARGIN.left - 14} y={gy} dy="0.35em" textAnchor="end" fill="var(--chart-text)" fontSize={12} className="tabular-nums">
                  {grade}
                </text>
              </g>
            );
          })}

          {/* Date ticks. */}
          {geometry.tickIndexes.map((i) => (
            <text
              key={i}
              x={geometry.xy[i]!.x}
              y={PLOT_HEIGHT + 18}
              textAnchor={points.length === 1 ? "middle" : i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              fill="var(--chart-text)"
              fontSize={12}
            >
              {formatDate(points[i]!.date)}
            </text>
          ))}

          {/* Crosshair on the active session. */}
          {activeXY && (
            <line
              x1={activeXY.x}
              x2={activeXY.x}
              y1={MARGIN.top - 6}
              y2={PLOT_HEIGHT - MARGIN.bottom}
              stroke="var(--chart-axis)"
              strokeWidth={1}
            />
          )}

          {points.length > 1 && (
            <polyline
              points={geometry.xy.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--chart-series)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Markers with a surface ring so they stay legible where they meet the line. */}
          {geometry.xy.map((p, i) => (
            <circle
              key={points[i]!.id}
              cx={p.x}
              cy={p.y}
              r={i === active ? 6 : 4.5}
              fill="var(--chart-series)"
              stroke="var(--surface-card)"
              strokeWidth={2}
            />
          ))}

          {/* Direct label on the latest session only. */}
          {latest && active === null && (
            <text x={latest.x + 10} y={latest.y} dy="0.35em" fill="#e2e8f0" fontSize={12} fontWeight={600}>
              {exercise.latest.grade}
            </text>
          )}
        </svg>
      )}

      {activePoint && activeXY && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-slate-950/95 px-3 py-2 text-sm shadow-xl"
          style={{
            left: Math.min(Math.max(activeXY.x, 90), width - 90),
            top: activeXY.y - 12,
          }}
        >
          <p className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full bg-[var(--chart-series)]" aria-hidden />
            <span className="font-semibold text-white">Grade {activePoint.grade}</span>
            <span className="text-slate-400">{GRADE_LABELS[activePoint.grade]}</span>
          </p>
          <p className="mt-0.5 text-slate-400">
            {formatDate(activePoint.date, true)} · {activePoint.exercise || exercise.label}
          </p>
        </div>
      )}

      <p id={descriptionId} className="sr-only" aria-live="polite">
        {activePoint ? `${formatDate(activePoint.date, true)}: grade ${activePoint.grade}, ${GRADE_LABELS[activePoint.grade]}.` : ""}
      </p>
    </div>
  );
}

function ProgressTable({ exercise }: { exercise: ExerciseProgress }) {
  const rows = [...exercise.points].reverse();
  return (
    <div className="max-h-[248px] overflow-y-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">{exercise.label}: form grade by session, newest first</caption>
        <thead className="text-xs tracking-wider text-slate-400 uppercase">
          <tr>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Date
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Exercise
            </th>
            <th scope="col" className="py-2 font-semibold">
              Grade
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((point) => (
            <tr key={point.id}>
              <td className="py-2 pr-4 text-slate-300 tabular-nums">{formatDate(point.date, true)}</td>
              <td className="py-2 pr-4">
                <Link href={`/analyses/${point.id}`} className="text-slate-200 hover:text-white hover:underline">
                  {point.exercise || exercise.label}
                </Link>
              </td>
              <td className="py-2">
                <GradeBadge grade={point.grade} size="sm" className="size-7 rounded-md text-sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
