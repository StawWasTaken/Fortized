#!/usr/bin/env python3
"""
Fortized Companion — lightweight local process scanner.

Runs a tiny HTTP server on localhost:47832 that returns the list of
currently running process names. The Fortized web app polls this
endpoint to automatically detect games & apps.

Usage:
    python3 fortized-companion.py            # run the server
    python3 fortized-companion.py --install   # install as auto-start service + run

No external dependencies — stdlib only (Python 3.6+).
"""

import http.server
import json
import os
import platform
import shutil
import subprocess
import sys
import textwrap

PORT = 47832
ALLOWED_ORIGINS = [
    "https://fortized.com",
    "https://www.fortized.com",
    "http://localhost",
    "http://127.0.0.1",
]


def get_running_processes():
    """Return a deduplicated list of running process names."""
    system = platform.system()
    try:
        if system == "Windows":
            out = subprocess.check_output(
                ["tasklist", "/FO", "CSV", "/NH"],
                text=True,
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
            names = set()
            for line in out.strip().splitlines():
                parts = line.split('"')
                if len(parts) >= 2:
                    names.add(parts[1].replace(".exe", ""))
            return sorted(names, key=str.lower)

        elif system == "Darwin":  # macOS
            out = subprocess.check_output(["ps", "-eo", "comm"], text=True)
            names = set()
            for line in out.strip().splitlines()[1:]:
                name = os.path.basename(line.strip())
                if name:
                    names.add(name)
            return sorted(names, key=str.lower)

        else:  # Linux
            out = subprocess.check_output(["ps", "-eo", "comm", "--no-headers"], text=True)
            names = set()
            for line in out.strip().splitlines():
                name = os.path.basename(line.strip())
                if name:
                    names.add(name)
            return sorted(names, key=str.lower)

    except Exception as e:
        return [f"__error__: {e}"]


def get_idle_time():
    """Return system idle time in seconds (best-effort)."""
    system = platform.system()
    try:
        if system == "Windows":
            import ctypes

            class LASTINPUTINFO(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]

            lii = LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
            ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii))
            millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
            return max(0, millis // 1000)

        elif system == "Darwin":
            out = subprocess.check_output(
                ["ioreg", "-c", "IOHIDSystem"], text=True
            )
            for line in out.splitlines():
                if "HIDIdleTime" in line:
                    ns = int(line.split("=")[-1].strip())
                    return ns // 1_000_000_000
            return 0

        else:
            try:
                out = subprocess.check_output(["xprintidle"], text=True)
                return int(out.strip()) // 1000
            except FileNotFoundError:
                return -1
    except Exception:
        return -1


# ─── Auto-install as background service ─────────────────────────

def _get_install_dir():
    system = platform.system()
    if system == "Windows":
        return os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), "Fortized")
    elif system == "Darwin":
        return os.path.expanduser("~/Library/Application Support/Fortized")
    else:
        return os.path.expanduser("~/.local/share/fortized")


def install_service():
    """Copy self to a permanent location and register as an auto-start service."""
    system = platform.system()
    install_dir = _get_install_dir()
    os.makedirs(install_dir, exist_ok=True)
    dest = os.path.join(install_dir, "fortized-companion.py")
    src = os.path.abspath(__file__)
    if os.path.abspath(dest) != src:
        shutil.copy2(src, dest)
    python = sys.executable or "python3"

    if system == "Windows":
        _install_windows(dest, python, install_dir)
    elif system == "Darwin":
        _install_macos(dest, python)
    else:
        _install_linux(dest, python)

    print(f"\n[Fortized] Companion installed to: {dest}")
    print("[Fortized] It will start automatically on login — no manual steps needed.")
    print("[Fortized] Starting now...")


