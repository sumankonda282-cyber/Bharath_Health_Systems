"""
BHaratCliniq Bridge Agent — Entry Point
If not configured, shows the config UI first.
If configured, runs the bridge agent.
Can also be installed as a Windows service.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def is_configured() -> bool:
    from bridge_agent import load_config
    cfg = load_config()
    return bool(cfg.get('api_key') and cfg.get('clinic_id'))


def run_as_service():
    """Windows service wrapper using pywin32."""
    try:
        import win32serviceutil
        import win32service
        import win32event
        import servicemanager

        class BridgeService(win32serviceutil.ServiceFramework):
            _svc_name_        = 'BHaratCliniqBridge'
            _svc_display_name_ = 'BHaratCliniq Bridge Agent'
            _svc_description_  = 'Connects clinic machines to BHaratCliniq cloud platform'

            def __init__(self, args):
                win32serviceutil.ServiceFramework.__init__(self, args)
                self.stop_event = win32event.CreateEvent(None, 0, 0, None)

            def SvcStop(self):
                self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
                win32event.SetEvent(self.stop_event)

            def SvcDoRun(self):
                servicemanager.LogMsg(
                    servicemanager.EVENTLOG_INFORMATION_TYPE,
                    servicemanager.PYS_SERVICE_STARTED,
                    (self._svc_name_, ''),
                )
                from bridge_agent import main
                main()

        if len(sys.argv) == 1:
            servicemanager.Initialize()
            servicemanager.PrepareToHostSingle(BridgeService)
            servicemanager.StartServiceCtrlDispatcher()
        else:
            win32serviceutil.HandleCommandLine(BridgeService)

    except ImportError:
        # Not Windows or pywin32 not available — run directly
        from bridge_agent import main
        main()


if __name__ == '__main__':
    # --config flag: show config UI
    if '--config' in sys.argv:
        from ui.config_ui import BridgeConfigUI
        BridgeConfigUI().run()
        sys.exit(0)

    # --install / --remove: Windows service management
    if '--install' in sys.argv or '--remove' in sys.argv or '--start' in sys.argv:
        run_as_service()
        sys.exit(0)

    # First run — show config UI if not configured
    if not is_configured():
        from ui.config_ui import BridgeConfigUI
        BridgeConfigUI().run()

    # Start bridge agent
    if is_configured():
        from bridge_agent import main
        main()
    else:
        print('Bridge agent not configured. Exiting.')
        sys.exit(1)
