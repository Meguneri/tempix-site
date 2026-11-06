'use strict';
if(E.coarse)document.body.classList.add('coarse');
for(const [id,aim]of [['move',false],['aim',true]]){
 const el=E.$('#'+id),knob=el.querySelector('i');let pid=null;
 const update=ev=>{if(ev.pointerId!==pid)return;const r=el.getBoundingClientRect(),dx=ev.clientX-r.left-r.width/2,dy=ev.clientY-r.top-r.height/2,len=Math.hypot(dx,dy),radius=r.width*.32,k=len>radius?radius/len:1;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`;if(aim){if(len>6){E.touch.ax=dx/len;E.touch.ay=dy/len}E.touch.aim=true;E.touch.fire=true}else{E.touch.x=len<5?0:dx*k/radius;E.touch.y=len<5?0:dy*k/radius}};
 el.addEventListener('pointerdown',ev=>{if(pid!==null)return;ev.preventDefault();pid=ev.pointerId;el.setPointerCapture(pid);E.audio.start();update(ev)});el.addEventListener('pointermove',ev=>{if(ev.pointerId===pid){ev.preventDefault();update(ev)}});
 const end=ev=>{if(ev.pointerId!==pid)return;pid=null;knob.style.transform='translate(0,0)';if(aim){E.touch.aim=false;E.touch.fire=false}else E.touch.x=E.touch.y=0};for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,end);
}
for(const el of document.querySelectorAll('[data-touch]')){const key=el.dataset.touch;el.addEventListener('pointerdown',ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);E.touch[key]=true;el.classList.add('pressed');E.audio.start()});const end=()=>{E.touch[key]=false;el.classList.remove('pressed')};for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,end)}
const typing=()=>['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);
addEventListener('keydown',ev=>{if(typing())return;if(['Space','Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(ev.code))ev.preventDefault();if(!ev.repeat){if(ev.code==='Escape'){if(E.menu)E.localAction('close');else if(E.S)E.localAction(E.S.paused?'resume':'pause');return}if(ev.code==='Tab'&&E.S){E.localAction('map');return}if(ev.code==='KeyI'&&E.S){E.localAction('bag');return}if(ev.code==='F1'){ev.preventDefault();E.localAction('help');return}E.pressed.add(ev.code)}E.keys.add(ev.code)});
addEventListener('keyup',ev=>E.keys.delete(ev.code));addEventListener('blur',()=>E.resetInput());
E.canvas.addEventListener('pointermove',ev=>{if(ev.pointerType==='touch')return;E.mouse.x=ev.clientX;E.mouse.y=ev.clientY});E.canvas.addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch')return;E.mouse.x=ev.clientX;E.mouse.y=ev.clientY;if(ev.button===0)E.mouse.down=true;E.audio.start()});addEventListener('pointerup',ev=>{if(ev.pointerType!=='touch')E.mouse.down=false});E.canvas.addEventListener('contextmenu',ev=>ev.preventDefault());
document.addEventListener('visibilitychange',()=>{E.resetInput();if(document.hidden&&E.S?.status==='play'){E.act('pause',true);if(E.seat===0)E.save()}});
E.input=()=>{
 const s=E.S;if(!s||E.menu||s.paused||s.offer||s.status!=='play')return{};const p=s.players[E.seat],w=E.weapons[p.weapon],touch=E.touch,k=E.keys,v=E.view;
 let e=E.nearest(p,Math.min(850,w.range),true);if(e&&!E.onScreen(e.x,e.y,15))e=null;
 const manual=E.coarse&&touch.aim;let ax=p.x+Math.cos(p.angle)*400,ay=p.y+Math.sin(p.angle)*400;
 if(manual){ax=p.x+touch.ax*400;ay=p.y+touch.ay*400}else if(E.opts.auto&&E.opts.aim&&e){ax=e.x;ay=e.y}else if(!E.coarse){ax=(E.mouse.x-v.x)/v.scale;ay=(E.mouse.y-v.y)/v.scale}
 const key=code=>k.has(code)||E.pressed.has(code);
 return{x:touch.x+Number(k.has('KeyD'))-Number(k.has('KeyA')),y:touch.y+Number(k.has('KeyS'))-Number(k.has('KeyW')),ax,ay,fire:manual?touch.fire:E.opts.auto?!!e:E.mouse.down,dash:touch.dash||key('Space'),skill:touch.skill||key('KeyQ'),use:touch.use||key('KeyE'),res:touch.res||key('KeyR'),reload:key('KeyF')};
};
let last=performance.now(),uiT=0,netT=0,inputT=0,lobbyT=0,saveT=0;
E.frame=now=>{
 const dt=Math.min(.06,Math.max(0,(now-last)/1000));last=now;E.clock+=dt;E.acc+=dt;const s=E.S;
 if(s&&E.screen==='game'){
  const input=E.input();if(E.mode==='online'&&E.seat===1){inputT+=dt;if(inputT>=.04){inputT=0;E.send({type:'input',input})}}
  else{let steps=0;while(E.acc>=1/60&&steps++<4){const inputs=[input];if(s.players.length===2)inputs.push(E.mode==='companion'?E.bot(s.players[1]):performance.now()-E.net.inputAt<300?E.net.input:{});E.step(1/60,inputs);E.acc-=1/60}E.pressed.clear();}
  if(E.mode==='online'){netT+=dt;if(netT>=1/15){netT=0;E.sendState()}}
  saveT+=dt;if(saveT>15&&E.seat===0){saveT=0;E.save()}
 }else E.acc=0;
 if(E.mode==='online'&&E.seat===1)E.acc=0;
 if(E.mode==='online'&&E.screen==='setup'&&E.seat===0){lobbyT+=dt;if(lobbyT>1){lobbyT=0;E.broadcastLobby()}}
 E.render(dt);uiT+=dt;if(uiT>=.1){uiT=0;E.ui()};requestAnimationFrame(E.frame);
};
E.ui();requestAnimationFrame(E.frame);
if(['http:','https:'].includes(location.protocol)){
 let session;try{session=JSON.parse(sessionStorage.getItem('helios3-session')||'null')}catch{}
 if(session?.token)E.connect('resume',session.code,session.token);
}
window.Helios={version:E.version,getState:()=>E.S,getMode:()=>E.mode};
if(new URLSearchParams(location.search).has('qa'))window.HeliosQA={
 start:(mode='solo',seed='QA-ENTROPY',diff=2)=>{E.config.diff=diff;E.newRun(mode,seed);return E.S},state:()=>E.S,
 graph:E.graph,enter:E.enter,step:(seconds,inputs=[{}])=>{for(let i=0;i<seconds*60;i++)E.step(1/60,inputs);return E.S},
 clear:()=>{E.S.enemies=[];E.S.room.wave=E.S.room.waves;E.S.room.spawnTimer=0;E.clearRoom()},
 pick:()=>{if(E.S.offer?.type==='item')for(let i=0;i<E.S.players.length;i++){let o=E.S.offer;if(o)E.action(i,'item',o.options[i][0])}},save:E.save,restore:E.restore,
 give:(id,n=1)=>{for(let j=0;j<n;j++)E.give(E.S.players[0],id)},finish:E.finish
};
