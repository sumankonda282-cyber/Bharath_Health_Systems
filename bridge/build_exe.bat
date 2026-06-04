@echo off
echo Building BHaratCliniq Bridge Agent...
pip install -r requirements.txt

pyinstaller ^
  --onefile ^
  --windowed ^
  --name "BHaratCliniq-Bridge" ^
  --icon "ui/icon.ico" ^
  --add-data "parsers;parsers" ^
  --add-data "ui;ui" ^
  --hidden-import pydicom ^
  --hidden-import hl7 ^
  --hidden-import astm ^
  --hidden-import serial ^
  --hidden-import websockets ^
  --hidden-import watchdog ^
  --hidden-import PIL ^
  --hidden-import tkinter ^
  main.py

echo.
echo Build complete. Executable is in dist/BHaratCliniq-Bridge.exe
echo.
echo To install as Windows service:
echo   dist\BHaratCliniq-Bridge.exe --install
echo   dist\BHaratCliniq-Bridge.exe --start
echo.
pause
