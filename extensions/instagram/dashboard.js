const $=id=>document.getElementById(id); const fields=['action','comment','scanLimit','mode','target','perUser','limit','delay','maxAge','dailyCap','exclude','dry','videos'];
const hints={users:'Separate usernames with commas or new lines.',followers:'One username. Loads available accounts from the follower dialog up to the discovery limit.',following:'One username. Loads available accounts from the following dialog up to the discovery limit.',commenters:'Paste an Instagram post URL. Discovers currently rendered commenters.',likers:'Paste an Instagram post URL. Discovers accounts from the visible likes dialog.',hashtag:'Enter one #hashtag, its /explore/tags/ URL, or Instagram hashtag search URL.',location:'Paste a specific place URL or numeric location ID. Country/city directories do not contain posts.',posts:'Paste post or reel URLs, separated by commas or new lines.'};
function settings(){return Object.fromEntries(fields.map(k=>[k,$(k).type==='checkbox'?$(k).checked:$(k).value]));}
function notice(s){$('notice').textContent=s;}
async function send(action,data={}){try{const r=await chrome.runtime.sendMessage({action,...data});if(!r?.ok)throw Error(r?.error||'No response');notice(r.message||'Saved.');await render();return true;}catch(e){notice(e.message);return false;}}
const DISCOVERY=['followers','following','commenters','likers','hashtag','location'],PROFILE_POSTS=['users','followers','following','commenters','likers'];
function updateForm(){
 const action=$('action').value,unfollow=action==='unfollow',post=['like','comment'].includes(action);
 for(const option of $('mode').options)option.disabled=unfollow&&option.value!=='users';
 if(unfollow)$('mode').value='users';
 const mode=$('mode').value;
 $('commentGroup').hidden=action!=='comment';$('comment').required=action==='comment';
 $('actionHint').textContent=({like:'Likes eligible '+(mode==='posts'?'posts you link':'posts from the source')+'. Preview first.',follow:'Follows discovered accounts, or the authors of discovered posts.',unfollow:'Only usernames you explicitly enter will be unfollowed.',comment:'Posts your exact comment on eligible posts. Preview first.'})[action];
 $('hint').textContent=unfollow?'Exact usernames you already follow, separated by commas or new lines.':hints[mode];
 // Hide what this action and source do not use (values are kept, so switching back restores them).
 document.querySelector('label[for="mode"]').hidden=unfollow;$('mode').hidden=unfollow;
 $('perUser').parentElement.hidden=!(post&&PROFILE_POSTS.includes(mode));
 $('scanGroup').hidden=unfollow||!DISCOVERY.includes(mode);
 if($('maxAge').type!=='hidden')$('maxAge').parentElement.hidden=!post;
 if($('videosRow'))$('videosRow').hidden=!post;
 if($('locLink'))$('locLink').hidden=unfollow||mode!=='location';
 document.querySelector('label[for="target"]').textContent=unfollow?'Usernames to unfollow':'Target';
 document.querySelector('label[for="perUser"]').textContent=action==='comment'?'Posts to comment on per profile':'Posts to like per profile';
 paintMode();
 $('target').placeholder=({location:'https://www.instagram.com/explore/locations/123/place/',hashtag:'#travel or a hashtag URL',posts:'Post or reel URLs',commenters:'A post URL',likers:'A post URL'})[mode]||'@username, one or more usernames';
}
$('mode').onchange=()=>{disarm();updateForm();};$('action').onchange=()=>{disarm();updateForm();rememberForm();};
let armed=null;
const startLabel=()=>$('dry').checked?'✦ Start preview':'✦ Start live task';
function disarm(){clearTimeout(armed);armed=null;$('start').textContent=startLabel();}
// Always-visible reminder of whether the next run is a harmless preview or a real, live run.
let liveTimer=null;
function paintMode(){
 const bar=$('modeBar'),dry=$('dry').checked;bar.className='modebar '+(dry?'mode-preview':'mode-live');bar.textContent='';
 // Preview stays on screen as a standing reminder. The LIVE notice is shown for 2 seconds after switching, then tucks away (the start button keeps saying "Start live task").
 clearTimeout(liveTimer);bar.hidden=false;if(!dry)liveTimer=setTimeout(()=>{if(!$('dry').checked)bar.hidden=true;},2000);
 const msg=document.createElement('span'),b=document.createElement('b');
 if(dry){b.textContent='👁 PREVIEW MODE';msg.append(b,' — Aurora only checks what it could do. Nothing will be liked, commented, followed or unfollowed.');}
 else{b.textContent='⚡ LIVE MODE';msg.append(b,' — Aurora will perform real actions on your account.');}
 const btn=document.createElement('button');btn.type='button';btn.textContent=dry?'Switch to live':'Back to preview';btn.onclick=()=>{$('dry').checked=!$('dry').checked;disarm();paintMode();rememberForm();};
 bar.append(msg,btn);if(!armed)$('start').textContent=startLabel();
}
$('dry').addEventListener('change',()=>{disarm();paintMode();});
$('task').onsubmit=async e=>{e.preventDefault();const config=settings();
 if(!config.dry&&!armed){
  $('start').textContent='⚠ Confirm live '+config.action+' task';
  notice('Live mode: this will really '+config.action+' (limit '+config.limit+', target: '+config.target+(config.action==='comment'?', comment: '+config.comment:'')+'). Click the button again within 15 seconds to confirm, or tick Preview only to cancel.');
  armed=setTimeout(()=>{disarm();notice('Live confirmation expired. Nothing was started.');},15000);return;
 }
 disarm();$('start').disabled=true;notice('Starting… opening your Instagram task tab.');const ok=await send('start',{config});await render();
 // The task runs in the site tab, so the small popup is no longer needed: close it.
 if(ok&&document.body.classList.contains('popup'))setTimeout(()=>window.close(),700);};
