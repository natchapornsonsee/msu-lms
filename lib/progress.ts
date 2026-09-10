import type { WatchedRange } from "@/lib/types";

export function normalizeRanges(input: unknown): WatchedRange[] {
  if (!Array.isArray(input)) return [];
  const ranges: WatchedRange[] = [];
  for (const item of input) {
    if (!Array.isArray(item) || item.length !== 2) continue;
    const a = Number(item[0]);
    const b = Number(item[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    const start = Math.max(0, Math.min(a, b));
    const end = Math.max(0, Math.max(a, b));
    if (end - start > 30) continue;
    ranges.push([start, end]);
  }
  return mergeRanges(ranges);
}

export function mergeRanges(ranges: WatchedRange[]): WatchedRange[] {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: WatchedRange[] = [[sorted[0][0], sorted[0][1]]];
  for (const [start, end] of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1] + 1.5) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

export function watchedSeconds(ranges: WatchedRange[]) {
  return mergeRanges(ranges).reduce((sum, [a, b]) => sum + Math.max(0, b - a), 0);
}

export function progressPercent(ranges: WatchedRange[], duration: number) {
  if (!duration || duration <= 0) return 0;
  return Math.min(100, Math.round((watchedSeconds(ranges) / duration) * 1000) / 10);
}

export function furthestContinuousSecond(ranges: WatchedRange[]) {
  const merged = mergeRanges(ranges);
  let end = 0;
  for (const [a, b] of merged) {
    if (a <= end + 2) end = Math.max(end, b);
    else break;
  }
  return end;
}
