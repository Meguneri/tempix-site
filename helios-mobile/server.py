#!/usr/bin/env python3
"""HELIOS MOBILE: small, dependency-free LAN/VPN WebSocket relay.

Python 3.10+. Intended only for trusted private LAN/VPN peers, not public hosting.
Only the game page and a health endpoint are served; no filesystem browsing.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import secrets
import socket
import struct
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
MAX_FRAME = 1_500_000
ROOMS: dict[str, 'Room'] = {}
LOCK = threading.RLock()
ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'


class Room:
    def __init__(self, code: str):
        self.code = code
        self.peers: list[Handler | None] = [None, None]
        self.tokens = [secrets.token_urlsafe(24), secrets.token_urlsafe(24)]
        self.names = ['Искатель 1', 'Искатель 2']
        self.updated = time.monotonic()

    def broadcast(self, payload: dict, except_peer: 'Handler | None' = None):
        for peer in list(self.peers):
            if peer and peer is not except_peer:
                peer.send_json(payload)

    def presence(self):
        self.broadcast({'type': 'presence', 'connected': [bool(p) for p in self.peers], 'names': self.names})


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'HeliosMobile/2.0'

    def log_message(self, fmt, *args):
        if args and '101' not in str(args):
            super().log_message(fmt, *args)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path == '/ws' and self.headers.get('Upgrade', '').lower() == 'websocket':
            self.websocket()
            return
        if path in ('/', '/index.html'):
            data = (ROOT / 'index.html').read_bytes()
            mime = 'text/html; charset=utf-8'
        elif path in ('/manifest.webmanifest', '/sw.js', '/icon-192.png', '/icon-512.png', '/icon.svg'):
            asset = ROOT / path[1:]
            if not asset.is_file():
                self.send_error(404)
                return
            data = asset.read_bytes()
            mime = {'.webmanifest': 'application/manifest+json', '.js': 'application/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml'}[asset.suffix]
        elif path == '/health':
            data = json.dumps({'ok': True, 'game': 'HELIOS MOBILE', 'version': '2.0.0-mobile'}).encode()
            mime = 'application/json'
        elif path == '/favicon.ico':
            self.send_response(204)
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.end_headers()
        self.wfile.write(data)

    def websocket(self):
        origin = self.headers.get('Origin')
        # Do not let unrelated websites connect to this private relay.
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            self.send_error(403, 'Origin mismatch')
            return
        key = self.headers.get('Sec-WebSocket-Key', '')
        try:
            if len(base64.b64decode(key, validate=True)) != 16:
                raise ValueError('key')
        except Exception:
            self.send_error(400, 'Bad WebSocket key')
            return
        if self.headers.get('Sec-WebSocket-Version') != '13':
            self.send_error(400, 'WebSocket version 13 required')
            return
        accept = base64.b64encode(hashlib.sha1((key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').encode()).digest()).decode()
        self.send_response(101)
        self.send_header('Upgrade', 'websocket')
        self.send_header('Connection', 'Upgrade')
        self.send_header('Sec-WebSocket-Accept', accept)
        self.end_headers()
        self.close_connection = True
        self.room: Room | None = None
        self.seat = -1
        self.write_lock = threading.Lock()
        self.alive = True
        self.connection.settimeout(50)
        fragments = bytearray()
        pending_opcode = None
        window, count = time.monotonic(), 0
        try:
            while self.alive:
                head = self.read_exact(2)
                fin, opcode = bool(head[0] & 128), head[0] & 15
                if head[0] & 0x70 or not (head[1] & 128):
                    break
                length = head[1] & 127
                if length == 126:
                    length = struct.unpack('!H', self.read_exact(2))[0]
                elif length == 127:
                    length = struct.unpack('!Q', self.read_exact(8))[0]
                if length > MAX_FRAME or (opcode >= 8 and (length > 125 or not fin)):
                    break
                mask = self.read_exact(4)
                payload = self.read_exact(length)
                payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
                if opcode == 8:
                    self.send_frame(payload[:125], 8)
                    break
                if opcode == 9:
                    self.send_frame(payload, 10)
                    continue
                if opcode == 10:
                    continue
                if opcode == 1:
                    if pending_opcode is not None:
                        break
                    if not fin:
                        pending_opcode, fragments = opcode, bytearray(payload)
                        continue
                elif opcode == 0 and pending_opcode == 1:
                    fragments.extend(payload)
                    if len(fragments) > MAX_FRAME:
                        break
                    if not fin:
                        continue
                    payload, pending_opcode = bytes(fragments), None
                    fragments.clear()
                else:
                    break
                now = time.monotonic()
                if now - window > 1:
                    window, count = now, 0
                count += 1
                if count > 150:
                    break
                try:
                    msg = json.loads(payload.decode('utf-8'))
                    if isinstance(msg, dict):
                        self.message(msg)
                except (UnicodeError, ValueError, TypeError):
                    self.send_json({'type': 'error', 'message': 'Неверный сетевой пакет.'})
        except (ConnectionError, OSError):
            pass
        finally:
            self.alive = False
            with LOCK:
                if self.room and self.room.peers[self.seat] is self:
                    self.room.peers[self.seat] = None
                    self.room.updated = time.monotonic()
                    self.room.presence()

    def read_exact(self, n: int) -> bytes:
        out = bytearray()
        while len(out) < n:
            data = self.rfile.read(n - len(out))
            if not data:
                raise ConnectionError('closed')
            out.extend(data)
        return bytes(out)

    def send_frame(self, data: bytes, opcode: int = 1):
        if not self.alive:
            return
        if len(data) < 126:
            header = bytes([128 | opcode, len(data)])
        elif len(data) < 65536:
            header = bytes([128 | opcode, 126]) + struct.pack('!H', len(data))
        else:
            header = bytes([128 | opcode, 127]) + struct.pack('!Q', len(data))
        try:
            with self.write_lock:
                self.connection.sendall(header + data)
        except OSError:
            self.alive = False

    def send_json(self, data: dict):
        self.send_frame(json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8'))

    def message(self, msg: dict):
        kind = msg.get('type')
        if kind == 'ping':
            self.send_json({'type': 'pong', 'time': msg.get('time')})
            return
        with LOCK:
            if kind in ('create', 'join', 'resume'):
                if self.room:
                    return
                # Empty rooms expire after 30 minutes.
                for code, room in list(ROOMS.items()):
                    if not any(room.peers) and time.monotonic() - room.updated > 1800:
                        del ROOMS[code]
                if kind == 'create':
                    if len(ROOMS) >= 32:
                        self.send_json({'type': 'error', 'message': 'Слишком много комнат. Перезапустите сервер.'})
                        return
                    code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                    while code in ROOMS:
                        code = ''.join(secrets.choice(ALPHABET) for _ in range(6))
                    room, seat = Room(code), 0
                    ROOMS[code] = room
                else:
                    code = str(msg.get('code', '')).strip().upper()[:10]
                    room = ROOMS.get(code)
                    if not room:
                        self.send_json({'type': 'error', 'message': 'Комната не найдена. Проверьте код и адрес сервера.'})
                        return
                    if kind == 'resume':
                        token = str(msg.get('token', ''))
                        seat = next((i for i, t in enumerate(room.tokens) if secrets.compare_digest(t, token)), -1)
                        if seat < 0:
                            self.send_json({'type': 'error', 'message': 'Сессия истекла. Создайте новую комнату.'})
                            return
                    else:
                        seat = 1
                        if room.peers[seat]:
                            self.send_json({'type': 'error', 'message': 'Комната уже заполнена.'})
                            return
                        if not room.peers[0]:
                            self.send_json({'type': 'error', 'message': 'Ведущий сейчас не в сети.'})
                            return
                        room.tokens[1] = secrets.token_urlsafe(24)
                previous = room.peers[seat]
                if previous and previous is not self:
                    previous.alive = False
                    try:
                        previous.connection.shutdown(socket.SHUT_RDWR)
                    except OSError:
                        pass
                self.room, self.seat = room, seat
                room.peers[seat] = self
                room.names[seat] = str(msg.get('name') or f'Искатель {seat+1}')[:24]
                room.updated = time.monotonic()
                self.send_json({'type': 'welcome', 'code': room.code, 'seat': seat, 'token': room.tokens[seat], 'names': room.names})
                room.presence()
                return
            if not self.room:
                return
            self.room.updated = time.monotonic()
            if kind == 'state' and self.seat == 0:
                peer = self.room.peers[1]
                state = msg.get('state')
                if peer and isinstance(state, dict):
                    peer.send_json({'type': 'state', 'state': state})
            elif kind == 'input' and self.seat == 1:
                peer = self.room.peers[0]
                if peer:
                    peer.send_json({'type': 'input', 'input': msg.get('input', {}), 'seat': 1})
            elif kind == 'action':
                # Sender identity is always attached by the server.
                peer = self.room.peers[0]
                if peer:
                    peer.send_json({'type': 'action', 'seat': self.seat, 'action': msg.get('action'), 'value': msg.get('value')})
            elif kind == 'lobby' and self.seat == 0:
                self.room.broadcast({'type': 'lobby', 'data': msg.get('data')}, except_peer=self)
            elif kind == 'notice':
                self.room.broadcast({'type': 'notice', 'seat': self.seat, 'message': str(msg.get('message', ''))[:120]}, except_peer=self)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--bind', default='0.0.0.0')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not (ROOT / 'index.html').is_file():
        raise SystemExit('index.html is missing. Extract the entire archive first.')
    try:
        server = ThreadingHTTPServer((args.bind, args.port), Handler)
    except OSError as exc:
        raise SystemExit(f'Cannot start on port {args.port}: {exc}\nTry: python server.py --port 8788') from exc
    server.daemon_threads = True
    server.request_queue_size = 16
    print('\n  HELIOS MOBILE / Private co-op server\n', flush=True)
    print(f'  This computer: http://127.0.0.1:{args.port}', flush=True)
    try:
        addresses = sorted({x[4][0] for x in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET)})
        for address in addresses:
            if not address.startswith('127.'):
                print(f'  LAN / VPN:     http://{address}:{args.port}', flush=True)
    except OSError:
        pass
    print(f'\n  PHONES: open one of the LAN / VPN addresses above in your browser.', flush=True)
    print(f'  Remote friend: http://YOUR_SHARED_VPN_IP:{args.port}', flush=True)
    print('  Both phones may play; this computer only runs the server.', flush=True)
    print('  Keep this window open. Ctrl+C stops the server.', flush=True)
    print('  Trusted LAN/VPN only. Do not expose this server to the public internet.\n', flush=True)
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(f'http://127.0.0.1:{args.port}')).start()
    try:
        server.serve_forever(poll_interval=0.25)
    except KeyboardInterrupt:
        print('\nServer stopped.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main()