"use client";

import { ChartLine, Table2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cx } from "@/lib/cx";
import { GRADE_LABELS, GRADE_POINTS, GRADES } from "@/lib/grades";
import type { ExerciseProgress } from "@/lib/progress";
import { GRADE_COLOR, GradeBadge } from "./grade-badge";
import { SectionHeading } from "./page-header";

const PLOT_HEIGHT = 220;
const AXIS_BAND = 28; // room for the date labels under the plot
const MARGIN = { top: 16, right: 28, bottom: 8, left: 36 };
const AXIS_FONT = { fontFamily: "var(--font-barlow-condensed), sans-serif", letterSpacing: "0.04em" } as const;

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
          <SectionHeading id="progress-heading">Progress by lift</SectionHeading>
          <p className="mt-1 text-sm text-iron-400">Your form grade each time you filmed it.</p>
        </div>
        <button
          type="button"
          onClick={() => setView((v) => (v === "chart" ? "table" : "chart"))}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold text-iron-300 transition hover:bg-iron-800 hover:text-iron-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100"
        >
          {view === "chart" ? <Table2 className="size-4" aria-hidden /> : <ChartLine className="size-4" aria-hidden />}
          {view === "chart" ? "Show as table" : "Show as chart"}
        </button>
      </div>

      {/* One filter row above the card it scopes. */}
      {exercises.length > 1 && (
        <div role="group" aria-label="Choose a lift" className="flex flex-wrap gap-2">
          {exercises.map((exercise) => {
            const active = exercise.key === selected.key;
            return (
              <button
                key={exercise.key}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedKey(exercise.key)}
                className={cx(
                  "rounded-md border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-iron-100",
                  active
                    ? "border-iron-100 bg-iron-100 text-iron-950"
                    : "border-iron-700 text-iron-300 hover:border-iron-500 hover:text-iron-50",
                )}
              >
                {exercise.label}
                <span className={cx("ml-1.5 tabular-nums", active ? "text-iron-600" : "text-iron-400")}>{exercise.count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-iron-800 bg-iron-900 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-wide text-iron-50 uppercase">{selected.label}</h3>
          <p className="text-sm text-iron-400">
            {selected.count} {selected.count === 1 ? "session" : "sessions"}
            {selected.count > 1 && (
              <>
                {" "}
                · from {selected.first.grade} to {selected.latest.grade}
              </>
            )}
          </p>
        </div>
        {view === "chart" ? <Chart exercise={selected} /> : <ProgressTable exercise={selected} />}
        {view === "chart" && selected.count === 1 && (
          <p className="mt-2 text-sm text-iron-400">Film this lift again to see your trend.</p>
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
          className="cursor-pointer overflow-visible rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-iron-100"
        >
          {/* Hairline gridlines and labels, one per grade. */}
          {GRADES.map((grade) => {
            const gy = geometry.y(GRADE_POINTS[grade]);
            return (
              <g key={grade}>
                <line x1={geometry.plotLeft} x2={geometry.plotRight} y1={gy} y2={gy} stroke="var(--chart-grid)" strokeWidth={1} />
                <text x={MARGIN.left - 14} y={gy} dy="0.35em" textAnchor="end" fill="var(--chart-text)" fontSize={13} fontWeight={600} style={AXIS_FONT}>
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
              fontSize={13}
              style={AXIS_FONT}
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
              stroke="var(--chart-line)"
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Markers take their grade's color (the y-position already encodes it, so color
              is redundant, never the only cue), with a surface ring where they meet the line. */}
          {geometry.xy.map((p, i) => (
            <circle
              key={points[i]!.id}
              cx={p.x}
              cy={p.y}
              r={i === active ? 7 : 5}
              fill={GRADE_COLOR[points[i]!.grade]}
              stroke="var(--surface-card)"
              strokeWidth={2}
            />
          ))}

          {/* Direct label on the latest session only. */}
          {latest && active === null && (
            <text x={latest.x + 11} y={latest.y} dy="0.35em" fill="var(--ink)" fontSize={14} fontWeight={700} style={AXIS_FONT}>
              {exercise.latest.grade}
            </text>
          )}
        </svg>
      )}

      {activePoint && activeXY && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-56 -translate-x-1/2 -translate-y-full rounded-md border border-iron-700 bg-iron-950/95 px-3 py-2 text-sm shadow-xl shadow-black/40"
          style={{
            left: Math.min(Math.max(activeXY.x, 90), width - 90),
            top: activeXY.y - 12,
          }}
        >
          <p className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: GRADE_COLOR[activePoint.grade] }} aria-hidden />
            <span className="font-semibold text-iron-50">Grade {activePoint.grade}</span>
            <span className="text-iron-400">{GRADE_LABELS[activePoint.grade]}</span>
          </p>
          <p className="mt-0.5 text-iron-400">
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
        <thead className="label-caps text-iron-400">
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
        <tbody className="divide-y divide-iron-800">
          {rows.map((point) => (
            <tr key={point.id}>
              <td className="py-2 pr-4 text-iron-300 tabular-nums">{formatDate(point.date, true)}</td>
              <td className="py-2 pr-4">
                <Link href={`/analyses/${point.id}`} className="text-iron-200 hover:text-iron-50 hover:underline">
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
