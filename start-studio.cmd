@echo off
cd /d "%~dp0"
echo ATLAS Globe Studio
echo Buka http://127.0.0.1:3100 di browser.
echo Tekan Ctrl+C untuk menghentikan server.
call npm.cmd start
pause
