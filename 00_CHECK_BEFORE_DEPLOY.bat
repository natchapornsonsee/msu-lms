@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo  MSU LMS - CHECK BEFORE VERCEL DEPLOY
echo ==========================================
if exist .env.local (
  echo [INFO] พบ .env.local ในเครื่อง - ต้องไม่ Commit ขึ้น GitHub
) else (
  echo [OK] ไม่มี .env.local ในแพ็กนี้
)
if not exist node_modules (
  echo [INFO] กำลังติดตั้ง packages...
  call npm install
  if errorlevel 1 goto :fail
)
echo [CHECK] TypeScript...
call npm run lint
if errorlevel 1 goto :fail
echo.
echo [OK] Source พร้อมสำหรับ Deploy
pause
exit /b 0
:fail
echo.
echo [ERROR] กรุณาแก้ error ด้านบนก่อน Deploy
pause
exit /b 1
