@echo off
setlocal
echo ===================================================
echo [Doorstep] Running Phase 1 Test Suites and Builds
echo ===================================================
echo.

echo --- 1. Running Services Descriptor Tests (Node/TS) ---
cd /d "%~dp0..\services\descriptor"
if not exist node_modules (
    echo Installing descriptor dependencies...
    call npm.cmd install
    if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
)

call npm.cmd test
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Descriptor test suite failed!
    exit /b %ERRORLEVEL%
)

echo.
echo --- 2. Typechecking and Building Descriptor Service ---
call npm.cmd run build
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Descriptor build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo --- 3. Typechecking and Building Web Surface ---
cd /d "%~dp0..\apps\surface"
if not exist node_modules (
    echo Installing surface dependencies...
    call npm.cmd install
    if %ERRORLEVEL% neq 0 exit /b %ERRORLEVEL%
)

call npm.cmd run build
if %ERRORLEVEL% neq 0 (
    echo [FAIL] Surface build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo [Doorstep] ALL TESTS GREEN AND BUILDS PASSED
echo ===================================================
exit /b 0
endlocal
