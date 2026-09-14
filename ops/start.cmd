@echo off
setlocal
echo Starting Doorstep Event-to-Description Service on http://localhost:3002...
cd /d "%~dp0..\services\descriptor"
node dist/index.js
endlocal
