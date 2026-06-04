"""
BHaratCliniq Bridge Agent — Configuration UI
Simple Tkinter window for clinic staff to configure the agent.
No technical knowledge required.
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))
from bridge_agent import load_config, save_config


class BridgeConfigUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('BHaratCliniq Bridge Agent — Setup')
        self.root.geometry('580x700')
        self.root.resizable(False, False)
        self.root.configure(bg='#f8fafc')
        try:
            icon_path = Path(__file__).parent / 'icon.ico'
            if icon_path.exists():
                self.root.iconbitmap(str(icon_path))
        except Exception:
            pass
        self.cfg = load_config()
        self._build_ui()

    def _label(self, parent, text, row, col=0, bold=False):
        font = ('Segoe UI', 9, 'bold') if bold else ('Segoe UI', 9)
        tk.Label(parent, text=text, bg='#f8fafc', font=font,
                 anchor='w').grid(row=row, column=col, sticky='w', pady=(6, 1), padx=8)

    def _entry(self, parent, key, row, col=1, show=None):
        var = tk.StringVar(value=self.cfg.get(key, ''))
        self._vars[key] = var
        tk.Entry(parent, textvariable=var, width=38, font=('Segoe UI', 9),
                 bd=1, relief='solid', show=show or '').grid(
            row=row, column=col, sticky='ew', pady=(0, 2), padx=8)
        return var

    def _folder_entry(self, parent, key, row):
        frame = tk.Frame(parent, bg='#f8fafc')
        frame.grid(row=row, column=1, sticky='ew', pady=(0, 2), padx=8)
        var = tk.StringVar(value=self.cfg.get(key, ''))
        self._vars[key] = var
        tk.Entry(frame, textvariable=var, width=30, font=('Segoe UI', 9),
                 bd=1, relief='solid').pack(side='left')
        tk.Button(frame, text='Browse', font=('Segoe UI', 8),
                  command=lambda v=var: v.set(filedialog.askdirectory() or v.get()),
                  bg='#e2e8f0', relief='flat', padx=6).pack(side='left', padx=(4, 0))

    def _section(self, parent, title, row):
        tk.Label(parent, text=title, bg='#0F2557', fg='white',
                 font=('Segoe UI', 9, 'bold'), anchor='w', padx=8) \
            .grid(row=row, column=0, columnspan=2, sticky='ew', pady=(12, 4))

    def _hint(self, parent, text, row):
        tk.Label(parent, text=text, bg='#f8fafc', fg='#6b7280',
                 font=('Segoe UI', 8)).grid(row=row, column=1, sticky='w', padx=8)

    def _build_ui(self):
        self._vars = {}

        # Header
        hdr = tk.Frame(self.root, bg='#0F2557', pady=14)
        hdr.pack(fill='x')
        tk.Label(hdr, text='BHaratCliniq Bridge Agent', fg='white',
                 font=('Segoe UI', 13, 'bold'), bg='#0F2557').pack()
        tk.Label(hdr, text='Connect your clinic machines to the BHaratCliniq cloud',
                 fg='#93c5fd', font=('Segoe UI', 9), bg='#0F2557').pack()

        # Status bar
        self._status_var = tk.StringVar(value='Not tested yet — click Test Connection')
        self._status_label = tk.Label(
            self.root, textvariable=self._status_var,
            bg='#fef3c7', fg='#92400e', font=('Segoe UI', 8),
            anchor='w', padx=8, pady=4)
        self._status_label.pack(fill='x')

        # Scrollable form
        canvas = tk.Canvas(self.root, bg='#f8fafc', highlightthickness=0)
        scroll = ttk.Scrollbar(self.root, orient='vertical', command=canvas.yview)
        frame = tk.Frame(canvas, bg='#f8fafc')
        frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=frame, anchor='nw')
        canvas.configure(yscrollcommand=scroll.set)
        canvas.pack(side='left', fill='both', expand=True)
        scroll.pack(side='right', fill='y')
        frame.columnconfigure(1, weight=1)

        r = 0

        self._section(frame, '  Step 1 — API Connection', r); r += 1
        self._label(frame, 'API URL', r)
        self._entry(frame, 'api_url', r); r += 1
        self._label(frame, 'API Key', r)
        self._entry(frame, 'api_key', r, show='*'); r += 1
        self._label(frame, 'Clinic ID', r)
        self._entry(frame, 'clinic_id', r); r += 1
        self._hint(frame, 'Get API Key and Clinic ID from BHaratCliniq portal → Settings → Bridge.', r); r += 1

        self._section(frame, '  Step 2 — HL7 Lab Machines (Beckman, Siemens, Abbott, Roche)', r); r += 1
        self._label(frame, 'TCP Port', r)
        self._entry(frame, 'hl7_port', r); r += 1
        self._hint(frame, 'Default 2575. Set your lab machine to send results to this PC\'s IP on this port.', r); r += 1

        self._section(frame, '  Step 3 — ASTM Lab Machines (Sysmex, Mindray, Horiba, Dirui)', r); r += 1
        self._label(frame, 'TCP Port', r)
        self._entry(frame, 'astm_port', r); r += 1
        self._label(frame, 'Serial Port', r)
        self._entry(frame, 'astm_serial_port', r); r += 1
        self._label(frame, 'Baud Rate', r)
        self._entry(frame, 'astm_baud_rate', r); r += 1
        self._hint(frame, 'Serial port example: COM3. Leave blank if machine uses TCP/LAN.', r); r += 1

        self._section(frame, '  Step 4 — DICOM Imaging (X-Ray, CT, MRI, Ultrasound)', r); r += 1
        self._label(frame, 'Watch Folder', r)
        self._folder_entry(frame, 'dicom_watch_folder', r); r += 1
        self._hint(frame, 'Folder where your imaging machine saves DICOM files automatically.', r); r += 1

        self._section(frame, '  Step 5 — PDF Fallback (any machine that exports PDF)', r); r += 1
        self._label(frame, 'Watch Folder', r)
        self._folder_entry(frame, 'pdf_watch_folder', r); r += 1
        self._hint(frame, 'Name files as ORDER-123.pdf to auto-match. Others go to unmatched queue.', r); r += 1

        self._section(frame, '  Advanced', r); r += 1
        self._label(frame, 'Retry Interval (s)', r)
        self._entry(frame, 'retry_interval', r); r += 1
        self._hint(frame, 'How often to retry failed uploads when internet is unavailable.', r); r += 1

        # Buttons
        btn_frame = tk.Frame(self.root, bg='#f8fafc', pady=12)
        btn_frame.pack(fill='x', padx=16)

        tk.Button(btn_frame, text='Test Connection', font=('Segoe UI', 9),
                  command=self._test_connection,
                  bg='#e2e8f0', relief='flat', padx=12, pady=6).pack(side='left', padx=(0, 8))

        tk.Button(btn_frame, text='Save & Start Agent', font=('Segoe UI', 9, 'bold'),
                  command=self._save,
                  bg='#0F2557', fg='white', relief='flat', padx=16, pady=6).pack(side='right')

    def _collect(self) -> dict:
        cfg = self.cfg.copy()
        for key, var in self._vars.items():
            val = var.get().strip()
            if key in ('hl7_port', 'astm_port', 'astm_baud_rate', 'retry_interval', 'ws_reconnect_delay'):
                try:
                    val = int(val)
                except ValueError:
                    pass
            cfg[key] = val
        return cfg

    def _test_connection(self):
        import requests as req
        cfg = self._collect()
        self._status_var.set('Testing connection...')
        self._status_label.config(bg='#fef3c7', fg='#92400e')
        self.root.update()
        try:
            r = req.get(
                f'{cfg["api_url"].rstrip("/")}/api/v1/bridge/ping',
                headers={'X-Bridge-Key': cfg['api_key'], 'X-Clinic-ID': cfg['clinic_id']},
                timeout=8,
            )
            if r.status_code == 200:
                clinic_name = r.json().get('clinic', '')
                self._status_var.set(f'✓ Connected — Clinic: {clinic_name}')
                self._status_label.config(bg='#d1fae5', fg='#065f46')
                messagebox.showinfo('Success', f'Connected to BHaratCliniq!\nClinic: {clinic_name}')
            else:
                self._status_var.set(f'✗ Failed: HTTP {r.status_code}')
                self._status_label.config(bg='#fee2e2', fg='#991b1b')
                messagebox.showerror('Failed', f'API returned {r.status_code}:\n{r.text[:300]}')
        except Exception as e:
            self._status_var.set(f'✗ Error: {e}')
            self._status_label.config(bg='#fee2e2', fg='#991b1b')
            messagebox.showerror('Connection Error', str(e))

    def _save(self):
        cfg = self._collect()
        if not cfg['api_key'] or not cfg['clinic_id']:
            messagebox.showerror('Missing Fields', 'API Key and Clinic ID are required.')
            return
        save_config(cfg)
        messagebox.showinfo(
            'Configuration Saved',
            'Settings saved successfully.\n\nThe bridge agent will now start and run in the background.\nLook for the BHaratCliniq icon in the system tray (bottom-right taskbar).'
        )
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    BridgeConfigUI().run()
