@echo off
chcp 65001 >nul
cd /d "%~dp0"
title HELIOS ENTROPY - Cooperative Host
HELIOS_ENTROPY_PC.exe --host
if errorlevel 1 pause
