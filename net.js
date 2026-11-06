'use strict';
E.act=(action,value)=>{if(E.mode==='online'&&E.seat===1){E.send({type:'action',action,value});return}E.action(E.seat,action,value);};
E.action=(seat,a,v)=>{
 const s=E.S,c=E.config;
 if(a==='config'&&E.screen==='setup'){
  if(!v||typeof v!=='object')return;
  if(v.field==='cls'&&E.classes[v.value])c.cls[seat]=v.value;
  if(v.field==='weapon'&&E.weapons[v.value])c.weapon[seat]=v.value;
  if(v.field==='diff'&&seat===0&&[0,1,2].includes(Number(v.value)))c.diff=Number(v.value);
  if(v.field==='seed'&&seat===0)c.seed=String(v.value).slice(0,40);
  if(seat===1)c.ready[1]=false;E.broadcastLobby();E.uiKey='';return;
 }
 if(a==='ready'&&E.screen==='setup'){c.ready[seat]=!c.ready[seat];E.broadcastLobby();E.uiKey='';return}
 if(a==='start'&&seat===0){if(E.mode==='online'&&(!E.net.connected.every(Boolean)||!c.ready[1]))return;if(s?.status==='play')return;E.newRun(E.mode,c.seed);E.sendState();return}
 if(!s||s.status!=='play'||!s.players[seat])return;
 if(a==='pause'){if(!v&&E.mode==='online'&&!E.net.connected.every(Boolean))return;s.paused=!!v;E.uiKey='';return}
 if(a==='warp'){E.warp(Number(v));return}
 if(a==='item'&&s.offer?.type==='item'){const o=s.offer;if(o.picked[seat]||!o.options[seat].includes(v))return;E.give(s.players[seat],v);o.picked[seat]=true;if(o.picked.every(Boolean))s.offer=null;E.save();E.uiKey='';return}
 if(a==='buy'&&s.offer?.type==='shop'){if(s.offer.done[seat])return;const q=s.room.stock[Number(v)],p=s.players[seat];if(!q||q.bought||s.coins<q.price)return;s.coins-=q.price;q.bought=true;if(q.id==='heal')p.hp=Math.min(E.stats(p).hp,p.hp+40);else if(q.id==='key')s.keys++;else E.give(p,q.id);E.save();E.uiKey='';return}
 if(a==='shopdone'&&s.offer?.type==='shop'){s.offer.done[seat]=true;if(s.offer.done.every(Boolean))s.offer=null;E.save();E.uiKey='';return}
 if(a==='event'&&s.offer?.type==='event'){E.eventChoice(seat,v==='yes');E.uiKey='';}
};
E.send=data=>{const ws=E.net.ws;if(ws?.readyState===1&&ws.bufferedAmount<500000){ws.send(JSON.stringify(data,(k,v)=>typeof v==='number'?Math.round(v*1000)/1000:v));return true}return false};
E.sendState=()=>{if(E.mode==='online'&&E.seat===0&&E.S)E.send({type:'state',state:E.S})};
E.broadcastLobby=()=>{if(E.mode==='online'&&E.seat===0)E.send({type:'lobby',data:{...E.config,version:E.version}})};
E.disconnect=()=>{const n=E.net;n.intentional=true;clearTimeout(n.retryTimer);if(n.ws){n.ws.onclose=null;n.ws.close()}n.ws=null;n.online=false;n.connected=[false,false];n.code='';n.token='';try{sessionStorage.removeItem('helios3-session')}catch{}E.mode='solo';E.seat=0;};
E.connect=(kind,code='',token='')=>{
 if(!['http:','https:'].includes(location.protocol)){E.notice('Сначала откройте адрес запущенного сервера.',true);return}
 const n=E.net;if(n.ws){n.ws.onclose=null;n.ws.close()}n.intentional=false;n.action=kind;E.mode='online';
 let ws;try{ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/ws')}catch{E.notice('Не удалось создать соединение.',true);return}n.ws=ws;
 ws.onopen=()=>{n.online=true;E.send({type:kind,code,token,name:E.profile.name||'Искатель'});};
 ws.onmessage=ev=>{let m;try{m=JSON.parse(ev.data)}catch{return}
  if(m.type==='error'){E.notice(m.message||'Ошибка соединения.',true);if(kind==='resume'){n.intentional=true;n.token='';try{sessionStorage.removeItem('helios3-session')}catch{}}return}
  if(m.type==='welcome'){
   E.seat=m.seat;n.code=m.code;n.token=m.token;n.retry=0;E.config.names=m.names;try{sessionStorage.setItem('helios3-session',JSON.stringify({code:m.code,token:m.token}))}catch{}
   if(kind==='resume'&&E.seat===0&&!E.S){const saved=E.load('helios3-save',null);if(saved?.version===E.version&&saved.state.mode==='online'){E.S=saved.state;E.config=saved.config;E.S.paused=true;E.lastFX=E.S.eventId;E.cam.snap=true}}
   E.screen=E.S?'game':'setup';E.menu=null;E.uiKey='';if(E.seat===0)E.broadcastLobby();E.notice('Комната '+m.code+' · соединение установлено.');
  }
  if(m.type==='presence'){const before=n.connected;n.connected=m.connected;if(E.S&&!m.connected.every(Boolean))E.S.paused=true;if(E.seat===0){if(!m.connected[1]&&before[1]){E.config.ready[1]=false;if(E.S){E.S.paused=true;E.save();E.notice('Напарник отключился. Бой остановлен.')}}E.config.names=m.names;E.broadcastLobby();E.sendState()}E.uiKey='';}
  if(m.type==='lobby'&&E.seat===1){if(m.data.version!==E.version){E.notice('Разные версии игры. Откройте одну версию сервера.',true);return}E.config=m.data;E.uiKey='';}
  if(m.type==='input'&&E.seat===0){n.input=m.input||{};n.inputAt=performance.now();}
  if(m.type==='action'&&E.seat===0)E.action(m.seat,m.action,m.value);
  if(m.type==='state'&&E.seat===1){if(m.state?.version!==E.version)return;const old=E.S;if(!old||old.room?.id!==m.state.room?.id||old.floor!==m.state.floor||old.seed!==m.state.seed){E.cache.clear();E.cam.snap=true;E.fx=[];}E.S=m.state;E.screen='game';}
 };
 ws.onerror=()=>E.notice('Сервер недоступен. Нужен комплектный Python-сервер и доступ к нему по LAN / VPN.',true);
 ws.onclose=()=>{n.online=false;if(n.intentional)return;if(E.S){E.S.paused=true;if(E.seat===0)E.save()}E.notice('Соединение потеряно. Повторное подключение…',true);E.uiKey='';if(n.token){n.retry=(n.retry||0)+1;n.retryTimer=setTimeout(()=>E.connect('resume',n.code,n.token),Math.min(8000,1000*n.retry))}};
};
