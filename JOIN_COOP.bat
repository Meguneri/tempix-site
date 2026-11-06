@echo off
chcp 65001 >nul
cd /d "%~dp0"
title HELIOS ENTROPY - Connect to Friend
set /p HOST="IP or VPN address of host (example 192.168.1.10): "
if "%HOST%"=="" exit /b
HELIOS_ENTROPY_PC.exe --join "http://%HOST%:8787"
if errorlevel 1 pause