$('save').onclick=()=>send('save',{config:settings()});
for(const action of ['pause','resume','stop'])$(action).onclick=()=>send(action);$('bannerResume').onclick=()=>send('resume');$('bannerStop').onclick=()=>send('stop');
$('theme').onclick=async()=>{document.body.classList.toggle('dark');await chrome.storage.local.set({dark:document.body.classList.contains('dark')});};
function tab(name){for(const k of ['studio','history','debug']){$(k).hidden=k!==name;$(k+'Tab').classList.toggle('selected',k===name);}if(name==='debug'){renderDebug();ui.debugSeen=Date.now();saveUi();$('debugDot').hidden=true;}}
$('historyTab').onclick=()=>tab('history');$('studioTab').onclick=()=>tab('studio');$('debugTab').onclick=()=>tab('debug');
async function renderDebug(){$('debugText').textContent=await AuroraReport.build(300);}
async function copyReport(button,label,lines){const text=await AuroraReport.build(lines);try{await navigator.clipboard.writeText(text);notice('Report copied. Paste it into your message.');button.textContent='Copied ✓';}catch{notice('Could not copy automatically: open the Debug log tab, select the text and copy it.');}setTimeout(()=>{button.textContent=label;},2500);}
$('debugCopy').onclick=()=>copyReport($('debugCopy'),'Copy report',300);
$('bannerCopy').onclick=()=>copyReport($('bannerCopy'),'Copy error report',120);
$('debugSave').onclick=async()=>{const url=URL.createObjectURL(new Blob([await AuroraReport.build(1500)],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='aurora-debug-report.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('debugClear').onclick=async()=>{const b=$('debugClear');if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent='Click again to clear';setTimeout(()=>{b.dataset.sure='';b.textContent='Clear';},4000);return;}b.dataset.sure='';b.textContent='Clear';await chrome.storage.local.set({debugLog:[]});await renderDebug();};
function tickNow(){
 const job=lastJob,el=$('nowline');if(!job||!['running','paused'].includes(job.status)){el.textContent='';return;}
 const left=job.queue?.length||0,part=doneNow(job)+'/'+(job.config?.limit||'?')+' done'+(left?' · '+left+' step'+(left===1?'':'s')+' left':'');
 if(job.status==='running'){const s=Math.max(0,Math.round(((job.nextAt||0)-Date.now())/1000));el.textContent='▶ '+(s?'Next step in '+s+'s · ':'Working… · ')+part;}else el.textContent='⏸ Paused · '+part;
}
let lastJob=null;setInterval(tickNow,1000);
let wasActive=false;
// Live stays selected across action changes; it returns to Preview only once the live task has finished or been stopped.
function backToPreviewIfDone(st,job){
 const active=['running','paused'].includes(st);
 if(wasActive&&['completed','stopped'].includes(st)&&job?.config?.dry===false&&!$('dry').checked){$('dry').checked=true;disarm();paintMode();rememberForm();notice('Task finished — back to Preview mode.');}
 wasActive=active;
}
let walkNow=null;
const walkOf=job=>walkNow&&job&&walkNow.id===job.id&&job.status==='running'&&Date.now()-walkNow.time<120000?walkNow:null;
const doneNow=job=>(job?.done??job?.liked??0)+(walkOf(job)?.acted||0);
async function render(){if(!$('debug').hidden)renderDebug();const {job,history=[],debugLog=[],walk}=await chrome.storage.local.get(['job','history','debugLog','walk']);walkNow=walk||null;const st=job?.status||'ready';backToPreviewIfDone(st,job);document.body.dataset.status=st;document.title=(st==='paused'?'🔔 Needs you · ':st==='running'?'● Running · ':st==='completed'?'✓ Done · ':'')+'Aurora';
 const banner=$('banner'),bad=st==='paused',good=st==='completed';banner.hidden=!(bad||good);banner.classList.toggle('ok',good);
 if(bad||good){$('bannerTitle').textContent=bad?'🔔 Aurora paused — it needs you':(job.config?.dry?'👁 Preview complete — nothing was sent':'✓ Session complete');$('bannerText').textContent=(good&&job.config?.dry?'This was only a preview, so no likes, comments, follows or unfollows were made. To run it for real, untick “Preview only” (or press “Switch to live”) and start again. ':'')+(job.message||'');$('bannerResume').hidden=!bad;$('bannerStop').hidden=!bad;$('bannerCopy').hidden=!bad;}
 $('liked').textContent=doneNow(job);$('skipped').textContent=job?.skipped||0;$('status').textContent=job?.status||'Ready';$('message').textContent=(job?.config?.dry&&job?.status&&job.status!=='ready'?'👁 Preview run — nothing was sent. ':'')+(walkOf(job)?.text||job?.message||'Your next session starts here.');$('progress').max=Number(job?.config?.limit)||10;{const left=job?.queue?.length||0,secs=left*(Number(job?.config?.delay)||30)*1.2,active=['running','paused'].includes(job?.status);$('eta').textContent=active&&left?`${left} step${left===1?'':'s'} left · about ${secs<90?'1':Math.round(secs/60)} min`:'';}$('progress').value=doneNow(job);lastJob=job;tickNow();$('start').disabled=['running','paused'].includes(job?.status);$('pause').disabled=job?.status!=='running';$('resume').disabled=job?.status!=='paused';$('stop').disabled=!['running','paused'].includes(job?.status);renderEvents(history);paintNav(job,history,debugLog);}
$('clearHistory').onclick=async()=>{if($('clearHistory').dataset.sure!=='1'){$('clearHistory').dataset.sure='1';$('clearHistory').textContent='Click again to clear';setTimeout(()=>{$('clearHistory').dataset.sure='';$('clearHistory').textContent='Clear history';},4000);return;}$('clearHistory').dataset.sure='';$('clearHistory').textContent='Clear history';await chrome.storage.local.set({history:[]});await render();};$('export').onclick=async()=>{const {history=[]}=await chrome.storage.local.get('history');const cell=v=>{let t=String(v??'');if(/^[=+\-@\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};const csv=['time,event,url',...history.map(e=>[new Date(e.time).toISOString(),e.message,e.url].map(cell).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=url;a.download='aurora-history.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
(async()=>{const {config:saved,draft,dark,ui:savedUi}=await chrome.storage.local.get(['config','draft','dark','ui']);Object.assign(ui,savedUi||{});if(ui.debugSeen===undefined){ui.debugSeen=Date.now();saveUi();}$('secPace').open=!!ui.secPace;$('secAdv').open=!!ui.secAdv;initFirstRun();const config=draft||saved;if(config)for(const k of fields){if(config[k]!==undefined){if($(k).type==='checkbox')$(k).checked=config[k];else $(k).value=config[k];}}$('dry').checked=draft?.dry!==false;$('dry').disabled=false;document.body.classList.toggle('dark',dark!==false);$('mode').onchange();await render();})();chrome.storage.onChanged.addListener(async changes=>{await render();if(changes?.job?.newValue?.message)notice(changes.job.newValue.message);});window.addEventListener('unhandledrejection',e=>notice('Extension error: '+(e.reason?.message||e.reason)));document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('input',()=>{if(armed)disarm();}));document.querySelectorAll('input,textarea,select').forEach(el=>el.addEventListener('invalid',()=>notice('Check the highlighted field: '+el.id),true));
// ---- Remembered form, reset and named setups ---------------------------------------------------------------
const DEFAULTS=settings();
function applyFields(c){for(const k of fields){if(c?.[k]===undefined)continue;if($(k).type==='checkbox')$(k).checked=!!c[k];else $(k).value=c[k];}$('dry').checked=true;updateForm();}
let draftTimer=null;
function rememberForm(){clearTimeout(draftTimer);draftTimer=setTimeout(()=>chrome.storage.local.set({draft:settings()}).catch(()=>{}),250);}
document.querySelectorAll('#task input,#task textarea,#task select').forEach(el=>{el.addEventListener('input',rememberForm);el.addEventListener('change',rememberForm);});
const sure={};
function twice(btn,label,run){if(sure[btn.id]){clearTimeout(sure[btn.id].t);btn.textContent=sure[btn.id].text;delete sure[btn.id];return run();}sure[btn.id]={text:btn.textContent,t:setTimeout(()=>{btn.textContent=sure[btn.id]?.text||btn.textContent;delete sure[btn.id];},5000)};btn.textContent=label;}
async function getPresets(){return (await chrome.storage.local.get('presets')).presets||{};}
async function renderPresets(keep){const p=await getPresets(),sel=$('presetList'),names=Object.keys(p).sort((a,b)=>a.localeCompare(b));sel.textContent='';const first=document.createElement('option');first.value='';first.textContent=names.length?'— choose a saved setup —':'— no saved setups yet —';sel.append(first);for(const n of names){const o=document.createElement('option');o.value=n;o.textContent=n;sel.append(o);}if(keep&&p[keep])sel.value=keep;}
$('presetSave').onclick=async()=>{const name=$('presetName').value.trim();if(!name){notice('Type a name for this setup first.');return;}const p=await getPresets();const run=async()=>{p[name]=settings();await chrome.storage.local.set({presets:p});await renderPresets(name);$('presetName').value='';notice('Saved setup “'+name+'”.');};if(p[name])twice($('presetSave'),'Click again to overwrite “'+name+'”',run);else await run();};
$('presetLoad').onclick=async()=>{const n=$('presetList').value;if(!n){notice('Choose a saved setup first.');return;}const p=await getPresets();if(!p[n]){notice('That setup no longer exists.');await renderPresets();return;}applyFields(p[n]);rememberForm();notice('Loaded “'+n+'”. Preview only is on — untick it to run live.');};
$('presetDelete').onclick=async()=>{const n=$('presetList').value;if(!n){notice('Choose a saved setup first.');return;}twice($('presetDelete'),'Click again to delete',async()=>{const p=await getPresets();delete p[n];await chrome.storage.local.set({presets:p});await renderPresets();notice('Deleted “'+n+'”.');});};
$('presetRename').onclick=async()=>{const n=$('presetList').value,to=$('presetName').value.trim();if(!n){notice('Choose a saved setup first.');return;}if(!to){notice('Type the new name in the name box.');return;}const p=await getPresets();if(p[to]&&to!==n){notice('A setup named “'+to+'” already exists.');return;}p[to]=p[n];if(to!==n)delete p[n];await chrome.storage.local.set({presets:p});await renderPresets(to);$('presetName').value='';notice('Renamed to “'+to+'”.');};
// Factory reset of the form: every field back to its default (Preview only on, target/comment/exclude empty), and the remembered draft AND the last-started config forgotten so nothing comes back on reopen. Saved setups and history are kept.
$('reset').onclick=()=>twice($('reset'),'Click again to erase all fields',async()=>{
 clearTimeout(draftTimer);disarm();
 applyFields(DEFAULTS);$('dry').checked=true;$('presetName').value='';$('presetList').value='';
 updateForm();paintMode();
 await chrome.storage.local.remove(['draft','config']);
 notice('Form reset to factory defaults: Preview only is on and the target, comment and other fields are cleared. Saved setups and history were kept.');
});
try{document.querySelectorAll('header .badge').forEach(b=>{b.textContent='✦ v'+chrome.runtime.getManifest().version+' · Preview + live actions';});}catch{}

// ================= Navigation upgrades =================
const ui={};
function saveUi(){try{chrome.storage.local.set({ui}).catch(()=>{});}catch{}}
const ACTION_NAMES={like:'Like',follow:'Follow',unfollow:'Unfollow',comment:'Comment on'};
const targetList=()=>[...new Set($('target').value.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean))];

// ---- one-line summary above Start, plus the collapsed-section captions ----
function paintSummary(){
 const dry=$('dry').checked,action=$('action').value,mode=$('mode').value,n=targetList().length;
 const perUser=Number($('perUser').value)||1,limit=Number($('limit').value)||1,delay=Number($('delay').value)||30,cap=Number($('dailyCap').value)||0;
 const post=['like','comment'].includes(action),perTarget=post&&PROFILE_POSTS.includes(mode),discover=action!=='unfollow'&&DISCOVERY.includes(mode);
 const steps=n?Math.min(limit,perTarget&&!discover?n*perUser:discover?limit:n):0,secs=Math.round(steps*delay*1.2+n*6);
 const eta=!steps?'':secs<100?'about 1–2 min':'about '+Math.round(secs/60)+' min';
 const el=$('startSummary');el.className='summary '+(dry?'is-preview':'is-live');el.textContent='';
 const tag=document.createElement('b');tag.textContent=dry?'PREVIEW':'LIVE';
 el.append(tag,' · '+ACTION_NAMES[action]+' '+(n?n+' target'+(n===1?'':'s'):'—  add a target to begin')+(n&&perTarget&&!discover?' · up to '+perUser+' each':'')+(n&&discover?' · up to '+limit+' actions':'')+' · every ~'+delay+'s'+(eta?' · '+eta:''));
 $('paceSum').textContent=(perTarget&&!discover?perUser+' per target · ':'')+'limit '+limit+' · every '+delay+'s · cap '+(cap>0?cap:'off');
 const ex=$('exclude').value.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).length;$('advSum').textContent=ex?'excluding '+ex:'none set';
}
{const base=updateForm;updateForm=function(){base();paintSummary();};}
{const base=paintMode;paintMode=function(){base();paintSummary();};}
$('task').addEventListener('input',paintSummary);$('task').addEventListener('change',paintSummary);
// Ctrl/Cmd + Enter starts the task from anywhere in the form.
$('task').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();$('start').click();}});
// remembered open/closed state of the collapsible sections
for(const [id,key] of [['secPace','secPace'],['secAdv','secAdv']])$(id).addEventListener('toggle',()=>{ui[key]=$(id).open;saveUi();});

// ---- sidebar badges ----
function paintNav(job,history,debugLog){
 const st=job?.status,dot=$('studioDot');dot.hidden=!['running','paused'].includes(st);dot.className='tabdot '+(st==='paused'?'warn':'pulse');dot.title=st==='paused'?'Task paused — needs you':'Task running';
 const n=history.length;$('historyCount').hidden=!n;$('historyCount').textContent=n>999?'999+':String(n);
 const errs=debugLog.filter(e=>e.l==='error'&&e.t>(ui.debugSeen||0)).length;$('debugDot').hidden=!errs||!$('debug').hidden;$('debugDot').title=errs+' new error'+(errs===1?'':'s');
}

// ---- activity history: filters + search ----
let histFilter='all',histQuery='',lastHistory=[];
function classify(msg){const m=String(msg||'');if(/^Skipped/i.test(m))return'skipped';if(/paused|failed|error|cannot|could not|unavailable|interrupted|restricted|stopped|captcha|challenge/i.test(m))return'problem';return'done';}
const ICON={done:'✓',skipped:'↷',problem:'⚠'};
function renderEvents(history){
 lastHistory=history;const q=histQuery.trim().toLowerCase();
 const rows=history.slice(-400).reverse().filter(e=>(histFilter==='all'||classify(e.message)===histFilter)&&(!q||String(e.message).toLowerCase().includes(q)||String(e.url||'').toLowerCase().includes(q))).slice(0,200);
 $('events').replaceChildren(...(rows.length?rows:[Object.assign(document.createElement('div'),{className:'hint',textContent:history.length?'Nothing matches this filter.':'No activity yet.'})]).map(e=>{
  if(!e.time)return e;
  const k=classify(e.message),d=document.createElement('div');d.className='event k-'+k;
  const ic=document.createElement('span');ic.className='ic';ic.textContent=ICON[k];d.append(ic,new Date(e.time).toLocaleString()+' · '+e.message);
  if(e.url){const a=document.createElement('a');a.href=e.url;a.target='_blank';a.rel='noreferrer';a.textContent=' Open post';d.append(a);}return d;}));
}
document.querySelectorAll('#histTools .chip').forEach(b=>b.onclick=()=>{histFilter=b.dataset.f;document.querySelectorAll('#histTools .chip').forEach(x=>x.classList.toggle('on',x===b));renderEvents(lastHistory);});
$('histSearch').addEventListener('input',()=>{histQuery=$('histSearch').value;renderEvents(lastHistory);});

// ---- saved setups: summary line + update in place ----
function describePreset(c){if(!c)return'';const act=ACTION_NAMES[c.action]||c.action,t=String(c.target||'').split(/[,\n]+/).map(s=>s.trim()).filter(Boolean);return act+' · '+t.length+' target'+(t.length===1?'':'s')+(t.length?' ('+t.slice(0,2).join(', ')+(t.length>2?'…':'')+')':'')+' · limit '+c.limit+' · every '+c.delay+'s';}
async function paintPresetInfo(){const n=$('presetList').value,p=await getPresets();$('presetInfo').textContent=n&&p[n]?describePreset(p[n]):'';$('presetUpdate').disabled=!n;}
$('presetList').addEventListener('change',paintPresetInfo);
{const base=renderPresets;renderPresets=async function(keep){await base(keep);await paintPresetInfo();};}
renderPresets($('presetList').value);
$('presetUpdate').onclick=async()=>{const n=$('presetList').value;if(!n){notice('Choose a saved setup first.');return;}twice($('presetUpdate'),'Click again to overwrite “'+n+'”',async()=>{const p=await getPresets();p[n]=settings();await chrome.storage.local.set({presets:p});await renderPresets(n);notice('Updated setup “'+n+'” with the current form.');});};

// ---- first-run checklist ----
async function initFirstRun(){
 if(ui.firstRunDone)return;$('firstRun').hidden=false;
 try{if(chrome.tabs?.query){const tabs=await chrome.tabs.query({url:'https://www.instagram.com/*'}),ok=tabs.length>0,s=$('frTabState');s.textContent=ok?'✓ found':'✗ none open yet — Aurora will open one';s.className=ok?'okmark':'nomark';}}catch{}
}
$('firstRunOk').onclick=()=>{ui.firstRunDone=true;saveUi();$('firstRun').hidden=true;};
paintSummary();
