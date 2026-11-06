#!/usr/bin/env python3
"""HELIOS ENTROPY v3: trusted private LAN/VPN server, Python 3.10+."""
import json
from urllib.parse import urlsplit
import legacy_server as relay

class EntropyHandler(relay.Handler):
    server_version = 'HeliosEntropy/3.0'
    def do_GET(self):
        path = urlsplit(self.path).path
        allowed = {'/core.js', '/world.js', '/combat.js', '/render.js', '/ui.js', '/net.js', '/main.js'}
        if path == '/health':
            data = json.dumps({'ok': True, 'game': 'HELIOS ENTROPY', 'version': '3.0.0-entropy'}).encode()
            mime = 'application/json'
        elif path in allowed:
            asset = relay.ROOT / path[1:]
            if not asset.is_file():
                self.send_error(404)
                return
            data = asset.read_bytes()
            mime = 'application/javascript; charset=utf-8'
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(data)

relay.Handler = EntropyHandler
if __name__ == '__main__':
    print('HELIOS / ENTROPY v3', flush=True)
    relay.main()
