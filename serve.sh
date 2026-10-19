#!/usr/bin/env bash
# Start a local web server for the Community Reform CIC website.
#
#   ./serve.sh          -> http://localhost:8080
#   ./serve.sh 3000     -> http://localhost:3000
#
# Stop it with Ctrl+C.
#
# Notes:
#   - The childcare enquiry form must be viewed over http:// (not by
#     double-clicking the HTML file): the appointment calendar talks to Cal.com
#     and browsers block that from file:// pages.
#   - This server sends "Cache-Control: no-store" so you always see the files
#     as they are on disk (no stale CSS/JS while testing).

set -e
cd "$(dirname "$0")"
PORT="${1:-8080}"

echo
echo "Community Reform CIC - local preview"
echo "  Serving: $(pwd)"
echo "  Home:    http://localhost:${PORT}/"
echo "  Enquiry: http://localhost:${PORT}/childcare-enquiry.html"
echo
echo "  Press Ctrl+C to stop."
echo

python3 - "$PORT" <<'PY'
import http.server
import socketserver
import sys

port = int(sys.argv[1])


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(('', port), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
PY
