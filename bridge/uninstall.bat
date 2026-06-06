@echo off
:: BHaratCliniq Bridge Agent — Uninstaller
:: Run as Administrator

echo ================================================
echo  BHaratCliniq Bridge Agent — Uninstaller
echo ================================================
echo.

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please run as Administrator
    pause
    exit /b 1
)

set INSTALL_DIR=%ProgramFiles%\BHaratCliniq\Bridge
set EXE_NAME=BHaratCliniq-Bridge.exe

echo Stopping and removing service...
"%INSTALL_DIR%\%EXE_NAME%" --stop  2>nul
"%INSTALL_DIR%\%EXE_NAME%" --remove 2>nul
echo [OK] Service removed

echo Removing startup entry...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "BHaratCliniqBridge" /f >nul 2>&1
echo [OK] Startup entry removed

echo Removing shortcuts...
del "%USERPROFILE%\Desktop\BHaratCliniq Bridge.lnk" 2>nul
rmdir /s /q "%APPDATA%\Microsoft\Windows\Start Menu\Programs\BHaratCliniq" 2>nul
echo [OK] Shortcuts removed

echo Removing installed files...
rmdir /s /q "%INSTALL_DIR%" 2>nul
echo [OK] Files removed

echo.
echo Configuration and logs are kept at:
echo   %APPDATA%\BHaratCliniq\
echo Delete that folder manually if you want to remove all data.
echo.
echo ================================================
echo  Uninstall complete.
echo ================================================
pause
