================================================================
 BHaratCliniq Bridge Agent
 Version 1.0  |  For clinic IT staff
================================================================

WHAT IS THIS?
-------------
This software connects your clinic's lab and imaging machines
to the BHaratCliniq cloud platform automatically.

Results from lab analysers (CBC, biochemistry, etc.) and
imaging equipment (X-ray, CT, MRI, Ultrasound) are sent
to the cloud as soon as they are ready. Doctors can view
them instantly in their BHaratCliniq portal.

No manual data entry. No USB drives. No delays.


WHAT MACHINES DOES IT SUPPORT?
-------------------------------
Lab Analysers (HL7 v2.x protocol):
  - Beckman Coulter, Siemens, Abbott, Roche
  - Any machine that supports HL7 over TCP/LAN

Lab Analysers (ASTM LIS02 protocol):
  - Sysmex, Mindray, Horiba, Dirui, BC Group
  - Any machine that supports ASTM via TCP or serial (RS-232)

Imaging Equipment (DICOM):
  - GE, Philips, Siemens, Canon, Mindray, Samsung
  - X-ray (CR/DR), CT, MRI, Ultrasound, Mammography
  - Any DICOM-compliant device

PDF Fallback (any machine):
  - If a machine can export PDF reports to a folder,
    the bridge will pick them up automatically.
    Name files as ORDER-123.pdf for automatic matching.


INSTALLATION (First Time)
--------------------------
1. Copy BHaratCliniq-Bridge.exe to this PC.

2. Right-click install.bat → "Run as Administrator"

3. Double-click the desktop shortcut "BHaratCliniq Bridge"
   OR run: BHaratCliniq-Bridge.exe --config

4. In the setup window:
   a. Enter the API URL, API Key, and Clinic ID
      (Get these from your BHaratCliniq portal → Settings → Bridge)
   b. Click "Test Connection" — must show green/success
   c. Configure your machine connections (see below)
   d. Click "Save & Start Agent"

5. The bridge icon will appear in the system tray
   (bottom-right corner of Windows taskbar, near the clock).
   Green dot = connected. Orange = offline (will retry).


MACHINE CONFIGURATION GUIDE
----------------------------

FOR HL7 LAB MACHINES (Beckman, Siemens, Abbott, Roche):
  - Note this PC's IP address (e.g., 192.168.1.10)
  - On the lab machine, set the LIS/Host IP to this PC's IP
  - Set the port to 2575 (or whatever you set in Bridge config)
  - Protocol: HL7 v2.x, TCP/IP
  - The bridge listens for incoming connections automatically

FOR ASTM LAB MACHINES via TCP (Sysmex, Mindray, Horiba):
  - Similar to HL7 — set Host IP to this PC, port 2576
  - Protocol: ASTM LIS02, TCP/IP

FOR ASTM LAB MACHINES via Serial/RS-232 (older models):
  - Connect the RS-232 cable from the machine to this PC
  - Check Device Manager for the COM port (e.g., COM3)
  - Enter COM3 (or your port) in "Serial Port" field
  - Set the correct baud rate (usually 9600 or 19200)
  - Check your machine manual for the baud rate

FOR DICOM IMAGING MACHINES (X-ray, CT, MRI, Ultrasound):
  - Configure the machine to save DICOM files to a shared folder
  - Set that folder path in "DICOM Watch Folder" in Bridge config
  - The bridge watches this folder and uploads automatically
  - Alternatively, configure the machine to send DICOM via C-STORE
    to this PC (DICOM AE title: BHARATCLINIQ, port: 11112)

FOR PDF FALLBACK (any machine):
  - Set the machine to export PDF reports to a specific folder
  - Set that folder in "PDF Watch Folder" in Bridge config
  - For automatic matching, name files: ORDER-XXXX.pdf
    where XXXX is the order number from BHaratCliniq


TROUBLESHOOTING
---------------
Problem: "Connection Failed" when testing
  - Check internet connection on this PC
  - Verify API Key and Clinic ID are correct
  - Check if the BHaratCliniq server URL is correct
  - Temporarily disable Windows Firewall and test again

Problem: Lab results not appearing in portal
  - Check if the lab machine is sending to the correct IP/port
  - Look at the log file: %APPDATA%\BHaratCliniq\bridge.log
  - Verify the machine is using HL7 or ASTM protocol
  - Check BHaratCliniq portal → Lab → Unmatched for results
    that arrived but couldn't be matched to an order

Problem: DICOM images not appearing
  - Verify the watch folder path is correct and accessible
  - Ensure the imaging machine is saving files to that folder
  - Check that files have .dcm extension or no extension
  - Look at: %APPDATA%\BHaratCliniq\bridge.log

Problem: Bridge not starting on boot
  - Right-click install.bat → Run as Administrator (reinstall)
  - Or check Services (services.msc) for "BHaratCliniq Bridge"

Problem: Offline results not uploading after internet restored
  - Results are saved in retry queue automatically
  - Queue file: %APPDATA%\BHaratCliniq\retry_queue.json
  - They will upload automatically when internet comes back
  - Check bridge.log for progress


LOG FILES
---------
All activity is logged at:
  %APPDATA%\BHaratCliniq\bridge.log

Configuration is stored at:
  %APPDATA%\BHaratCliniq\config.json

Offline retry queue:
  %APPDATA%\BHaratCliniq\retry_queue.json


UNINSTALL
---------
Right-click uninstall.bat → Run as Administrator


SUPPORT
-------
Email: support@bharatcliniq.com
Portal: https://bharatcliniq.com

================================================================
