@echo off
setlocal
echo Starting Doorstep in Development Mode...
start "Doorstep Descriptor Service" cmd /k "cd /d %~dp0..\services\descriptor && npm run start"
start "Doorstep UI Surface" cmd /k "cd /d %~dp0..\apps\surface && npm run dev"
echo Services launched:
echo - Backend API: http://localhost:3002
echo - Surface Dev: http://localhost:5174
endlocal
