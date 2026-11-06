@echo off
cd /d "%~dp0"
title HELIOS MOBILE - Private server
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 server.py
) else (
  python server.py
)
echo.
echo Server stopped. Python 3.10+ is required on this computer.
pause