def _install_windows(script, python, install_dir):
    """Create a VBS launcher in the Startup folder (hidden, no console window)."""
    vbs_path = os.path.join(install_dir, "fortized-companion.vbs")
    startup = os.path.join(
        os.environ.get("APPDATA", ""),
        r"Microsoft\Windows\Start Menu\Programs\Startup",
    )
    vbs_content = textwrap.dedent(f"""\
        Set WshShell = CreateObject("WScript.Shell")
        WshShell.Run """{python}"" ""{script}""", 0, False
    """)
    with open(vbs_path, "w") as f:
        f.write(vbs_content)
    link_dest = os.path.join(startup, "FortizedCompanion.vbs")
    shutil.copy2(vbs_path, link_dest)
    print(f"[Fortized] Added to Windows Startup: {link_dest}")


def _install_macos(script, python):
    """Create a macOS LaunchAgent plist."""
    plist_dir = os.path.expanduser("~/Library/LaunchAgents")
    os.makedirs(plist_dir, exist_ok=True)
    plist_path = os.path.join(plist_dir, "com.fortized.companion.plist")
    plist_content = textwrap.dedent(f"""\
        <?xml version="1.0" encoding="UTF-8"?>
        <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
          "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
        <plist version="1.0">
        <dict>
            <key>Label</key>
            <string>com.fortized.companion</string>
            <key>ProgramArguments</key>
            <array>
                <string>{python}</string>
                <string>{script}</string>
            </array>
            <key>RunAtLoad</key>
            <true/>
            <key>KeepAlive</key>
            <true/>
            <key>StandardOutPath</key>
            <string>/tmp/fortized-companion.log</string>
            <key>StandardErrorPath</key>
            <string>/tmp/fortized-companion.log</string>
        </dict>
        </plist>
    """)
    with open(plist_path, "w") as f:
        f.write(plist_content)
    subprocess.run(["launchctl", "unload", plist_path], capture_output=True)
    subprocess.run(["launchctl", "load", plist_path], check=True)
    print(f"[Fortized] LaunchAgent installed: {plist_path}")


def _install_linux(script, python):
    """Create a systemd user service."""
    unit_dir = os.path.expanduser("~/.config/systemd/user")
    os.makedirs(unit_dir, exist_ok=True)
    unit_path = os.path.join(unit_dir, "fortized-companion.service")
    unit_content = textwrap.dedent(f"""\
        [Unit]
        Description=Fortized Companion — game activity detector
        After=network.target

        [Service]
        ExecStart={python} {script}
        Restart=on-failure
        RestartSec=5

        [Install]
        WantedBy=default.target
    """)
    with open(unit_path, "w") as f:
        f.write(unit_content)
    subprocess.run(["systemctl", "--user", "daemon-reload"], capture_output=True)
    subprocess.run(["systemctl", "--user", "enable", "--now", "fortized-companion.service"], check=True)
    print(f"[Fortized] Systemd user service installed: {unit_path}")


# ─── HTTP server ─────────────────────────────────────────────────

class CompanionHandler(http.server.BaseHTTPRequestHandler):
    def _cors(self, origin):
        if origin and any(origin.startswith(a) for a in ALLOWED_ORIGINS):
            self.send_header("Access-Control-Allow-Origin", origin)
        else:
            self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGINS[0])
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors(self.headers.get("Origin"))
        self.end_headers()

    def do_GET(self):
        origin = self.headers.get("Origin")
        if self.path == "/processes":
            data = get_running_processes()
            self._respond(200, {"processes": data}, origin)
        elif self.path == "/idle":
            secs = get_idle_time()
            self._respond(200, {"idle_seconds": secs}, origin)
        elif self.path == "/ping":
            self._respond(200, {"status": "ok", "version": "1.1.0"}, origin)
        else:
            self._respond(404, {"error": "not found"}, origin)

    def _respond(self, code, data, origin):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self._cors(origin)
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        pass


def main():
    if "--install" in sys.argv:
        install_service()

    server = http.server.HTTPServer(("127.0.0.1", PORT), CompanionHandler)
    if "--install" not in sys.argv:
        print(f"Fortized Companion running on http://127.0.0.1:{PORT}")
        print("Endpoints: /ping  /processes  /idle")
        print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
