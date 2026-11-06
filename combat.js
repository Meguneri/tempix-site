'use strict';
E.move=(e,vx,vy,dt)=>{const n=Math.max(1,Math.ceil(Math.hypot(vx,vy)*dt/11)),d=dt/n;for(let i=0;i<n;i++){if(E.free(e.x+vx*d,e.y,e.r))e.x+=vx*d;if(E.free(e.x,e.y+vy*d,e.r))e.y+=vy*d;}};
E.line=(a,b,pad=3)=>{const d=E.len(a,b),n=Math.ceil(d/24);for(let i=1;i<n;i++)if(!E.free(E.mix(a.x,b.x,i/n),E.mix(a.y,b.y,i/n),pad))return false;return true};
E.nearest=(p,max=1400,visible=false)=>{let out=null,d=max;for(const e of E.S.enemies){if(e.hp<=0)continue;const v=E.len(e,p);if(v<d&&(!visible||E.line(p,e))){d=v;out=e}}return out};
E.navigate=(e,p,speed,dt)=>{
 const d=E.len(e,p);if(d<4)return;let a=Math.atan2(p.y-e.y,p.x-e.x);
 if(!E.free(e.x+Math.cos(a)*55,e.y+Math.sin(a)*55,e.r+3)){
  let best=-1e9,angle=a;for(const offset of [0,.45,-.45,.9,-.9,1.5,-1.5,2.2,-2.2,Math.PI]){const aa=a+offset,x=e.x+Math.cos(aa)*66,y=e.y+Math.sin(aa)*66;if(!E.free(x,y,e.r+3))continue;const score=-Math.hypot(x-p.x,y-p.y)+(Math.cos(aa-(e.walkAngle??a))*22);if(score>best){best=score;angle=aa}}a=angle;
 }e.walkAngle=a;E.move(e,Math.cos(a)*speed,Math.sin(a)*speed,dt);
};
E.spawnEnemy=(type,x,y,elite=false)=>{
 const s=E.S;if(s.enemies.filter(e=>e.hp>0).length>=60)return null;const c=E.enemies[type],p=E.freePos(x,y,c.r+5),scale=(1+s.floor*.28)*[.8,1,1.22][s.diff]*(s.mode==='solo'?.88:1.45)*(elite?1.55:1)*(s.mutation==='bounty'?1.15:1)*(s.room.mod==='armored'?1.3:1);
 const e={id:E.id(),type,x:p.x,y:p.y,r:c.r,hp:c.hp*scale,max:c.hp*scale,damage:c.dmg*[.75,1.05,1.4][s.diff]*(1+s.floor*.12),speed:c.speed*(1+s.diff*.07),color:c.color,elite,cool:E.range(.9,1.7),hurt:0,angle:0,wind:0,charge:0,burn:0,slow:0,stun:1.05,contact:0};s.enemies.push(e);E.event('spawn',e.x,e.y,e.color,34);return e;
};
E.spawnBoss=()=>{
 const s=E.S,r=s.room,b=E.biomes[s.floor],hp=(1900+s.floor*700)*[.8,1,1.25][s.diff]*(s.mode==='solo'?1:1.75);
 s.enemies.push({id:E.id(),type:'boss',boss:s.floor,x:r.w/2,y:r.h*.32,r:52+s.floor*3,hp,max:hp,damage:(19+s.floor*3)*[.85,1.1,1.45][s.diff],speed:65,color:b.color,elite:true,cool:2,hurt:0,angle:0,wind:0,charge:0,burn:0,slow:0,stun:1.2,contact:0,phase:1,attack:0,summon:9});E.event('boss',r.w/2,r.h*.32,b.color,150);
};
E.bullet=(x,y,a,speed,damage,enemy,owner,extra={})=>{const s=E.S;if(s.bullets.length>380)return;s.bullets.push({id:E.id(),x,y,px:x,py:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,r:enemy?6:4,damage,enemy,owner,life:2.4,color:enemy?'#ff8fae':E.colors[owner]||'#75f5e0',pierce:0,bounce:0,homing:0,chain:0,blast:0,hit:[],...extra})};
E.hazard=(x,y,r,dmg,delay=1.2,color='#ffbb7b',kind='circle',angle=0)=>{const s=E.S;if(s.hazards.length>=40)return;s.hazards.push({id:E.id(),x,y,r,damage:dmg,wait:delay,total:delay,life:kind==='beam'?.4:.3,color,kind,angle,hit:[]})};
E.explode=(x,y,r,dmg,pid,secondary=true)=>{E.event('blast',x,y,E.colors[pid]||'#f5bc86',r);for(const e of [...E.S.enemies])if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<r+e.r&&E.line({x,y},e))E.damageEnemy(e,dmg,pid,secondary)};
E.damageEnemy=(e,dmg,pid=0,secondary=false,crit=false)=>{
 if(e.hp<=0)return;const s=E.S,p=s.players[pid],m=p?.mods||{};
 if(e.type==='boss'&&e.shielded&&s.enemies.some(x=>x.node&&x.hp>0))dmg*=.12;
 if(!secondary&&e.elite)dmg*=1+.25*(m.focus||0);
 if(s.mutation==='fragile')dmg*=1.25;
 e.hp-=dmg;e.hurt=.09;
 if(!secondary){if(m.burn){e.burn=3;e.burnDps=8*m.burn;e.burnOwner=pid}if(m.frost)e.slow=Math.max(e.slow,2);if(m.gravity){for(const q of s.enemies)if(q.id!==e.id&&q.hp>0&&E.len(q,e)<150)E.navigate(q,e,20*m.gravity,.22)}if(crit&&m.leech)p.shield=Math.min(E.stats(p).shield,p.shield+2*m.leech);E.event('hit',e.x,e.y,crit?'#fff3b6':e.color,Math.round(dmg));}
 if(e.hp<=0)E.kill(e,pid);
};
E.kill=(e,pid)=>{
 if(e.dead)return;e.dead=true;const s=E.S,p=s.players[pid],m=p?.mods||{};s.kills++;if(p){p.kills++;if(!p.down)p.hp=Math.min(E.stats(p).hp,p.hp+1.2*(m.vamp||0)+(m.vamp&&m.glass?1:0))}
 s.resonance=Math.min(100,s.resonance+3.3*(1+.35*(m.resonance||0)));E.event('death',e.x,e.y,e.color,e.type==='boss'?130:e.r*2);
 if(E.rand()<.7||e.elite){let val=(e.elite?8:3)*(1+.15*(m.luck||0))*(s.mutation==='bounty'?1.4:s.mutation==='volatile'?1.2:1);s.drops.push({id:E.id(),type:'coin',x:e.x,y:e.y,value:Math.ceil(val),t:0})}
 if(E.rand()<.045+.015*(m.luck||0))s.drops.push({id:E.id(),type:'heal',x:e.x+18,y:e.y,value:14,t:0});
 if(e.type==='splitter')for(let i=0;i<2;i++){const a=i*Math.PI;const q=E.spawnEnemy('skitter',e.x+Math.cos(a)*32,e.y+Math.sin(a)*32);if(q){q.r=12;q.hp*=.65;q.max=q.hp;q.stun=.65}}
 if(m.blast)E.explode(e.x,e.y,m.burn?155:100,24*m.blast,pid,true);
 if(m.execute)for(let i=0;i<4;i++)E.bullet(e.x,e.y,i*Math.PI/2,460,9*m.execute,false,pid,{life:1.4,homing:m.homing||0,color:'#d4b4ff'});
};
E.hurt=(p,dmg)=>{
 if(p.down||p.inv>0)return;const s=E.S,st=E.stats(p);dmg*=st.armor*(s.mutation==='fragile'?1.25:1)*(p.guard>0?.5:1);let take=Math.min(p.shield,dmg);p.shield-=take;p.hp-=dmg-take;p.inv=.42;p.hurt=7;E.event('hurt',p.x,p.y,'#ff648b',dmg);E.audio.play('hit');
 if(p.mods.thorns)E.explode(p.x,p.y,130,24*p.mods.thorns,p.id,true);
 if(p.hp<=0){p.hp=0;p.down=true;p.downTime=40;p.revive=0;E.event('death',p.x,p.y,E.colors[p.id],70);if(s.mode==='solo'||s.players.every(q=>q.down))E.finish(false)}
};
E.shoot=p=>{
 const s=E.S,w=E.weapons[p.weapon],st=E.stats(p),m=p.mods;if(p.fire>0||p.reload>0||p.ammo<=0)return;
 p.fire=w.rate/st.rate/(p.buff>0?1.55:1)/(s.mutation==='frenzy'?1.15:1);p.ammo--;p.shots++;
 const crit=E.rand()<st.crit;let dmg=w.dmg*st.damage*(crit?2:1)*(p.move>.15?1+.25*(m.momentum||0):1)*(m.double?Math.pow(.74,m.double):1)*(m.homing&&m.double?1.12:1);
 const opt={life:w.range/(w.speed*.78**(m.giant||0)),pierce:(w.pierce||0)+(m.pierce||0),chain:(w.chain||0)+(m.chain||0),blast:w.blast||0,bounce:m.bounce||0,homing:m.homing||0,r:4+3*(m.giant||0),crit,color:m.burn?'#ffd08a':m.frost?'#c6efff':m.homing?'#ddbbff':E.colors[p.id]};
 const angles=[];for(let i=0;i<w.pellets;i++)angles.push(p.angle+(i-(w.pellets-1)/2)*w.spread*2/Math.max(1,w.pellets-1)+E.range(-w.spread*.15,w.spread*.15));
 if(m.double)for(let i=1;i<=m.double;i++)angles.push(p.angle+.17*i,p.angle-.17*i);
 for(const a of angles)E.bullet(p.x+Math.cos(a)*25,p.y+Math.sin(a)*25,a,w.speed*.78**(m.giant||0),dmg,false,p.id,opt);
 if(m.burst&&p.shots%4===0)for(const a of [-.38,0,.38])E.bullet(p.x,p.y,p.angle+a,w.speed,dmg*.65*m.burst,false,p.id,opt);
 E.event('shot',p.x+Math.cos(p.angle)*30,p.y+Math.sin(p.angle)*30,opt.color,20);if(p.ammo<=0)p.reload=st.reload;
};
E.skill=p=>{
 if(p.skill>0||p.down)return;const s=E.S;p.skill=E.stats(p).cd;E.event('pulse',p.x,p.y,E.colors[p.id],170);
 if(p.cls==='warden'){E.explode(p.x,p.y,210,80,p.id);s.bullets=s.bullets.filter(b=>!b.enemy||E.len(b,p)>220);p.guard=4;p.inv=.6;for(const e of s.enemies)if(e.hp>0&&E.len(e,p)<230)e.stun=1}
 if(p.cls==='scout'){p.buff=4;for(let i=0;i<12;i++)E.bullet(p.x,p.y,i*Math.PI/6,620,32*E.stats(p).damage,false,p.id,{pierce:3,homing:p.mods.homing||0,life:1.8,color:'#c8f7ff'});}
 if(p.cls==='engineer')s.effects.push({id:E.id(),type:'turret',x:p.x,y:p.y,owner:p.id,life:12,t:0});
 if(p.cls==='medic')s.effects.push({id:E.id(),type:'heal',x:p.x,y:p.y,owner:p.id,life:6,r:150});
};
E.ultimate=()=>{const s=E.S;if(s.resonance<100||s.surge>0)return;s.resonance=0;s.surge=6;s.bullets=s.bullets.filter(b=>!b.enemy);for(const p of s.players)if(!p.down){p.shield=E.stats(p).shield;p.inv=1.2;p.buff=4;E.event('pulse',p.x,p.y,'#ffe1a3',250)}};
E.playerStep=(p,i,dt)=>{
 const s=E.S,st=E.stats(p);for(const k of ['fire','skill','dash','inv','hurt','buff','slow','useT','guard'])p[k]=Math.max(0,(p[k]||0)-dt);
 if(p.down){p.downTime-=dt;if(!p.reviving)p.revive=Math.max(0,p.revive-dt*.25);p.reviving=false;return}
 if(p.reload>0){p.reload-=dt;if(p.reload<=0)p.ammo=st.clip}
 if(!p.hurt)p.shield=Math.min(st.shield,p.shield+dt*(s.players.length>1&&s.players.some(q=>q.id!==p.id&&!q.down&&E.len(q,p)<230)?5:3));
 let x=E.clamp(Number(i.x)||0,-1,1),y=E.clamp(Number(i.y)||0,-1,1),d=Math.hypot(x,y);if(d>1){x/=d;y/=d}p.move=Math.min(1,d);p.steps+=dt*p.move*st.speed;
 if(Number.isFinite(i.ax)&&Number.isFinite(i.ay))p.angle=Math.atan2(i.ay-p.y,i.ax-p.x);
 if(i.dash&&p.dash<=0){p.dash=st.dash;p.dashT=.2;p.dx=d>.1?x:Math.cos(p.angle);p.dy=d>.1?y:Math.sin(p.angle);p.inv=Math.max(p.inv,.24);if(p.mods.battery)p.shield=Math.min(st.shield,p.shield+8*p.mods.battery);if(p.mods.nova)E.explode(p.x,p.y,140,40*p.mods.nova+(p.mods.battery?30:0),p.id);E.event('dash',p.x,p.y,E.colors[p.id],40)}
 if(p.dashT>0){p.dashT-=dt;E.move(p,p.dx*780,p.dy*780,dt)}else E.move(p,x*st.speed*(p.slow>.01?.65:1),y*st.speed*(p.slow>.01?.65:1),dt);
 if(i.skill)E.skill(p);if(i.res)E.ultimate();if(i.fire)E.shoot(p);if(i.reload&&!p.reload&&p.ammo<st.clip)p.reload=st.reload;
 if(i.use)E.use(p,dt);
 p.droneT-=dt;if(p.mods.drone&&p.droneT<=0){const e=E.nearest(p,700,true);if(e){p.droneT=.8/st.rate;for(let n=0;n<p.mods.drone;n++){const a=s.t*1.2+n*6.28/p.mods.drone,q={x:p.x+Math.cos(a)*48,y:p.y+Math.sin(a)*48};E.bullet(q.x,q.y,Math.atan2(e.y-q.y,e.x-q.x),700,13*st.damage,false,p.id,{color:'#c0e8ff',life:1.4})}}}
 p.orbitT-=dt;if(p.mods.orbit&&p.orbitT<=0){p.orbitT=.22;for(const e of [...s.enemies])if(e.hp>0&&E.len(p,e)<75)E.damageEnemy(e,9*p.mods.orbit,p.id,true)}
};
E.eShot=(e,a,extra={})=>E.bullet(e.x+Math.cos(a)*(e.r+10),e.y+Math.sin(a)*(e.r+10),a,extra.speed||255+E.S.floor*12,e.damage,true,e.id,{life:5,...extra});
E.bossStep=(e,target,dt)=>{
 const s=E.S,r=s.room,phase=e.hp/e.max<.33?3:e.hp/e.max<.67?2:1;
 if(phase>e.phase){e.phase=phase;e.cool=Math.max(1,e.cool);E.event('boss',e.x,e.y,e.color,150);if(e.boss===4){for(const dx of [-200,200]){const n=E.spawnEnemy('turret',r.w/2+dx,r.h/2-200,true);if(n)n.node=true}e.shielded=true}}
 e.shielded=e.boss===4&&s.enemies.some(x=>x.node&&x.hp>0);e.angle=Math.atan2(target.y-e.y,target.x-e.x);e.cool-=dt;e.summon-=dt;
 if(e.wind>0){e.wind-=dt;if(e.wind<=0)e.charge=.65}
 if(e.charge>0){e.charge-=dt;E.move(e,Math.cos(e.chargeA)*510,Math.sin(e.chargeA)*510,dt)}
 else if(e.wind<=0){const orbit={x:r.w/2+Math.cos(s.t*.23+e.boss)*r.w*.17,y:r.h/2+Math.sin(s.t*.3)*r.h*.18};E.navigate(e,e.boss===0?target:orbit,55+phase*9,dt)}
 if(e.cool<=0){e.attack++;e.cool=2.5-phase*.24;
  if(e.boss===0){if(e.attack%3===0){e.wind=.95;e.chargeA=e.angle}else if(e.attack%2){for(let j=-2;j<=2;j++)E.eShot(e,e.angle+j*.16,{speed:300})}else for(let j=0;j<12+phase*2;j++)E.eShot(e,j*6.28/(12+phase*2)+s.t*.2,{speed:205})}
  if(e.boss===1){for(const p of s.players)if(!p.down){E.hazard(p.x,p.y,90,28,1.4,'#c8f592');if(phase>1)for(const x of [-110,110])E.hazard(p.x+x,p.y+100,65,22,1.6,'#b7e87e')}for(let j=0;j<10;j++)E.eShot(e,j*6.28/10+s.t*.3,{speed:190,color:'#dbf597',r:9});}
  if(e.boss===2){for(let j=0;j<14+phase*3;j++)E.eShot(e,j*6.28/(14+phase*3)+s.t*.27,{speed:220,color:'#bfeaff',slow:true});if(e.attack%2===0)E.hazard(e.x,e.y,1050,35,1.35,'#b0e0ff','beam',e.angle)}
  if(e.boss===3){for(const p of s.players)if(!p.down)for(let k=0;k<3;k++)E.hazard(p.x+(k-1)*110,p.y,75,32,1.1+k*.15,'#ffb772');if(e.attack%2===0)E.hazard(e.x,e.y,1100,40,1.4,'#ffc27b','beam',e.angle);else for(let j=-3;j<=3;j++)E.eShot(e,e.angle+j*.18,{speed:285,color:'#ffd3a0'})}
  if(e.boss===4){for(let j=0;j<18;j++){const a=j*6.28/18+s.t*.24;E.eShot(e,a,{speed:j%2?190:300,color:j%2?'#ffb3db':'#ceb0ff'})}if(phase>1)for(const p of s.players)if(!p.down)E.hazard(p.x,p.y,100,35,1.3,'#d6b4ff');if(e.attack%3===0)E.hazard(e.x,e.y,1100,35,1.5,'#cfadff','beam',e.angle)}
 }
 if(e.summon<=0){e.summon=13-phase;for(let j=0;j<phase;j++)E.spawnEnemy(e.boss===1?'splitter':e.boss===3?'bomber':'skitter',r.w/2+(j%2?-260:260),r.h/2+190);}
};
E.enemyStep=(e,dt)=>{
 const s=E.S;if(e.hp<=0)return;e.hurt=Math.max(0,e.hurt-dt);e.contact=Math.max(0,e.contact-dt);e.slow=Math.max(0,e.slow-dt);
 if(e.burn>0){e.burn-=dt;E.damageEnemy(e,e.burnDps*dt,e.burnOwner,true);if(e.hp<=0)return}
 if(e.stun>0){e.stun-=dt;return}
 const alive=s.players.filter(p=>!p.down);if(!alive.length)return;const p=alive.sort((a,b)=>E.len(a,e)-E.len(b,e))[0],d=E.len(e,p),a=Math.atan2(p.y-e.y,p.x-e.x);e.angle=a;
 const mult=(s.surge>0?.55:1)*(e.slow>0?.65:1)*(s.mutation==='frenzy'?1.15:1)*(s.room.mod==='haste'?1.2:1);dt*=s.surge>0?.72:1;
 if(e.type==='boss')E.bossStep(e,p,dt);else{
  e.cool-=dt;const speed=e.speed*mult;
  if(['skitter','splitter','bomber'].includes(e.type))E.navigate(e,p,speed,dt);
  if(e.type==='bomber'&&d<92){E.hazard(e.x,e.y,115,e.damage,.75,'#ffc383');e.hp=0;e.dead=true;E.event('death',e.x,e.y,e.color,50);return}
  if(e.type==='charger'){
   if(e.wind>0){e.wind-=dt;if(e.wind<=0)e.charge=.5}else if(e.charge>0){e.charge-=dt;E.move(e,Math.cos(e.chargeA)*480*mult,Math.sin(e.chargeA)*480*mult,dt)}else{E.navigate(e,p,speed,dt);if(e.cool<=0&&d<550&&E.line(e,p)){e.cool=3;e.wind=.8;e.chargeA=a}}
  }
  if(e.type==='brute'){E.navigate(e,p,speed,dt);if(e.cool<=0&&d<180){e.cool=3.5;E.hazard(e.x,e.y,160,e.damage,1.1,'#ffd29b')}}
  if(['shooter','sniper','prism'].includes(e.type)){
   if(d>430||!E.line(e,p))E.navigate(e,p,speed,dt);else if(d<230)E.navigate(e,{x:e.x-Math.cos(a)*150,y:e.y-Math.sin(a)*150},speed,dt);
   if(e.cool<=0&&E.line(e,p)){
    if(e.type==='sniper'){e.cool=3.2;E.hazard(e.x,e.y,1050,e.damage,1.1,e.color,'beam',a)}
    else if(e.type==='prism'){e.cool=2.5;for(let j=0;j<8;j++)E.eShot(e,j*Math.PI/4+s.t*.2,{speed:205,color:'#d5bcff'})}
    else{e.cool=1.65;for(let j=-1;j<=1;j++)E.eShot(e,a+j*.12)}
   }
  }
  if(e.type==='turret'&&e.cool<=0&&E.line(e,p)){e.cool=2.1;for(let j=-2;j<=2;j++)E.eShot(e,a+j*.15,{speed:235});}
  if(e.type==='healer'){if(d<260)E.navigate(e,{x:e.x-Math.cos(a)*180,y:e.y-Math.sin(a)*180},speed,dt);if(e.cool<=0){e.cool=2.5;for(const q of s.enemies)if(q.id!==e.id&&q.hp>0&&E.len(q,e)<280)q.hp=Math.min(q.max,q.hp+12);E.event('pulse',e.x,e.y,e.color,220);E.eShot(e,a,{speed:210})}}
 }
 for(const q of s.players)if(!q.down&&E.len(e,q)<e.r+q.r+5&&e.contact<=0){E.hurt(q,e.damage);e.contact=.65;const a=Math.atan2(q.y-e.y,q.x-e.x);E.move(q,Math.cos(a)*100,Math.sin(a)*100,.12)}
};
E.bulletStep=dt=>{
 const s=E.S;for(const b of [...s.bullets]){
  if(b.life<=0)continue;b.life-=dt;b.px=b.x;b.py=b.y;
  if(!b.enemy&&b.homing){const e=E.nearest(b,360,true);if(e){const speed=Math.hypot(b.vx,b.vy),a=Math.atan2(b.vy,b.vx),target=Math.atan2(e.y-b.y,e.x-b.x),diff=Math.atan2(Math.sin(target-a),Math.cos(target-a)),turn=E.clamp(diff,-dt*(2.7+b.homing),dt*(2.7+b.homing));b.vx=Math.cos(a+turn)*speed;b.vy=Math.sin(a+turn)*speed}}
  const d=dt*(b.enemy&&s.surge>0?.6:1),steps=Math.max(1,Math.ceil(Math.hypot(b.vx,b.vy)*d/12));
  for(let i=0;i<steps&&b.life>0;i++){
   const nx=b.x+b.vx*d/steps,ny=b.y+b.vy*d/steps;
   if(!E.free(nx,ny,b.r)){
    if(b.bounce>0){b.bounce--;const bx=!E.free(nx,b.y,b.r),by=!E.free(b.x,ny,b.r);if(bx||!by)b.vx=-b.vx;if(by)b.vy=-b.vy;E.event('spark',b.x,b.y,b.color,12)}else{b.life=0;if(b.blast&&!b.enemy)E.explode(b.x,b.y,b.blast,b.damage*.6,b.owner);E.event('spark',b.x,b.y,b.color,8)}break;
   }b.x=nx;b.y=ny;
   if(b.enemy){for(const p of s.players){if(p.down)continue;if(p.mods.orbit&&E.len(p,b)<68){const angle=Math.atan2(b.y-p.y,b.x-p.x);let block=false;for(let k=0;k<p.mods.orbit+1;k++){const a=s.t*2+k*6.28/(p.mods.orbit+1);if(Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)))<.28)block=true}if(block){b.life=0;E.event('spark',b.x,b.y,E.colors[p.id],14);break}}
     if(E.len(p,b)<p.r+b.r){E.hurt(p,b.damage);if(b.slow)p.slow=1.4;b.life=0;break}}
   }else for(const e of [...s.enemies]){
    if(e.hp<=0||b.hit.includes(e.id)||E.len(e,b)>e.r+b.r)continue;b.hit.push(e.id);E.damageEnemy(e,b.damage,b.owner,false,b.crit);
    if(b.blast)E.explode(b.x,b.y,b.blast,b.damage*.65,b.owner);
    if(b.chain){let last=e,used=new Set(b.hit),damage=b.damage*.65;for(let k=0;k<b.chain;k++){const q=s.enemies.filter(v=>v.hp>0&&!used.has(v.id)&&E.len(v,last)<230&&E.line(last,v)).sort((a,c)=>E.len(a,last)-E.len(c,last))[0];if(!q)break;used.add(q.id);E.event('arc',last.x,last.y,b.color,{x:q.x,y:q.y});E.damageEnemy(q,damage,b.owner,true);if(s.players[b.owner].mods.frost)q.slow=2;damage*=.65;last=q}}
    if(b.pierce>0){b.pierce--;b.damage*=.85}else b.life=0;break;
   }
  }
 }
 s.bullets=s.bullets.filter(b=>b.life>0);s.enemies=s.enemies.filter(e=>e.hp>0);
};
E.hazardStep=dt=>{
 const s=E.S;for(const h of s.hazards){h.wait-=dt;if(h.wait>0)continue;h.life-=dt;for(const p of s.players){if(p.down||h.hit.includes(p.id))continue;let inside=false;
  if(h.kind==='beam'){const dx=p.x-h.x,dy=p.y-h.y,along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),side=Math.abs(-dx*Math.sin(h.angle)+dy*Math.cos(h.angle));inside=along>0&&along<h.r&&side<22+p.r&&E.line(h,p)}else inside=E.len(h,p)<h.r+p.r&&E.line(h,p);
  if(inside){h.hit.push(p.id);E.hurt(p,h.damage)}}}s.hazards=s.hazards.filter(h=>h.life>0);
};
E.effectStep=dt=>{
 const s=E.S;for(const a of s.effects){a.life-=dt;if(a.type==='heal'){for(const p of s.players)if(!p.down&&E.len(p,a)<a.r)p.hp=Math.min(E.stats(p).hp,p.hp+5*dt)}else if(a.type==='turret'){a.t-=dt;if(a.t<=0){const e=E.nearest(a,750,true);if(e){a.t=.3;E.bullet(a.x,a.y,Math.atan2(e.y-a.y,e.x-a.x),780,16*E.stats(s.players[a.owner]).damage,false,a.owner,{life:1.3,color:'#a8deff'})}}}}s.effects=s.effects.filter(a=>a.life>0);
 for(const d of s.drops){d.t+=dt;const p=s.players.filter(p=>!p.down).sort((a,b)=>E.len(a,d)-E.len(b,d))[0];if(!p)continue;let distance=E.len(p,d);if(distance<170&&E.line(p,d)){const n=Math.max(1,distance);d.x+=(p.x-d.x)/n*230*dt;d.y+=(p.y-d.y)/n*230*dt}if(distance<28){d.t=999;if(d.type==='coin')s.coins+=d.value;else p.hp=Math.min(E.stats(p).hp,p.hp+d.value);E.event('pickup',d.x,d.y,d.type==='coin'?'#ffd28c':'#b8ef9b',12)}}s.drops=s.drops.filter(d=>d.t<999);
};
E.bot=p=>{
 const s=E.S,ally=s.players[0],e=E.nearest(p,850,true),r=s.room;let target={x:ally.x+60,y:ally.y+30},use=false;
 if(ally.down){target=ally;use=E.len(p,ally)<95}else if(e){const a=Math.atan2(p.y-e.y,p.x-e.x);if(E.len(e,p)<210)target={x:p.x+Math.cos(a)*160,y:p.y+Math.sin(a)*160};}
 const hazard=s.hazards.find(h=>h.wait>0&&h.kind==='circle'&&E.len(p,h)<h.r+30);if(hazard){const a=Math.atan2(p.y-hazard.y,p.x-hazard.x);target={x:p.x+Math.cos(a)*180,y:p.y+Math.sin(a)*180}}
 const a=Math.atan2(target.y-p.y,target.x-p.x),moving=E.len(p,target)>50;
 return {x:moving?Math.cos(a):0,y:moving?Math.sin(a):0,ax:e?e.x:p.x+Math.cos(p.angle)*300,ay:e?e.y:p.y+Math.sin(p.angle)*300,fire:!!e,skill:!!e&&(p.cls!=='medic'||p.hp<E.stats(p).hp*.6),dash:!!hazard&&hazard.wait<.5,use,res:s.resonance>=100&&s.enemies.length>8};
};
E.step=(dt,inputs)=>{
 const s=E.S;if(!s||s.status!=='play'||s.paused||s.offer)return;if(E.mode!=='online'&&E.menu)return;
 s.t+=dt;s.surge=Math.max(0,s.surge-dt);const room=s.room;
 for(let j=0;j<s.players.length;j++){E.playerStep(s.players[j],inputs[j]||{},dt);if(s.room!==room||s.offer||s.status!=='play')return}
 for(const e of [...s.enemies])E.enemyStep(e,dt);
 E.bulletStep(dt);E.hazardStep(dt);E.effectStep(dt);E.roomStep(dt);
 if(s.players.every(p=>p.down))E.finish(false);
};
