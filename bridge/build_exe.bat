@echo off
echo ================================================
echo  BHaratCliniq Bridge Agent — Build EXE
echo ================================================
echo.

echo [1/3] Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo [2/3] Generating icon...
python ui\generate_icon.py
if %errorlevel% neq 0 (
    echo WARNING: Icon generation failed. Build will continue without icon.
)

echo.
echo [3/3] Building executable with PyInstaller...
pyinstaller ^
  --onefile ^
  --windowed ^
  --name "BHaratCliniq-Bridge" ^
  --icon "ui\icon.ico" ^
  --add-data "parsers;parsers" ^
  --add-data "ui;ui" ^
  --hidden-import pydicom ^
  --hidden-import pydicom.encoders ^
  --hidden-import hl7 ^
  --hidden-import astm ^
  --hidden-import serial ^
  --hidden-import serial.tools ^
  --hidden-import websockets ^
  --hidden-import watchdog ^
  --hidden-import watchdog.observers ^
  --hidden-import watchdog.events ^
  --hidden-import PIL ^
  --hidden-import PIL.Image ^
  --hidden-import PIL.ImageDraw ^
  --hidden-import PIL.ImageEnhance ^
  --hidden-import pystray ^
  --hidden-import tkinter ^
  --hidden-import tkinter.ttk ^
  --hidden-import tkinter.filedialog ^
  --hidden-import tkinter.messagebox ^
  --hidden-import win32serviceutil ^
  --hidden-import win32service ^
  --hidden-import win32event ^
  --hidden-import servicemanager ^
  main.py

if %errorlevel% neq 0 (
    echo ERROR: PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo ================================================
echo  BUILD COMPLETE
echo ================================================
echo  Executable: dist\BHaratCliniq-Bridge.exe
echo.
echo  To install as Windows service (run as Administrator):
echo    dist\BHaratCliniq-Bridge.exe --install
echo    dist\BHaratCliniq-Bridge.exe --start
echo.
echo  To run as desktop app (with system tray):
echo    dist\BHaratCliniq-Bridge.exe
echo.
echo  To open configuration:
echo    dist\BHaratCliniq-Bridge.exe --config
echo ================================================
echo.
pause
