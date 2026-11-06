@echo off
chcp 65001 >nul
cd /d "%~dp0"
title HELIOS ENTROPY - Private Server
HELIOS_ENTROPY_PC.exe --host --server-only
if errorlevel 1 pause
