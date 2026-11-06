'use strict';
E.canvas=document.getElementById('scene');E.ctx=E.canvas.getContext('2d',{alpha:false});E.view={w:innerWidth,h:innerHeight,dpr:1,scale:1,x:0,y:0};
E.round=(c,x,y,w,h,r=6)=>{c.beginPath();c.roundRect(x,y,w,h,r)};
E.poly=(c,x,y,r,n,angle=0)=>{c.beginPath();for(let j=0;j<n;j++){let a=angle+j*6.283185/n;j?c.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}c.closePath()};
E.txt=(c,str,x,y,size=12,color='#dbe9eb',align='center')=>{c.font=`600 ${size}px system-ui, sans-serif`;c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(str,x,y)};
E.glow=(c,x,y,r,color,alpha=.2)=>{if(r<=0)return;c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore()};
E.resize=()=>{const v=E.view;v.w=innerWidth;v.h=innerHeight;v.dpr=Math.min(devicePixelRatio||1,E.opts.quality==='high'?1.75:1);E.canvas.width=Math.round(v.w*v.dpr);E.canvas.height=Math.round(v.h*v.dpr);E.canvas.style.width=v.w+'px';E.canvas.style.height=v.h+'px'};addEventListener('resize',()=>{E.resize();E.resetInput?.()});E.resize();
E.camera=dt=>{const s=E.S,v=E.view,p=s.players[E.seat]||s.players[0],focus=p.down?(s.players.find(x=>!x.down)||p):p,r=s.room;v.scale=E.coarse?(v.w>v.h?.72:.63):Math.min(1.07,Math.max(.75,v.w/1420));
 let tx=focus.x,ty=focus.y;if(r.w*v.scale<v.w)tx=r.w/2;else tx=E.clamp(tx,v.w/v.scale/2-60,r.w-v.w/v.scale/2+60);if(r.h*v.scale<v.h)ty=r.h/2;else ty=E.clamp(ty,v.h/v.scale*.46-60,r.h-v.h/v.scale*.46+70);
 if(E.cam.snap){E.cam.x=tx;E.cam.y=ty;E.cam.snap=false}else{const k=1-Math.exp(-dt*10);E.cam.x=E.mix(E.cam.x,tx,k);E.cam.y=E.mix(E.cam.y,ty,k)}v.x=v.w/2-E.cam.x*v.scale;v.y=v.h*(E.coarse?.43:.5)-E.cam.y*v.scale;
};
E.onScreen=(x,y,pad=40)=>{const v=E.view,xx=x*v.scale+v.x,yy=y*v.scale+v.y;return xx>-pad&&xx<v.w+pad&&yy>-pad&&yy<v.h+pad};
E.floorTexture=()=>{
 const s=E.S,r=s.room,key=s.floor+':'+r.id+':'+r.seed;if(E.cache.has(key))return E.cache.get(key);
 const cv=document.createElement('canvas');cv.width=r.w+120;cv.height=r.h+160;const c=cv.getContext('2d');c.translate(60,60);const b=E.biomes[s.floor],rand=E.random(r.seed),w=r.w,h=r.h;
 c.fillStyle='#03090f';E.round(c,-8,-8,w+16,h+40,26);c.fill();
 let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,b.floor);g.addColorStop(.6,'#14232d');g.addColorStop(1,b.floor);c.fillStyle=g;E.round(c,30,30,w-60,h-60,18);c.fill();
 c.save();E.round(c,42,42,w-84,h-84,12);c.clip();
 for(let y=40;y<h-40;y+=80)for(let x=40;x<w-40;x+=80){const hash=rand();c.fillStyle=hash>.55?'#aec5d008':'#00000010';c.fillRect(x+2,y+2,76,76);c.strokeStyle='#b4dce014';c.lineWidth=1;c.strokeRect(x+1.5,y+1.5,77,77);c.fillStyle='#00000040';c.fillRect(x+3,y+78,75,2);c.fillStyle='#b0c5d340';for(const a of [8,70])for(const z of [8,70])c.fillRect(x+a,y+z,1.7,1.7);
  if(hash>.82){c.strokeStyle='#9ca8b41b';c.beginPath();c.moveTo(x+18,y+27);c.lineTo(x+61,y+18);c.moveTo(x+30,y+52);c.lineTo(x+54,y+44);c.stroke()}
  if(hash<.09){c.fillStyle='#07111b';c.fillRect(x+17,y+23,46,34);c.fillStyle='#344c59';for(let n=0;n<7;n++)c.fillRect(x+20,y+27+n*4,40,1)}
 }
 // Scene-specific surface materials: water, ice, hot service channels, void glass.
 if(s.floor===1){for(let j=0;j<22;j++){let x=90+rand()*(w-180),y=90+rand()*(h-180);c.fillStyle='#8fbb7321';c.beginPath();c.ellipse(x,y,35+rand()*80,12+rand()*32,rand()*6.28,0,6.28);c.fill();for(let k=0;k<4;k++){c.fillStyle=k%2?'#91b96f55':'#4d826d77';c.beginPath();c.ellipse(x+rand()*60-30,y+rand()*30-15,8,3,rand()*6.28,0,6.28);c.fill()}}}
 if(s.floor===2){for(let j=0;j<15;j++){const x=rand()*w,y=rand()*h;c.strokeStyle='#c7f1ff24';c.lineWidth=1.4;c.beginPath();c.moveTo(x,y);c.lineTo(x+35,y+20);c.lineTo(x+20,y+50);c.lineTo(x+50,y+80);c.stroke();E.glow(c,x,y,90,'#b6e4ff',.05)}}
 const tracks=s.floor===3?'#ffb06a':b.color;
 for(const x of [92,w-92]){c.fillStyle='#050d15aa';c.fillRect(x-14,65,28,h-130);c.strokeStyle='#5b707744';c.strokeRect(x-14,65,28,h-130);for(let y=80;y<h-80;y+=45){c.fillStyle=tracks+(s.floor===3?'a0':'35');c.fillRect(x-9,y,18,25);c.fillStyle='#070e18';c.fillRect(x-15,y+28,30,4)}}
 for(const y of [98,h-98]){c.strokeStyle=b.color+'2a';c.lineWidth=2;c.beginPath();c.moveTo(150,y);c.lineTo(w-150,y);c.stroke()}
 c.strokeStyle=b.color+'24';c.lineWidth=3;E.poly(c,w/2,h/2,115,6,Math.PI/6);c.stroke();c.lineWidth=1;E.poly(c,w/2,h/2,130,6,Math.PI/6);c.stroke();E.txt(c,E.kind[s.graph.rooms[r.id].kind][1],w/2,h/2,64,b.color+'35');
 E.txt(c,`${String(s.floor+1).padStart(2,'0')} / ${String(r.id+1).padStart(2,'0')}`,w/2,175,33,b.color+'50');E.txt(c,E.kind[s.graph.rooms[r.id].kind][0].toUpperCase(),w/2,h-166,18,b.color+'55');
 // Stencilled service markings, border stripes, cable routes.
 for(const [x,y,a]of [[150,150,0],[w-150,h-150,Math.PI]]){c.save();c.translate(x,y);c.rotate(a);c.fillStyle='#d8c38e50';for(let j=0;j<5;j++){c.beginPath();c.moveTo(j*18,0);c.lineTo(j*18+8,0);c.lineTo(j*18+22,20);c.lineTo(j*18+14,20);c.fill()}c.restore()}
 c.strokeStyle='#02091088';c.lineWidth=7;c.beginPath();c.moveTo(180,h-70);c.lineTo(w*.4,h-70);c.lineTo(w*.4,h-120);c.lineTo(w*.7,h-120);c.stroke();c.strokeStyle='#71818b66';c.lineWidth=1;c.stroke();c.restore();
 // Raised hull perimeter, with luminous inset strips.
 for(const wall of [{x:12,y:10,w:w-24,h:42},{x:12,y:h-40,w:w-24,h:42},{x:12,y:40,w:38,h:h-80},{x:w-50,y:40,w:38,h:h-80}]){c.fillStyle='#030a12';c.fillRect(wall.x+5,wall.y+20,wall.w,wall.h);g=c.createLinearGradient(0,wall.y,0,wall.y+wall.h);g.addColorStop(0,b.metal);g.addColorStop(.15,'#1b2b36');g.addColorStop(1,'#0b1521');c.fillStyle=g;c.fillRect(wall.x,wall.y,wall.w,wall.h);c.fillStyle='#c1dfe530';c.fillRect(wall.x,wall.y,wall.w,2)}
 for(let x=140;x<w-100;x+=180){for(const y of [22,h-25]){c.fillStyle='#020a10';c.fillRect(x-26,y-4,52,10);c.fillStyle=b.color;c.fillRect(x-21,y-1,42,3);E.glow(c,x,y+10,95,b.color,.12)}}
 for(let y=140;y<h-100;y+=170){c.fillStyle='#536673';c.fillRect(18,y,19,37);c.fillRect(w-37,y,19,37);c.fillStyle=b.color+'90';c.fillRect(23,y+5,8,22);c.fillRect(w-31,y+5,8,22)}
 E.cache.clear();E.cache.set(key,cv);return cv;
};
E.coverDraw=(c,o,b)=>{
 c.save();c.fillStyle='#00040c80';E.round(c,o.x+12,o.y+15,o.w,o.h,8);c.fill();c.fillStyle='#07101c';E.round(c,o.x,o.y-12,o.w,o.h+14,8);c.fill();
 let g=c.createLinearGradient(o.x,o.y-14,o.x+o.w,o.y+o.h);g.addColorStop(0,b.metal);g.addColorStop(.45,'#33434f');g.addColorStop(1,'#162332');c.fillStyle=g;E.round(c,o.x+2,o.y-16,o.w-4,o.h-4,6);c.fill();c.strokeStyle='#c7dfec44';c.lineWidth=1;c.stroke();c.fillStyle='#6c839440';c.fillRect(o.x+8,o.y-11,o.w-16,2);
 if(o.kind==='glass'){c.fillStyle=b.color+'35';E.round(c,o.x+12,o.y-6,o.w-24,o.h-24,12);c.fill();c.strokeStyle=b.color+'a0';c.stroke();c.fillStyle='#edffff30';c.fillRect(o.x+16,o.y+1,6,o.h-38);E.glow(c,o.x+o.w/2,o.y+o.h/2,90,b.color,.1)}
 else if(o.kind==='server'){c.fillStyle='#06121e';c.fillRect(o.x+10,o.y-4,o.w-20,o.h-30);for(let i=0;i<Math.floor((o.h-30)/14);i++){c.fillStyle='#506272';c.fillRect(o.x+15,o.y+1+i*14,o.w-40,5);c.fillStyle=i%2?b.color:'#eec48a';c.fillRect(o.x+o.w-22,o.y+i*14,4,4)}}
 else if(o.kind==='pillar'){c.strokeStyle='#8da4b455';c.lineWidth=3;E.poly(c,o.x+o.w/2,o.y+o.h/2-14,Math.min(o.w,o.h)*.32,6,0);c.stroke();E.glow(c,o.x+o.w/2,o.y+o.h/2-14,40,b.color,.18)}
 else{c.fillStyle='#0d1b27';c.fillRect(o.x+12,o.y+3,o.w-24,o.h-37);c.strokeStyle='#78919c55';c.lineWidth=3;c.beginPath();c.moveTo(o.x+18,o.y+8);c.lineTo(o.x+o.w-18,o.y+o.h-39);c.moveTo(o.x+o.w-18,o.y+8);c.lineTo(o.x+18,o.y+o.h-39);c.stroke();c.fillStyle='#e3ba6d88';c.fillRect(o.x+10,o.y+o.h-24,18,4);c.fillRect(o.x+o.w-28,o.y+o.h-24,18,4)}
 c.fillStyle='#000a12';c.fillRect(o.x+5,o.y+o.h-16,o.w-10,13);c.fillStyle=b.color+'75';c.fillRect(o.x+13,o.y+o.h-12,15,3);c.restore();
};
E.doorDraw=(c,d)=>{
 const s=E.S,r=s.room,node=s.graph.rooms[d.id],locked=r.locked,col=locked?'#ff8197':node.kind==='boss'?'#ffb66f':node.main?'#74efdd':'#c7acff';
 c.save();c.translate(d.x,d.y);c.rotate(d.dir*Math.PI/2);c.fillStyle='#020a12';c.fillRect(-90,-26,180,65);c.fillStyle='#314653';c.fillRect(-100,-26,15,69);c.fillRect(85,-26,15,69);c.fillStyle=col;c.fillRect(-94,-18,4,48);c.fillRect(90,-18,4,48);E.glow(c,0,30,120,col,.16);
 if(locked){let g=c.createLinearGradient(0,-20,0,35);g.addColorStop(0,'#485663');g.addColorStop(1,'#14212e');c.fillStyle=g;c.fillRect(-82,-20,164,52);c.strokeStyle='#d3b18155';c.lineWidth=3;for(let k=-70;k<70;k+=22){c.beginPath();c.moveTo(k,28);c.lineTo(k+16,-8);c.stroke()}c.fillStyle='#ff6c84';c.fillRect(-18,1,36,5)}else{c.fillStyle=col+'18';c.fillRect(-70,-23,140,60);c.strokeStyle=col+'77';c.lineWidth=2;c.beginPath();c.moveTo(-18,37);c.lineTo(0,21);c.lineTo(18,37);c.stroke()}
 c.restore();let tx=d.x,ty=d.y+(d.dir===0?75:d.dir===2?-75:0);if(d.dir===1)tx-=90;if(d.dir===3)tx+=90;E.txt(c,locked?'ЗАПЕРТО':E.kind[node.kind][1]+' '+E.kind[node.kind][0],tx,ty,12,col);
};
E.objectDraw=(c,o)=>{
 if(o.used||o.type==='arrival')return;const t=E.clock,color=o.type==='portal'?'#ffc68b':o.type==='repair'?'#b5f69c':o.type==='shop'?'#ffda94':o.type==='curse'?'#ff93c9':'#bcb0ff';c.save();c.translate(o.x,o.y);c.fillStyle='#01081088';c.beginPath();c.ellipse(8,18,40,21,0,0,6.28);c.fill();E.glow(c,0,-12,o.type==='portal'?150:80,color,.17);
 if(o.type==='portal'){for(let j=0;j<3;j++){c.save();c.scale(1,.65);c.rotate(t*(j%2?-.5:.35));c.strokeStyle=color+(j?'66':'cc');c.lineWidth=j?2:5;E.poly(c,0,0,65+j*18,j===1?6:12,t*.1);c.stroke();c.restore()}c.fillStyle=color+'19';c.beginPath();c.ellipse(0,0,56,35,0,0,6.28);c.fill();E.txt(c,E.S.floor===4?'ЭВАКУАЦИЯ':'СЛЕДУЮЩИЙ СЕКТОР',0,95,13,color);E.txt(c,'↑',0,0,32,color)}
 else{c.fillStyle='#253847';E.poly(c,0,6,33,6,Math.PI/6);c.fill();c.strokeStyle=color+'99';c.lineWidth=2;c.stroke();c.fillStyle='#122333';E.poly(c,0,-2,29,6,Math.PI/6);c.fill();let bob=Math.sin(t*2)*4;
  if(o.type==='artifact'||o.type==='curse'){c.save();c.translate(0,-25+bob);c.rotate(t*.35);c.strokeStyle=color;c.lineWidth=2;E.poly(c,0,0,17,4,0);c.stroke();c.fillStyle=color+'45';E.poly(c,0,0,12,4,Math.PI/4);c.fill();c.restore();c.strokeStyle=color+'30';c.beginPath();c.moveTo(-20,-13);c.lineTo(-9,-44);c.moveTo(20,-13);c.lineTo(9,-44);c.stroke()}
  else{E.txt(c,({shop:'¤',repair:'✚',event:'?',challenge:'⚔',chest:'▣'})[o.type]||'◇',0,-21+bob,30,color)}
  E.txt(c,({artifact:'МОДУЛЬ',curse:'СДЕЛКА',shop:'СНАБЖЕНИЕ',repair:'ЛЕЧЕНИЕ',event:'АНОМАЛИЯ',challenge:'3 ВОЛНЫ',chest:'КОНТЕЙНЕР'})[o.type],0,59,11,color);
 }c.restore();
};
E.actorShadow=(c,x,y,r)=>{c.fillStyle='#00050c80';c.beginPath();c.ellipse(x+7,y+10,r*1.2,r*.62,0,0,6.28);c.fill()};
E.playerDraw=(c,p)=>{
 const col=E.colors[p.id],t=E.S.t;E.actorShadow(c,p.x,p.y,24);c.save();c.translate(p.x,p.y);
 if(p.down){E.glow(c,0,0,65,'#ff7a9e',.18);E.txt(c,'✚',0,-10,30,'#ff8ca4');E.txt(c,p.downTime>0?Math.ceil(p.downTime)+'с':'ОЖИДАНИЕ',0,24,12,'#ffd0d9');if(p.revive>0){c.strokeStyle=col;c.lineWidth=4;c.beginPath();c.arc(0,0,35,-Math.PI/2,-Math.PI/2+p.revive/2.5*6.28);c.stroke()}c.restore();return}
 if(p.inv>.5||p.dashT>0){c.strokeStyle=col+'aa';c.lineWidth=2;c.beginPath();c.arc(0,-7,30+t%1*4,0,6.28);c.stroke()}
 if(p.shield>0){c.strokeStyle=col+'30';c.lineWidth=1;c.beginPath();c.ellipse(0,-8,28,31,0,0,6.28);c.stroke()}
 c.rotate(p.angle);const stride=Math.sin(p.steps*.055)*5;
 c.fillStyle='#0d1c29';E.round(c,-17,-16+stride,19,11,4);c.fill();E.round(c,-17,5-stride,19,11,4);c.fill();c.fillStyle='#7093a0';c.fillRect(-13,-14+stride,10,3);c.fillRect(-13,7-stride,10,3);
 let g=c.createLinearGradient(-15,-17,15,17);g.addColorStop(0,p.cls==='medic'?'#dde8db':'#a4c5ce');g.addColorStop(.4,'#45616e');g.addColorStop(1,'#1b2e40');c.fillStyle=g;E.round(c,-14,-18,31,36,9);c.fill();c.strokeStyle='#d9f2f066';c.lineWidth=1;c.stroke();
 c.fillStyle='#0e2331';E.round(c,-18,-10,10,20,3);c.fill();c.fillStyle=col;c.fillRect(-16,-5,3,10);c.fillStyle='#17303f';E.round(c,8,-23,15,13,4);c.fill();E.round(c,8,10,15,13,4);c.fill();c.fillStyle=col+'bb';c.fillRect(9,-20,10,3);c.fillRect(9,18,10,3);
 c.fillStyle='#91aebb';E.round(c,14,-7,31,12,3);c.fill();c.fillStyle='#142534';c.fillRect(21,-6,22,7);c.fillStyle=col;c.fillRect(28,-7,10,2);c.fillStyle='#d5e5de';c.fillRect(43,-5,5,8);
 c.fillStyle='#10222f';c.beginPath();c.ellipse(3,-2,13,12,0,0,6.28);c.fill();c.fillStyle=col;c.beginPath();c.ellipse(8,-2,4,8,0,0,6.28);c.fill();c.fillStyle='#e3ffff';c.fillRect(8,-5,2,6);c.restore();
 for(let j=0;j<(p.mods.drone||0);j++){const a=t*1.2+j*6.28/p.mods.drone,x=p.x+Math.cos(a)*48,y=p.y+Math.sin(a)*48;c.save();c.translate(x,y-12);c.rotate(a);c.fillStyle='#718d9b';E.poly(c,0,0,10,3,0);c.fill();c.fillStyle='#a0edff';c.fillRect(-4,-2,5,4);c.restore();E.glow(c,x,y,24,'#9fddff',.2)}
 if(p.mods.orbit)for(let j=0;j<p.mods.orbit+1;j++){const a=t*2+j*6.28/(p.mods.orbit+1),x=p.x+Math.cos(a)*64,y=p.y+Math.sin(a)*64;E.glow(c,x,y,24,col,.35);c.fillStyle=col;E.poly(c,x,y,7,4,a);c.fill()}
 if(E.S.players.length>1)E.txt(c,p.name,p.x,p.y-47,11,col);
};
E.enemyDraw=(c,e)=>{
 const r=e.r,color=e.hurt>0?'#ffffff':e.color;E.actorShadow(c,e.x,e.y,r);c.save();c.translate(e.x,e.y-9);
 if(e.stun>.25){c.globalAlpha=.55+.2*Math.sin(E.clock*18);c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.arc(0,0,r+9,0,6.28);c.stroke();}
 if(e.wind>0){c.save();c.rotate(e.chargeA);c.fillStyle=color+'25';c.fillRect(0,-21,560,42);c.strokeStyle=color;c.setLineDash([12,10]);c.beginPath();c.moveTo(0,0);c.lineTo(560,0);c.stroke();c.restore()}
 if(e.type==='boss'){
  E.glow(c,0,0,r*2.8,color,.13);c.save();c.rotate(E.S.t*.3);for(let j=0;j<6;j++){c.save();c.rotate(j*Math.PI/3);c.fillStyle='#152633';E.round(c,r-5,-13,29,26,5);c.fill();c.strokeStyle=color+'99';c.lineWidth=2;c.stroke();c.fillStyle=color;c.fillRect(r+13,-7,3,14);c.restore()}c.restore();
  let g=c.createRadialGradient(-20,-20,2,0,0,r);g.addColorStop(0,'#80909e');g.addColorStop(.55,'#344555');g.addColorStop(1,'#142230');c.fillStyle=g;E.poly(c,0,0,r,8,e.angle*.2);c.fill();c.strokeStyle=color+'aa';c.lineWidth=3;c.stroke();c.fillStyle='#07131e';E.poly(c,0,0,r*.7,6,-E.S.t*.3);c.fill();c.strokeStyle=color+'88';c.stroke();E.glow(c,0,0,r*.7,color,.5);c.fillStyle=color;E.poly(c,0,0,r*.29,4,E.S.t*.8);c.fill();c.fillStyle='#f5f3ff';E.poly(c,0,0,r*.12,4,-E.S.t);c.fill();
  if(e.shielded){c.strokeStyle='#d1bbff';c.lineWidth=3;c.beginPath();c.arc(0,0,r+14,E.S.t,E.S.t+5.8);c.stroke()}
 }else{
  c.save();c.rotate(e.angle);const armored=['brute','turret','healer'].includes(e.type);
  if(['skitter','charger','splitter'].includes(e.type)){c.strokeStyle='#7b8794';c.lineWidth=4;for(let j of [-1,1])for(let k of [-1,1]){const y=j*r*.7,x=k*r*.6;const wave=Math.sin(E.S.t*9+k)*4;c.beginPath();c.moveTo(x,y*.6);c.lineTo(x-7,y);c.lineTo(x-10+wave,y+j*7);c.stroke()}}
  let g=c.createLinearGradient(-r,-r,r,r);g.addColorStop(0,armored?'#7f8995':'#72657d');g.addColorStop(1,'#19232f');c.fillStyle=g;
  if(e.type==='bomber'){c.beginPath();c.arc(0,0,r,0,6.28);c.fill();c.strokeStyle=color;c.lineWidth=3;c.stroke();c.fillStyle='#161621';E.poly(c,0,0,r*.7,3,E.S.t);c.fill()}
  else{E.poly(c,0,0,r,e.type==='prism'?4:e.type==='splitter'?5:6,0);c.fill();c.strokeStyle=color+'88';c.lineWidth=2;c.stroke();c.fillStyle='#0b1722';E.poly(c,1,0,r*.6,e.type==='prism'?4:6,0);c.fill()}
  if(['shooter','sniper','turret'].includes(e.type)){c.fillStyle='#728292';E.round(c,r*.4,-6,r+8,12,3);c.fill();c.fillStyle=color;c.fillRect(r+5,-3,6,6)}
  c.fillStyle=color;E.poly(c,r*.25,0,e.type==='healer'?8:6,e.type==='healer'?4:3,e.type==='healer'?Math.PI/4:0);c.fill();c.fillStyle='#fff0ee';c.fillRect(r*.25,-1,3,2);c.restore();
 }
 if(e.elite&&e.type!=='boss'){c.strokeStyle='#ffda95';c.lineWidth=1.5;E.poly(c,0,0,r+8,6,E.S.t*.3);c.stroke()}
 if(e.hp<e.max&&e.type!=='boss'){c.fillStyle='#08121edd';c.fillRect(-r,-r-17,r*2,4);c.fillStyle=e.color;c.fillRect(-r,-r-17,r*2*E.clamp(e.hp/e.max,0,1),4)}
 if(e.slow>0){c.strokeStyle='#c1ebff88';c.lineWidth=1;E.poly(c,0,0,r+4,6,0);c.stroke()}
 if(e.burn>0)E.glow(c,0,0,r*1.5,'#ffbd70',.25);c.restore();
};
E.processFX=()=>{
 const s=E.S;if(!s)return;if(s.eventId<E.lastFX)E.lastFX=0;
 for(const a of s.events){if(a.id<=E.lastFX)continue;E.lastFX=a.id;let life=['pickup','hit'].includes(a.type)?.7:a.type==='arc'?.16:.5;E.fx.push({...a,t:0,life});if(['shot','pickup','death'].includes(a.type))E.audio.play(a.type);
  if(['hit','death','spark','blast','hurt'].includes(a.type)){const rand=E.random(a.id*1777),n=E.opts.quality==='high'?(a.type==='death'?15:5):3;for(let j=0;j<n;j++){const ang=rand()*6.28,v=30+rand()*200;E.fx.push({type:'particle',x:a.x,y:a.y,vx:Math.cos(ang)*v,vy:Math.sin(ang)*v,color:a.color,t:0,life:.25+rand()*.5,r:1+rand()*3})}}
 }const max=E.opts.quality==='high'?600:180;if(E.fx.length>max)E.fx.splice(0,E.fx.length-max);
};
E.fxDraw=(c,dt)=>{for(const f of E.fx){f.t+=dt;let t=f.t/f.life;if(t>=1)continue;c.save();c.globalAlpha=1-t;c.fillStyle=f.color;c.strokeStyle=f.color;
 if(f.type==='particle'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.96;f.vy*=.96;c.fillRect(f.x,f.y,f.r,f.r)}
 else if(f.type==='hit'){E.txt(c,String(f.value),f.x,f.y-25-t*30,13,f.color)}
 else if(f.type==='shot'){E.glow(c,f.x,f.y,40,f.color,.75);E.poly(c,f.x,f.y,14*(1-t),4,.4);c.fill()}
 else if(f.type==='arc'){c.lineWidth=3;c.beginPath();c.moveTo(f.x,f.y);c.lineTo((f.x+f.value.x)/2+12,(f.y+f.value.y)/2-13);c.lineTo(f.value.x,f.value.y);c.stroke();}
 else if(['pulse','death','blast','boss','clear','victory','dash','hurt','spawn'].includes(f.type)){const radius=(typeof f.value==='number'?f.value:60)*(f.type==='spawn'?1-t:.2+t*.8);if(radius>0){c.lineWidth=f.type==='blast'?5:2;c.beginPath();c.arc(f.x,f.y,Math.min(300,radius),0,6.28);c.stroke();E.glow(c,f.x,f.y,Math.min(300,radius),f.color,.22)}}
 else if(f.type==='pickup'){c.lineWidth=2;E.poly(c,f.x,f.y,16+t*26,4,t);c.stroke()}
 c.restore()}E.fx=E.fx.filter(f=>f.t<f.life)};
