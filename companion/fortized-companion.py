#!/usr/bin/env python3
"""
Fortized Companion — lightweight local process scanner.

Runs a tiny HTTP server on localhost:47832 that returns the list of
currently running process names. The Fortized web app polls this
endpoint to automatically detect games & apps.

Usage:
    python3 fortized-companion.py          # runs on port 47832
    python3 fortized-companion.py 5555     # custom port

No external dependencies — stdlib only (Python 3.6+).
"""

import http.server
import json
import os
import platform
import subprocess
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 47832
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
                    # Value is in nanoseconds
                    ns = int(line.split("=")[-1].strip())
                    return ns // 1_000_000_000
            return 0

        else:
            # Linux with xprintidle (optional)
            try:
                out = subprocess.check_output(["xprintidle"], text=True)
                return int(out.strip()) // 1000
            except FileNotFoundError:
                return -1  # xprintidle not installed
    except Exception:
        return -1


class CompanionHandler(http.server.BaseHTTPRequestHandler):
    def _cors(self, origin):
        """Set CORS headers. Allow known Fortized origins."""
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
            self._respond(200, {"status": "ok", "version": "1.0.0"}, origin)
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
        # Quiet — no spam in terminal
        pass


def main():
    server = http.server.HTTPServer(("127.0.0.1", PORT), CompanionHandler)
    print(f"Fortized Companion running on http://127.0.0.1:{PORT}")
    print(f"Endpoints: /ping  /processes  /idle")
    print(f"Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
