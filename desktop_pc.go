// HELIOS / ENTROPY — Windows desktop launcher and LAN relay.
// Uses only Go's standard library. The game is an embedded offline HTML page.
package main

import (
	"bufio"
	"context"
	"crypto/rand"
	"crypto/sha1"
	"embed"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

//go:embed dist/HELIOS_ENTROPY_OFFLINE.html
var embedded embed.FS

const maxFrame = 1500000
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const guid = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

type Payload = map[string]any

type Room struct {
	code   string
	peers  [2]*Peer
	tokens [2]string
	names  [2]string
	last   time.Time
}
type Peer struct {
	c       net.Conn
	rd      *bufio.Reader
	wr      *bufio.Writer
	room    *Room
	seat    int
	writeMu sync.Mutex
	alive   atomic.Bool
}

var rooms = map[string]*Room{}
var roomMu sync.Mutex

func randString(alpha string, n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	for i := range b {
		b[i] = alpha[int(b[i])%len(alpha)]
	}
	return string(b)
}
func randomToken() string {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}
func newRoom() *Room {
	r := &Room{names: [2]string{"Искатель 1", "Искатель 2"}, last: time.Now()}
	for i := range r.tokens {
		r.tokens[i] = randomToken()
	}
	for {
		r.code = randString(alphabet, 6)
		if _, found := rooms[r.code]; !found {
			break
		}
	}
	rooms[r.code] = r
	return r
}
func (p *Peer) send(op byte, b []byte) error {
	if !p.alive.Load() {
		return io.EOF
	}
	p.writeMu.Lock()
	defer p.writeMu.Unlock()
	if err := p.c.SetWriteDeadline(time.Now().Add(6 * time.Second)); err != nil {
		return err
	}
	hdr := []byte{0x80 | op}
	switch {
	case len(b) < 126:
		hdr = append(hdr, byte(len(b)))
	case len(b) < 65536:
		hdr = append(hdr, 126, byte(len(b)>>8), byte(len(b)))
	default:
		hdr = append(hdr, 127, 0, 0, 0, 0, byte(len(b)>>24), byte(len(b)>>16), byte(len(b)>>8), byte(len(b)))
	}
	if _, err := p.wr.Write(hdr); err != nil {
		return err
	}
	if _, err := p.wr.Write(b); err != nil {
		return err
	}
	return p.wr.Flush()
}
func (p *Peer) sendJSON(data Payload) {
	b, err := json.Marshal(data)
	if err != nil {
		return
	}
	if err = p.send(1, b); err != nil {
		p.alive.Store(false)
		_ = p.c.Close()
	}
}
func (r *Room) broadcast(msg Payload, exclude *Peer) {
	for _, p := range r.peers {
		if p != nil && p != exclude {
			p.sendJSON(msg)
		}
	}
}
func (r *Room) presence() {
	r.broadcast(Payload{"type": "presence", "connected": []bool{r.peers[0] != nil, r.peers[1] != nil}, "names": r.names}, nil)
}
func text(v any) string {
	s, ok := v.(string)
	if !ok {
		return ""
	}
	return s
}
func (p *Peer) message(m Payload) {
	typ := text(m["type"])
	if typ == "ping" {
		p.sendJSON(Payload{"type": "pong", "time": m["time"]})
		return
	}
	roomMu.Lock()
	defer roomMu.Unlock()
	if typ == "create" || typ == "join" || typ == "resume" {
		if p.room != nil {
			return
		}
		for k, r := range rooms {
			if r.peers[0] == nil && r.peers[1] == nil && time.Since(r.last) > 30*time.Minute {
				delete(rooms, k)
			}
		}
		var r *Room
		seat := 0
		if typ == "create" {
			if len(rooms) >= 32 {
				p.sendJSON(Payload{"type": "error", "message": "Слишком много комнат. Перезапустите сервер."})
				return
			}
			r = newRoom()
		} else {
			code := strings.ToUpper(strings.TrimSpace(text(m["code"])))
			if len(code) > 10 {
				code = code[:10]
			}
			r = rooms[code]
			if r == nil {
				p.sendJSON(Payload{"type": "error", "message": "Комната не найдена. Проверьте код и адрес сервера."})
				return
			}
			if typ == "resume" {
				seat = -1
				for i, t := range r.tokens {
					if t == text(m["token"]) && t != "" {
						seat = i
					}
				}
				if seat < 0 {
					p.sendJSON(Payload{"type": "error", "message": "Сессия истекла. Создайте новую комнату."})
					return
				}
			} else {
				seat = 1
				if r.peers[seat] != nil {
					p.sendJSON(Payload{"type": "error", "message": "Комната уже заполнена."})
					return
				}
				if r.peers[0] == nil {
					p.sendJSON(Payload{"type": "error", "message": "Ведущий сейчас не в сети."})
					return
				}
				r.tokens[seat] = randomToken()
			}
		}
		previous := r.peers[seat]
		if previous != nil && previous != p {
			previous.alive.Store(false)
			_ = previous.c.Close()
		}
		p.room = r
		p.seat = seat
		r.peers[seat] = p
		name := strings.TrimSpace(text(m["name"]))
		if name == "" {
			name = fmt.Sprintf("Искатель %d", seat+1)
		}
		chars := []rune(name)
		if len(chars) > 24 {
			name = string(chars[:24])
		}
		r.names[seat] = name
		r.last = time.Now()
		p.sendJSON(Payload{"type": "welcome", "code": r.code, "seat": seat, "token": r.tokens[seat], "names": r.names})
		r.presence()
		return
	}
	if p.room == nil {
		return
	}
	r := p.room
	r.last = time.Now()
	switch typ {
	case "state":
		if p.seat == 0 && r.peers[1] != nil {
			if state, ok := m["state"].(map[string]any); ok {
				r.peers[1].sendJSON(Payload{"type": "state", "state": state})
			}
		}
	case "input":
		if p.seat == 1 && r.peers[0] != nil {
			r.peers[0].sendJSON(Payload{"type": "input", "input": m["input"], "seat": 1})
		}
	case "action":
		if r.peers[0] != nil {
			r.peers[0].sendJSON(Payload{"type": "action", "seat": p.seat, "action": m["action"], "value": m["value"]})
		}
	case "lobby":
		if p.seat == 0 {
			r.broadcast(Payload{"type": "lobby", "data": m["data"]}, p)
		}
	case "notice":
		msg := []rune(text(m["message"]))
		if len(msg) > 120 {
			msg = msg[:120]
		}
		r.broadcast(Payload{"type": "notice", "seat": p.seat, "message": string(msg)}, p)
	}
}
func (p *Peer) readFrame() (byte, []byte, error) {
	if err := p.c.SetReadDeadline(time.Now().Add(90 * time.Second)); err != nil {
		return 0, nil, err
	}
	b := make([]byte, 2)
	if _, err := io.ReadFull(p.rd, b); err != nil {
		return 0, nil, err
	}
	if b[0]&0x70 != 0 || b[1]&0x80 == 0 {
		return 0, nil, errors.New("invalid flags or unmasked data")
	}
	op := b[0] & 0xf
	n := uint64(b[1] & 0x7f)
	if n == 126 {
		q := make([]byte, 2)
		if _, err := io.ReadFull(p.rd, q); err != nil {
			return 0, nil, err
		}
		n = uint64(binary.BigEndian.Uint16(q))
	}
	if n == 127 {
		q := make([]byte, 8)
		if _, err := io.ReadFull(p.rd, q); err != nil {
			return 0, nil, err
		}
		n = binary.BigEndian.Uint64(q)
	}
	if n > maxFrame || (op >= 8 && (n > 125 || b[0]&0x80 == 0)) {
		return 0, nil, errors.New("frame too large")
	}
	mask := make([]byte, 4)
	if _, err := io.ReadFull(p.rd, mask); err != nil {
		return 0, nil, err
	}
	data := make([]byte, int(n))
	if _, err := io.ReadFull(p.rd, data); err != nil {
		return 0, nil, err
	}
	for i := range data {
		data[i] ^= mask[i%4]
	}
	if b[0]&0x80 == 0 {
		return 0, nil, errors.New("fragmented packets not supported")
	}
	return op, data, nil
}
func (p *Peer) serve() {
	p.alive.Store(true)
	defer func() {
		p.alive.Store(false)
		_ = p.c.Close()
		roomMu.Lock()
		defer roomMu.Unlock()
		r := p.room
		if r != nil && r.peers[p.seat] == p {
			r.peers[p.seat] = nil
			r.last = time.Now()
			r.presence()
		}
	}()
	count := 0
	stamp := time.Now()
	for p.alive.Load() {
		op, data, err := p.readFrame()
		if err != nil {
			return
		}
		switch op {
		case 8:
			_ = p.send(8, nil)
			return
		case 9:
			_ = p.send(10, data)
			continue
		case 10:
			continue
		case 1:
			now := time.Now()
			if now.Sub(stamp) > time.Second {
				count = 0
				stamp = now
			}
			count++
			if count > 150 {
				return
			}
			if len(data) > 0 {
				var msg Payload
				if err := json.Unmarshal(data, &msg); err != nil || msg == nil {
					p.sendJSON(Payload{"type": "error", "message": "Неверный сетевой пакет."})
					continue
				}
				p.message(msg)
			}
		default:
			return
		}
	}
}
func upgrade(w http.ResponseWriter, r *http.Request) {
	if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") || r.Header.Get("Sec-WebSocket-Version") != "13" {
		http.Error(w, "WebSocket upgrade required", 400)
		return
	}
	origin := r.Header.Get("Origin")
	if origin != "" {
		u, err := url.Parse(origin)
		if err != nil || !strings.EqualFold(u.Host, r.Host) {
			http.Error(w, "Origin mismatch", 403)
			return
		}
	}
	raw, err := base64.StdEncoding.DecodeString(r.Header.Get("Sec-WebSocket-Key"))
	if err != nil || len(raw) != 16 {
		http.Error(w, "Invalid key", 400)
		return
	}
	accept := base64.StdEncoding.EncodeToString(sha1Sum([]byte(r.Header.Get("Sec-WebSocket-Key") + guid)))
	h, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "Hijack unavailable", 500)
		return
	}
	conn, wr, err := h.Hijack()
	if err != nil {
		return
	}
	fmt.Fprintf(wr, "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: %s\r\n\r\n", accept)
	if err = wr.Flush(); err != nil {
		_ = conn.Close()
		return
	}
	(&Peer{c: conn, rd: wr.Reader, wr: wr.Writer, seat: -1}).serve()
}
func sha1Sum(p []byte) []byte { b := sha1.Sum(p); return b[:] }

