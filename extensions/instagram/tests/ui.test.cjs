// Offline checks of the studio (dashboard.html), toolbar popup (popup.html) and on-page panel: pages are injected with a stubbed chrome.* API.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');let passed=0;
const check=(name,v)=>{assert(v,name);passed++;console.log('PASS '+name);};
const stub=()=>{const store={};window.__sent=[];window.chrome={storage:{local:{get:async k=>{const o={};[].concat(k||[]).forEach(x=>{if(x in store)o[x]=store[x];});return o;},set:async o=>Object.assign(store,o),remove:async k=>{[].concat(k).forEach(x=>delete store[x]);}},onChanged:{addListener(){}}},runtime:{getManifest:()=>({version:'9.9.9'}),sendMessage:async m=>{window.__sent.push(m);return{ok:true};},getURL:x=>x}};};
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-crashpad-for-testing']});
try{
 const open=async(name,viewport={width:1280,height:900})=>{const ctx=await browser.newContext({viewport}),pg=await ctx.newPage();pg.setDefaultTimeout(20000);pg.on('pageerror',e=>{throw e;});
  await pg.setContent(read(name).replace(/<script src="[^"]*"><\/script>/g,'').replace(/<link[^>]*stylesheet[^>]*>/,''));await pg.evaluate(stub);
  await pg.addStyleTag({content:read('style.css').replace(/@import[^;]*;/g,'')});for(const f of ['report.js','dashboard.js'])await pg.addScriptTag({content:read(f)});await pg.waitForTimeout(500);return{ctx,pg};};
 const vis=(pg,sel)=>pg.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.hidden&&getComputedStyle(e).display!=='none'&&!e.closest('[hidden]');},sel);
 const setDry=(pg,v)=>pg.evaluate(v=>{const e=document.getElementById('dry');e.checked=v;e.dispatchEvent(new Event('change',{bubbles:true}));},v);
 const {ctx,pg:ui}=await open('dashboard.html');const act=a=>ui.selectOption('#action',a),src=m=>ui.selectOption('#mode',m);
 check('studio opens in PREVIEW MODE with a "Start preview" button',/PREVIEW MODE/.test(await ui.textContent('#modeBar'))&&/Start preview/.test(await ui.textContent('#start')));
 check('studio header shows the installed version',/v9\.9\.9/.test(await ui.textContent('header .badge')));
 await setDry(ui,false);check('unticking Preview only switches to LIVE MODE / "Start live task"',/LIVE MODE/.test(await ui.textContent('#modeBar'))&&/Start live task/.test(await ui.textContent('#start')));
 check('the LIVE bar is a slim strip',await vis(ui,'#modeBar')&&(await ui.evaluate(()=>document.getElementById('modeBar').getBoundingClientRect().height))<110);
 await ui.waitForTimeout(2400);check('the LIVE bar hides itself after 2 seconds',!await vis(ui,'#modeBar'));
 await setDry(ui,true);await ui.waitForTimeout(2400);check('the PREVIEW bar stays visible',await vis(ui,'#modeBar')&&/PREVIEW MODE/.test(await ui.textContent('#modeBar')));
 await setDry(ui,false);await ui.click('#modeBar button');check('the bar button returns to preview',await ui.isChecked('#dry'));
 await setDry(ui,false);await act('comment');await act('follow');check('Live stays selected when the action changes',!await ui.isChecked('#dry')&&/Start live task/.test(await ui.textContent('#start')));
 const job=(status,dry)=>ui.evaluate(([s,d])=>chrome.storage.local.set({job:{status:s,message:'m',config:{dry:d,limit:5,action:'like',delay:30},queue:s==='running'?[{}]:[]}}).then(()=>render()),[status,dry]);
 await job('running',false);check('Live stays selected while the task runs',!await ui.isChecked('#dry'));
 await job('completed',false);check('when the live task is done the form returns to Preview',await ui.isChecked('#dry')&&/Start preview/.test(await ui.textContent('#start')));
 await setDry(ui,false);await job('running',true);await job('completed',true);check('a finished preview run does not flip a live choice made for the next task',!await ui.isChecked('#dry'));await setDry(ui,true);
 await ui.evaluate(()=>chrome.storage.local.set({job:{status:'running',done:1,nextAt:Date.now()+20000,config:{dry:false,limit:3,action:'like',delay:30},queue:[{},{}]}}).then(()=>render()));
 check('Live session shows a counter and countdown while running',/1\/3 done/.test(await ui.textContent('#nowline'))&&/2 steps left/.test(await ui.textContent('#nowline'))&&/Next step in \d+s/.test(await ui.textContent('#nowline')));
 await ui.evaluate(()=>chrome.storage.local.set({walk:{id:'x',acted:2,text:'@alice: post 3 done',time:Date.now()},job:{id:'x',status:'running',done:1,nextAt:Date.now()+20000,message:'Reading Instagram: walk',config:{dry:false,limit:5,action:'like',delay:30},queue:[{}]}}).then(()=>render()));
 check('while a walk is running the counter, progress text and message include its live progress',/3\/5 done/.test(await ui.textContent('#nowline'))&&(await ui.textContent('#liked'))==='3'&&/post 3 done/.test(await ui.textContent('#message')));
 await job('completed',true);await setDry(ui,true);
 // hiding unused fields
 await act('like');await src('users');check('Like on profiles shows posts-per-profile and source, hides comment text and discovery limit',await vis(ui,'#perUser')&&await vis(ui,'#mode')&&!await vis(ui,'#commentGroup')&&!await vis(ui,'#scanGroup'));
 await act('comment');check('Comment shows the comment box',await vis(ui,'#commentGroup')&&await vis(ui,'#perUser'));
 await act('like');await src('hashtag');check('Like on a hashtag hides posts-per-profile and shows the discovery limit',!await vis(ui,'#perUser')&&await vis(ui,'#scanGroup'));
 await act('follow');await src('users');check('Follow on explicit users hides posts-per-profile, discovery limit and post filters',!await vis(ui,'#perUser')&&!await vis(ui,'#scanGroup')&&!await vis(ui,'#commentGroup'));
 await src('followers');check('Follow from followers shows the discovery limit',await vis(ui,'#scanGroup'));
 await act('unfollow');check('Unfollow hides the source picker, posts-per-profile and discovery limit',!await vis(ui,'#mode')&&!await vis(ui,'#perUser')&&!await vis(ui,'#scanGroup')&&await ui.inputValue('#mode')==='users');
 check('Unfollow relabels the target box',/unfollow/i.test(await ui.textContent('label[for="target"]')));
 await act('like');check('switching back to Like restores the source picker',await vis(ui,'#mode'));
 if(await ui.evaluate(()=>!!document.getElementById('locLink'))){await src('location');check('the "Find a location" link only shows for the location source',await vis(ui,'#locLink'));await src('users');check('…and hides for other sources',!await vis(ui,'#locLink'));}
 // layout
 check('Start/Save are not sticky or fixed',await ui.evaluate(()=>['#task .startbar','#task .actions'].every(q=>!['sticky','fixed'].includes(getComputedStyle(document.querySelector(q)).position))));
 check('Saved setups sits directly under Live session, outside the task form',await ui.evaluate(()=>{const l=document.querySelector('article.live'),s=document.querySelector('article.setups');return !!l&&!!s&&l.nextElementSibling===s&&!document.getElementById('task').contains(document.getElementById('presetSave'));}));
 await ui.fill('#presetName','Morning likes');await ui.click('#presetSave');await ui.waitForTimeout(300);check('saving a setup works',await ui.evaluate(()=>[...document.getElementById('presetList').options].some(o=>o.value==='Morning likes')));
 await ui.selectOption('#presetList','Morning likes');await ui.waitForTimeout(100);check('the setup summary line appears',/target/.test(await ui.textContent('#presetInfo')));
 // summary, sections, ctrl+enter
 await act('like');await src('users');await ui.fill('#target','alice, bob');
 const sum=await ui.textContent('#startSummary');check('summary line shows mode, action, target count, per-target posts and pace',/PREVIEW/.test(sum)&&/Like 2 targets/.test(sum)&&/up to 3 each/.test(sum)&&/every ~30s/.test(sum));
 await setDry(ui,false);check('summary flips to LIVE',/LIVE/.test(await ui.textContent('#startSummary')));await setDry(ui,true);
 check('Pace & limits and Advanced start collapsed with captions',!await ui.evaluate(()=>document.getElementById('secPace').open)&&/limit 10/.test(await ui.textContent('#paceSum'))&&/none set/.test(await ui.textContent('#advSum')));
 await ui.click('#secPace>summary');check('opening a section is remembered',await ui.evaluate(async()=>{await new Promise(r=>setTimeout(r,150));return (await chrome.storage.local.get('ui')).ui.secPace===true;}));
 await ui.evaluate(()=>{window.__sent.length=0;});await ui.focus('#target');await ui.keyboard.press('Control+Enter');await ui.waitForTimeout(300);check('Ctrl+Enter starts the task',await ui.evaluate(()=>window.__sent.some(m=>m.action==='start')));
 // factory reset
 await ui.evaluate(()=>{document.getElementById('secAdv').open=true;});await act('comment');await ui.fill('#comment','Great!');await ui.fill('#exclude','bob');await ui.fill('#perUser','7');await setDry(ui,false);
 await ui.evaluate(()=>chrome.storage.local.set({draft:{action:'comment',target:'x',dry:false},config:{action:'comment',target:'x',dry:false}}));
 await ui.click('#reset');check('Reset asks for a second click',/Click again/.test(await ui.textContent('#reset'))&&await ui.inputValue('#target')==='alice, bob');
 await ui.click('#reset');await ui.waitForTimeout(200);
 check('Reset erases target, comment, exclude and numbers to factory defaults',await ui.inputValue('#target')===''&&await ui.inputValue('#comment')===''&&await ui.inputValue('#exclude')===''&&await ui.inputValue('#perUser')==='3'&&await ui.inputValue('#action')==='like');
 check('Reset puts Preview only back on and forgets the draft and last config',await ui.isChecked('#dry')&&await ui.evaluate(async()=>{const o=await chrome.storage.local.get(['draft','config']);return !o.draft&&!o.config;}));
 // history filters, badges
 await ui.evaluate(()=>chrome.storage.local.set({history:[{time:1,message:'Liked post'},{time:2,message:'Skipped: already liked'},{time:3,message:'Task paused: captcha'}],debugLog:[{l:'error',t:Date.now()+5,m:'x'}]}).then(()=>render()));
 check('sidebar shows the history count and a debug error dot',(await ui.textContent('#historyCount'))==='3'&&await vis(ui,'#debugDot'));
 await ui.click('#historyTab');await ui.click('#histTools [data-f="skipped"]');check('history filter shows only skipped items',await ui.evaluate(()=>document.querySelectorAll('#events .event').length===1));
 await ui.click('#histTools [data-f="problem"]');check('history filter shows problems',await ui.evaluate(()=>document.querySelectorAll('#events .event.k-problem').length===1));
 await ui.fill('#histSearch','liked');await ui.click('#histTools [data-f="all"]');check('history search narrows the list',await ui.evaluate(()=>document.querySelectorAll('#events .event').length===2));
 await ui.click('#debugTab');check('opening Debug log clears its dot',!await vis(ui,'#debugDot'));
 await ui.click('#firstRunOk').catch(()=>{});
 await ctx.close();
 // popup layout
 const {ctx:pc,pg:pp}=await open('popup.html',{width:760,height:600});
 let overlap=false;for(const y of [0,150,300,600,900,1500]){await pp.evaluate(y=>window.scrollTo(0,y),y);const r=await pp.evaluate(()=>({l:document.querySelector('article.live').getBoundingClientRect().bottom,s:document.querySelector('article.setups').getBoundingClientRect().top}));if(r.s<r.l-1)overlap=true;}
 check('popup: Saved setups never overlaps Live session',!overlap);
 await pp.evaluate(()=>window.scrollTo(0,0));
 const bars=await pp.evaluate(()=>({inner:[...document.querySelectorAll('body *')].filter(e=>/auto|scroll/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+2).map(e=>e.tagName),side:document.documentElement.scrollWidth>document.documentElement.clientWidth+1}));
 check('popup: single scrollbar, no horizontal scroll',bars.inner.length===0&&!bars.side);
 check('popup: nothing is fixed or sticky',await pp.evaluate(()=>[...document.querySelectorAll('body *')].every(e=>!['fixed','sticky'].includes(getComputedStyle(e).position))));
 await pc.close();
 // on-page panel loads without errors
 const pctx=await browser.newContext(),pn=await pctx.newPage();pn.on('pageerror',e=>{throw e;});await pn.setContent('<html><body></body></html>');await pn.evaluate(stub);
 await pn.addScriptTag({content:'globalThis.AuroraSelectors=globalThis.AuroraSelectors||{profileName:()=>null};'});await pn.addScriptTag({content:read('report.js')});await pn.addScriptTag({content:read('panel.js')});await pn.waitForTimeout(200);
 check('on-page panel mounts',await pn.evaluate(()=>!!document.getElementById('aurora-panel-host')));await pctx.close();
 console.log('\n'+passed+' UI checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
