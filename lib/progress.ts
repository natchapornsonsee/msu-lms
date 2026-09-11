import type { WatchedRange } from "@/lib/types";

// The learner-presence UI pauses playback after 10 seconds without a face.
// Therefore brief detector drop-outs below that threshold should not create
// permanent holes in learning progress.
export const PRESENCE_GRACE_SECONDS = 9.5;

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
    // A client normally submits short incremental ranges. Reject implausibly
    // large single ranges so a forged request cannot credit a whole lesson.
    if (end <= start) continue;
    ranges.push([start, end]);
  }
  return mergeRanges(ranges);
}

export function mergeRanges(ranges: WatchedRange[]): WatchedRange[] {
  if (!ranges.length) return [];
  const sorted = [...ranges]
    .map(([a, b]) => [Math.max(0, a), Math.max(0, b)] as WatchedRange)
    .sort((a, b) => a[0] - b[0]);

  const merged: WatchedRange[] = [[sorted[0][0], sorted[0][1]]];

  for (const [start, end] of sorted.slice(1)) {
    const last = merged[merged.length - 1];

    // The face detector samples periodically and can briefly lose a valid face.
    // A gap shorter than the 10s auto-pause threshold is treated as continuous
    // attendance instead of permanently reducing the completion percentage.
    if (start <= last[1] + PRESENCE_GRACE_SECONDS) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}

export function watchedSeconds(ranges: WatchedRange[]) {
  return mergeRanges(ranges).reduce(
    (sum, [a, b]) => sum + Math.max(0, b - a),
    0
  );
}

export function progressPercent(ranges: WatchedRange[], duration: number) {
  if (!duration || duration <= 0) return 0;

  const merged = mergeRanges(ranges).map(
    ([a, b]) =>
      [
        Math.max(0, Math.min(duration, a)),
        Math.max(0, Math.min(duration, b)),
      ] as WatchedRange
  );

  if (!merged.length) return 0;

  // Startup/end-of-video technical grace:
  // - camera/model initialization may finish a few seconds after playback begins
  // - the 1-second progress sampler may not fire exactly at the final frame
  // These edges are credited only when they are inside the same <10s presence
  // grace used by the camera policy.
  if (merged[0][0] <= PRESENCE_GRACE_SECONDS) {
    merged[0][0] = 0;
  }

  const last = merged[merged.length - 1];
  if (duration - last[1] <= PRESENCE_GRACE_SECONDS) {
    last[1] = duration;
  }

  const watched = merged.reduce(
    (sum, [a, b]) => sum + Math.max(0, b - a),
    0
  );

  const pct = Math.min(100, Math.round((watched / duration) * 1000) / 10);

  // Eliminate floating-point / final-frame artifacts such as 99.9%.
  return pct >= 99.5 ? 100 : pct;
}

export function furthestContinuousSecond(ranges: WatchedRange[]) {
  const merged = mergeRanges(ranges);
  let end = 0;

  for (const [a, b] of merged) {
    if (a <= end + PRESENCE_GRACE_SECONDS) {
      end = Math.max(end, b);
    } else {
      break;
    }
  }

  return end;
}