var uiCSS = `
<style id="pc-edition">
@media(pointer:fine){
 .mini{width:208px;height:166px;top:100px;right:22px;border-color:#64868b7a}
 .vitals{width:258px;padding:12px 15px}
 .hudtop{left:24px;top:20px;right:24px}
 .hudbottom{left:24px;right:24px;bottom:24px}
 .objective{font-size:13px;padding:11px 17px;border-left-width:3px}
 .ammo{padding:12px 19px;font-size:14px}
 .ammo strong{font-size:25px}
 #scene{cursor:crosshair}
 .titlegrid{grid-template-columns:1.25fr .75fr}
 .shell{width:min(1240px,100%)}
 #fps-hel{position:fixed;top:275px;right:25px;background:#081521bb;border:1px solid #5c869055;padding:5px 9px;font:11px ui-monospace,monospace;color:#9cc5c2;z-index:4;pointer-events:none;display:none}
 #pc-help{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);color:#adcbd2b3;font:10px ui-monospace,monospace;z-index:4;pointer-events:none;white-space:nowrap;letter-spacing:.5px}
}
</style>
`
var uiJS = `
<script id="pc-edition-logic">
(()=>{
 if(window.matchMedia('(pointer:coarse)').matches)return;
 document.body.classList.add('desktop-edition');
 const help=document.createElement('div');help.id='pc-help';help.textContent='WASD ДВИЖЕНИЕ  ·  ЛКМ ОГОНЬ  ·  ПРОБЕЛ РЫВОК  ·  Q СПОСОБНОСТЬ  ·  E ДЕЙСТВИЕ  ·  TAB КАРТА  ·  F3 FPS  ·  КОЛЕСО МАСШТАБ';document.body.appendChild(help);
 const fps=document.createElement('div');fps.id='fps-hel';document.body.appendChild(fps);
 let zoom=1,now=performance.now(),frames=0,acc=0,showFPS=false;
 const originalCamera=E.camera;
 E.camera=dt=>{originalCamera(dt);const v=E.view;const base=v.scale;v.scale=Math.max(.60,Math.min(1.65,base*zoom));
  // Preserve camera center when applying player-controlled zoom.
  const delta=v.scale-base;v.x-=E.cam.x*delta;v.y-=E.cam.y*delta;v.x+=v.w*0;};
 document.getElementById('scene').addEventListener('wheel',ev=>{if(E.screen!=='game'||E.menu)return;ev.preventDefault();zoom=Math.max(.72,Math.min(1.5,zoom*(ev.deltaY>0?.91:1.09)));E.notice('Масштаб: '+Math.round(zoom*100)+'%');},{passive:false});
 window.addEventListener('keydown',ev=>{if(ev.code==='F3'){ev.preventDefault();showFPS=!showFPS;fps.style.display=showFPS?'block':'none'}if(ev.code==='F11'){ev.preventDefault();if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});else document.exitFullscreen().catch(()=>{})}},true);
 const tick=t=>{frames++;acc+=t-now;now=t;if(acc>=1000){if(showFPS)fps.textContent=Math.round(frames*1000/acc)+' FPS · '+E.view.w+'×'+E.view.h+' · '+(E.opts.quality==='ultra'?'ULTRA':E.opts.quality.toUpperCase());frames=0;acc=0};help.style.display=E.screen==='game'&&!E.menu?'block':'none';requestAnimationFrame(tick)};requestAnimationFrame(tick);
 const oldSettings=E.settingsHTML;E.settingsHTML=()=>oldSettings().replace('<option value="high"', '<option value="ultra" '+(E.opts.quality==='ultra'?'selected':'')+'>Ультра — чёткий рендер для ПК (нагружает видеокарту)</option><option value="high"');
 try{if(!localStorage.getItem('helios-pc-initial')){E.opts.quality='high';E.opts.auto=false;E.opts.aim=false;E.store('helios3-options',E.opts);localStorage.setItem('helios-pc-initial','yes')}}catch(_){}
 E.resize();
})()
</script>
`
var gameHTML []byte

