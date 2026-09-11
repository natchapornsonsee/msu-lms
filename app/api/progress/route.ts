import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {createAdminClient} from "@/lib/supabase/admin";
import {mergeRanges,normalizeRanges,progressPercent} from "@/lib/progress";

export async function POST(req:Request){
 try{
  const {user}=await requireUser();
  const admin=createAdminClient();
  const b=await req.json();
  const partId=String(b.part_id||'');
  const duration=Math.max(1,Number(b.duration_seconds||0));

  if(!partId){
   return NextResponse.json({error:'part_id required'},{status:400});
  }

  const {data:part}=await admin
   .from('course_parts')
   .select('id,course_id')
   .eq('id',partId)
   .single();

  if(!part){
   return NextResponse.json({error:'Part not found'},{status:404});
  }

  const {data:course}=await admin
   .from('courses')
   .select('passing_progress')
   .eq('id',part.course_id)
   .single();

  const {data:en}=await admin
   .from('enrollments')
   .select('reset_count')
   .eq('user_id',user.id)
   .eq('course_id',part.course_id)
   .single();

  if(!en){
   return NextResponse.json({error:'Not enrolled'},{status:403});
  }

  const attempt=Number(en.reset_count);

  const {data:existing}=await admin
   .from('lesson_progress')
   .select('*')
   .eq('user_id',user.id)
   .eq('part_id',partId)
   .eq('attempt_no',attempt)
   .maybeSingle();

  const previous=normalizeRanges(existing?.watched_ranges);
  const incoming=normalizeRanges(b.watched_ranges);
  let ranges=mergeRanges([...previous,...incoming]);

 const requestedRaw = Number(b.last_position_seconds);
const requested = Number.isFinite(requestedRaw)
  ? requestedRaw
  : Number(existing?.last_position_seconds || 0);

const furthestWatched = ranges.reduce(
  (max, range) => Math.max(max, Number(range?.[1] || 0)),
  0
);

const reachedActualEnd =
  requested >= duration - 2 &&
  furthestWatched >= duration - 12;

if (reachedActualEnd) {
  ranges = [[0, duration]];
}

const pct = reachedActualEnd
  ? 100
  : progressPercent(ranges, duration);
  const passed=pct>=Number(course?.passing_progress||80);
  const passedAt=passed?(existing?.passed_at||new Date().toISOString()):null;

  // Progress credit and Resume position are intentionally separate:
  // - progress_pct comes ONLY from watched_ranges (presence-verified viewing)
  // - last_position_seconds remembers where playback actually stopped
  //
  // The previous V0.1 route ignored b.last_position_seconds and instead used
  // "furthest continuous range from second 0". A tiny face-detection gap could
  // therefore keep Resume stuck at e.g. minute 3 while progress correctly
  // showed viewing through minute 30.
  const furthestWatched=ranges.reduce((max,range)=>{
   const end=Number(range?.[1]||0);
   return Number.isFinite(end)?Math.max(max,end):max;
  },0);

  const requestedRaw=Number(b.last_position_seconds);
  const fallbackLast=Number(existing?.last_position_seconds||0);
  const requested=Number.isFinite(requestedRaw)?requestedRaw:fallbackLast;
  const clampedRequested=Math.max(0,Math.min(duration,requested));

  // Face loss can let video continue for at most ~10 seconds before auto-pause.
  // Allow a small 12s tolerance beyond the farthest credited range, but do not
  // let a forged request create an arbitrary resume point far ahead.
  const safeCeiling=Math.min(duration,Math.max(12,furthestWatched+12));
  const last=Math.min(clampedRequested,safeCeiling);

  const payload={
   user_id:user.id,
   part_id:partId,
   attempt_no:attempt,
   duration_seconds:duration,
   watched_ranges:ranges,
   progress_pct:pct,
   passed,
   passed_at:passedAt,
   last_position_seconds:last,
   updated_at:new Date().toISOString()
  };

  const {error}=await admin
   .from('lesson_progress')
   .upsert(payload,{onConflict:'user_id,part_id,attempt_no'});

  if(error)throw error;

  return NextResponse.json({
   ok:true,
   progress_pct:pct,
   passed,
   watched_ranges:ranges,
   last_position_seconds:last
  });
 }catch(e:any){
  return NextResponse.json(
   {error:e.message||'Progress save failed'},
   {status:e.message==='UNAUTHORIZED'?401:500}
  );
 }
}
