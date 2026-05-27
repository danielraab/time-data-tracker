"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type TouchEvent,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
} from "date-fns";
import { orphanEnds, pairSpans } from "@/lib/spans";
import { formatDayLabel, formatTime } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Entry } from "@/lib/types";

interface TimelineProps {
  entries: Entry[];
  onPickTime?: (iso: string) => void;
  /** Called when the user drags on the lane to define a duration's bounds. */
  onCreateDuration?: (startIso: string, endIso: string) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Vertical pixels per hour. 40px keeps the lane scannable while still tappable. */
const HOUR_PX = 40;
const DAY_HEIGHT = 24 * HOUR_PX;
/** Visible scroll viewport height — keeps the timeline from dominating the page. */
const VIEWPORT_PX = 7 * HOUR_PX;
const SWIPE_THRESHOLD = 50;
const SWIPE_MAX_OFF_AXIS = 60;
/** Minimum drag distance (px) to distinguish a drag gesture from a tap. */
const DRAG_THRESHOLD_PX = 6;

function dayLabel(date: Date): string {
  if (isToday(date)) return t.timeline.today;
  if (isYesterday(date)) return t.timeline.yesterday;
  if (isTomorrow(date)) return t.timeline.tomorrow;
  return formatDayLabel(date);
}

export function Timeline({
  entries,
  onPickTime,
  onCreateDuration,
}: TimelineProps) {
  const now = useNow();

  /**
   * Day shown, expressed as an offset (in days) from "today". 0 = today,
   * -1 = yesterday, etc. Storing an offset rather than an absolute Date keeps
   * the SSR snapshot deterministic (no clock reads during render) and is
   * trivially serializable.
   */
  const [dayOffset, setDayOffset] = useState(0);

  const day = useMemo<Date | null>(
    () => (now !== null ? addDays(startOfDay(new Date(now)), dayOffset) : null),
    [now, dayOffset],
  );

  const dayStartMs = day ? day.getTime() : 0;
  const dayEndMs = dayStartMs + DAY_MS;
  const showingToday = dayOffset === 0;

  const pairs = useMemo(() => pairSpans(entries), [entries]);
  const orphans = useMemo(() => orphanEnds(entries), [entries]);
  const points = useMemo(
    () =>
      entries.filter(
        (e) => e.entryType === "point_label" || e.entryType === "point_number",
      ),
    [entries],
  );

  /** Spans that overlap the current day, clipped to its bounds. */
  const visibleSpans = useMemo(() => {
    // When `now` isn't available yet (pre-mount), use end-of-day so that
    // open spans still render without reading the impure clock during render.
    const openEndMs = now ?? dayEndMs;
    return pairs
      .map(({ start, end }) => {
        const startMs = new Date(start.timestamp).getTime();
        const endMs = end ? new Date(end.timestamp).getTime() : openEndMs;
        const open = end === null;
        const clippedStart = Math.max(startMs, dayStartMs);
        const clippedEnd = Math.min(endMs, dayEndMs);
        if (clippedEnd < dayStartMs || clippedStart > dayEndMs) return null;
        if (clippedEnd <= clippedStart) return null;
        return {
          id: start._id,
          label: start.label,
          open,
          clippedStart,
          clippedEnd,
          continuesBefore: startMs < dayStartMs,
          continuesAfter: endMs > dayEndMs,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);
  }, [pairs, dayStartMs, dayEndMs, now]);

  const visiblePoints = useMemo(
    () =>
      points.filter((p) => {
        const ms = new Date(p.timestamp).getTime();
        return ms >= dayStartMs && ms <= dayEndMs;
      }),
    [points, dayStartMs, dayEndMs],
  );

  const visibleOrphans = useMemo(
    () =>
      orphans.filter((o) => {
        const ms = new Date(o.timestamp).getTime();
        return ms >= dayStartMs && ms <= dayEndMs;
      }),
    [orphans, dayStartMs, dayEndMs],
  );

  const yPos = useCallback(
    (ms: number) => ((ms - dayStartMs) / DAY_MS) * DAY_HEIGHT,
    [dayStartMs],
  );

  const nowY =
    now !== null && now >= dayStartMs && now <= dayEndMs ? yPos(now) : null;

  /** Convert a y-pixel offset within the day lane to a UTC millisecond timestamp. */
  function msFromLanePx(px: number): number {
    return dayStartMs + Math.max(0, Math.min(1, px / DAY_HEIGHT)) * DAY_MS;
  }

  // Drag-to-create state
  const dragAnchorRef = useRef<{
    px: number;
    ms: number;
    pointerType: string;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    topPx: number;
    heightPx: number;
    startIso: string;
    endIso: string;
  } | null>(null);

  function handleLanePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!onPickTime && !onCreateDuration) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    // Capture pointer for mouse/pen so move/up fire even outside the element.
    // Do NOT capture touch — that would break the scroll container.
    if (e.pointerType !== "touch") {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const py = e.clientY - e.currentTarget.getBoundingClientRect().top;
    dragAnchorRef.current = {
      px: py,
      ms: msFromLanePx(py),
      pointerType: e.pointerType,
    };
  }

  function handleLanePointerMove(e: PointerEvent<HTMLDivElement>) {
    const anchor = dragAnchorRef.current;
    if (!anchor || anchor.pointerType === "touch" || !onCreateDuration) return;
    const py = e.clientY - e.currentTarget.getBoundingClientRect().top;
    if (Math.abs(py - anchor.px) < DRAG_THRESHOLD_PX) return;
    const curMs = msFromLanePx(py);
    const startMs = Math.min(anchor.ms, curMs);
    const endMs = Math.max(anchor.ms, curMs);
    const topPx = yPos(startMs);
    setDragPreview({
      topPx,
      heightPx: Math.max(4, yPos(endMs) - topPx),
      startIso: new Date(startMs).toISOString(),
      endIso: new Date(endMs).toISOString(),
    });
  }

  function handleLanePointerUp(e: PointerEvent<HTMLDivElement>) {
    const anchor = dragAnchorRef.current;
    dragAnchorRef.current = null;
    setDragPreview(null);
    if (!anchor) return;
    const py = e.clientY - e.currentTarget.getBoundingClientRect().top;
    const isDrag =
      anchor.pointerType !== "touch" &&
      Math.abs(py - anchor.px) >= DRAG_THRESHOLD_PX;
    if (isDrag && onCreateDuration) {
      const curMs = msFromLanePx(py);
      onCreateDuration(
        new Date(Math.min(anchor.ms, curMs)).toISOString(),
        new Date(Math.max(anchor.ms, curMs)).toISOString(),
      );
    } else if (!isDrag && onPickTime) {
      onPickTime(new Date(anchor.ms).toISOString());
    }
  }

  function handleLanePointerCancel() {
    dragAnchorRef.current = null;
    setDragPreview(null);
  }

  const goPrev = useCallback(() => setDayOffset((o) => o - 1), []);
  const goNext = useCallback(() => setDayOffset((o) => o + 1), []);
  const goToday = useCallback(() => setDayOffset(0), []);

  // Auto-scroll the day viewport to a useful position when the day changes:
  // - today: center "now"
  // - other days: center the earliest visible entry, falling back to 08:00.
  // We deliberately depend only on `dayOffset` + `dayReady` so manual user
  // scrolls aren't reset when entries refresh.
  const scrollRef = useRef<HTMLDivElement>(null);
  const dayReady = day !== null;
  useEffect(() => {
    if (!dayReady) return;
    const el = scrollRef.current;
    if (!el) return;

    let targetY: number;
    if (showingToday && nowY !== null) {
      targetY = nowY - VIEWPORT_PX / 3;
    } else {
      const allMs = [
        ...visibleSpans.map((s) => s.clippedStart),
        ...visiblePoints.map((p) => new Date(p.timestamp).getTime()),
        ...visibleOrphans.map((o) => new Date(o.timestamp).getTime()),
      ];
      targetY =
        allMs.length > 0
          ? yPos(Math.min(...allMs)) - VIEWPORT_PX / 3
          : 8 * HOUR_PX - VIEWPORT_PX / 4;
    }
    el.scrollTop = Math.max(0, Math.min(DAY_HEIGHT - VIEWPORT_PX, targetY));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayOffset, dayReady]);

  // Swipe handling
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    const tch = e.touches[0];
    touchStart.current = { x: tch.clientX, y: tch.clientY };
  }
  function handleTouchEnd(e: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const tch = e.changedTouches[0];
    const dx = tch.clientX - start.x;
    const dy = tch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dy) > SWIPE_MAX_OFF_AXIS) return;
    if (dx > 0) goPrev();
    else goNext();
  }

  const isOnToday = showingToday;

  if (!day) {
    // Pre-hydration placeholder so SSR + client agree.
    return (
      <div className="h-28 rounded-lg border border-dashed border-border bg-card" />
    );
  }

  return (
    <div className="space-y-2">
      {/* Day navigation header */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goPrev}
          aria-label={t.timeline.prevDay}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex flex-1 flex-col items-center text-center">
          <span className="text-sm font-medium">{dayLabel(day)}</span>
          {!isToday(day) && !isYesterday(day) && !isTomorrow(day) ? null : (
            <span className="text-[10px] text-muted-foreground">
              {formatDayLabel(day)}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={goNext}
          aria-label={t.timeline.nextDay}
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      {!isOnToday && (
        <div className="flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            {t.timeline.jumpToToday}
          </Button>
        </div>
      )}

      {/* Day grid */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="overflow-y-auto rounded-lg border border-border bg-card"
        style={{ height: `${VIEWPORT_PX}px`, touchAction: "pan-y" }}
      >
        <div
          className="relative flex select-none"
          style={{ height: `${DAY_HEIGHT}px` }}
        >
          {/* Hour rail */}
          <div className="relative w-12 shrink-0 border-r border-border">
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className="absolute left-0 right-0 -translate-y-1/2 px-1 text-right text-[10px] tabular-nums text-muted-foreground"
                style={{ top: `${h * HOUR_PX}px` }}
              >
                {h === 0 ? "" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
          </div>

          {/* Lane */}
          <div
            onPointerDown={
              onPickTime || onCreateDuration ? handleLanePointerDown : undefined
            }
            onPointerMove={onCreateDuration ? handleLanePointerMove : undefined}
            onPointerUp={
              onPickTime || onCreateDuration ? handleLanePointerUp : undefined
            }
            onPointerCancel={handleLanePointerCancel}
            className={cn(
              "relative flex-1",
              (onPickTime || onCreateDuration) &&
                (dragPreview ? "cursor-ns-resize" : "cursor-crosshair"),
            )}
          >
            {/* Hour gridlines */}
            {Array.from({ length: 24 }, (_, h) => (
              <div
                key={h}
                className={cn(
                  "pointer-events-none absolute left-0 right-0 h-px",
                  h % 6 === 0 ? "bg-border" : "bg-border/40",
                )}
                style={{ top: `${h * HOUR_PX}px` }}
              />
            ))}

            {/* Spans */}
            {visibleSpans.map((s) => {
              const top = yPos(s.clippedStart);
              const height = Math.max(4, yPos(s.clippedEnd) - top);
              const startIso = new Date(s.clippedStart).toISOString();
              const endIso = new Date(s.clippedEnd).toISOString();
              return (
                <div
                  key={s.id}
                  title={
                    s.label ??
                    `${formatTime(startIso)} – ${s.open ? t.timeline.now : formatTime(endIso)}`
                  }
                  className={cn(
                    "pointer-events-none absolute left-2 right-8 flex flex-col overflow-hidden rounded-md border px-2 py-1 leading-tight",
                    s.open
                      ? "border-amber-500/70 bg-amber-400/30 text-amber-900 dark:text-amber-100"
                      : "border-primary/50 bg-primary/20 text-foreground",
                    s.continuesBefore && "rounded-t-none border-t-0",
                    s.continuesAfter && "rounded-b-none border-b-0",
                  )}
                  style={{ top: `${top}px`, height: `${height}px` }}
                >
                  {s.label ? (
                    <>
                      <div className="truncate text-[11px] font-medium">
                        {s.label}
                      </div>
                      {height >= 24 && (
                        <div className="mt-0.5 truncate text-[10px] tabular-nums opacity-70">
                          {s.continuesBefore ? "…" : formatTime(startIso)}
                          {" – "}
                          {s.continuesAfter
                            ? "…"
                            : s.open
                              ? t.timeline.now
                              : formatTime(endIso)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="truncate text-[10px] tabular-nums opacity-70">
                      {s.continuesBefore ? "…" : formatTime(startIso)}
                      {" – "}
                      {s.continuesAfter
                        ? "…"
                        : s.open
                          ? t.timeline.now
                          : formatTime(endIso)}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Orphan ends */}
            {visibleOrphans.map((entry) => (
              <div
                key={entry._id}
                title={entry.label || t.entries.types.span_end}
                className="pointer-events-none absolute right-2 flex max-w-[60%] -translate-y-1/2 items-center gap-1"
                style={{
                  top: `${yPos(new Date(entry.timestamp).getTime())}px`,
                }}
              >
                <span className="size-2 shrink-0 rounded-sm bg-amber-500" />
                <span className="truncate rounded bg-amber-500/90 px-1 text-[10px] text-white">
                  {formatTime(entry.timestamp)}
                  {entry.label ? ` · ${entry.label}` : ""}
                </span>
              </div>
            ))}

            {/* Points */}
            {visiblePoints.map((entry) => (
              <div
                key={entry._id}
                title={`${formatTime(entry.timestamp)}${
                  entry.label ? ` · ${entry.label}` : ""
                }${entry.value !== undefined ? ` · ${entry.value}` : ""}`}
                className="pointer-events-none absolute left-2 right-2 flex -translate-y-1/2 items-center gap-2"
                style={{
                  top: `${yPos(new Date(entry.timestamp).getTime())}px`,
                }}
              >
                <span className="size-2 shrink-0 rounded-full bg-primary" />
                <span className="truncate text-[11px] text-foreground">
                  {formatTime(entry.timestamp)}
                  {entry.label ? ` · ${entry.label}` : ""}
                  {entry.value !== undefined ? ` · ${entry.value}` : ""}
                </span>
              </div>
            ))}

            {/* Drag preview */}
            {dragPreview && (
              <div
                className="pointer-events-none absolute left-2 right-8 rounded-md border-2 border-dashed border-primary/70 bg-primary/10"
                style={{
                  top: `${dragPreview.topPx}px`,
                  height: `${dragPreview.heightPx}px`,
                }}
              >
                <div className="px-2 py-1 text-[10px] tabular-nums leading-tight text-primary/80">
                  {formatTime(dragPreview.startIso)} –{" "}
                  {formatTime(dragPreview.endIso)}
                </div>
              </div>
            )}

            {/* Now line */}
            {nowY !== null && (
              <div
                className="pointer-events-none absolute left-0 right-0"
                style={{ top: `${nowY}px` }}
              >
                <div className="h-px bg-red-500" />
                <span className="absolute -top-2 left-1 rounded bg-red-500 px-1 text-[10px] font-medium text-white">
                  {t.timeline.now}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {visibleSpans.length === 0 &&
        visiblePoints.length === 0 &&
        visibleOrphans.length === 0
          ? entries.length === 0
            ? t.timeline.empty
            : t.timeline.emptyDay
          : onCreateDuration
            ? t.timeline.dragHint
            : onPickTime
              ? t.timeline.clickHint
              : null}
      </p>
    </div>
  );
}