func init() {
	b, err := embedded.ReadFile("dist/HELIOS_ENTROPY_OFFLINE.html")
	if err != nil {
		panic(err)
	}
	s := string(b)
	s = strings.Replace(s, "</head>", uiCSS+"</head>", 1)
	// Apply quality support before the game initializes, without breaking the standalone fallback.
	s = strings.ReplaceAll(s, "if(E.opts.quality==='high')", "if(E.opts.quality!=='low')")
	s = strings.ReplaceAll(s, "E.opts.quality==='high'?", "E.opts.quality!=='low'?")
	s = strings.Replace(s, "v.dpr=Math.min(devicePixelRatio||1,E.opts.quality!=='low'?1.75:1)", "v.dpr=Math.min(E.opts.quality==='ultra'?Math.max(1.5,Math.min(devicePixelRatio||1,2.5)):devicePixelRatio||1,E.opts.quality==='ultra'?2.5:E.opts.quality!=='low'?1.75:1,Math.max(1,Math.sqrt(12000000/(v.w*v.h))))", 1)
	s = strings.Replace(s, "</body>", uiJS+"</body>", 1)
	gameHTML = []byte(s)
}

func main() {
	host := flag.Bool("host", false, "host a private LAN/VPN co-op game on 0.0.0.0:8787")
	serverOnly := flag.Bool("server-only", false, "run server without opening a game window")
	browserOnly := flag.Bool("browser", false, "open in regular browser instead of app window")
	join := flag.String("join", "", "connect to friend's private LAN/VPN HTTP server")
	flag.Parse()
	if *join != "" {
		u, err := url.Parse(*join)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" || u.User != nil {
			fmt.Fprintln(os.Stderr, "Неверный адрес сервера. Пример: http://192.168.1.10:8787")
			os.Exit(2)
		}
		fmt.Println("Подключаемся к серверу друга: " + u.String())
		if err := openGame(u.String(), *browserOnly); err != nil {
			log.Println(err)
		}
		return
	}
	bind := "127.0.0.1:8787"
	if *host {
		bind = ":8787"
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			_, _ = w.Write([]byte(`{"ok":true,"game":"HELIOS ENTROPY PC","version":"3.0.0-entropy"}`))
			return
		}
		if r.URL.Path != "/" && r.URL.Path != "/index.html" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "no-referrer")
		_, _ = w.Write(gameHTML)
	})
	mux.HandleFunc("/ws", upgrade)
	server := &http.Server{Addr: bind, Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	ln, err := net.Listen("tcp", bind)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Не удалось запустить: порт 8787 уже занят.")
		fmt.Fprintln(os.Stderr, err)
		if runtime.GOOS == "windows" {
			time.Sleep(6 * time.Second)
		}
		os.Exit(1)
	}
	defer ln.Close()
	go func() {
		if err := server.Serve(ln); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Println(err)
		}
	}()
	fmt.Println("\n  ГЕЛИОС / ЭНТРОПИЯ — ПК\n")
	fmt.Println("  Играть на этом компьютере: http://127.0.0.1:8787")
	if *host {
		fmt.Println("\n  КООПЕРАТИВ: передай другу адрес из вашей Wi-Fi/LAN/VPN-сети.")
		for _, ip := range lanIPs() {
			fmt.Printf("    http://%s:8787\n", ip)
		}
		fmt.Println("  Не открывай порт в публичный интернет.")
	}
	if *serverOnly {
		fmt.Println("\n  Сервер запущен. Ctrl+C — остановить.")
		select {}
	}
	url := "http://127.0.0.1:8787"
	browserMode := *browserOnly || (runtime.GOOS == "windows" && !hasAppBrowser())
	if err := openGame(url, *browserOnly); err != nil {
		log.Println("Не удалось открыть окно автоматически:", err)
		fmt.Println("Открой вручную " + url)
		select {}
	}
	if browserMode {
		fmt.Println("Сервер запущен. Закрой это окно или нажми Ctrl+C, чтобы остановить сервер.")
		select {}
	}
	fmt.Println("\n  Окно игры закрыто. Сохраняй прогресс через меню паузы.")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
