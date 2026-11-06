'use strict';
E.dirs=[[0,-1],[1,0],[0,1],[-1,0]];
E.graph=(seed,floor,solo)=>{
 const rand=E.random(E.hash(seed+':graph:'+floor)),rooms=[],occupied=new Set(),main=[];
 const add=(x,y,kind,depth,parent=null)=>{const r={id:rooms.length,x,y,kind,depth,links:[],seen:false,visited:false,cleared:false,main:false,data:null};rooms.push(r);occupied.add(x+','+y);if(parent!==null){r.links.push(parent);rooms[parent].links.push(r.id)}return r};
 let p=add(0,0,'start',0);p.main=true;main.push(p.id);const length=6+floor;
 // Self-avoiding spine. If boxed in, extend an earlier frontier, keeping a single boss path.
 for(let i=1;i<=length;i++){
  let free=E.dirs.map(([dx,dy])=>[p.x+dx,p.y+dy]).filter(([x,y])=>!occupied.has(x+','+y));
  if(!free.length){break}
  free.sort((a,b)=>(Math.abs(b[0])+Math.abs(b[1]))-(Math.abs(a[0])+Math.abs(a[1])));
  const pos=rand()<.7?free[0]:free[Math.floor(rand()*free.length)];
  p=add(pos[0],pos[1],i===length?'boss':i%3===0?'elite':'combat',i,p.id);p.main=true;main.push(p.id);
 }
 rooms[main.at(-1)].kind='boss';
 const kinds=['treasure','shop','repair','event','challenge',...(solo?['curse','treasure','event']:['treasure'])];
 for(let k=0;k<kinds.length;k++){
  let placed=false;
  for(let tries=0;tries<80&&!placed;tries++){
   const parent=rooms[main[1+Math.floor(rand()*Math.max(1,main.length-2))]];
   const ds=[...E.dirs].sort(()=>rand()-.5);
   for(const [dx,dy]of ds){const x=parent.x+dx,y=parent.y+dy;if(!occupied.has(x+','+y)){add(x,y,kinds[k],parent.depth+1,parent.id);placed=true;break}}
  }
 }
 const g={rooms,main,start:0,boss:main.at(-1)};rooms[0].seen=true;rooms[0].visited=false;for(const id of rooms[0].links)rooms[id].seen=true;return g;
};
E.newFloor=()=>{
 const s=E.S;s.room=null;s.graph=E.graph(s.seed,s.floor,s.mode==='solo');s.roomsTotal+=s.graph.rooms.length;
 const mods=s.mode==='solo'?['stable','volatile','surge','bounty','frenzy','fragile']:['stable','stable','bounty'];
 s.mutation=mods[Math.floor(E.random(E.hash(s.seed+':mutation:'+s.floor))()*mods.length)];
 E.enter(0,null);E.notice(E.biomes[s.floor].name+' · '+E.mutations[s.mutation].name);E.save();
};
E.mutations={stable:{name:'Стабильный контур',desc:'Без глобальной аномалии.'},volatile:{name:'Неустойчивая материя',desc:'Больше взрывных противников; +20% кредитов.'},surge:{name:'Ионный прибой',desc:'В бою возникают предупреждённые разряды.'},bounty:{name:'Золотая лихорадка',desc:'+40% кредитов, +15% здоровья врагам.'},frenzy:{name:'Ускоренный распад',desc:'Враги на 15% быстрее, ваши выстрелы на 15% чаще.'},fragile:{name:'Стеклянный мир',desc:'Вы и враги наносите на 25% больше урона.'}};
E.rectHit=(x,y,r,b)=>Math.hypot(x-E.clamp(x,b.x,b.x+b.w),y-E.clamp(y,b.y,b.y+b.h))<r;
E.free=(x,y,r=20,room=E.S.room)=>x>48+r&&x<room.w-48-r&&y>60+r&&y<room.h-48-r&&!room.cover.some(o=>E.rectHit(x,y,r,o));
E.freePos=(x,y,r=22,room=E.S.room)=>{if(E.free(x,y,r,room))return{x,y};for(let d=40;d<600;d+=40)for(let a=0;a<6.28;a+=.5)if(E.free(x+Math.cos(a)*d,y+Math.sin(a)*d,r,room))return{x:x+Math.cos(a)*d,y:y+Math.sin(a)*d};return{x:room.w/2,y:room.h/2}};
E.roomData=node=>{
 const s=E.S,rand=E.random(E.hash(s.seed+':room:'+s.floor+':'+node.id)),boss=node.kind==='boss',w=boss?1440:[1120,1280,1440][Math.floor(rand()*3)],h=boss?1040:[840,960,1120][Math.floor(rand()*3)];
 const r={id:node.id,w,h,seed:E.hash(s.seed+':art:'+s.floor+':'+node.id),style:Math.floor(rand()*10),cover:[],objects:[],doors:[],wave:0,waves:node.kind==='elite'?2:node.kind==='challenge'?3:1+(rand()<.32+s.floor*.07?1:0),spawnTimer:1.3,clear:false,locked:false,hazardT:5,elapsed:0,entered:0};
 for(const id of node.links){const q=s.graph.rooms[id],dx=q.x-node.x,dy=q.y-node.y;const dir=dx===1?1:dx===-1?3:dy===1?2:0;r.doors.push({id,dir,x:dir===1?w-62:dir===3?62:w/2,y:dir===0?70:dir===2?h-62:h/2})}
 const kinds=['crate','server','glass','pillar','vent'];
 const layouts=[[[.22,.22],[.78,.78],[.22,.78],[.78,.22]],[[.24,.25],[.74,.25],[.25,.72]],[[.2,.3],[.8,.7]],[[.3,.2],[.7,.8],[.3,.8],[.7,.2]],[[.2,.2],[.2,.7],[.75,.2],[.75,.7]],[[.28,.28],[.72,.72]],[[.24,.2],[.78,.2],[.22,.8],[.76,.8]],[[.18,.35],[.8,.35],[.2,.7],[.8,.7]],[[.27,.25],[.75,.27],[.26,.76]],[[.24,.24],[.75,.75],[.24,.75],[.75,.24]]];
 if(!['start','shop','repair','treasure','event','curse'].includes(node.kind))for(const [px,py]of layouts[r.style]){const bw=boss?78:72+Math.floor(rand()*2)*48,bh=boss?74:72+Math.floor(rand()*2)*44,x=w*px-bw/2,y=h*py-bh/2;if(Math.abs(x+bw/2-w/2)>bw/2+90&&Math.abs(y+bh/2-h/2)>bh/2+90)r.cover.push({x,y,w:bw,h:bh,kind:kinds[Math.floor(rand()*kinds.length)]})}
 const obj=(type,x=w/2,y=h/2,extra={})=>r.objects.push({id:E.id(),type,x,y,used:false,...extra});
 if(node.kind==='treasure')obj('artifact');
 if(node.kind==='shop'){obj('shop');r.stock=[...E.items].sort(()=>rand()-.5).slice(0,3).map((x,i)=>({id:x.id,price:38+i*16+s.floor*9,bought:false}));r.stock.push({id:'heal',price:24+s.floor*4,bought:false},{id:'key',price:18,bought:false})}
 if(node.kind==='repair')obj('repair');
 if(node.kind==='event')obj('event',w/2,h/2,{event:['gift','reroll','altar'][Math.floor(rand()*3)]});
 if(node.kind==='curse')obj('curse');
 if(node.kind==='challenge')obj('challenge');
 if(node.kind==='start')obj('arrival',w/2,h/2-140);
 if(node.kind==='elite')r.mod=['armored','haste','storm'][Math.floor(rand()*3)];
 return r;
};
E.enter=(id,from)=>{
 const s=E.S,n=s.graph.rooms[id];if(!n)return;
 if(s.room&&s.graph.rooms[s.room.id]){s.room.savedDrops=s.drops;s.graph.rooms[s.room.id].data=s.room;}
 const first=!n.visited;n.visited=true;n.seen=true;for(const j of n.links)s.graph.rooms[j].seen=true;
 s.room=n.data||(n.data=E.roomData(n));const r=s.room;r.entered++;s.enemies=[];s.bullets=[];s.hazards=[];s.effects=[];s.drops=r.savedDrops||[];delete r.savedDrops;s.offer=null;
 const door=r.doors.find(x=>x.id===from);let x=door?door.x:r.w/2,y=door?door.y:r.h/2;
 if(door){if(door.dir===0)y+=130;if(door.dir===1)x-=130;if(door.dir===2)y-=130;if(door.dir===3)x+=130}
 for(const p of s.players){const q=E.freePos(x+(p.id?40:-40),y,23,r);p.x=q.x;p.y=q.y;p.inv=Math.max(p.inv,1.8);p.ammo=E.stats(p).clip;p.reload=0;p.dashT=0;p.hurt=0;}
 if(!n.cleared&&['combat','elite','boss'].includes(n.kind)){r.locked=true;r.spawnTimer=1.2;r.wave=0;r.clear=false}
 else {r.locked=false;r.clear=true;if(!n.cleared){n.cleared=true;s.rooms++;}}
 if(n.kind==='boss'&&!n.cleared)r.waves=1;
 E.cache.clear();E.cam.snap=true;E.fx=[];E.menu=null;E.uiKey='';
 if(first&&n.kind==='start'&&s.floor===0){if(s.mode==='solo')E.offer('Начальная аномалия');else E.notice('Двери с точкой ведут через охрану. Звезда — необязательный артефакт.')}
 E.save();
};
E.spawnWave=()=>{
 const s=E.S,r=s.room,node=s.graph.rooms[r.id];r.wave++;r.spawnTimer=0;
 if(node.kind==='boss'){E.spawnBoss();return}
 let count=4+s.floor+Math.floor(s.diff*.8)+(s.mode==='solo'?0:2)+(node.kind==='elite'?2:0)+(node.kind==='challenge'?r.wave:0);
 const pools=[['skitter','charger','shooter','sniper','bomber'],['splitter','healer','skitter','shooter','bomber'],['prism','sniper','charger','turret','skitter'],['brute','bomber','charger','shooter','turret'],['prism','healer','splitter','sniper','brute']];
 for(let i=0;i<count;i++){let type=E.pick(pools[s.floor]);if(s.mutation==='volatile'&&i%3===0)type='bomber';const a=E.range(0,Math.PI*2);let pos=E.freePos(r.w/2+Math.cos(a)*(r.w*.31),r.h/2+Math.sin(a)*(r.h*.29),40);for(let j=0;j<15&&s.players.some(p=>E.len(pos,p)<230);j++)pos=E.freePos(E.range(150,r.w-150),E.range(150,r.h-150),40);E.spawnEnemy(type,pos.x,pos.y,node.kind==='elite'&&i<2)}
};
E.clearRoom=()=>{
 const s=E.S,r=s.room,node=s.graph.rooms[r.id];if(r.clear)return;r.clear=true;r.locked=false;node.cleared=true;s.rooms++;s.hazards=[];s.bullets=s.bullets.filter(b=>!b.enemy);
 const money=7+s.floor*3+(node.kind==='elite'?12:0);s.coins+=money;
 for(const p of s.players){if(p.down){p.down=false;p.hp=E.stats(p).hp*.3;p.inv=2}p.hp=Math.min(E.stats(p).hp,p.hp+6*(p.mods.regen||0));p.shield=Math.min(E.stats(p).shield,p.shield+5)}
 E.event('clear',r.w/2,r.h/2,E.biomes[s.floor].color,100);
 if(node.kind==='boss'){r.objects.push({id:E.id(),type:'portal',x:r.w/2,y:r.h/2,used:false});r.objects.push({id:E.id(),type:'artifact',x:r.w/2-150,y:r.h/2+90,used:false});E.notice(s.floor===4?'Ядро побеждено. Портал завершает экспедицию.':'Переход прямо здесь. Возвращаться к входу не нужно.');}
 else if(node.kind==='elite'||node.kind==='challenge'){r.objects.push({id:E.id(),type:'artifact',x:r.w/2,y:r.h/2,used:false});}
 else if(E.rand()<.17+(s.mode==='solo'?.12:0)){r.objects.push({id:E.id(),type:'chest',x:r.w/2,y:r.h/2,used:false})}
 E.save();
};
E.roomStep=dt=>{
 const s=E.S,r=s.room;if(!r||r.clear)return;r.elapsed+=dt;
 if(r.spawnTimer>0){r.spawnTimer-=dt;if(r.spawnTimer<=0)E.spawnWave()}
 if(!s.enemies.some(e=>e.hp>0)&&r.spawnTimer<=0){if(r.wave<r.waves)r.spawnTimer=1.5;else E.clearRoom()}
 if(s.mutation==='surge'||r.mod==='storm'){r.hazardT-=dt;if(r.hazardT<=0){r.hazardT=6;for(const p of s.players)if(!p.down)E.hazard(p.x,p.y,72,18+s.floor*3,1.25,'#ffd37a')}}
};
E.canWarp=id=>{const s=E.S;return s&&s.room.clear&&!s.offer&&s.graph.rooms[id]?.cleared&&s.players.every(p=>!p.down)&&id!==s.room.id};
E.warp=id=>{if(E.canWarp(id)){E.enter(id,null);E.notice('Транзит между зачищенными комнатами.')}};
E.nearObject=p=>{const r=E.S.room;return [...r.objects.filter(o=>!o.used&&o.type!=='arrival'),...(!r.locked?r.doors.map(o=>({...o,type:'door'})):[])].filter(o=>E.len(o,p)<112).sort((a,b)=>E.len(a,p)-E.len(b,p))[0]};
E.use=(p,dt)=>{
 const s=E.S,r=s.room;
 const ally=s.players.find(a=>a.id!==p.id&&a.down&&E.len(a,p)<100);
 if(ally){ally.revive+=dt*(p.cls==='medic'?2:1);ally.reviving=true;if(ally.revive>=2.5){ally.down=false;ally.hp=E.stats(ally).hp*.45;ally.shield=12;ally.inv=2;ally.revive=0;E.event('pickup',ally.x,ally.y,E.colors[ally.id],60)}return}
 if(p.useT>0)return;const o=E.nearObject(p);if(!o)return;p.useT=.4;
 if(o.type==='door'||o.type==='portal'){
  const far=s.players.some(q=>!q.down&&E.len(q,o)>230);if(far&&s.mode==='online'){E.notice('Напарник должен подойти к этому шлюзу.');return}
  if(s.players.some(q=>q.down)){E.notice('Сначала поднимите напарника.');return}
  if(o.type==='door'){E.enter(o.id,r.id);return}
  if(s.floor===4){E.finish(true);return}s.floor++;s.players.forEach(q=>{q.hp=Math.min(E.stats(q).hp,q.hp+20);q.shield=E.stats(q).shield});E.newFloor();return;
 }
 if(o.type==='artifact'){o.used=true;E.offer('Артефакт');return}
 if(o.type==='chest'){o.used=true;if(s.keys>0){s.keys--;E.offer('Закрытый контейнер')}else{s.coins+=12;E.notice('Без ключа: разобрали корпус на 12 кредитов.')}return}
 if(o.type==='repair'){o.used=true;for(const q of s.players){q.hp=Math.min(E.stats(q).hp,q.hp+40);q.shield=E.stats(q).shield}E.notice('Медблок: +40 HP и полный щит.');E.save();return}
 if(o.type==='shop'){s.offer={type:'shop',source:'Снабжение',done:s.players.map(()=>false)};if(s.mode==='companion')s.offer.done[1]=true;return}
 if(o.type==='challenge'){o.used=true;r.clear=false;r.locked=true;r.wave=0;r.spawnTimer=1.4;r.waves=3;s.graph.rooms[r.id].cleared=false;E.notice('Испытание: три волны. Награда — артефакт.');return}
 if(o.type==='event'||o.type==='curse'){s.offer={type:'event',source:o.type==='curse'?'Сделка с разломом':'Неизвестный протокол',event:o.type==='curse'?'curse':o.event,objectId:o.id,seat:p.id};return}
};
E.eventChoice=(seat,yes)=>{
 const s=E.S,o=s.offer;if(!o||o.type!=='event'||o.seat!==seat)return;const p=s.players[seat],obj=s.room.objects.find(x=>x.id===o.objectId);if(obj)obj.used=true;s.offer=null;
 if(!yes){E.save();return}
 if(o.event==='curse'){if(p.hp<=28){E.notice('Нужно больше 28 HP. Сделка отменена.');return}p.hp-=28;E.give(p,E.pick(E.items.filter(x=>x.tag==='wild')).id);E.give(p,E.pick(E.items.filter(x=>x.tag==='wild')).id);E.notice('Два хаотических модуля получены.')}
 else if(o.event==='reroll'){if(s.coins<25){E.notice('Нужно 25 кредитов.');return}s.coins-=25;p.weapon=E.pick(Object.keys(E.weapons));p.ammo=E.stats(p).clip;E.give(p,E.pick(E.items).id);E.notice('Оружие и модуль изменены.')}
 else if(o.event==='altar'){if(p.hp<=18){E.notice('Недостаточно здоровья.');return}p.hp-=18;E.offer('Алтарь: выбор за 18 HP')}
 else{if(E.rand()<.65){s.coins+=35;s.keys++;E.notice('Найдено 35 кредитов и ключ.')}else {E.give(p,E.pick(E.items).id);E.notice('Протокол выдал случайный модуль.')}}E.save();
};
