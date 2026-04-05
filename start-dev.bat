@echo off
echo ========================================
echo   WorkHive - Development Server Start
echo ========================================
echo.

echo [1/2] Starting Backend (port 3000)...
start "WorkHive Backend" cmd /k "cd /d %~dp0backend && npm start"

echo [2/2] Starting Frontend (port 5173)...
timeout /t 3 /nobreak >nul
start "WorkHive Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Press any key to exit...
pause >nul