func lanIPs() []string {
	ifaces, err := net.Interfaces()
	if err != nil {
		return nil
	}
	var out []string
	for _, face := range ifaces {
		if face.Flags&net.FlagUp == 0 || face.Flags&net.FlagLoopback != 0 {
			continue
		}
		addrs, _ := face.Addrs()
		for _, addr := range addrs {
			var ip net.IP
			switch x := addr.(type) {
			case *net.IPNet:
				ip = x.IP
			case *net.IPAddr:
				ip = x.IP
			}
			if ip == nil || ip.To4() == nil || ip.IsLoopback() {
				continue
			}
			out = append(out, ip.String())
		}
	}
	return out
}
func openGame(addr string, regular bool) error {
	if runtime.GOOS == "windows" {
		if !regular {
			for _, p := range browsers() {
				if _, err := os.Stat(p); err == nil {
					dir := os.Getenv("LOCALAPPDATA")
					if dir == "" {
						dir = os.TempDir()
					}
					profile := filepath.Join(dir, "HeliosEntropyPC", "BrowserData")
					_ = os.MkdirAll(profile, 0700)
					cmd := exec.Command(p, "--new-window", "--no-first-run", "--user-data-dir="+profile, "--window-size=1580,950", "--app="+addr)
					if err = cmd.Start(); err == nil {
						return cmd.Wait()
					}
				}
			}
		}
		return exec.Command("rundll32", "url.dll,FileProtocolHandler", addr).Start()
	}
	if runtime.GOOS == "darwin" {
		return exec.Command("open", addr).Start()
	}
	for _, p := range []string{"xdg-open", "chromium", "google-chrome"} {
		if _, err := exec.LookPath(p); err == nil {
			return exec.Command(p, addr).Start()
		}
	}
	return errors.New("browser not found")
}
func hasAppBrowser() bool {
	for _, p := range browsers() {
		if _, err := os.Stat(p); err == nil {
			return true
		}
	}
	return false
}
func browsers() []string {
	roots := []string{os.Getenv("ProgramFiles(x86)"), os.Getenv("ProgramFiles"), os.Getenv("LOCALAPPDATA")}
	var out []string
	for _, root := range roots {
		if root != "" {
			for _, sub := range []string{"Microsoft/Edge/Application/msedge.exe", "Google/Chrome/Application/chrome.exe"} {
				out = append(out, filepath.Join(root, filepath.FromSlash(sub)))
			}
		}
	}
	return out
}
