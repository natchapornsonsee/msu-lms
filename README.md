# MSU Future Learning — V0.1

ระบบเรียนออนไลน์แบบ Presence-aware LMS สำหรับคอมพิวเตอร์, iPad และมือถือ ออกแบบตาม Requirement:

- Login ด้วย Email + Password
  - นิสิต: `@msu.ac.th`
  - บุคคลภายนอก: Email อื่นที่ Admin สร้าง/Import ให้
- Admin import ผู้เรียนจาก Excel
- Dashboard แสดง Progress ราย Course / Part และคะแนน Post-test
- Course มีหลาย Part ได้ แต่มี Post-test ครั้งเดียวท้าย Course ใน V0.1
- วิดีโอหลัก: YouTube Unlisted
- ตรวจกล้องแบบ A+B: ตรวจว่ามีใบหน้าอยู่หน้ากล้อง และหยุดนับเมื่อใบหน้าหาย
- Progress นับเฉพาะช่วงที่วิดีโอกำลังเล่น + หน้าเว็บ visible + ตรวจพบใบหน้า
- ไม่อนุญาตลากข้ามส่วนวิดีโอที่ยังไม่เคยเรียน (client-side guard)
- ไม่พบใบหน้าต่อเนื่อง 10 วินาที: Pause วิดีโอ + หยุด Progress
- Progress ถูกบันทึกแยก Part และจำต่อเมื่อปิด/สลับคอร์ส
- ทุก Part ต้องถึงเกณฑ์ (default 80%) จึงปลดล็อก Post-test
- Post-test Multiple Choice 4 ตัวเลือก, สุ่มข้อ + สุ่มตัวเลือก, ทำได้ 1 ครั้งต่อรอบ
- Admin Reset รายคน/รายคอร์ส หรือ Reset ทั้งคอร์สได้ โดยเก็บประวัติรอบเก่าไว้ด้วย `attempt_no`
- Import ข้อสอบจาก PDF แบบ text PDF แล้ว Preview/Edit ก่อน Save
- Admin เพิ่ม/แก้/ลบข้อสอบเองได้
- Export Excel: Course Report + Part Detail
- UI: dark futuristic / glass dashboard

---

## 0. สิ่งที่เลือกใช้ใน V0.1

- Next.js 16.3.3 + TypeScript
- Supabase: Authentication + PostgreSQL
- MediaPipe Face Detector: ประมวลผลภาพกล้องใน Browser
- YouTube IFrame Player API
- ExcelJS: Import/Export `.xlsx`
- pdf-parse: อ่าน text จาก PDF ข้อสอบ
- Vercel: แนะนำสำหรับ Deploy เพื่อให้ iPad/มือถือเข้าผ่าน HTTPS

> **ทำไมยังไม่ใช้ Google Drive video ใน V0.1:** YouTube IFrame API ควบคุม play/pause/current time/seek ได้ตรงกว่าและเสถียรกว่าสำหรับระบบ Progress Tracking ส่วน Drive สามารถเพิ่มเป็น provider ตัวที่ 2 ใน V0.2 ได้

---

# 1. ติดตั้งโปรแกรมบน Windows

ติดตั้ง:

1. **Node.js 22 LTS**
2. **Visual Studio Code** (แนะนำ แต่ไม่บังคับ)
3. Browser: Chrome / Edge
4. Git (ใช้ตอน Deploy ผ่าน GitHub; ไม่จำเป็นสำหรับการรันในเครื่อง)

ตรวจสอบ Node.js:

```powershell
node -v
npm -v
```

ควรเห็น Node 22.x หรือใหม่กว่าที่ Next.js รองรับ

---

# 2. แตกไฟล์โปรเจกต์

ตัวอย่างให้แตกไว้ที่:

```text
C:\MSU-LMS\msu-lms-v0.1
```

เปิด PowerShell ใน Folder แล้วรัน:

```powershell
cd C:\MSU-LMS\msu-lms-v0.1
npm install
```

---

# 3. สร้าง Supabase Project

1. เข้า Supabase Dashboard
2. Create new project
3. รอ Database พร้อม
4. ไปที่ **SQL Editor**
5. เปิดไฟล์:

```text
supabase\schema.sql
```

6. Copy SQL ทั้งหมดไปวาง แล้วกด **Run**

ระบบจะสร้าง Table:

