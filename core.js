/* HELIOS / ENTROPY — self-contained, dependency-free roguelike. */
'use strict';
const E=window.E={version:'3.0.0-entropy',S:null,mode:'solo',seat:0,screen:'title',menu:null,clock:0,fx:[],notices:[],lastFX:0,cam:{x:0,y:0},keys:new Set(),pressed:new Set(),mouse:{x:0,y:0,down:false},touch:{x:0,y:0,ax:1,ay:0,aim:false,fire:false},cache:new Map(),net:{ws:null,code:'',token:'',online:false,connected:[false,false],input:{},inputAt:0},uiKey:'',acc:0};
E.$=s=>document.querySelector(s);E.clamp=(x,a,b)=>Math.max(a,Math.min(b,x));E.len=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);E.mix=(a,b,t)=>a+(b-a)*t;E.esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
E.hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0||1};
E.random=seed=>{let n=seed>>>0||1;return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)/4294967296}};
E.rand=()=>{let n=E.S.rng;n^=n<<13;n^=n>>>17;n^=n<<5;E.S.rng=n>>>0;return E.S.rng/4294967296};E.range=(a,b)=>a+(b-a)*E.rand();E.pick=a=>a[Math.floor(E.rand()*a.length)];E.id=()=>++E.S.serial;
E.memory={};E.storageWarn=false;E.load=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??(E.memory[k]?JSON.parse(E.memory[k]):f)}catch{return E.memory[k]?JSON.parse(E.memory[k]):f}};E.store=(k,v)=>{const text=JSON.stringify(v);E.memory[k]=text;try{localStorage.setItem(k,text);return true}catch{E.storageWarn=true;return false}};
E.opts={quality:'high',auto:true,aim:true,volume:.3,shake:false,...E.load('helios3-options',{})};E.profile={wins:0,runs:0,best:0,...E.load('helios3-profile',{})};E.coarse=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;
E.colors=['#73f6df','#ffbe7c'];
E.classes={
 warden:{name:'Бастион',glyph:'▣',hp:145,shield:48,speed:235,cd:11,skill:'Гравиудар',desc:'Удар по площади, уничтожение пуль и временная броня.'},
 scout:{name:'Фантом',glyph:'◇',hp:100,shield:30,speed:285,cd:10,skill:'Фазовый импульс',desc:'Веер пробивающих зарядов и ускоренная стрельба.'},
 engineer:{name:'Механик',glyph:'⌘',hp:115,shield:38,speed:250,cd:15,skill:'Сторожевая турель',desc:'Устанавливает турель на 12 секунд.'},
 medic:{name:'Биотех',glyph:'✚',hp:120,shield:34,speed:250,cd:18,skill:'Регенерация',desc:'Лечебное поле на 6 секунд. Быстрее поднимает напарника.'}
};
E.weapons={
 carbine:{name:'Карабин',dmg:17,rate:.18,clip:25,reload:1.2,speed:840,pellets:1,spread:.025,range:1100},
 scatter:{name:'Шквал',dmg:11,rate:.65,clip:7,reload:1.65,speed:720,pellets:6,spread:.24,range:550},
 arc:{name:'Дуга',dmg:27,rate:.46,clip:12,reload:1.5,speed:660,pellets:1,spread:0,range:1000,chain:2},
 rail:{name:'Рельс',dmg:84,rate:.88,clip:5,reload:1.75,speed:1450,pellets:1,spread:0,range:1400,pierce:3},
 smg:{name:'Рой',dmg:9,rate:.08,clip:40,reload:1.5,speed:800,pellets:1,spread:.07,range:850},
 plasma:{name:'Плазма',dmg:47,rate:.78,clip:6,reload:1.8,speed:480,pellets:1,spread:.02,range:1100,blast:100}
};
E.biomes=[
 {name:'Орбитальные доки',sub:'Сталь · вакуум · аварийный свет',color:'#66e9e0',floor:'#172e3b',metal:'#3d6672',bg:'#08111c',boss:'ЦЕРБЕР',bossSub:'Охранный комплекс',icon:'◈'},
 {name:'Затопленный сад',sub:'Биосинтез · споры · живая вода',color:'#b8ee7f',floor:'#1d352e',metal:'#506650',bg:'#071916',boss:'САДОВНИК',bossSub:'Коллективный организм',icon:'❋'},
 {name:'Криохранилище',sub:'Лёд · туман · зеркальные осколки',color:'#9fd5ff',floor:'#233c54',metal:'#557d9a',bg:'#091424',boss:'ПРИЗМА',bossSub:'Архитектор холода',icon:'✧'},
 {name:'Промышленное солнце',sub:'Литейная · раскалённые каналы · искры',color:'#ffb16c',floor:'#3a2b2b',metal:'#7b6254',bg:'#190f16',boss:'ГЕФЕСТ',bossSub:'Реакторный колосс',icon:'☼'},
 {name:'Нулевая орбита',sub:'Гравитация · разлом · свет звезды',color:'#c7a0ff',floor:'#302948',metal:'#6c588f',bg:'#100b20',boss:'ГЕЛИОС',bossSub:'Последняя воля станции',icon:'◎'}
];
// Every module below is implemented in stats or in the combat/room hooks.
E.items=[
 ['damage','Вольфрам','↗','Урон +18%.','attack',5],['rate','Овердрайв','»','Скорострельность +16%.','attack',5],
 ['hp','Живой каркас','♥','Здоровье +25; восстанавливает 25 HP.','defense',4],['shield','Ионный панцирь','⬡','Щит +20; сразу заряжает щит.','defense',4],
 ['speed','Сервопривод','↠','Скорость движения +9%.','utility',3],['crit','Предиктор','⌖','Шанс двойного урона +11%.','attack',4],
 ['burn','Термит','♨','Попадания поджигают цель на 3 секунды.','element',3],['frost','Абсолютный ноль','❄','Попадания замедляют цель на 25%.','element',2],
 ['chain','Катушка Теслы','ϟ','Разряд перепрыгивает на ещё одну цель.','element',3],['pierce','Фазовый канал','⇢','Снаряды пробивают ещё одну цель.','attack',3],
 ['bounce','Рикошет','⤨','Снаряды один раз отскакивают от стен и укрытий.','wild',2],['homing','Умный рой','⌁','Снаряды доворачивают к ближайшему врагу.','wild',2],
 ['double','Раздвоитель','⋔','Два дополнительных снаряда; урон каждого −26%.','wild',2],['giant','Тяжёлое ядро','●','Снаряды крупнее; урон +35%, скорость −22%.','wild',2],
 ['drone','Спутник','✧','Боевой дрон стреляет рядом с вами.','utility',3],['vamp','Рекуператор','♦','Убийство восстанавливает 1,2 HP.','defense',3],
 ['blast','Цепной распад','✹','Погибшие враги взрываются: 24 урона.','element',3],['dash','Фазовая батарея','◇','Перезарядка рывка −22%.','utility',3],
 ['nova','Ударная волна','◌','После рывка: взрыв на 40 урона.','wild',2],['armor','Керамика','▰','Получаемый урон −10%.','defense',4],
 ['reload','Магнитный магазин','↻','Перезарядка −20%, магазин +20%.','attack',3],['cooldown','Сопроцессор','⌘','Перезарядка способности −17%.','utility',3],
 ['regen','Клеточная фабрика','✚','После зачистки восстанавливает 6 HP.','defense',3],['luck','Чёрный ящик','?','На 15% больше кредитов; выше шанс аптечки.','utility',3],
 ['glass','Стеклянная звезда','✦','Урон +45%, максимум здоровья −20.','wild',2],['thorns','Контур возмездия','⚡','При получении урона: разряд на 24 урона.','element',3],
 ['orbit','Орбитальный щит','⊙','Спутники блокируют пули и ранят близких врагов.','defense',3],['focus','Охотник','⌖','Урон боссам и элитным врагам +25%.','attack',3],
 ['execute','Сборщик эха','†','Убийство выпускает четыре слабых снаряда.','wild',2],['gravity','Сингулярность','◉','Попадания слабо стягивают соседних врагов.','wild',2],
 ['momentum','Кинетический привод','≋','Урон +25% во время движения.','attack',2],['fortune','Золотая жила','¤','До +40% урона от накопленных кредитов.','wild',2],
 ['battery','Аварийный резерв','▱','Рывок восстанавливает 8 единиц щита.','defense',3],['burst','Тройное эхо','∴','Каждый четвёртый выстрел выпускает три боковых заряда.','attack',2],
 ['leech','Паразитный импульс','ψ','Критические попадания восстанавливают 2 щита.','wild',2],['resonance','Резонатор','∞','Ультимейт накапливается на 35% быстрее.','utility',3]
].map(([id,name,icon,desc,tag,max])=>({id,name,icon,desc,tag,max}));E.item=Object.fromEntries(E.items.map(x=>[x.id,x]));
E.synergies=[['chain','frost','Сверхпроводимость','Цепные попадания дополнительно замедляют.'],['blast','burn','Феникс','Радиус взрыва погибших врагов увеличен.'],['homing','double','Созвездие','Раздвоенные снаряды получают +12% урона.'],['vamp','glass','Кровавая звезда','Ещё +1 HP за убийство.'],['nova','battery','Грозовой шаг','Взрыв рывка наносит +30 урона.'],['drone','rate','Машинный хор','Дроны используют вашу скорострельность.']];
E.enemies={
 skitter:{name:'Резак',hp:44,r:16,speed:118,dmg:12,color:'#f1889b'},charger:{name:'Гончая',hp:82,r:20,speed:95,dmg:19,color:'#ffa76f'},shooter:{name:'Стрелок',hp:68,r:18,speed:75,dmg:13,color:'#de9dff'},
 sniper:{name:'Наблюдатель',hp:68,r:18,speed:55,dmg:23,color:'#d49fff'},brute:{name:'Грузчик',hp:215,r:29,speed:65,dmg:24,color:'#d8b28a'},healer:{name:'Ремонтник',hp:105,r:20,speed:72,dmg:9,color:'#a9f1c5'},
 bomber:{name:'Взрывной носитель',hp:36,r:14,speed:135,dmg:28,color:'#ffb664'},splitter:{name:'Репликатор',hp:102,r:24,speed:75,dmg:14,color:'#badf83'},prism:{name:'Призма',hp:105,r:22,speed:60,dmg:14,color:'#a7b8ff'},turret:{name:'Страж',hp:130,r:22,speed:0,dmg:13,color:'#f292ba'}
};
E.kind={start:['Шлюз','⌂'],combat:['Охрана','•'],elite:['Элита','▲'],treasure:['Артефакт','✦'],shop:['Снабжение','¤'],repair:['Медблок','✚'],event:['Аномалия','?'],challenge:['Испытание','⚔'],curse:['Сделка','ψ'],boss:['Управляющий узел','☠']};
E.config={cls:['warden','scout'],weapon:['carbine','arc'],diff:2,seed:'',names:['Искатель','Напарник'],ready:[true,false]};
E.stats=p=>{const c=E.classes[p.cls],m=p.mods,w=E.weapons[p.weapon];return {hp:Math.max(35,c.hp+25*(m.hp||0)-20*(m.glass||0)),shield:c.shield+20*(m.shield||0),speed:c.speed*(1+.09*(m.speed||0)),damage:(1+.18*(m.damage||0)+.45*(m.glass||0)+.35*(m.giant||0))*(1+(m.fortune||0)*Math.min(.4,(E.S?.coins||0)/400)),rate:1+.16*(m.rate||0),armor:.9**(m.armor||0),crit:.05+.11*(m.crit||0),reload:w.reload*.8**(m.reload||0),clip:Math.round(w.clip*(1+.2*(m.reload||0))),cd:c.cd*.83**(m.cooldown||0),dash:2.7*.78**(m.dash||0)}};
E.player=i=>{const cls=E.config.cls[i],w=E.config.weapon[i],c=E.classes[cls];return {id:i,cls,weapon:w,name:E.config.names[i],x:600,y:400,r:18,hp:c.hp,shield:c.shield,mods:{},angle:0,fire:0,reload:0,ammo:E.weapons[w].clip,skill:0,dash:0,dashT:0,inv:1.6,hurt:0,buff:0,down:false,downTime:0,revive:0,shots:0,kills:0,droneT:0,orbitT:0,move:0,slow:0,steps:0}};
E.notice=(text,bad=false)=>{E.notices.push({text,bad,end:E.clock+4});if(E.notices.length>3)E.notices.shift()};
E.event=(type,x,y,color,value=0)=>{const s=E.S;s.events.push({id:++s.eventId,type,x,y,color,value});if(s.events.length>70)s.events.shift()};
E.offerItems=p=>{let pool=E.items.filter(x=>(p.mods[x.id]||0)<x.max);const out=[];while(out.length<3&&pool.length){const j=Math.floor(E.rand()*pool.length);out.push(pool.splice(j,1)[0].id)}return out.length?out:['hp','shield','damage']};
E.give=(p,id)=>{if(!E.item[id])return;p.mods[id]=(p.mods[id]||0)+1;const st=E.stats(p);p.hp=E.clamp(p.hp+(id==='hp'?25:0),1,st.hp);if(id==='shield')p.shield=st.shield;if(id==='reload')p.ammo=st.clip;E.event('pickup',p.x,p.y,E.colors[p.id],id);};
E.offer=(source='artifact')=>{const s=E.S;if(s.offer)return;s.offer={type:'item',source,options:s.players.map(E.offerItems),picked:s.players.map(()=>false)};if(s.mode==='companion'){let o=s.offer;E.give(s.players[1],o.options[1][0]);o.picked[1]=true}E.save();};
E.save=()=>{if(!E.S||['win','loss'].includes(E.S.status))return;E.store('helios3-save',{version:E.version,config:E.config,state:E.S})};
E.newRun=(mode=E.mode,seed=E.config.seed)=>{E.mode=mode;E.seat=mode==='online'?E.seat:0;seed=seed?.trim()||('HX-'+Math.random().toString(36).slice(2,9).toUpperCase());E.S={version:E.version,seed,rng:E.hash(seed),serial:1,mode,diff:E.config.diff,floor:0,t:0,status:'play',paused:false,players:[E.player(0)],coins:0,keys:1,resonance:0,surge:0,kills:0,rooms:0,events:[],eventId:0,enemies:[],bullets:[],hazards:[],effects:[],drops:[],offer:null,roomsTotal:0};if(mode!=='solo')E.S.players.push(E.player(1));E.screen='game';E.menu=null;E.lastFX=0;E.fx=[];E.profile.runs++;E.store('helios3-profile',E.profile);E.newFloor();E.audio?.start();};
E.restore=()=>{const d=E.load('helios3-save',null);if(!d||d.version!==E.version)return E.notice('Нет совместимого сохранения.',true);E.S=d.state;E.config=d.config;E.mode=E.S.mode;E.screen='game';E.menu=null;E.S.paused=false;E.lastFX=E.S.eventId;E.fx=[];E.cache.clear();E.cam.snap=true;E.notice('Забег восстановлен.');};
E.finish=win=>{const s=E.S;if(s.status!=='play')return;s.status=win?'win':'loss';s.offer=null;s.bullets=[];s.hazards=[];s.paused=false;E.menu=null;E.profile.best=Math.max(E.profile.best,s.floor+Number(win));if(win)E.profile.wins++;E.store('helios3-profile',E.profile);delete E.memory['helios3-save'];try{localStorage.removeItem('helios3-save')}catch{};E.event(win?'victory':'death',s.players[0].x,s.players[0].y,win?'#f4d79b':'#ff6f90',160);};
E.daily=()=>new Date().toISOString().slice(0,10);
E.audio={ctx:null,master:null,t:0,start(){try{if(!this.ctx){this.ctx=new (window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.connect(this.ctx.destination)}this.master.gain.value=E.opts.volume*.12;if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})}catch{}},play(type){const c=this.ctx;if(!c||!E.opts.volume||c.state!=='running')return;if(type==='shot'&&E.clock-this.t<.06)return;if(type==='shot')this.t=E.clock;const o=c.createOscillator(),g=c.createGain(),t=c.currentTime;const f=type==='shot'?170:type==='hit'?90:type==='pickup'?720:type==='death'?55:340;o.type=type==='shot'?'triangle':'sine';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(type==='pickup'?1100:Math.max(25,f*.3),t+.12);g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+.17)}};
