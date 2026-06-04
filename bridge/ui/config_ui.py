"""
BHaratCliniq Bridge Agent — Configuration UI
Simple Tkinter window for clinic staff to configure the agent.
No technical knowledge required.
"""
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path
import sys
import os

sys.path.insert(0, str(Path(__file__).parent.parent))
from bridge_agent import load_config, save_config, CONFIG_PATH


class BridgeConfigUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('BHaratCliniq Bridge Agent — Setup')
        self.root.geometry('560x640')
        self.root.resizable(False, False)
        self.root.configure(bg='#f8fafc')

        self.cfg = load_config()
        self._build_ui()

    def _label(self, parent, text, row, col=0, bold=False):
        font = ('Segoe UI', 9, 'bold') if bold else ('Segoe UI', 9)
        tk.Label(parent, text=text, bg='#f8fafc', font=font,
                 anchor='w').grid(row=row, column=col, sticky='w', pady=(6, 1), padx=8)

    def _entry(self, parent, key, row, col=1, show=None):
        var = tk.StringVar(value=self.cfg.get(key, ''))
        self._vars[key] = var
        e = tk.Entry(parent, textvariable=var, width=38, font=('Segoe UI', 9),
                     bd=1, relief='solid', show=show or '')
        e.grid(row=row, column=col, sticky='ew', pady=(0, 2), padx=8)
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
                 font=('Segoe UI', 9, 'bold'), anchor='w', padx=8)\
            .grid(row=row, column=0, columnspan=2, sticky='ew', pady=(12, 4))

    def _build_ui(self):
        self._vars = {}

        # Header
        hdr = tk.Frame(self.root, bg='#0F2557', pady=14)
        hdr.pack(fill='x')
        tk.Label(hdr, text='BHaratCliniq Bridge Agent', fg='white',
                 font=('Segoe UI', 13, 'bold'), bg='#0F2557').pack()
        tk.Label(hdr, text='Connect your clinic machines to the cloud',
                 fg='#93c5fd', font=('Segoe UI', 9), bg='#0F2557').pack()

        # Status bar
        self._status_var = tk.StringVar(value='Not connected')
        tk.Label(self.root, textvariable=self._status_var,
                 bg='#fef3c7', fg='#92400e', font=('Segoe UI', 8),
                 anchor='w', padx=8, pady=4).pack(fill='x')

        # Scrollable form
        canvas = tk.Canvas(self.root, bg='#f8fafc', highlightthickness=0)
        scroll = ttk.Scrollbar(self.root, orient='vertical', command=canvas.yview)
        frame  = tk.Frame(canvas, bg='#f8fafc')
        frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=frame, anchor='nw')
        canvas.configure(yscrollcommand=scroll.set)
        canvas.pack(side='left', fill='both', expand=True)
        scroll.pack(side='right', fill='y')
        frame.columnconfigure(1, weight=1)

        r = 0

        # API Connection
        self._section(frame, '  API Connection', r); r += 1
        self._label(frame, 'API URL', r);    self._entry(frame, 'api_url', r);    r += 1
        self._label(frame, 'API Key', r);    self._entry(frame, 'api_key', r, show='*'); r += 1
        self._label(frame, 'Clinic ID', r);  self._entry(frame, 'clinic_id', r);  r += 1

        # HL7 Settings
        self._section(frame, '  HL7 v2.x (Beckman, Siemens, Abbott, Roche...)', r); r += 1
        self._label(frame, 'TCP Port', r);   self._entry(frame, 'hl7_port', r);   r += 1
        tk.Label(frame, text='Default 2575 — machine must send to this PC IP:port',
                 bg='#f8fafc', fg='#6b7280', font=('Segoe UI', 8))\
            .grid(row=r, column=1, sticky='w', padx=8); r += 1

        # ASTM Settings
        self._section(frame, '  ASTM LIS02 (Sysmex, Mindray, Horiba, Dirui...)', r); r += 1
        self._label(frame, 'TCP Port', r);        self._entry(frame, 'astm_port', r);        r += 1
        self._label(frame, 'Serial Port', r);     self._entry(frame, 'astm_serial_port', r); r += 1
        self._label(frame, 'Baud Rate', r);       self._entry(frame, 'astm_baud_rate', r);   r += 1
        tk.Label(frame, text='Serial: COM3, COM4 etc. Leave blank if using TCP',
                 bg='#f8fafc', fg='#6b7280', font=('Segoe UI', 8))\
            .grid(row=r, column=1, sticky='w', padx=8); r += 1

        # DICOM Settings
        self._section(frame, '  DICOM / Imaging (GE, Philips, Siemens, Canon...)', r); r += 1
        self._label(frame, 'Watch Folder', r); self._folder_entry(frame, 'dicom_watch_folder', r); r += 1
        tk.Label(frame, text='Folder where scanner saves DICOM files',
                 bg='#f8fafc', fg='#6b7280', font=('Segoe UI', 8))\
            .grid(row=r, column=1, sticky='w', padx=8); r += 1

        # PDF Settings
        self._section(frame, '  PDF Fallback (any machine)', r); r += 1
        self._label(frame, 'Watch Folder', r); self._folder_entry(frame, 'pdf_watch_folder', r); r += 1
        tk.Label(frame, text='Folder where machines save PDF reports',
                 bg='#f8fafc', fg='#6b7280', font=('Segoe UI', 8))\
            .grid(row=r, column=1, sticky='w', padx=8); r += 1

        # Buttons
        btn_frame = tk.Frame(self.root, bg='#f8fafc', pady=12)
        btn_frame.pack(fill='x', padx=16)

        tk.Button(btn_frame, text='Test Connection', font=('Segoe UI', 9),
                  command=self._test_connection,
                  bg='#e2e8f0', relief='flat', padx=12, pady=6)\
            .pack(side='left', padx=(0, 8))

        tk.Button(btn_frame, text='Save & Start Agent', font=('Segoe UI', 9, 'bold'),
                  command=self._save,
                  bg='#0F2557', fg='white', relief='flat', padx=16, pady=6)\
            .pack(side='right')

    def _collect(self) -> dict:
        cfg = self.cfg.copy()
        for key, var in self._vars.items():
            val = var.get().strip()
            # Preserve int types
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
        try:
            r = req.get(
                f'{cfg["api_url"].rstrip("/")}/api/v1/bridge/ping',
                headers={'X-Bridge-Key': cfg['api_key'], 'X-Clinic-ID': cfg['clinic_id']},
                timeout=8,
            )
            if r.status_code == 200:
                self._status_var.set('✓ Connected successfully')
                messagebox.showinfo('Success', 'Connection to BHaratCliniq API successful!')
            else:
                self._status_var.set(f'✗ Connection failed: {r.status_code}')
                messagebox.showerror('Failed', f'API returned {r.status_code}:\n{r.text[:200]}')
        except Exception as e:
            self._status_var.set(f'✗ Error: {e}')
            messagebox.showerror('Error', str(e))

    def _save(self):
        cfg = self._collect()
        if not cfg['api_key'] or not cfg['clinic_id']:
            messagebox.showerror('Missing', 'API Key and Clinic ID are required.')
            return
        save_config(cfg)
        messagebox.showinfo('Saved', 'Configuration saved.\nThe bridge agent will start automatically on next launch.')
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    BridgeConfigUI().run()