- profiles
- courses
- course_parts
- enrollments
- lesson_progress
- quiz_questions
- quiz_attempts
- reset_audit

พร้อม Row Level Security (RLS)

---

# 4. ตั้งค่า `.env.local`

Copy:

```text
.env.example
```

เป็น:

```text
.env.local
```

ใส่ค่า:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_FACE_MODEL_URL=https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite
```

ค่าจาก Supabase หาได้ใน Project Settings / API หรือ Connect dialog ตาม UI เวอร์ชันปัจจุบัน

### สำคัญมาก

`SUPABASE_SERVICE_ROLE_KEY` เป็น Secret ฝั่ง Server เท่านั้น

- ห้ามเปลี่ยนชื่อเป็น `NEXT_PUBLIC_...`
- ห้ามเอาไปใส่ใน Client Component
- ห้าม Commit `.env.local` ขึ้น GitHub

โปรเจกต์มี `.gitignore` กัน `.env.local` ไว้แล้ว

---

# 5. สร้าง Admin คนแรก

หลัง `npm install` และตั้ง `.env.local` แล้ว:

```powershell
npm run bootstrap-admin -- admin@msu.ac.th "YourStrongPassword123!" "ชื่อ" "นามสกุล"
```

ตัวอย่าง:

```powershell
npm run bootstrap-admin -- japan@msu.ac.th "Test@12345678" "เจแปน" "ผู้ดูแลระบบ"
```

> ใช้รหัสผ่านจริงที่แข็งแรงกว่าตัวอย่างเมื่อ Deploy จริง

---

# 6. Run ระบบในคอมพิวเตอร์

```powershell
npm run dev
```

เปิด:

```text
http://localhost:3000
```

Login ด้วย Admin ที่สร้างในข้อ 5

---

# 7. Workflow สำหรับ Admin

## 7.1 สร้าง Course

Admin → `Admin` → สร้างคอร์ส

กรอก:

- Course code
- ชื่อคอร์ส
- รายละเอียด
- เกณฑ์ผ่าน เช่น 80%
- หลังสร้าง เข้า `จัดการ →`
- เปิด `Published` เมื่อต้องการให้ผู้เรียนเห็น

## 7.2 เพิ่ม Part / Video

ใน Course Control:

- ลำดับ Part
- ชื่อ Part
- YouTube URL หรือ Video ID
- รายละเอียด

YouTube ต้องตั้งเป็น **Unlisted** หรือ Public และต้องอนุญาต Embed

ตัวอย่าง URL:

```text
https://youtu.be/VIDEO_ID
https://www.youtube.com/watch?v=VIDEO_ID
```

ระบบจะแปลงเป็น Video ID ให้

Admin สามารถแก้ URL/ชื่อ/รายละเอียด หรือลบ Part ภายหลังได้

---

# 8. Excel Import ผู้เรียน

ใช้ไฟล์ `templates/import_users_template.xlsx`

คอลัมน์:

| Column | ความหมาย |
|---|---|
| email | Email Login |
| first_name | ชื่อ |
| last_name | นามสกุล |
| student_id | รหัสนิสิต |
| faculty | คณะ |
| program | สาขา |
| year | ชั้นปี |
| group_name | กลุ่มเรียน |
| temporary_password | รหัสชั่วคราว (เว้นว่างให้ระบบสุ่ม) |
| course_codes | Code ของคอร์ส เช่น `HSTE101,HSTE102` |

กติกา Role:

- Email ลงท้าย `@msu.ac.th` → `student`
- Email อื่น → `external`
- Excel Import ไม่สร้าง Admin

หากไม่ใส่ `temporary_password` ระบบจะสุ่มให้ และแสดงในผล Import **เฉพาะตอนสร้างบัญชีใหม่**

เมื่อ Login ครั้งแรก ผู้เรียนจะถูกส่งไปหน้า Account เพื่อเปลี่ยน Password ก่อน

---

# 9. การตรวจกล้องและ Progress

V0.1 ใช้ **Face Detection ไม่ใช่ Face Recognition**

ระบบทำงานดังนี้:

```text
Video Playing
   + Browser tab visible
   + Camera permission = Allowed
   + Detect face = Yes
              ↓
        นับ Progress
