const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='lineupMaker.pwa.v1';
const POS=['투수','포수','1루수','2루수','3루수','유격수','좌익수','중견수','우익수','지명타자','없음'];
const FIELD_POS=POS.slice(0,9);
const coords={투수:[.50,.56],포수:[.50,.84],'1루수':[.71,.59],'2루수':[.62,.43],'3루수':[.29,.59],유격수:[.41,.43],좌익수:[.26,.26],중견수:[.50,.18],우익수:[.74,.26],지명타자:[.30,.78]};
const offsets={투수:[0,-20],포수:[-5,-20],'1루수':[0,-30],'3루수':[0,-30],유격수:[-35,0],지명타자:[0,-30]};
const dict={ko:{position:'포지션',lineup:'라인업',settings:'설정',starters:'선발',bench:'벤치',teamSettings:'팀 설정',teamName:'팀명',defaultPlayers:'기본 출전 선수',dh:'지명타자',use:'사용',notUse:'미사용',benchPosition:'포지션 탭 벤치멤버',show:'보이기',hide:'숨기기',language:'언어',playerManagement:'선수 관리',number:'등번호',name:'이름',saveLineup:'라인업 저장',saveImage:'저장'},en:{position:'Positions',lineup:'Lineup',settings:'Settings',starters:'Starters',bench:'Bench',teamSettings:'Team Settings',teamName:'Team Name',defaultPlayers:'Default Players',dh:'Designated Hitter',use:'Use',notUse:'Off',benchPosition:'Bench on Field',show:'Show',hide:'Hide',language:'Language',playerManagement:'Players',number:'No.',name:'Name',saveLineup:'Save Lineup',saveImage:'Save'},ja:{position:'守備位置',lineup:'ラインナップ',settings:'設定',starters:'スタメン',bench:'ベンチ',teamSettings:'チーム設定',teamName:'チーム名',defaultPlayers:'基本出場人数',dh:'指名打者',use:'使用',notUse:'未使用',benchPosition:'守備画面ベンチ',show:'表示',hide:'非表示',language:'言語',playerManagement:'選手管理',number:'背番号',name:'名前',saveLineup:'ラインナップ保存',saveImage:'保存'}};
const posLabel=(p,l)=>({en:{투수:'Pitcher',포수:'Catcher','1루수':'1B','2루수':'2B','3루수':'3B',유격수:'SS',좌익수:'LF',중견수:'CF',우익수:'RF',지명타자:'DH',없음:'None'},ja:{투수:'投手',포수:'捕手','1루수':'一塁手','2루수':'二塁手','3루수':'三塁手',유격수:'遊撃手',좌익수:'左翼手',중견수:'中堅手',우익수:'右翼手',지명타자:'指名打者',없음:'なし'}}[l]?.[p]||p);
const demoPlayers=[
['3','이병철','중견수'],['6','정호준','유격수'],['11','차현준','3루수'],['12','박연재','없음'],['14','함형민','우익수'],['16','김양채','좌익수'],['18','김병훈','중견수'],['19','김기욱','1루수'],['20','이상륜','2루수'],['26','김동우','좌익수'],['31','박수완','포수'],['42','이기령','1루수'],['51','유준혁','투수'],['58','김병선','투수'],['77','황우성','없음']
].map((x,i)=>({id:'p'+i,num:x[0],name:x[1],primary:POS.includes(x[2])?x[2]:'없음'}));
const demoStarterPlan=[
['p0','중견수'],['p1','유격수'],['p2','3루수'],['p4','우익수'],['p5','좌익수'],['p7','1루수'],['p8','2루수'],['p10','포수'],['p12','투수'],['p14','지명타자']
];
const demoBenchIds=['p3','p6','p9','p11','p13'];
const fresh=()=>({lang:null,gameTitle:'Title',teamName:'블루삭스',defaultCount:9,usesDH:true,showBench:true,players:demoPlayers,starters:demoStarterPlan.map((x,i)=>({id:'s'+i,playerId:x[0],position:x[1]})),bench:demoBenchIds.map((id,i)=>({id:'b'+i,playerId:id,position:'없음'})),saved:[]});
let state; try{state=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{state=fresh()}
const legacyLanguageMap={korean:'ko',english:'en',japanese:'ja',한국어:'ko',영어:'en',일본어:'ja'};
state.lang=legacyLanguageMap[state.lang]||state.lang||'ko';
if(!dict[state.lang]) state.lang='ko';
let undo=[],redo=[];
function snapshot(){undo.push(JSON.stringify(state));if(undo.length>50)undo.shift();redo=[]}
function persist(){localStorage.setItem(KEY,JSON.stringify(state))}
function commit(){persist();renderAll()}
function player(id){return state.players.find(p=>p.id===id)}
function jerseyNumberValue(value){
  const text=String(value??'').trim();
  const match=text.match(/^-?\d+(?:\.\d+)?/);
  return match?Number(match[0]):Number.POSITIVE_INFINITY;
}
function sortPlayersByNumber(){
  state.players.sort((a,b)=>{
    const diff=jerseyNumberValue(a.num)-jerseyNumberValue(b.num);
    if(Number.isFinite(diff)&&diff!==0)return diff;
    if(Number.isFinite(jerseyNumberValue(a.num))&&!Number.isFinite(jerseyNumberValue(b.num)))return -1;
    if(!Number.isFinite(jerseyNumberValue(a.num))&&Number.isFinite(jerseyNumberValue(b.num)))return 1;
    return String(a.num??'').localeCompare(String(b.num??''),'ko',{numeric:true,sensitivity:'base'})||String(a.name??'').localeCompare(String(b.name??''),'ko');
  });
}

function parseSeasonGroup(title=''){
  const text=String(title||'');
  const yearMatch=text.match(/(?:19|20)\d{2}/);
  const half=text.includes('전반기')?'전반기':text.includes('후반기')?'후반기':null;
  return {year:yearMatch?yearMatch[0]:null,half};
}
function ensureSavedMetadata(){
  if(!Array.isArray(state.saved))state.saved=[];
  let changed=false;
  state.saved.forEach(g=>{
    if(!g.recordId){g.recordId=crypto.randomUUID();changed=true}
    if(typeof g.attendanceConfirmed!=='boolean'){g.attendanceConfirmed=false;changed=true}
    if(!Array.isArray(g.attendanceIds)){g.attendanceIds=[];changed=true}
  });
  if(changed)persist();
}
function attendanceCount(playerId,year,half=null){
  if(!playerId||!year)return 0;
  return state.saved.reduce((count,g)=>{
    if(!g.attendanceConfirmed||!Array.isArray(g.attendanceIds)||!g.attendanceIds.includes(playerId))return count;
    const group=parseSeasonGroup(g.gameTitle);
    if(group.year!==String(year))return count;
    if(half&&group.half!==half)return count;
    if(!half&&!group.half)return count;
    return count+1;
  },0);
}
function attendanceSummary(playerId,year){
  return {
    season:attendanceCount(playerId,year,null),
    first:attendanceCount(playerId,year,'전반기'),
    second:attendanceCount(playerId,year,'후반기')
  };
}
let attendanceOpenId=null;
const attendanceDrafts=new Map();
function attendanceRosterIds(g){
  const ids=[];
  [...(Array.isArray(g.starters)?g.starters:[]),...(Array.isArray(g.bench)?g.bench:[])].forEach(slot=>{
    if(slot&&slot.playerId&&!ids.includes(slot.playerId))ids.push(slot.playerId);
  });
  return ids;
}
function attendanceDefaultIds(g){
  return attendanceRosterIds(g);
}
function attendanceDraft(g){
  if(!attendanceDrafts.has(g.recordId)){
    attendanceDrafts.set(g.recordId,new Set(g.attendanceConfirmed?g.attendanceIds:attendanceDefaultIds(g)));
  }
  return attendanceDrafts.get(g.recordId);
}
function t(k){const lang=dict[state.lang]?state.lang:'ko';return dict[lang]?.[k]||dict.ko[k]||k}
function toast(msg){const e=$('#toast');e.textContent=msg;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),1600)}
function optionsPlayers(selected){return `<option value="">—</option>`+state.players.map(p=>`<option value="${p.id}" ${p.id===selected?'selected':''}>${esc(p.name)}</option>`).join('')}
function optionsPos(selected){return POS.filter(p=>state.usesDH||p!=='지명타자').map(p=>`<option value="${p}" ${p===selected?'selected':''}>${posLabel(p,state.lang)}</option>`).join('')}
function esc(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderAll(){applyI18n();$('#gameTitle').value=state.gameTitle;renderField();renderPortrait();renderEditors();renderSettings();renderWarnings();$('#undoBtn').disabled=!undo.length;$('#redoBtn').disabled=!redo.length}
function applyI18n(){
  $$('[data-i]').forEach(e=>e.textContent=t(e.dataset.i));
  document.documentElement.lang=state.lang||'ko';
  const modalText={
    ko:{title:'이미지 저장',desc:'저장할 구성을 선택하세요.',position:'포지션',lineup:'라인업',combined:'포지션+라인업',cancel:'취소'},
    en:{title:'Save Image',desc:'Choose what to save.',position:'Position',lineup:'Lineup',combined:'Position + Lineup',cancel:'Cancel'},
    ja:{title:'画像を保存',desc:'保存する内容を選択してください。',position:'守備位置',lineup:'ラインナップ',combined:'守備位置+ラインナップ',cancel:'キャンセル'}
  }[state.lang]||null;
  if(modalText){
    $('#saveImageTitle').textContent=modalText.title;
    $('#saveImageDescription').textContent=modalText.desc;
    $('[data-image-type="position"]').textContent=modalText.position;
    $('[data-image-type="lineup"]').textContent=modalText.lineup;
    $('[data-image-type="combined"]').textContent=modalText.combined;
    $('#cancelImageSave').textContent=modalText.cancel;
  }
}
function renderField(){const markers=$('#markers');markers.innerHTML='';const field=$('#field');const offsetScale=Math.min(1,Math.max(.34,field.clientWidth/900));const positions=[...FIELD_POS,...(state.usesDH?['지명타자']:[])];positions.forEach(pos=>{const entry=state.starters.find(x=>x.position===pos),p=entry&&player(entry.playerId);const [x,y]=coords[pos], [ox,oy]=offsets[pos]||[0,0];const m=document.createElement('div');m.className='marker '+(!p?'empty':'');m.dataset.dropPosition=pos;m.style.left=`calc(${x*100}% + ${Math.round(ox*offsetScale)}px)`;m.style.top=`calc(${y*100}% + ${Math.round(oy*offsetScale)}px)`;m.innerHTML=`<strong>${p?`#${esc(p.num)} ${esc(p.name)}`:posLabel(pos,state.lang)}</strong><small>${posLabel(pos,state.lang)}</small>`;if(entry){setupDrag(m,{type:'entry',id:entry.id,source:'starter'})}markers.appendChild(m)});const bp=$('#benchPanel');bp.style.display=state.showBench?'block':'none';bp.innerHTML=`<h3>${t('bench')}</h3>`+state.bench.slice(0,8).map(e=>{const p=player(e.playerId);return `<div class="bench-mini" data-bench-id="${e.id}"><span>${p?.num||'-'}</span><span>${esc(p?.name||'—')}</span></div>`}).join('');$$('[data-bench-id]').forEach(el=>setupDrag(el,{type:'entry',id:el.dataset.benchId,source:'bench'}));bp.dataset.dropBench='1'}
function renderPortrait(){const host=$('#portraitTable');host.innerHTML=`<div class="portrait-lineup"><section class="portrait-roster-section portrait-starters-watermark"><h3>${t('starters')}</h3><div class="portrait-head starter-five"><span>타순</span><span>${t('number')}</span><span>${t('name')}</span><span>${t('position')}</span><span></span></div><div id="pStart"></div></section><div class="bench-divider"></div><section class="portrait-roster-section portrait-bench-watermark"><h3>${t('bench')}</h3><div class="portrait-head bench-only"><span>${t('number')}</span><span>${t('name')}</span></div><div id="pBench"></div></section></div>`;state.starters.forEach((e,i)=>{$('#pStart').insertAdjacentHTML('beforeend',portraitRow(e,i,'starter'))});state.bench.forEach(e=>{$('#pBench').insertAdjacentHTML('beforeend',benchPortraitRow(e))});$$('.name-drag').forEach(el=>setupDrag(el,{type:'order',id:el.dataset.id,source:el.dataset.source}));$$('.portrait-pos-select').forEach(el=>{el.onchange=ev=>{const entry=state.starters.find(x=>x.id===el.dataset.id);if(!entry)return;snapshot();entry.position=ev.target.value;commit()}});$$('.position-drag-handle').forEach(el=>setupPositionHandle(el,{type:'positionCell',id:el.dataset.id,source:'starter'}));}
function portraitRow(e,i,source){const p=player(e.playerId);return `<div class="portrait-row starter-five" data-drop-row="${e.id}" data-source="${source}"><span>${i+1}</span><span>${p?.num||'-'}</span><span class="drag-cell name-drag" data-id="${e.id}" data-source="${source}">${esc(p?.name||'—')}</span><select class="portrait-pos-select" data-id="${e.id}" aria-label="${t('position')}">${optionsPos(e.position)}</select><button type="button" class="position-drag-handle" data-id="${e.id}" aria-label="포지션 드래그">≡</button></div>`}
function benchPortraitRow(e){const p=player(e.playerId);return `<div class="portrait-row bench-only" data-drop-row="${e.id}" data-source="bench"><span>${p?.num||'-'}</span><span class="drag-cell name-drag" data-id="${e.id}" data-source="bench">${esc(p?.name||'—')}</span></div>`}
function renderEditors(){const s=$('#starterEditor');s.innerHTML=`<div class="table-head"><span>타순</span><span>${t('number')}</span><span>${t('name')}</span><span>${t('position')}</span><span></span></div>`;state.starters.forEach((e,i)=>{const p=player(e.playerId);s.insertAdjacentHTML('beforeend',`<div class="starter-row" data-sid="${e.id}" data-drop-row="${e.id}" data-source="starter"><div class="order">${i+1}</div><div class="number">${p?.num||'—'}</div><div class="editor-drag-wrap"><select class="playerSelect">${optionsPlayers(e.playerId)}</select><button type="button" class="editor-drag-handle order-handle" data-id="${e.id}" aria-label="타순 드래그">≡</button></div><div class="editor-drag-wrap"><select class="posSelect">${optionsPos(e.position)}</select><button type="button" class="editor-drag-handle position-handle" data-id="${e.id}" aria-label="포지션 드래그">≡</button></div><button class="remove">×</button></div>`)});const b=$('#benchEditor');b.innerHTML=`<div class="bench-head"><span>${t('number')}</span><span>${t('name')}</span><span></span></div>`;state.bench.forEach(e=>{const p=player(e.playerId);b.insertAdjacentHTML('beforeend',`<div class="bench-row" data-bid="${e.id}"><div class="number">${p?.num||'—'}</div><select>${optionsPlayers(e.playerId)}</select><button class="remove">×</button></div>`)});$$('[data-sid]').forEach(row=>{const e=state.starters.find(x=>x.id===row.dataset.sid);row.querySelector('.playerSelect').onchange=ev=>{snapshot();e.playerId=ev.target.value;commit()};row.querySelector('.posSelect').onchange=ev=>{snapshot();e.position=ev.target.value;commit()};row.querySelector('.remove').onclick=()=>{snapshot();state.starters=state.starters.filter(x=>x.id!==e.id);commit()}});$$('.order-handle').forEach(el=>setupEditorDragHandle(el,{type:'order',id:el.dataset.id,source:'starter'},'타순 이동'));$$('.position-handle').forEach(el=>setupEditorDragHandle(el,{type:'positionCell',id:el.dataset.id,source:'starter'},'포지션 이동'));$$('[data-bid]').forEach(row=>{const e=state.bench.find(x=>x.id===row.dataset.bid);row.querySelector('select').onchange=ev=>{snapshot();e.playerId=ev.target.value;commit()};row.querySelector('.remove').onclick=()=>{snapshot();state.bench=state.bench.filter(x=>x.id!==e.id);commit()}})}
function renderSettings(){
  $$('input[name=dh]').forEach(r=>r.checked=(r.value==='on')===state.usesDH);
  $$('input[name=showBench]').forEach(r=>r.checked=(r.value==='on')===state.showBench);

  const pm=$('#playerManager');
  pm.innerHTML='';
  state.players.forEach(p=>pm.insertAdjacentHTML('beforeend',`<div class="player-row" data-pid="${p.id}"><input class="pnum" value="${esc(p.num)}"><input class="pname" value="${esc(p.name)}"><select class="ppos">${optionsPos(p.primary)}</select><button class="remove">×</button></div>`));
  $$('[data-pid]').forEach(row=>{
    const p=player(row.dataset.pid);
    row.querySelector('.pnum').onchange=e=>{snapshot();p.num=e.target.value;commit()};
    row.querySelector('.pname').onchange=e=>{snapshot();p.name=e.target.value;commit()};
    row.querySelector('.ppos').onchange=e=>{snapshot();p.primary=e.target.value;commit()};
    row.querySelector('.remove').onclick=()=>{snapshot();state.players=state.players.filter(x=>x.id!==p.id);state.starters.forEach(x=>{if(x.playerId===p.id)x.playerId=''});state.bench.forEach(x=>{if(x.playerId===p.id)x.playerId=''});commit()};
  });

  const am=$('#attendanceManager');
  const managed=state.saved.map((g,i)=>({g,i,group:parseSeasonGroup(g.gameTitle)})).filter(x=>x.group.year&&x.group.half);
  if(!managed.length){
    am.innerHTML='<div class="attendance-empty">전반기 또는 후반기가 포함된 저장 경기가 없습니다.</div>';
  }else{
    am.innerHTML=managed.map(({g,i,group})=>{
      const open=attendanceOpenId===g.recordId;
      const status=g.attendanceConfirmed?'완료':'미확정';
      const rosterIds=attendanceRosterIds(g);
      const playerSource=Array.isArray(g.players)?g.players:state.players;
      const savedPlayers=rosterIds.map(id=>playerSource.find(p=>p.id===id)||state.players.find(p=>p.id===id)).filter(Boolean).sort((a,b)=>jerseyNumberValue(a.num)-jerseyNumberValue(b.num));
      const draft=attendanceDraft(g);
      const body=open?`<div class="attendance-body" data-attendance-body="${g.recordId}">
        <div class="attendance-meta">${group.year} ${group.half} · 출전하지 않은 선수만 체크 해제</div>
        <div class="attendance-player-list">${savedPlayers.map(p=>`<label class="attendance-player"><input type="checkbox" data-attendance-check="${g.recordId}" data-player-id="${p.id}" ${draft.has(p.id)?'checked':''}><span class="attendance-num">${esc(String(p.num||'-'))}</span><span>${esc(p.name||'—')}</span></label>`).join('')}</div>
        <div class="attendance-actions"><button type="button" data-attendance-all="${g.recordId}">전체 선택</button><button type="button" class="primary attendance-save" data-attendance-save="${g.recordId}">출전 저장</button></div>
      </div>`:'';
      return `<div class="attendance-game ${open?'open':''}" data-attendance-game="${g.recordId}"><button type="button" class="attendance-summary" data-attendance-toggle="${g.recordId}" aria-expanded="${open?'true':'false'}"><span class="attendance-title">${esc(g.gameTitle||'제목 없음')}</span><span class="attendance-status ${g.attendanceConfirmed?'done':'pending'}">${status}</span><span class="attendance-chevron">${open?'⌃':'⌄'}</span></button>${body}</div>`;
    }).join('');
  }
  $$('[data-attendance-toggle]').forEach(b=>b.onclick=()=>{attendanceOpenId=attendanceOpenId===b.dataset.attendanceToggle?null:b.dataset.attendanceToggle;renderSettings()});
  $$('[data-attendance-check]').forEach(c=>c.onchange=()=>{const g=state.saved.find(x=>x.recordId===c.dataset.attendanceCheck);if(!g)return;const draft=attendanceDraft(g);c.checked?draft.add(c.dataset.playerId):draft.delete(c.dataset.playerId)});
  $$('[data-attendance-all]').forEach(b=>b.onclick=()=>{const g=state.saved.find(x=>x.recordId===b.dataset.attendanceAll);if(!g)return;attendanceDrafts.set(g.recordId,new Set(attendanceDefaultIds(g)));renderSettings()});
  $$('[data-attendance-save]').forEach(b=>b.onclick=()=>{const g=state.saved.find(x=>x.recordId===b.dataset.attendanceSave);if(!g)return;snapshot();g.attendanceIds=[...attendanceDraft(g)];g.attendanceConfirmed=true;persist();renderSettings();toast('출전 기록을 저장했어요')});

  const sg=$('#savedGames');
  sg.innerHTML='<h3>저장된 경기</h3>'+state.saved.map((g,i)=>`<div class="saved-game"><span>${esc(g.gameTitle)}</span><button data-load="${i}">불러오기</button><button data-copy="${i}">복사</button><button data-del="${i}">삭제</button></div>`).join('');
  $$('[data-load]').forEach(b=>b.onclick=()=>{snapshot();Object.assign(state,JSON.parse(JSON.stringify(state.saved[+b.dataset.load])));state.saved=JSON.parse(localStorage.getItem(KEY)).saved||state.saved;ensureSavedMetadata();commit()});
  $$('[data-copy]').forEach(b=>{b.onclick=()=>{const g=JSON.parse(JSON.stringify(state.saved[+b.dataset.copy]));g.gameTitle+=' 복사본';g.starters.forEach(x=>x.id=crypto.randomUUID());g.bench.forEach(x=>x.id=crypto.randomUUID());delete g.recordId;g.attendanceConfirmed=false;g.attendanceIds=[];snapshot();Object.assign(state,g);commit()}});
  $$('[data-del]').forEach(b=>b.onclick=()=>{const g=state.saved[+b.dataset.del];if(g){attendanceDrafts.delete(g.recordId);if(attendanceOpenId===g.recordId)attendanceOpenId=null}snapshot();state.saved.splice(+b.dataset.del,1);commit()});
}
function renderWarnings(){const dupPos=state.starters.map(e=>e.position).filter(p=>p!=='없음'&&p!=='지명타자').filter((p,i,a)=>a.indexOf(p)!==i);const used=state.starters.map(e=>e.position);const miss=FIELD_POS.filter(p=>!used.includes(p));const ids=state.starters.concat(state.bench).map(e=>e.playerId).filter(Boolean);const dupPlayerIds=ids.filter((x,i,a)=>a.indexOf(x)!==i);const dupPlayerNames=[...new Set(dupPlayerIds.map(id=>player(id)?.name).filter(Boolean))];const msgs=[];if(dupPos.length)msgs.push('중복 포지션 배치 : '+[...new Set(dupPos)].join(', '));if(dupPlayerNames.length)msgs.push('중복 선수 출전 : '+dupPlayerNames.join(', '));if(miss.length)msgs.push('빠진 포지션 : '+miss.join(', '));const warnings=$('#warnings');warnings.textContent=msgs.join('\n');warnings.classList.toggle('has-warning',msgs.length>0)}
function handleDrop(payload,target){snapshot();const sourceArr=payload.source==='bench'?state.bench:state.starters;const src=sourceArr.find(x=>x.id===payload.id);if(!src)return; if(target.kind==='position'){const dst=state.starters.find(x=>x.position===target.position);if(payload.source==='bench'){state.bench=state.bench.filter(x=>x.id!==src.id);if(dst){state.starters=state.starters.filter(x=>x.id!==dst.id);state.bench.push({...dst,position:'없음'})}state.starters.push({...src,position:target.position})}else{if(dst&&dst.id!==src.id){const temp=src.position;src.position=dst.position;dst.position=temp}else src.position=target.position}}else if(target.kind==='bench'){if(payload.source==='starter'){state.starters=state.starters.filter(x=>x.id!==src.id);state.bench.push({...src,position:'없음'})}}else if(target.kind==='row'){const targetArr=target.source==='bench'?state.bench:state.starters;const dst=targetArr.find(x=>x.id===target.id);if(!dst)return;if(payload.type==='order'&&payload.source==='starter'&&target.source==='starter'){const a=state.starters.findIndex(x=>x.id===src.id),b=state.starters.findIndex(x=>x.id===dst.id);state.starters.splice(b,0,state.starters.splice(a,1)[0])}else if(payload.type==='positionCell'&&payload.source==='starter'&&target.source==='starter'){[src.position,dst.position]=[dst.position,src.position]}else if(payload.source!==target.source){
  if(payload.source==='bench'){
    const benchIndex=state.bench.findIndex(x=>x.id===src.id);
    const starterIndex=state.starters.findIndex(x=>x.id===dst.id);
    if(benchIndex<0||starterIndex<0)return;
    const promoted={...src,position:dst.position};
    const demoted={...dst,position:'없음'};
    state.starters.splice(starterIndex,1,promoted);
    state.bench.splice(benchIndex,1,demoted);
  }else{
    const starterIndex=state.starters.findIndex(x=>x.id===src.id);
    const benchIndex=state.bench.findIndex(x=>x.id===dst.id);
    if(starterIndex<0||benchIndex<0)return;
    const promoted={...dst,position:src.position};
    const demoted={...src,position:'없음'};
    state.starters.splice(starterIndex,1,promoted);
    state.bench.splice(benchIndex,1,demoted);
  }
}}commit()}
let drag=null;
function openPositionPicker(anchor,payload){
  closePositionPicker();
  const entry=state.starters.find(x=>x.id===payload.id);
  if(!entry)return;
  const pop=document.createElement('div');
  pop.id='positionPicker';
  pop.className='position-picker';
  pop.innerHTML=`<div class="position-picker-title">${t('position')}</div><div class="position-picker-list">${positions.filter(p=>state.usesDH||p!=='지명타자').map(p=>`<button type="button" data-position="${esc(p)}" class="${entry.position===p?'selected':''}">${posLabel(p,state.lang)}</button>`).join('')}</div>`;
  document.body.appendChild(pop);
  const r=anchor.getBoundingClientRect();
  const margin=10;
  const popW=Math.min(260,window.innerWidth-margin*2);
  let left=Math.min(Math.max(margin,r.left+r.width/2-popW/2),window.innerWidth-popW-margin);
  let top=r.bottom+6;
  pop.style.width=`${popW}px`;
  pop.style.left=`${left}px`;
  pop.style.top=`${top}px`;
  requestAnimationFrame(()=>{
    const pr=pop.getBoundingClientRect();
    if(pr.bottom>window.innerHeight-margin) pop.style.top=`${Math.max(margin,r.top-pr.height-6)}px`;
  });
  pop.querySelectorAll('[data-position]').forEach(btn=>btn.onclick=()=>{
    snapshot();
    entry.position=btn.dataset.position;
    closePositionPicker();
    commit();
  });
  setTimeout(()=>document.addEventListener('pointerdown',outsidePositionPicker,{capture:true,once:true}),0);
}
function outsidePositionPicker(e){const pop=$('#positionPicker');if(pop&&!pop.contains(e.target))closePositionPicker()}
function closePositionPicker(){const pop=$('#positionPicker');if(pop)pop.remove()}
function setupPositionTapAndHold(el,payload){
  let timer=null,startX=0,startY=0,pointerId=null,dragging=false,suppressClick=false;
  const cancelTimer=()=>{if(timer){clearTimeout(timer);timer=null}};

  // A normal tap is handled by the native click event. This is more reliable
  // than synthesizing a picker from pointerup on iOS Safari.
  el.onclick=e=>{
    if(suppressClick||dragging){
      e.preventDefault();
      e.stopPropagation();
      suppressClick=false;
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    openPositionPicker(el,payload);
  };

  el.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    closePositionPicker();
    startX=e.clientX;startY=e.clientY;pointerId=e.pointerId;dragging=false;suppressClick=false;
    el.classList.add('pressing');
    timer=setTimeout(()=>{
      timer=null;
      dragging=true;
      suppressClick=true;
      el.setPointerCapture?.(pointerId);
      drag={payload,startX,startY,el};
      const g=$('#dragGhost');
      g.textContent=el.textContent.trim();
      g.classList.remove('hidden');
      g.style.left=startX+'px';
      g.style.top=startY+'px';
      if(navigator.vibrate)navigator.vibrate(18);
      el.classList.add('long-press-active');
    },420);
  };

  el.onpointermove=e=>{
    if(pointerId!==e.pointerId)return;
    const dist=Math.hypot(e.clientX-startX,e.clientY-startY);
    if(!dragging&&dist>9){
      cancelTimer();
      el.classList.remove('pressing');
    }
    if(dragging&&drag&&drag.el===el){
      e.preventDefault();
      moveGhost(e);
      highlightTarget(e.clientX,e.clientY);
    }
  };

  el.onpointerup=e=>{
    if(pointerId!==e.pointerId)return;
    const wasDragging=dragging;
    cancelTimer();
    el.classList.remove('pressing','long-press-active');
    pointerId=null;
    dragging=false;
    if(wasDragging){
      e.preventDefault();
      const target=findTarget(e.clientX,e.clientY);
      clearDrag();
      if(target)handleDrop(payload,target);
      // iOS may emit a click after pointerup; suppress that single click.
      setTimeout(()=>{suppressClick=false},350);
    }
    // For a short tap, do nothing here and let the click event open the picker.
  };

  el.onpointercancel=()=>{
    cancelTimer();
    el.classList.remove('pressing','long-press-active');
    pointerId=null;
    dragging=false;
    suppressClick=false;
    if(drag&&drag.el===el)clearDrag();
  };
}

function setupEditorDragHandle(el,payload,label){
  let timer=null,pointerId=null,active=false,startX=0,startY=0;
  const stopTimer=()=>{if(timer){clearTimeout(timer);timer=null}};
  const unlock=()=>{document.body.classList.remove('position-dragging');el.classList.remove('drag-handle-active')};
  el.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;active=false;
    el.setPointerCapture?.(pointerId);
    timer=setTimeout(()=>{
      timer=null;active=true;
      document.body.classList.add('position-dragging');
      el.classList.add('drag-handle-active');
      drag={payload,startX,startY,el};
      const g=$('#dragGhost');g.textContent=label;g.classList.remove('hidden');g.style.left=startX+'px';g.style.top=startY+'px';
      navigator.vibrate?.(18);
    },360);
  };
  el.onpointermove=e=>{
    if(e.pointerId!==pointerId)return;
    const dist=Math.hypot(e.clientX-startX,e.clientY-startY);
    if(!active&&dist>8)stopTimer();
    if(active&&drag?.el===el){e.preventDefault();moveGhost(e);highlightTarget(e.clientX,e.clientY)}
  };
  el.onpointerup=e=>{
    if(e.pointerId!==pointerId)return;
    e.preventDefault();stopTimer();
    if(active){const target=findTarget(e.clientX,e.clientY);clearDrag();if(target)handleDrop(payload,target)}
    pointerId=null;active=false;unlock();
  };
  el.onpointercancel=()=>{stopTimer();if(drag?.el===el)clearDrag();pointerId=null;active=false;unlock()};
  el.oncontextmenu=e=>e.preventDefault();
}

function setupPositionHandle(el,payload){
  let timer=null,pointerId=null,active=false,startX=0,startY=0;
  const stopTimer=()=>{if(timer){clearTimeout(timer);timer=null}};
  const unlock=()=>{document.body.classList.remove('position-dragging');el.classList.remove('drag-handle-active')};
  el.onpointerdown=e=>{
    if(e.button!==undefined&&e.button!==0)return;
    e.preventDefault();e.stopPropagation();
    pointerId=e.pointerId;startX=e.clientX;startY=e.clientY;active=false;
    el.setPointerCapture?.(pointerId);
    timer=setTimeout(()=>{
      timer=null;active=true;
      document.body.classList.add('position-dragging');
      el.classList.add('drag-handle-active');
      drag={payload,startX,startY,el};
      const g=$('#dragGhost');g.textContent='포지션 이동';g.classList.remove('hidden');g.style.left=startX+'px';g.style.top=startY+'px';
      navigator.vibrate?.(18);
    },420);
  };
  el.onpointermove=e=>{
    if(e.pointerId!==pointerId)return;
    const dist=Math.hypot(e.clientX-startX,e.clientY-startY);
    if(!active&&dist>8){stopTimer();}
    if(active&&drag?.el===el){e.preventDefault();moveGhost(e);highlightTarget(e.clientX,e.clientY)}
  };
  el.onpointerup=e=>{
    if(e.pointerId!==pointerId)return;
    e.preventDefault();stopTimer();
    if(active){const target=findTarget(e.clientX,e.clientY);clearDrag();if(target)handleDrop(payload,target)}
    pointerId=null;active=false;unlock();
  };
  el.onpointercancel=()=>{stopTimer();if(drag?.el===el)clearDrag();pointerId=null;active=false;unlock()};
  el.oncontextmenu=e=>e.preventDefault();
}

function setupDrag(el,payload){el.onpointerdown=e=>{if(e.button!==undefined&&e.button!==0)return;drag={payload,startX:e.clientX,startY:e.clientY,el};el.setPointerCapture?.(e.pointerId);const g=$('#dragGhost');g.textContent=el.textContent.trim();g.classList.remove('hidden');moveGhost(e);e.preventDefault()};el.onpointermove=e=>{if(!drag||drag.el!==el)return;moveGhost(e);highlightTarget(e.clientX,e.clientY)};el.onpointerup=e=>{if(!drag||drag.el!==el)return;const target=findTarget(e.clientX,e.clientY);clearDrag();if(target)handleDrop(payload,target)};el.onpointercancel=clearDrag}
function moveGhost(e){const g=$('#dragGhost');g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'}
function findTarget(x,y){const elems=document.elementsFromPoint(x,y);const pos=elems.find(e=>e.dataset?.dropPosition);if(pos)return{kind:'position',position:pos.dataset.dropPosition};if(elems.find(e=>e.dataset?.dropBench))return{kind:'bench'};const row=elems.find(e=>e.dataset?.dropRow);if(row)return{kind:'row',id:row.dataset.dropRow,source:row.dataset.source};return null}
function highlightTarget(x,y){$$('.drop-hover').forEach(e=>e.classList.remove('drop-hover'));const elems=document.elementsFromPoint(x,y);const e=elems.find(e=>e.dataset?.dropPosition||e.dataset?.dropBench||e.dataset?.dropRow);e?.classList.add('drop-hover')}
function clearDrag(){$('#dragGhost').classList.add('hidden');$$('.drop-hover').forEach(e=>e.classList.remove('drop-hover'));drag=null}
function loadFieldImage(){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='baseball-field.png'})}
function loadWatermarkImage(){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src='rockets-watermark.png'})}
function drawWatermark(ctx,img,x,y,w,h,opacity=.075){ctx.save();ctx.globalAlpha=opacity;const scale=Math.min(w/img.width,h/img.height);const dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,x+(w-dw)/2,y+(h-dh)/2,dw,dh);ctx.restore()}

