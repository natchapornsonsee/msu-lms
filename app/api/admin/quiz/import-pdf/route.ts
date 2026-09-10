import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";

// IMPORTANT:
// pdf-parse@1.1.1's package entrypoint (index.js) contains debug/test code that
// tries to open ./test/data/05-versions-space.pdf when evaluated by some
// production bundlers. Import the actual parser implementation directly
// instead so Vercel/Next.js never executes that debug block.
const pdf = require("pdf-parse/lib/pdf-parse.js") as (
  dataBuffer: Buffer
) => Promise<{text?: string}>;

type Draft={
  question_text:string,
  option_a:string,
  option_b:string,
  option_c:string,
  option_d:string,
  correct_option:string,
  order_no:number
};

function parseQuestions(text:string):Draft[]{
  const lines=text
    .replace(/\r/g,'')
    .split('\n')
    .map(x=>x.replace(/\s+/g,' ').trim())
    .filter(Boolean);

  const out:Draft[]=[];
  let cur:Draft|null=null;
  let field:keyof Draft|'question_text'='question_text';

  const optionMap:Record<string,keyof Draft>={
    A:'option_a',
    B:'option_b',
    C:'option_c',
    D:'option_d',
    'ก':'option_a',
    'ข':'option_b',
    'ค':'option_c',
    'ง':'option_d'
  };

  const flush=()=>{
    if(
      cur &&
      cur.question_text &&
      cur.option_a &&
      cur.option_b &&
      cur.option_c &&
      cur.option_d
    ){
      out.push(cur);
    }
    cur=null;
  };

  for(const line of lines){
    const qm=line.match(/^\s*(\d{1,3})\s*[\.\)\:]\s*(.+)$/);
    if(qm){
      flush();
      cur={
        question_text:qm[2],
        option_a:'',
        option_b:'',
        option_c:'',
        option_d:'',
        correct_option:'',
        order_no:Number(qm[1])
      };
      field='question_text';
      continue;
    }

    if(!cur) continue;

    const om=line.match(/^\s*([A-Da-dกขคง])\s*[\.\)\:]\s*(.+)$/);
    if(om){
      field=optionMap[om[1].toUpperCase()]||optionMap[om[1]];
      (cur as any)[field]=om[2];
      continue;
    }

    (cur as any)[field]=`${(cur as any)[field]} ${line}`.trim();
  }

  flush();
  return out.map((q,i)=>({...q,order_no:i+1}));
}

export async function POST(req:Request){
  try{
    await requireAdmin();

    const fd=await req.formData();
    const file=fd.get('file') as File|null;

    if(!file){
      return NextResponse.json({error:'ไม่พบ PDF'},{status:400});
    }

    if(file.size>12*1024*1024){
      return NextResponse.json(
        {error:'V0.1 รองรับ PDF ไม่เกิน 12 MB'},
        {status:400}
      );
    }

    const parsed=await pdf(Buffer.from(await file.arrayBuffer()));
    const questions=parseQuestions(parsed.text||'');

    if(!questions.length){
      return NextResponse.json(
        {
          error:'ไม่พบรูปแบบข้อสอบ 4 ตัวเลือกที่แยกได้อัตโนมัติ กรุณาตรวจรูปแบบ PDF หรือเพิ่มข้อสอบด้วยตนเอง'
        },
        {status:422}
      );
    }

    return NextResponse.json({ok:true,questions});
  }catch(e:any){
    return NextResponse.json(
      {error:e?.message||'PDF parse failed'},
      {status:500}
    );
  }
}