```

หากอย่างใดอย่างหนึ่งไม่ผ่าน → ไม่เพิ่ม Progress

หากไม่พบใบหน้าต่อเนื่องประมาณ 10 วินาที → Pause วิดีโอ

ระบบบันทึกช่วงเวลาวิดีโอที่เรียน (`watched_ranges`) ไม่ใช่เพียงตัวจับเวลาอย่างเดียว จึงลดปัญหาการเปิดช่วงเดิมวนเพื่อปั๊มเปอร์เซ็นต์

### Privacy

V0.1 ไม่ Upload/บันทึกรูปกล้องลง Database และไม่เก็บ Face embedding

MediaPipe ทำ Face Detection ใน Browser ของผู้เรียน

### ข้อจำกัดสำคัญ

A+B **ยืนยันได้เพียงว่ามีใบหน้าอยู่หน้ากล้อง ไม่ได้ยืนยันว่าเป็นเจ้าของบัญชีจริง** และไม่ใช่ Liveness Detection ดังนั้นยังสามารถถูกหลอกด้วยรูป/วิดีโอในบางสถานการณ์ได้ หากต้องการใช้เป็นการคุมสอบจริง ควรเพิ่ม Identity + Liveness ใน V0.2/V1.0

---

# 10. Post-test

Quiz จะปลดล็อกเมื่อ **ทุก Part** ถึง `passing_progress` ของ Course เช่น 80%

- Multiple Choice 4 ตัวเลือก
- สุ่มลำดับข้อ
- สุ่มลำดับตัวเลือก
- ทำได้ 1 ครั้งต่อ `attempt_no`
- ปิดหน้าแล้วกลับมา: หากยังไม่กด Submit จะกลับเข้ารอบเดิมได้
- หลัง Submit: ทำใหม่ไม่ได้จนกว่า Admin Reset

การตรวจคำตอบเกิดฝั่ง Server และ Correct Answer ไม่ถูกส่งให้ Student ก่อน Submit

---

# 11. Import ข้อสอบจาก PDF

รองรับ **Text PDF** ในรูปแบบใกล้เคียง:

```text
1. คำถาม...
A. ตัวเลือก 1
B. ตัวเลือก 2
C. ตัวเลือก 3
D. ตัวเลือก 4
```

หรือ:

```text
1) คำถาม...
ก. ตัวเลือก 1
ข. ตัวเลือก 2
ค. ตัวเลือก 3
ง. ตัวเลือก 4
```

Flow:

```text
Upload PDF
→ Extract text
→ Auto split question/options
→ Preview
→ Admin แก้ข้อความ
→ Admin เลือก Correct Answer
→ Save
```

### V0.1 ยังไม่ทำ OCR

ถ้า PDF เป็นรูปสแกนทั้งหน้า ไม่มี selectable text ระบบจะอ่านไม่ได้ ควร OCR PDF ก่อน หรือเพิ่ม OCR เป็น V0.2

---

# 12. Reset

### Reset รายคน

Course Control → ผู้เรียน → `Reset`

ระบบเพิ่ม `reset_count` ของคนนั้น 1 รอบ

### Reset ทั้งคอร์ส

Course Control → `Reset ทั้งคอร์ส`

ระบบสร้างรอบใหม่ให้ผู้เรียนทุกคนที่ Enroll ในคอร์สนั้น

### Reset ทั้งระบบ

Admin Dashboard → `Reset ทุกคนทุกคอร์ส` → พิมพ์ `RESET ALL` เพื่อยืนยัน ระบบจะเพิ่มรอบใหม่ให้ Enrollment ทุกตัว

### ประวัติเดิม

Progress/คะแนนรอบเดิม **ไม่ถูกลบ** แต่รอบปัจจุบันจะใช้ `attempt_no` ใหม่

---

# 13. Export Excel

Admin Dashboard → `Export Excel`

ไฟล์มี 2 Sheet:

### Course Report

- ชื่อ
- นามสกุล
- รหัสนิสิต
- Email
- คณะ
- สาขา
- ชั้นปี
- กลุ่มเรียน
- รหัสคอร์ส
- ชื่อคอร์ส
- % เข้าเรียน
- สถานะผ่าน/ยังไม่ผ่าน
- คะแนน Post-test
- วันที่เรียนครบเกณฑ์
- วันที่ทำข้อสอบ
- รอบการเรียน

### Part Detail

- Email
- รหัสนิสิต
- Course
- Part
- Progress %
- Passed
- Last position
- Updated time

---

# 14. ทดสอบบน iPad / iPhone / Android

สำหรับกล้อง Browser ควรใช้งานผ่าน **HTTPS**

ดังนั้นวิธีทดสอบที่แนะนำคือ Deploy Vercel ก่อน แล้วเปิด URL `https://...vercel.app` จาก iPad

