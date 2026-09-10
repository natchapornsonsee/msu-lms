import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const { data: enrollments } = await admin.from("enrollments").select("*");

    const wb = new ExcelJS.Workbook();
    wb.creator = "MSU Future Learning";
    const ws = wb.addWorksheet("Course Report");
    const detail = wb.addWorksheet("Part Detail");

    ws.columns = [
      { header: "ชื่อ", key: "first_name", width: 18 },
      { header: "นามสกุล", key: "last_name", width: 20 },
      { header: "รหัสนิสิต", key: "student_id", width: 16 },
      { header: "Email", key: "email", width: 30 },
      { header: "คณะ", key: "faculty", width: 24 },
      { header: "สาขา", key: "program", width: 26 },
      { header: "ชั้นปี", key: "year", width: 10 },
      { header: "กลุ่มเรียน", key: "group_name", width: 14 },
      { header: "รหัสคอร์ส", key: "course_code", width: 14 },
      { header: "ชื่อคอร์ส", key: "course_title", width: 30 },
      { header: "% เข้าเรียน", key: "attendance", width: 14 },
      { header: "สถานะ", key: "status", width: 18 },
      { header: "คะแนนสอบ", key: "score", width: 14 },
      { header: "วันที่เรียนครบ", key: "completion_date", width: 22 },
      { header: "วันที่ทำข้อสอบ", key: "quiz_date", width: 22 },
      { header: "รอบที่", key: "attempt_no", width: 10 },
    ];

    detail.columns = [
      { header: "Email", key: "email", width: 30 },
      { header: "รหัสนิสิต", key: "student_id", width: 16 },
      { header: "คอร์ส", key: "course_code", width: 14 },
      { header: "Part", key: "part", width: 28 },
      { header: "Progress %", key: "progress", width: 14 },
      { header: "ผ่าน", key: "passed", width: 10 },
      { header: "Last position (s)", key: "last_position", width: 18 },
      { header: "Passed at", key: "passed_at", width: 24 },
      { header: "Updated", key: "updated_at", width: 24 },
    ];

    for (const en of enrollments ?? []) {
      const { data: profile } = await admin.from("profiles").select("*").eq("id", en.user_id).single();
      const { data: course } = await admin.from("courses").select("*").eq("id", en.course_id).single();
      if (!profile || !course) continue;

      const { data: parts } = await admin.from("course_parts").select("*").eq("course_id", course.id).order("order_no");
      const ids = (parts ?? []).map((p: any) => p.id);
      let progress: any[] = [];
      if (ids.length) {
        const r = await admin.from("lesson_progress").select("*")
          .eq("user_id", profile.id)
          .eq("attempt_no", en.reset_count)
          .in("part_id", ids);
        progress = r.data ?? [];
      }

      const progressMap = new Map(progress.map((p: any) => [p.part_id, p]));
      const values = (parts ?? []).map((p: any) => Number(progressMap.get(p.id)?.progress_pct ?? 0));
      const attendance = values.length
        ? Math.round((values.reduce((a: number, b: number) => a + b, 0) / values.length) * 10) / 10
        : 0;
      const passed = values.length > 0 && values.every((v: number) => v >= Number(course.passing_progress));
      const completionDate = passed
        ? progress.map((p: any) => p.passed_at).filter(Boolean).sort().at(-1) ?? null
        : null;

      const { data: quiz } = await admin.from("quiz_attempts")
        .select("score,status,submitted_at")
        .eq("user_id", profile.id)
        .eq("course_id", course.id)
        .eq("attempt_no", en.reset_count)
        .maybeSingle();

      ws.addRow({
        first_name: profile.first_name,
        last_name: profile.last_name,
        student_id: profile.student_id,
        email: profile.email,
        faculty: profile.faculty,
        program: profile.program,
        year: profile.year,
        group_name: profile.group_name,
        course_code: course.code,
        course_title: course.title,
        attendance,
        status: passed ? "ผ่านเกณฑ์การเรียน" : "ยังไม่ผ่าน",
        score: quiz?.status === "submitted" ? Number(quiz.score) : null,
        completion_date: completionDate,
        quiz_date: quiz?.status === "submitted" ? quiz.submitted_at : null,
        attempt_no: en.reset_count + 1,
      });

      for (const part of parts ?? []) {
        const pr = progressMap.get(part.id);
        detail.addRow({
          email: profile.email,
          student_id: profile.student_id,
          course_code: course.code,
          part: part.title,
          progress: Number(pr?.progress_pct ?? 0),
          passed: Boolean(pr?.passed),
          last_position: Number(pr?.last_position_seconds ?? 0),
          passed_at: pr?.passed_at ?? null,
          updated_at: pr?.updated_at ?? null,
        });
      }
    }

    for (const sheet of [ws, detail]) {
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      if (sheet.columnCount > 0) {
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: sheet.columnCount },
        };
      }
    }

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="msu-learning-report-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Export failed" }, { status: 500 });
  }
}