function safeName(value){return String(value||'lineup').replace(/[\\/:*?"<>|]/g,'-').trim()||'lineup'}
function canvasBlob(canvas){return new Promise(resolve=>canvas.toBlob(resolve,'image/png'))}
function drawRoundedBox(ctx,x,y,w,h,r,fill,stroke='#fff'){ctx.fillStyle=fill;roundRect(ctx,x,y,w,h,r);ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function drawPositionOnCanvas(ctx,img,top=0,width=1200){const height=800;ctx.drawImage(img,0,top,width,height);ctx.textAlign='center';ctx.textBaseline='middle';state.starters.forEach(e=>{if(!coords[e.position])return;const p=player(e.playerId);if(!p)return;const [x,y]=coords[e.position],[ox,oy]=offsets[e.position]||[0,0];const px=x*width+ox*1.6,py=top+y*height+oy*1.6;drawRoundedBox(ctx,px-76,py-31,152,62,14,'rgba(15,25,38,.92)');ctx.fillStyle='#fff';ctx.font='700 23px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(`#${p.num} ${p.name}`,px,py-10);ctx.font='18px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(posLabel(e.position,state.lang),px,py+17)});if(state.showBench&&state.bench.length){const panelW=205,rowH=28,panelH=54+Math.min(state.bench.length,8)*rowH;const x=width-panelW-28,y=top+height-panelH-30;drawRoundedBox(ctx,x,y,panelW,panelH,14,'rgba(15,25,38,.93)');ctx.textAlign='left';ctx.fillStyle='#fff';ctx.font='700 20px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(t('bench'),x+14,y+24);ctx.font='16px -apple-system,BlinkMacSystemFont,sans-serif';state.bench.slice(0,8).forEach((e,i)=>{const p=player(e.playerId);ctx.fillText(`${p?.num||'-'}   ${p?.name||'—'}`,x+14,y+52+i*rowH)})}}
function drawLineupTable(ctx,top,width=1200,watermarkImg=null){
  const left=70,right=width-70,rowH=44;
  const starters=state.starters,bench=state.bench;
  const group=parseSeasonGroup(state.gameTitle);
  const showAttendance=Boolean(group.year&&group.half);
  const height=110+(starters.length+bench.length)*rowH+120;
  ctx.fillStyle='#fff';ctx.fillRect(0,top,width,height);
  ctx.fillStyle='#17191c';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.font='700 30px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.fillText(state.gameTitle||'라인업',left,top+40);

  let y=top+82;
  ctx.font='700 23px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.fillText(t('starters'),left,y);
  y+=34;

  const orderX=left;
  const numberX=left+88;
  const attendanceW=showAttendance?205:0;
  const nameStart=left+225;
  const contentRight=right-attendanceW;
  const halfWidth=(contentRight-nameStart)/2;
  const nameX=nameStart;
  const positionX=nameStart+halfWidth;
  const attendanceX=contentRight+28;

  ctx.fillStyle='#6d737c';
  ctx.font='700 17px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.fillText('타순',orderX,y);
  ctx.fillText(t('number'),numberX,y);
  ctx.fillText(t('name'),nameX,y);
  ctx.fillText(t('position'),positionX,y);
  if(showAttendance){ctx.font='700 15px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(`${group.half} 출장 경기 수`,attendanceX,y)}
  y+=32;

  const starterRowsTop=y-18;
  const starterRowsHeight=Math.max(rowH,starters.length*rowH);
  if(watermarkImg){
    const wmWidth=Math.min(width*.42,520);
    const wmHeight=Math.max(210,Math.min(starterRowsHeight-12,360));
    drawWatermark(ctx,watermarkImg,(width-wmWidth)/2,starterRowsTop+(starterRowsHeight-wmHeight)/2,wmWidth,wmHeight,.075);
  }

  ctx.strokeStyle='#dfe2e7';ctx.lineWidth=1;
  starters.forEach((e,i)=>{
    const p=player(e.playerId);
    ctx.beginPath();ctx.moveTo(left,y-18);ctx.lineTo(right,y-18);ctx.stroke();
    ctx.fillStyle='#17191c';ctx.font='20px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText(String(i+1),orderX,y+4);
    ctx.fillText(p?.num||'-',numberX,y+4);
    ctx.fillText(p?.name||'—',nameX,y+4);
    ctx.fillText(posLabel(e.position,state.lang),positionX,y+4);
    if(showAttendance&&p)ctx.fillText(`${attendanceCount(p.id,group.year,group.half)}경기`,attendanceX,y+4);
    y+=rowH;
  });

  y+=12;
  ctx.strokeStyle='#9da3ad';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
  y+=34;

  ctx.fillStyle='#17191c';ctx.font='700 23px -apple-system,BlinkMacSystemFont,sans-serif';
  ctx.fillText(t('bench'),left,y);
  y+=34;
  ctx.fillStyle='#6d737c';ctx.font='700 17px -apple-system,BlinkMacSystemFont,sans-serif';
  const benchNumberX=left;
  const benchNameX=left+150;
  const benchAttendanceX=showAttendance?right-175:null;
  ctx.fillText(t('number'),benchNumberX,y);
  ctx.fillText(t('name'),benchNameX,y);
  if(showAttendance){ctx.font='700 15px -apple-system,BlinkMacSystemFont,sans-serif';ctx.fillText(`${group.half} 출장 경기 수`,benchAttendanceX,y)}
  y+=32;

  const benchRowsTop=y-18;
  const benchRowsHeight=Math.max(rowH,bench.length*rowH);
  if(watermarkImg&&bench.length){
    const wmWidth=Math.min(width*.34,430);
    const wmHeight=Math.max(150,Math.min(benchRowsHeight+18,250));
    drawWatermark(ctx,watermarkImg,(width-wmWidth)/2,benchRowsTop+(benchRowsHeight-wmHeight)/2,wmWidth,wmHeight,.075);
  }

  bench.forEach(e=>{
    const p=player(e.playerId);
    ctx.strokeStyle='#dfe2e7';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(left,y-18);ctx.lineTo(right,y-18);ctx.stroke();
    ctx.fillStyle='#17191c';ctx.font='20px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText(p?.num||'-',benchNumberX,y+4);
    ctx.fillText(p?.name||'—',benchNameX,y+4);
    if(showAttendance&&p)ctx.fillText(`${attendanceCount(p.id,group.year,group.half)}경기`,benchAttendanceX,y+4);
    y+=rowH;
  });
  return height;
}
async function generateImage(type='position'){const img=await loadFieldImage();const watermarkImg=await loadWatermarkImage().catch(()=>null);const width=1200;let canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');if(type==='position'){canvas.width=width;canvas.height=800;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,800);drawPositionOnCanvas(ctx,img,0,width)}else if(type==='lineup'){const lineupH=110+(state.starters.length+state.bench.length)*44+120;canvas.width=width;canvas.height=lineupH;drawLineupTable(ctx,0,width,watermarkImg)}else{const lineupH=110+(state.starters.length+state.bench.length)*44+120;canvas.width=width;canvas.height=800+lineupH;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);drawPositionOnCanvas(ctx,img,0,width);drawLineupTable(ctx,800,width,watermarkImg)}return canvasBlob(canvas)}
async function saveGeneratedImage(type){try{const blob=await generateImage(type);const labels={position:'position',lineup:'lineup',combined:'position-lineup'};const filename=`${safeName(state.gameTitle)}-${labels[type]}.png`;const file=new File([blob],filename,{type:'image/png'});if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title:state.gameTitle||'Rockets Lineup Manager',files:[file]})}else{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}toast('이미지를 만들었어요')}catch(err){console.error(err);toast('이미지 저장에 실패했어요')}}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h))}

function createBackupFile(){
  const payload=JSON.stringify(state,null,2);
  return new File([payload],'rockets-lineup-manager-backup.json',{type:'application/json'});
}
async function shareAllData(){
  try{
    const file=createBackupFile();
    if(navigator.share&&navigator.canShare?.({files:[file]})){
      await navigator.share({title:'Rockets Lineup Manager 전체 데이터',text:'Rockets Lineup Manager 백업 데이터',files:[file]});
      toast('전체 데이터를 공유했어요');
      return;
    }
    const url=URL.createObjectURL(file);
    const a=document.createElement('a');
    a.href=url;
    a.download=file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast('공유를 지원하지 않아 백업 파일로 저장했어요');
  }catch(err){
    if(err?.name==='AbortError')return;
    console.error(err);
    toast('데이터 공유에 실패했어요');
  }
}

$$('.bottom-nav button').forEach(b=>b.onclick=()=>{if(b.dataset.tab==='settingsTab'){attendanceOpenId=null;renderSettings()}$$('.bottom-nav button').forEach(x=>x.classList.toggle('active',x===b));$$('.tab').forEach(t=>t.classList.toggle('active',t.id===b.dataset.tab))});
$('#gameTitle').onchange=e=>{snapshot();state.gameTitle=e.target.value;commit()};$('#saveGameBtn').onclick=()=>{const savedGame=JSON.parse(JSON.stringify({...state,saved:undefined}));savedGame.recordId=crypto.randomUUID();savedGame.attendanceConfirmed=false;savedGame.attendanceIds=[];state.saved.push(savedGame);persist();renderSettings();toast('라인업을 저장했어요')};$('#undoBtn').onclick=()=>{if(!undo.length)return;redo.push(JSON.stringify(state));state=JSON.parse(undo.pop());commit()};$('#redoBtn').onclick=()=>{if(!redo.length)return;undo.push(JSON.stringify(state));state=JSON.parse(redo.pop());commit()};$('#addStarter').onclick=()=>{if(state.starters.length>=30)return toast('더 이상 추가할 수 없어요');snapshot();state.starters.push({id:crypto.randomUUID(),playerId:'',position:'없음'});commit()};$('#addBench').onclick=()=>{snapshot();state.bench.push({id:crypto.randomUUID(),playerId:'',position:'없음'});commit()};$('#addPlayer').onclick=()=>{snapshot();state.players.push({id:crypto.randomUUID(),num:'',name:'새 선수',primary:'없음'});commit()};$$('input[name=dh]').forEach(r=>r.onchange=e=>{snapshot();state.usesDH=e.target.value==='on';if(!state.usesDH)state.starters.forEach(x=>{if(x.position==='지명타자')x.position='없음'});commit()});$$('input[name=showBench]').forEach(r=>r.onchange=e=>{snapshot();state.showBench=e.target.value==='on';commit()});$('#exportJson').onclick=()=>{const file=createBackupFile();const url=URL.createObjectURL(file);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};$('#importJson').onchange=async e=>{try{snapshot();state=JSON.parse(await e.target.files[0].text());ensureSavedMetadata();attendanceOpenId=null;attendanceDrafts.clear();commit();e.target.value='';toast('복원했어요')}catch{toast('복원 실패')}};$('#shareData').onclick=shareAllData;$('#resetData').onclick=()=>{if(confirm('전체 데이터를 초기화할까요?')){attendanceOpenId=null;attendanceDrafts.clear();state=fresh();commit()}};$('#shareBtn').onclick=()=>$('#saveImageModal').classList.remove('hidden');$('#cancelImageSave').onclick=()=>$('#saveImageModal').classList.add('hidden');$('#saveImageModal').onclick=e=>{if(e.target===$('#saveImageModal'))$('#saveImageModal').classList.add('hidden')};$$('[data-image-type]').forEach(b=>b.onclick=async()=>{$('#saveImageModal').classList.add('hidden');await saveGeneratedImage(b.dataset.imageType)});
$$('#languageGate button').forEach(b=>b.onclick=()=>{state.lang=b.dataset.lang;$('#languageGate').classList.add('hidden');commit()});if(!state.lang)$('#languageGate').classList.remove('hidden');if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));ensureSavedMetadata();sortPlayersByNumber();
renderAll();

let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if($('#positionTab').classList.contains('active')){renderField();}},120)});