เมื่อ Browser ถาม Permission:

```text
Camera → Allow
```

หากเคยกด Block ให้เปิด Site Settings / Safari Settings แล้วอนุญาต Camera ใหม่

> การเปิดจาก iPad ไปที่ `http://192.168.x.x:3000` ในวง LAN อาจติดข้อจำกัด Secure Context ของ Browser จึงไม่ใช่วิธีที่แนะนำสำหรับ Camera testing

---

# 15. Deploy ขึ้น Vercel

## ทางที่ง่าย: GitHub + Vercel

### 15.1 สร้าง Git repository

ใน Folder โปรเจกต์:

```powershell
git init
git add .
git commit -m "MSU Future Learning V0.1"
```

สร้าง Repository ที่ GitHub แล้วทำตามคำสั่ง Push ของ GitHub

ตรวจสอบก่อน Push ว่า `.env.local` **ไม่ติดขึ้น Git**:

```powershell
git status
```

### 15.2 Import Project ที่ Vercel

1. Login Vercel
2. Add New → Project
3. Import GitHub repository
4. Framework = Next.js
5. ใส่ Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_FACE_MODEL_URL
```

`NEXT_PUBLIC_APP_URL` ให้ใช้ Production URL เช่น:

```text
https://your-lms.vercel.app
```

6. Deploy

หลังเปลี่ยน Environment Variables ต้อง Redeploy เพื่อให้ deployment ใหม่ใช้ค่าล่าสุด

---

# 16. Checklist ก่อนใช้กับนิสิตจริง

- [ ] Admin Login ได้
- [ ] Create course ได้
- [ ] YouTube Unlisted เล่นใน Embed ได้
- [ ] Add/Edit/Delete Part ได้
- [ ] Excel Import ผู้เรียนได้
- [ ] ผู้เรียนเปลี่ยน Password ครั้งแรกได้
- [ ] iPad/มือถืออนุญาตกล้องได้
- [ ] เอาหน้าออก >10 วินาที Video Pause
- [ ] สลับ Tab แล้ว Video Pause
- [ ] ปิดแล้วกลับมา Progress เดิมยังอยู่
- [ ] ลากข้ามช่วงที่ไม่เคยเรียนถูกดึงกลับ
- [ ] ทุก Part ≥80% แล้ว Quiz Unlock
- [ ] Quiz สุ่มข้อ/ตัวเลือก
- [ ] Submit แล้วทำซ้ำไม่ได้
- [ ] Reset รายคนใช้งานได้
- [ ] Reset ทั้ง Course ใช้งานได้
- [ ] Export Excel เปิดได้และข้อมูลครบ

---

# 17. สิ่งที่ควรทำต่อใน V0.2

1. เพิ่ม OCR สำหรับ PDF สแกน
2. Import Answer Key จาก PDF/Excel
3. Google Drive / Supabase Storage video provider
4. Dashboard analytics รายห้อง/รายคณะ
5. กำหนด Start/End date ของ Course
6. Random question pool เช่น สุ่ม 20 จาก 50 ข้อ
7. Question bank แยกจาก Course
8. Activity / audit logs ละเอียดขึ้น
9. Email reset password
10. Liveness / Identity verification หากต้องการใช้คุมสอบระดับจริงจัง
11. Web Worker สำหรับ MediaPipe เพื่อลดภาระ UI thread บนอุปกรณ์รุ่นเก่า
12. Automated tests + rate limiting + security hardening ก่อน production ขนาดใหญ่

---

## หมายเหตุด้าน Production

V0.1 นี้เหมาะกับ **Prototype / Pilot / ใช้ทดสอบกลุ่มเรียนจริงขนาดเล็กถึงกลางหลังผ่าน Checklist** แต่ก่อนใช้เป็นระบบมหาวิทยาลัยระดับ production ควรทำ security review, load test, backup policy, PDPA/privacy notice, monitoring และ disaster recovery เพิ่มเติม

---

# 18. Official references

ดูเอกสารทางการที่ `REFERENCES.md`
