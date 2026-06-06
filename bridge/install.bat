@echo off
:: BHaratCliniq Bridge Agent — One-Click Installer for Clinic Staff
:: Run this as Administrator

echo ================================================
echo  BHaratCliniq Bridge Agent — Installer
echo ================================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Please right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

set INSTALL_DIR=%ProgramFiles%\BHaratCliniq\Bridge
set EXE_NAME=BHaratCliniq-Bridge.exe

echo Installing to: %INSTALL_DIR%
echo.

:: Create install directory
mkdir "%INSTALL_DIR%" 2>nul

:: Copy exe
if not exist "%EXE_NAME%" (
    echo ERROR: %EXE_NAME% not found in current folder.
    echo Please place install.bat next to %EXE_NAME%
    pause
    exit /b 1
)
copy /Y "%EXE_NAME%" "%INSTALL_DIR%\%EXE_NAME%"
echo [OK] Copied executable

:: Create Windows Start Menu shortcut
set SHORTCUT_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\BHaratCliniq
mkdir "%SHORTCUT_DIR%" 2>nul
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_DIR%\BHaratCliniq Bridge.lnk'); $s.TargetPath = '%INSTALL_DIR%\%EXE_NAME%'; $s.Description = 'BHaratCliniq Bridge Agent'; $s.Save()"
echo [OK] Created Start Menu shortcut

:: Create Desktop shortcut
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%USERPROFILE%\Desktop\BHaratCliniq Bridge.lnk'); $s.TargetPath = '%INSTALL_DIR%\%EXE_NAME%'; $s.Description = 'BHaratCliniq Bridge Agent'; $s.Save()"
echo [OK] Created Desktop shortcut

:: Install as Windows service (auto-start on boot)
echo.
echo Installing Windows service (auto-starts on boot)...
"%INSTALL_DIR%\%EXE_NAME%" --install
if %errorlevel% equ 0 (
    echo [OK] Service installed
    "%INSTALL_DIR%\%EXE_NAME%" --start
    echo [OK] Service started
) else (
    echo [WARN] Service install failed — bridge will need to be started manually
)

:: Add to startup (fallback for non-service mode)
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" ^
    /v "BHaratCliniqBridge" ^
    /t REG_SZ ^
    /d "\"%INSTALL_DIR%\%EXE_NAME%\"" ^
    /f >nul 2>&1
echo [OK] Added to startup

echo.
echo ================================================
echo  Installation complete!
echo.
echo  Next step: Open Configuration
echo  Double-click "BHaratCliniq Bridge" on Desktop
echo  OR run: "%INSTALL_DIR%\%EXE_NAME%" --config
echo ================================================
echo.
pause
