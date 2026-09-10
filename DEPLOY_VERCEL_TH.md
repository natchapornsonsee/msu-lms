# Deploy MSU LMS ขึ้นออนไลน์ด้วย Vercel + Supabase

แพ็กนี้เตรียมสำหรับ Production แล้ว โดย **ไม่รวม `.env.local`, `.next`, `node_modules` หรือ Secret ใด ๆ**

## สถาปัตยกรรมหลัง Deploy

- Next.js Frontend + API Routes: Vercel
- Database + Authentication: Supabase Cloud
- วิดีโอ: YouTube Unlisted
- Face Detection: MediaPipe ทำงานบน Browser ของผู้เรียน
- เครื่องคอมของผู้สอนไม่ต้องเปิดค้าง

## 1) ก่อนขึ้น GitHub

เปิด Terminal/PowerShell ที่โฟลเดอร์นี้ แล้วรัน:

```powershell
npm install
npm run lint
```

ต้องไม่มี TypeScript error

## 2) สร้าง GitHub Repository

แนะนำชื่อ `msu-lms`

```powershell
git init
git add .
git commit -m "MSU LMS production deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/msu-lms.git
git push -u origin main
```

ก่อน push ใช้ `git status` ตรวจว่า **ไม่มี `.env.local`**

## 3) Import เข้า Vercel

1. เข้า Vercel
2. Add New > Project
3. Import repository `msu-lms`
4. Framework Preset: Next.js
5. Node.js: 22.x
6. ใส่ Environment Variables ทั้ง Production / Preview ตามต้องการ:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_FACE_MODEL_URL
```

ค่า 4 ตัวแรก Copy จาก `.env.local` เดิมได้ แต่ `NEXT_PUBLIC_APP_URL` ให้เปลี่ยนเป็น URL Production ที่ Vercel ให้ เช่น:

```text
https://msu-lms-xxxx.vercel.app
```

`SUPABASE_SERVICE_ROLE_KEY` เป็น Secret: ห้ามใส่คำว่า NEXT_PUBLIC_ ข้างหน้า และห้าม Commit ลง GitHub

7. กด Deploy

## 4) ตั้ง Supabase URL หลังได้ Vercel URL

Supabase Dashboard > Authentication > URL Configuration

- Site URL = `https://YOUR-PROJECT.vercel.app`
- Redirect URLs เพิ่ม:
  - `https://YOUR-PROJECT.vercel.app/**`
  - `http://localhost:3000/**` (เก็บไว้สำหรับทดสอบในเครื่อง)

จากนั้นกลับ Vercel > Settings > Environment Variables แล้วตั้ง:

```text
NEXT_PUBLIC_APP_URL=https://YOUR-PROJECT.vercel.app
```

แล้ว Redeploy Production อีกครั้ง

## 5) ทดสอบ Production

ตรวจอย่างน้อย:

1. Admin Login
2. สร้าง Course
3. Import ผู้เรียนจาก Excel
4. Login ผู้เรียน
5. เปิดกล้องจาก Browser
6. YouTube เล่นต่อเนื่อง ไม่เด้งย้อนเอง
7. เอาหน้าออก 10 วินาทีแล้ววิดีโอ Pause
8. Progress บันทึกหลัง Reload
9. ทุก Part ถึงเกณฑ์แล้ว Quiz ปลดล็อก
10. Submit Quiz และ Export Excel

## หมายเหตุเรื่องกล้อง

Production URL ของ Vercel ใช้ HTTPS จึงเหมาะกับ `navigator.mediaDevices.getUserMedia()` บน Browser สมัยใหม่ ผู้เรียนต้องกด Allow Camera ครั้งแรก

## อัปเดตระบบภายหลัง

เมื่อแก้ Code แล้ว `git push` ไป branch `main` Vercel จะสร้าง Production deployment ใหม่อัตโนมัติ โดยเครื่องผู้สอนไม่ต้องเปิดเป็น Server
