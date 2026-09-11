import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  mergeRanges,
  normalizeRanges,
  progressPercent,
} from "@/lib/progress";

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const admin = createAdminClient();
    const b = await req.json();

    const partId = String(b.part_id || "");
    const duration = Math.max(1, Number(b.duration_seconds || 0));

    if (!partId) {
      return NextResponse.json(
        { error: "part_id required" },
        { status: 400 }
      );
    }

    const { data: part } = await admin
      .from("course_parts")
      .select("id,course_id")
      .eq("id", partId)
      .single();

    if (!part) {
      return NextResponse.json(
        { error: "Part not found" },
        { status: 404 }
      );
    }

    const { data: course } = await admin
      .from("courses")
      .select("passing_progress")
      .eq("id", part.course_id)
      .single();

    const { data: en } = await admin
      .from("enrollments")
      .select("reset_count")
      .eq("user_id", user.id)
      .eq("course_id", part.course_id)
      .single();

    if (!en) {
      return NextResponse.json(
        { error: "Not enrolled" },
        { status: 403 }
      );
    }

    const attempt = Number(en.reset_count);

    const { data: existing } = await admin
      .from("lesson_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("part_id", partId)
      .eq("attempt_no", attempt)
      .maybeSingle();

    const previous = normalizeRanges(existing?.watched_ranges);
    const incoming = normalizeRanges(b.watched_ranges);

    let ranges = mergeRanges([
      ...previous,
      ...incoming,
    ])
      .map(
        ([a, b]) =>
          [
            Math.max(0, Math.min(duration, Number(a))),
            Math.max(0, Math.min(duration, Number(b))),
          ] as [number, number]
      )
      .filter(([a, b]) => b > a);

    const requestedRaw = Number(b.last_position_seconds);

    const fallbackLast = Number(
      existing?.last_position_seconds || 0
    );

    const requested = Number.isFinite(requestedRaw)
      ? requestedRaw
      : fallbackLast;

    const clampedRequested = Math.max(
      0,
      Math.min(duration, requested)
    );

    let furthestWatched = ranges.reduce(
      (max, range) =>
        Math.max(max, Number(range?.[1] || 0)),
      0
    );

    // ผู้เรียนไปถึงท้ายคลิปจริง
    // และมีหลักฐาน watched range ถึงช่วงท้าย
    const reachedActualEnd =
      duration >= 5 &&
      clampedRequested >= duration - 2 &&
      furthestWatched >= duration - 12;

    // ซ่อมข้อมูลที่ V0.1.7 เคยทำ range หาย
    if (reachedActualEnd) {
      ranges = [[0, duration]];
      furthestWatched = duration;
    }

    const pct = reachedActualEnd
      ? 100
      : progressPercent(ranges, duration);

    const passed =
      pct >= Number(course?.passing_progress || 80);

    const passedAt = passed
      ? existing?.passed_at || new Date().toISOString()
      : null;

    const safeCeiling = reachedActualEnd
      ? duration
      : Math.min(
          duration,
          Math.max(12, furthestWatched + 12)
        );

    const last = reachedActualEnd
      ? duration
      : Math.min(clampedRequested, safeCeiling);

    const payload = {
      user_id: user.id,
      part_id: partId,
      attempt_no: attempt,
      duration_seconds: duration,
      watched_ranges: ranges,
      progress_pct: pct,
      passed,
      passed_at: passedAt,
      last_position_seconds: last,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from("lesson_progress")
      .upsert(payload, {
        onConflict: "user_id,part_id,attempt_no",
      });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      progress_pct: pct,
      passed,
      watched_ranges: ranges,
      last_position_seconds: last,
      completed: reachedActualEnd,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error:
          e?.message || "Progress save failed",
      },
      {
        status:
          e?.message === "UNAUTHORIZED" ? 401 : 500,
      }
    );
  }
}