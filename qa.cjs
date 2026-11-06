'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),store=new Map();
const ctx={console,Map,Set,Date,Math,JSON,Number,String,Object,Array,performance,location:{protocol:'file:'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},matchMedia:()=>({matches:false}),navigator:{maxTouchPoints:0},document:{querySelector:()=>({})},sessionStorage:{removeItem(){}},setTimeout,clearTimeout};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['core','world','combat','net'])vm.runInContext(fs.readFileSync(__dirname+'/'+f+'.js','utf8'),ctx);
const E=ctx.E;E.audio.start=()=>{};let maps=0,minrooms=100,maxrooms=0;
for(let k=0;k<1000;k++)for(let floor=0;floor<5;floor++){
 const g=E.graph('TEST-'+k,floor,k%2===0),seen=new Set([0]),q=[0];for(let i=0;i<q.length;i++)for(const j of g.rooms[q[i]].links)if(!seen.has(j)){seen.add(j);q.push(j)}assert.equal(seen.size,g.rooms.length);assert.equal(g.rooms[g.boss].links.length,1);assert.equal(g.rooms[g.boss].kind,'boss');assert(g.main.length>=6);assert.equal(new Set(g.rooms.map(n=>n.x+','+n.y)).size,g.rooms.length);for(const n of g.rooms)for(const j of n.links){const other=g.rooms[j];assert.equal(Math.abs(n.x-other.x)+Math.abs(n.y-other.y),1)}assert(g.rooms.some(n=>n.kind==='treasure'));maps++;minrooms=Math.min(minrooms,g.rooms.length);maxrooms=Math.max(maxrooms,g.rooms.length);
}
E.newRun('solo','FULL-CAMPAIGN');assert.equal(E.S.players.length,1);assert(E.S.offer);E.action(0,'item',E.S.offer.options[0][0]);assert(!E.S.offer);let rooms=0,bosses=0;
for(let floor=0;floor<5;floor++){
 assert.equal(E.S.floor,floor);const graph=E.S.graph;
 for(const n of graph.rooms){E.enter(n.id,null);const r=E.S.room;assert.equal(r.id,n.id);for(const d of r.doors){const q=E.freePos(d.x,d.y,22);assert(E.free(q.x,q.y,22));assert(E.line({x:r.w/2,y:r.h/2},q,22))}
 if(n.kind==='boss'){r.spawnTimer=0;E.spawnBoss();const boss=E.S.enemies.find(x=>x.type==='boss');assert(boss);bosses++;for(const ratio of [1,.6,.25]){boss.hp=boss.max*ratio;for(let t=0;t<360;t++){E.S.players[0].inv=999;E.step(1/60,[{}]);assert.equal(E.S.status,'play')}}}
 else if(r.locked){for(let t=0;t<100;t++){E.S.players[0].inv=999;E.step(1/60,[{}])}assert(E.S.enemies.length>0)}
 E.S.enemies=[];r.wave=r.waves;r.spawnTimer=0;if(!r.clear)E.clearRoom();assert(r.clear);rooms++;
 }
 E.enter(graph.boss,null);const o=E.S.room.objects.find(o=>o.type==='portal');assert(o);const p=E.S.players[0];p.x=o.x;p.y=o.y;p.useT=0;E.use(p,.02);
}
assert.equal(E.S.status,'win');assert(!E.load('helios3-save',null));
for(const weapon of Object.keys(E.weapons)){
 E.config.weapon[0]=weapon;E.newRun('solo','MODULE-'+weapon);E.action(0,'item',E.S.offer.options[0][0]);E.enter(E.S.graph.main[1],0);E.S.room.spawnTimer=0;E.S.room.wave=1;for(const it of E.items)E.give(E.S.players[0],it.id);const p=E.S.players[0];p.inv=999;p.x=E.S.room.w/2;p.y=E.S.room.h*.65;
 for(let k=0;k<12;k++)E.spawnEnemy(Object.keys(E.enemies)[k%10],E.S.room.w/2+(k-6)*45,E.S.room.h*.3,k%3===0);
 for(let t=0;t<360;t++){const e=E.nearest(p);E.step(1/60,[{ax:e?.x||p.x,ay:e?.y||p.y-100,fire:true,skill:t%300===0,dash:t%120===0,x:Math.sin(t*.025)*.7,y:Math.cos(t*.025)*.7,res:true}]);p.inv=999;if(E.S.room.clear)break}
 for(const arr of [E.S.players,E.S.enemies,E.S.bullets])for(const o of arr){assert(Number.isFinite(o.x));assert(Number.isFinite(o.y))}E.save();const seed=E.S.seed;E.S=null;E.restore();assert.equal(E.S.seed,seed);
}
E.newRun('companion','COOP-QA');assert.equal(E.S.players.length,2);const p=E.S.players[1];p.down=true;p.hp=0;p.downTime=40;E.S.players[0].x=p.x;E.S.players[0].y=p.y;for(let i=0;i<200;i++)E.use(E.S.players[0],1/60);assert(!p.down);
const result={version:E.version,maps,minrooms,maxrooms,rooms,bosses,modules:E.items.length,weapons:Object.keys(E.weapons).length,saveRestore:true,revive:true,technicalProgression:true,naturalPlaythrough:false,physicalPhones:false};fs.writeFileSync(__dirname+'/QA_RESULTS.json',JSON.stringify(result,null,2)+'\n');console.log(result);