E.hazardDraw=(c,h)=>{
 c.save();c.translate(h.x,h.y);const ready=h.wait<=0,a=ready?.85:.15+.12*Math.sin(E.clock*12),progress=E.clamp(1-h.wait/h.total,0,1);c.fillStyle=h.color;c.strokeStyle=h.color;c.globalAlpha=a;
 if(h.kind==='beam'){c.rotate(h.angle);c.fillRect(0,-(ready?22:16),h.r,ready?44:32);c.globalAlpha=ready?1:.8;c.lineWidth=ready?7:2;c.setLineDash(ready?[]:[10,10]);c.beginPath();c.moveTo(0,0);c.lineTo(h.r,0);c.stroke();if(ready){c.strokeStyle='#fff5df';c.lineWidth=4;c.stroke()}}
 else{c.beginPath();c.arc(0,0,h.r,0,6.28);c.fill();c.globalAlpha=.8;c.lineWidth=2;c.stroke();c.lineWidth=5;c.beginPath();c.arc(0,0,h.r,-Math.PI/2,-Math.PI/2+progress*6.28);c.stroke();c.globalAlpha=.5;c.lineWidth=1;c.beginPath();c.moveTo(-16,0);c.lineTo(16,0);c.moveTo(0,-16);c.lineTo(0,16);c.stroke();}
 c.restore();
};
E.background=(c,w,h,t)=>{
 let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#07111e');g.addColorStop(.6,'#11192b');g.addColorStop(1,'#090e18');c.fillStyle=g;c.fillRect(0,0,w,h);
 E.glow(c,w*.78,h*.35,Math.max(250,w*.5),'#364c72',.26);const rr=E.random(1773);for(let j=0;j<120;j++){let x=rr()*w,y=rr()*h;c.fillStyle=j%5?'#bbd6de66':'#e6d2ab99';c.globalAlpha=.25+.3*Math.sin(j+t*.3);c.fillRect(x,y,j%4?1:2,1)}c.globalAlpha=1;
 if(E.screen!=='game'){
  c.save();c.translate(w*.76,h*.5);c.rotate(-.25+t*.015);const r=Math.min(w,h)*.34;c.strokeStyle='#60869324';c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.ellipse(0,0,r+i*22,r*.6+i*15,0,0,6.28);c.stroke()}c.fillStyle='#09131e';c.beginPath();c.arc(0,0,r*.7,0,6.28);c.fill();g=c.createRadialGradient(-r*.3,-r*.3,5,0,0,r*.7);g.addColorStop(0,'#4c7488');g.addColorStop(.65,'#142d45');g.addColorStop(1,'#080f18');c.fillStyle=g;c.fill();c.strokeStyle='#6de5dd33';c.lineWidth=2;c.stroke();for(let j=0;j<12;j++){c.save();c.rotate(j*Math.PI/6);c.fillStyle='#1e3446';E.round(c,r*.84,-13,50,26,4);c.fill();c.strokeStyle='#71899855';c.stroke();c.fillStyle=j%3?'#6ce5dca0':'#ffd394cc';c.fillRect(r*.84+3,-10,3,20);c.restore()}c.restore();
 }
};
E.render=dt=>{
 const c=E.ctx,v=E.view,s=E.S;c.setTransform(v.dpr,0,0,v.dpr,0,0);E.background(c,v.w,v.h,E.clock);if(E.screen!=='game'||!s)return;
 E.camera(dt);E.processFX();c.save();c.translate(v.x,v.y);c.scale(v.scale,v.scale);const r=s.room,b=E.biomes[s.floor];c.drawImage(E.floorTexture(),-60,-60);
 for(const d of r.doors)E.doorDraw(c,d);
 for(const a of s.effects){if(a.type==='heal'){E.glow(c,a.x,a.y,a.r,'#abf5a9',.2);c.strokeStyle='#bdf6c277';c.lineWidth=2;c.beginPath();c.arc(a.x,a.y,a.r,0,6.28);c.stroke()}else{E.actorShadow(c,a.x,a.y,20);c.fillStyle='#506f86';E.poly(c,a.x,a.y-8,19,6,E.clock);c.fill();E.glow(c,a.x,a.y,40,'#a7dfff',.15)}}
 for(const h of s.hazards)E.hazardDraw(c,h);
 for(const d of s.drops){const color=d.type==='coin'?'#ffcf83':'#b2f39e';E.glow(c,d.x,d.y,26,color,.15);c.fillStyle=color;E.poly(c,d.x,d.y-4+Math.sin(E.clock*3+d.id)*3,d.type==='coin'?6:9,d.type==='coin'?6:4,E.clock*.5);c.fill()}
 const entities=[...r.cover.map(o=>({y:o.y+o.h,draw:()=>E.coverDraw(c,o,b)})),...r.objects.map(o=>({y:o.y+15,draw:()=>E.objectDraw(c,o)})),...s.players.map(p=>({y:p.y,draw:()=>E.playerDraw(c,p)})),...s.enemies.filter(e=>e.hp>0).map(e=>({y:e.y,draw:()=>E.enemyDraw(c,e)}))].sort((a,b)=>a.y-b.y);for(const entity of entities)entity.draw();
 for(const q of s.bullets){const speed=Math.hypot(q.vx,q.vy),a=Math.atan2(q.vy,q.vx);c.save();c.translate(q.x,q.y);c.rotate(a);if(E.opts.quality==='high')E.glow(c,0,0,q.enemy?25:19,q.color,.28);c.strokeStyle=q.color+'77';c.lineWidth=q.r*1.7;c.beginPath();c.moveTo(-Math.min(37,speed*.025),0);c.lineTo(0,0);c.stroke();c.fillStyle=q.color;c.beginPath();c.ellipse(0,0,q.r*1.4,q.r,0,0,6.28);c.fill();c.fillStyle=q.enemy?'#ffe9f0':'#f4fffa';c.beginPath();c.arc(0,0,q.r*.42,0,6.28);c.fill();c.restore()}
 E.fxDraw(c,dt);
 if(E.opts.quality==='high'){
  c.save();c.globalCompositeOperation='screen';for(const p of s.players)E.glow(c,p.x,p.y,220,E.colors[p.id],.055);
  const rr=E.random(r.seed+88);for(let j=0;j<25;j++){const x=70+rr()*(r.w-140),yy=70+rr()*(r.h-140),y=(yy+E.clock*(s.floor===3?-14:5)+r.h)%r.h;if(!E.onScreen(x,y))continue;c.fillStyle=b.color+(s.floor===2?'44':'55');c.beginPath();c.arc(x+Math.sin(E.clock*.3+j)*12,y,s.floor===2?1.4:1.1,0,6.28);c.fill()}
  // Soft shafts are decorative and never conceal projectiles.
  c.globalAlpha=.03;c.fillStyle=b.color;for(let j=0;j<3;j++){c.beginPath();c.moveTo(180+j*360,45);c.lineTo(230+j*360,45);c.lineTo(410+j*360,r.h*.7);c.lineTo(260+j*360,r.h*.7);c.fill()}c.restore();
 }
 const p=s.players[E.seat]||s.players[0],obj=!p.down?E.nearObject(p):null;if(obj&&!s.offer){const label=obj.type==='door'?E.kind[s.graph.rooms[obj.id].kind][0]:obj.type==='portal'?'Войти в переход':obj.type==='artifact'?'Выбрать модуль':obj.type==='shop'?'Открыть снабжение':'Взаимодействовать';c.fillStyle='#06121be8';E.round(c,p.x-105,p.y+42,210,31,7);c.fill();E.txt(c,(E.coarse?'◎':'E')+'  '+label,p.x,p.y+58,12,'#e5f8eb')}
 c.restore();let vg=c.createRadialGradient(v.w*.5,v.h*.5,Math.min(v.w,v.h)*.25,v.w*.5,v.h*.5,Math.max(v.w,v.h)*.68);vg.addColorStop(0,'transparent');vg.addColorStop(1,'#020710a0');c.fillStyle=vg;c.fillRect(0,0,v.w,v.h);
 if(s.surge>0){c.strokeStyle='#f7d69e66';c.lineWidth=6;c.strokeRect(3,3,v.w-6,v.h-6)}
};
E.mapDraw=(cv,large=false)=>{
 const s=E.S;if(!s)return;const rect=cv.getBoundingClientRect(),w=rect.width||150,h=rect.height||120,dpr=Math.min(devicePixelRatio||1,2);if(cv.width!==Math.round(w*dpr)||cv.height!==Math.round(h*dpr)){cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr)}const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);const nodes=s.graph.rooms.filter(n=>n.seen||large&&n.visited),xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),minX=Math.min(...xs)-.7,maxX=Math.max(...xs)+.7,minY=Math.min(...ys)-.7,maxY=Math.max(...ys)+.7,scale=Math.min((w-20)/(maxX-minX),(h-20)/(maxY-minY),large?90:34),ox=(w-(maxX+minX)*scale)/2,oy=(h-(maxY+minY)*scale)/2;
 cv._map={ox,oy,scale,nodes};c.lineWidth=large?5:3;c.strokeStyle='#4d718577';for(const n of nodes)for(const k of n.links){const q=s.graph.rooms[k];if(q.seen){c.beginPath();c.moveTo(ox+n.x*scale,oy+n.y*scale);c.lineTo(ox+q.x*scale,oy+q.y*scale);c.stroke()}}
 for(const n of nodes){let x=ox+n.x*scale,y=oy+n.y*scale,ww=scale*.68,hh=scale*.49;const current=n.id===s.room.id,color=current?'#87f9df':n.kind==='boss'?'#ffc18c':n.main?'#96b3bf':'#ceb2ff';c.fillStyle=current?'#285b61':n.cleared?'#263f4d':'#101e2c';E.round(c,x-ww/2,y-hh/2,ww,hh,3);c.fill();c.strokeStyle=color+(n.visited?'dd':'55');c.lineWidth=current?2:1;c.stroke();E.txt(c,E.kind[n.kind][1],x,y,large?19:10,color);if(large)E.txt(c,E.kind[n.kind][0],x,y+hh/2+13,10,color);}
};
