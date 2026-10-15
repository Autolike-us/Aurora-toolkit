(()=>{
 if(globalThis.__auroraContent)return;globalThis.__auroraContent=true;
 const D=AuroraDOM,S=AuroraSelectors;let locked=false;
 // Short trace of what this step saw; sent back with the result so the background can log it (never includes cookies or tokens).
 let trace=[];const T=(...a)=>{trace.push(a.join(' ').slice(0,160));if(trace.length>40)trace.shift();};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 // ---- Challenges (captcha, verification, "try again later") ---------------------------------------------
 const WARN=/Try Again Later|We restrict certain activity|Action Blocked/i;
 const VERIFY=/Confirm it.s you|Help us confirm|challenge required|Suspicious Login Attempt/i;
 const CAPTCHA_TEXT=/Drag the slider|fit the puzzle|Select \d objects?|same shape|Slide to complete|I.m not a robot/i;
 const CAPTCHA_SEL='[class*="captcha" i],[id*="captcha" i],[class*="recaptcha" i],iframe[src*="captcha" i],iframe[src*="recaptcha" i]';
 const MSG={
  captcha:'Instagram is showing a captcha. Solve it in the Instagram tab; Aurora continues automatically once it is solved (or press Resume).',
  verify:'Instagram is asking you to verify it is you. Complete it in the Instagram tab, then press Resume.',
  warning:'Instagram restricted this action ("try again later"). Wait a while before you press Resume.'
 };
 const cls=z=>typeof z.className==='string'?z.className:'';
 const big=z=>{const r=z.getBoundingClientRect();return r.width>150&&r.height>100;};
 const desc=z=>z.tagName.toLowerCase()+(z.id?'#'+z.id:'')+(cls(z)?'.'+cls(z).slice(0,60):'')+' "'+String(z.innerText||z.textContent||'').replace(/\s+/g,' ').slice(0,80)+'"';
 // Looks for a challenge that is really on screen: sized captcha widgets, the challenge page, and warning dialogs/alerts.
 function detectChallenge(){
  if(location.pathname.startsWith('/challenge'))return {kind:'verify',where:'page '+location.pathname};
  for(const z of document.querySelectorAll(CAPTCHA_SEL))if(D.visible(z)&&big(z)&&(z.tagName==='IFRAME'||z.innerText||z.querySelector('iframe,canvas,img')))return {kind:'captcha',where:desc(z)};
  for(const z of document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="alert"]')){
   if(!D.visible(z))continue;const t=z.innerText||'';
   if(CAPTCHA_TEXT.test(t))return {kind:'captcha',where:desc(z)};
   if(VERIFY.test(t))return {kind:'verify',where:desc(z)};
   if(WARN.test(t))return {kind:'warning',where:desc(z)};
  }
  return null;
 }
 globalThis.AuroraChallenge=()=>{try{return detectChallenge();}catch{return null;}};
 let lastCheck=0;
 // Checked at most every 1.5 s so busy pages stay light.
 function blocked(force){
  if(location.pathname.includes('/accounts/login')||document.querySelector('input[name="password"]'))throw Error('Sign in to Instagram, then resume.');
  const now=Date.now();if(!force&&now-lastCheck<1500)return;lastCheck=now;
  const c=detectChallenge();
  if(c){T('challenge',c.kind,c.where);throw Error(MSG[c.kind]);}
 }
 // ---- Human-like pacing -------------------------------------------------------------------------------
 const rand=(a,b)=>a+Math.random()*(b-a);
 const think=(a,b)=>wait(rand(a,b));
 // Types one character at a time with a human rhythm: uneven gaps, longer after spaces and punctuation, the odd pause to think.
 // Very long texts are sped up so typing never takes more than about 90 seconds.
 async function typeHuman(text,id,put){
  const chars=[...String(text)];
  const gaps=chars.map((ch,i)=>{let g=rand(70,190);if(ch===' ')g+=rand(30,150);else if(/[.,!?;:]/.test(ch))g+=rand(120,380);if(Math.random()<0.04)g+=rand(450,1300);if(i===0)g+=rand(250,650);return g;});
  const total=gaps.reduce((a,b)=>a+b,0),scale=total>90000?90000/total:1;
  for(let i=0;i<chars.length;i++){if(i%8===0)await active(id);await put(chars[i]);await wait(gaps[i]*scale);}
 }
 async function active(id){blocked();const {job}=await chrome.storage.local.get('job');if(job?.id!==id||job.status!=='running')throw Error('Task stopped or paused.');if(!job.licenseExpires||job.licenseExpires*1000<=Date.now())throw Error('Aurora license expired. Open License & activation.');if(Date.now()-(job.licenseCheckedAt||0)>60000){const entitlement=await chrome.runtime.sendMessage({action:'licenseCheck'});if(!entitlement?.ok)throw Error(entitlement?.error||'License check failed. Open License & activation.');}}
 async function until(fn,id,ms=12000){for(let t=0;t<ms;t+=300){await active(id);const x=fn();if(x)return x;await wait(300);}return null;}
 async function collect(root,read,limit,id){
  const found=new Set();let stale=0;
  for(let i=0;i<20&&found.size<limit&&stale<3;i++){
   await active(id);const before=found.size;read().forEach(x=>found.add(x));stale=found.size===before?stale+1:0;
   if(found.size>=limit)break;
   const scroller=D.scrollContainer(root);
   if(scroller)scroller.scrollTop+=Math.max(300,scroller.clientHeight*0.8);
   else if(root.matches('[role="dialog"]'))break;
   else {const more=D.controls(root).find(b=>/^(Load more comments|View more comments)$/i.test(b.textContent.trim()));if(more)more.click();else window.scrollBy(0,Math.max(500,innerHeight*0.8));}
   await wait(650);
  }
  return [...found].slice(0,limit);
 }
 function postDate(root){return [...root.querySelectorAll('a[href]')].filter(a=>S.pageKey(a.href)===S.pageKey(location.href)).map(a=>a.querySelector('time[datetime]')).find(Boolean);}
 async function receipt(key,status){const {receipts={}}=await chrome.storage.local.get('receipts');receipts[key]={status,time:Date.now()};await chrome.storage.local.set({receipts});}
 async function perform(key,id,click,confirm,message){
  const {receipts={}}=await chrome.storage.local.get('receipts');
  if(receipts[key])return {message:`Skipped: this action was already ${receipts[key].status}. Check Instagram before creating another task.`};
  await think(900,2600);
  await active(id);await receipt(key,'attempted');await active(id);await click();T('click sent');
  const ok=await until(confirm,id,9000);T('confirmed',!!ok);
  if(!ok)throw Error('Action was sent but could not be confirmed. It will not be automatically repeated. Check Instagram.');
  await receipt(key,'confirmed');return {performed:true,message};
 }
// Like or comment on the post shown in `root` (an article, a post page or the open post popup).
 async function postAction(c,id,root,actor){
  const author=await until(()=>D.author(root),id);T('author found',!!author);
  if(actor&&author&&author===actor)return {message:'Skipped: this is your own post.'};
  if(author&&c.exclude.includes(author))return {message:'Skipped: excluded post author.'};
  if(c.videos&&(root.querySelector('video')||location.pathname.includes('/reel/')))return {message:'Skipped: video filter.'};
  if(c.maxAge){const time=postDate(root);if(!time)throw Error('Cannot determine the post date with the age filter enabled.');if(Date.now()-Date.parse(time.dateTime)>c.maxAge*86400000)return {message:'Skipped: older than your age filter.'};}
  if(c.action==='like'){
   const bar=await until(()=>D.bar(root),id);T('action bar',!!bar);if(!bar)throw Error('Cannot identify post action bar. Comment likes were not clicked.');
   if(bar.querySelector('svg[aria-label="Unlike"]'))return {message:'Skipped: post already liked.'};
   const button=bar.querySelector('svg[aria-label="Like"]')?.closest('button,[role="button"]');if(!button)throw Error('Post Like button unavailable.');
   if(c.dry)return {preview:true,message:'Preview: eligible post like. No change made.'};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh Instagram.');
   return perform(`${actor}:like:${S.pageKey(location.href)}:${id}`,id,()=>button.click(),()=>D.bar(root.isConnected?root:(postRoot()||root))?.querySelector('svg[aria-label="Unlike"]'),'Liked post.');
  }
  if(c.action==='comment'){
   // Instagram can replace the comment box while typing, so always look it up fresh instead of holding on to one element.
   const findField=()=>[...(root).querySelectorAll('textarea'),...document.querySelectorAll('textarea')].filter(D.visible).find(e=>/comment/i.test(e.placeholder||e.getAttribute('aria-label')||''))||null;
   const field=await until(findField,id);T('comment box found',!!field);
   if(!field)return {message:'Skipped: comments are disabled or the comment field is unavailable.'};
   if(c.dry)return {preview:true,message:`Preview comment: ${c.comment}. Nothing posted.`};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh Instagram.');
   const key=`${actor}:comment:${S.pageKey(location.href)}`;
   const {receipts={}}=await chrome.storage.local.get('receipts');if(receipts[key])return {message:'Skipped: Aurora already attempted a comment on this post. No duplicate sent.'};
   if(field.value.trim()&&field.value.trim()!==c.comment.replace(/\s*[\r\n]+\s*/g,' ').trim())throw Error('The comment box already contains text. Clear it manually before resuming.');
   const want=c.comment.replace(/\s*[\r\n]+\s*/g,' ').trim();
   const ownComment=()=>D.commentRows(root).some(row=>D.names(row)[0]===actor&&row.textContent.includes(want));
   if(ownComment())return {message:'Skipped: your comment is already visible.'};
   await active(id);await think(500,1400);
   // Let the page finish loading and re-rendering before typing; Instagram resets the box while it hydrates.
   {const t0=Date.now();while(document.readyState!=='complete'&&Date.now()-t0<15000){await active(id);await wait(300);}await think(1500,2800);
    let prev=findField(),still=0;while(still<4&&Date.now()-t0<25000){await active(id);await wait(400);const cur=findField();if(cur&&cur===prev)still++;else{still=0;prev=cur;}}}
   const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
   let typed='';await typeHuman(want,id,async ch=>{const f=findField();if(!f)throw Error('The comment box disappeared while typing. Nothing was submitted.');f.focus();if(f.value!==typed){T('box was reset while typing; restoring');setter.call(f,typed);f.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));}typed+=ch;f.dispatchEvent(new KeyboardEvent('keydown',{key:ch,bubbles:true}));setter.call(f,typed);f.dispatchEvent(new InputEvent('input',{bubbles:true,data:ch,inputType:'insertText'}));f.dispatchEvent(new KeyboardEvent('keyup',{key:ch,bubbles:true}));});
   {let f=findField();if(f&&f.value!==want){T('final text mismatch; restoring');f.focus();setter.call(f,want);f.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));await wait(400);f=findField();}T('typed',[...want].length,'characters');if(!f||f.value.trim()!==want)throw Error('Typing did not complete as expected. Nothing was submitted.');}
   const submit=await until(()=>{const f=findField(),form=f&&(f.closest('form')||f.parentElement),b=form&&D.button(form,'Post');return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'?b:null;},id,5000);T('post button found',!!submit,'box still attached',field.isConnected);
   if(!submit)throw Error('Comment prepared but Post control is unavailable. Nothing was submitted.');
   return perform(key,id,()=>submit.click(),()=>{const f=findField();return (!f||!f.value.trim())&&ownComment();},'Posted your comment.');
  }
  throw Error('Unsupported post action.');
 }
 // ---- Walk a profile in place: open its first post, act, press Next, repeat -------------------------------------
 const outsideMain=e=>{const m=document.querySelector('main');return !m||!m.contains(e);};
 // The open post popup lives outside <main>: find it from its Comment icon.
 function postRoot(){
  for(const svg of document.querySelectorAll('svg[aria-label="Comment"]')){
   if(!D.visible(svg)||!outsideMain(svg))continue;
   const hit=svg.closest('article')||svg.closest('[role="dialog"]');if(hit)return hit;
   let e=svg.parentElement;for(let n=0;e&&e!==document.body&&n<14;n++,e=e.parentElement)if(e.querySelector('header')&&D.bar(e))return e;
  }
  return null;
 }
 // The popup's own Next arrow (not a photo carousel's, which sits inside the article).
 const nextBtn=()=>{const all=[...document.querySelectorAll('svg[aria-label="Next"]')].map(v=>v.closest('button,[role="button"]')).filter(b=>b&&D.visible(b)&&outsideMain(b));return all.find(b=>!b.closest('article'))||all.find(b=>b.closest('._aaqg'))||null;};
 const gridTiles=()=>{const m=document.querySelector('main');return m?[...m.querySelectorAll('a[href]')].filter(a=>S.postURL(a.href)&&D.visible(a)&&a.querySelector('img')):[];};
 // Live progress for the panel and studio (the background only updates the job when the whole walk ends).
 const progress=(id,acted,text)=>chrome.storage.local.set({walk:{id,acted,text,time:Date.now()}}).catch(()=>{});
 async function sleepActive(ms,id){for(let t=0;t<ms;t+=1000){await active(id);await wait(Math.min(1000,ms-t));}}
 async function closePost(profileKey){
  for(let n=0;n<3&&postRoot();n++){
   const x=[...document.querySelectorAll('svg[aria-label="Close"]')].map(v=>v.closest('button,[role="button"]')).find(b=>b&&D.visible(b)&&outsideMain(b));
   if(x)x.click();else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',keyCode:27,bubbles:true}));
   await wait(900);
  }
  if(S.pageKey(location.href)!==profileKey){history.back();await wait(1200);}
 }
 async function walk(s,c,id,actor){
  const name=S.profileName(location.href)?.toLowerCase();if(name!==s.username)throw Error('Profile changed; refusing to act on a different account.');
  if(c.exclude.includes(name)||actor===name)return {message:'Skipped: own or excluded profile.'};
  const profileKey=S.pageKey(location.href);
  if(postRoot())await closePost(profileKey);
  const tile=await until(()=>gridTiles()[0]||(/This account is private|No posts yet|Sorry, this page isn.t available/i.test(document.body.innerText||'')?'none':null),id,15000);
  if(!tile||tile==='none'){const t=document.body.innerText||'';const why=/This account is private/i.test(t)?'the account is private':/No posts yet/i.test(t)?'it has no posts':/this page isn.t available/i.test(t)?'the profile is unavailable':'no posts were found';return {message:`Skipped @${name}: ${why}.`};}
  const verb=c.action==='comment'?'commented on':'liked';
  const max=Math.max(1,Math.min(c.perUser,Math.max(1,(c.limit||1)-(s.done||0)),s.room==null?Infinity:Math.max(1,s.room)));
  T('walk','@'+name,'tiles',gridTiles().length,'max',max);await progress(id,0,'@'+name+': opening the first post…');
  tile.scrollIntoView({block:'center',behavior:'instant'});await think(700,1500);await active(id);tile.click();
  if(!await until(()=>S.postURL(location.href)&&postRoot(),id,15000))throw Error('The first post did not open. Check the task tab and resume.');
  let acted=0,lastSkip='',skippedLiked=0;const visited=new Set();
  try{
   for(let i=0;i<c.perUser*4+6&&acted<max;i++){
    await active(id);
    const key=S.pageKey(location.href);if(visited.has(key))break;visited.add(key);
    await until(()=>{const r=postRoot();return r&&D.bar(r);},id,10000);
    const root=postRoot();if(!root)throw Error('Lost the open post. Check the task tab and resume.');
    T('walk post',key);await progress(id,acted,'@'+name+': post '+(visited.size)+' — '+(c.dry?'checking':c.action==='comment'?'commenting':'liking')+'…');
    const r=await postAction(c,id,root,actor);
    if(r.performed||r.preview)acted++;else{lastSkip=String(r.message||'').replace(/^Skipped:\s*/,'');if(/already liked/i.test(lastSkip))skippedLiked++;}
    await progress(id,acted,'@'+name+': post '+visited.size+' '+(r.performed?'done ✓':r.preview?'checked':'skipped ('+lastSkip+')')+' · '+acted+'/'+max+' on this profile'+(acted<max&&r.performed?' · waiting before the next one…':''));
    if(acted>=max)break;
    // pace only after a real action; skipped posts move on quickly
    if(r.performed)await sleepActive(Math.round(c.delay*1000*(1+Math.random()*0.4)),id);
    const next=nextBtn();if(!next){T('no Next arrow: last post');break;}
    await active(id);await think(700,1800);next.click();
    if(!await until(()=>S.pageKey(location.href)!==key,id,8000)){T('Next did not advance');break;}
    await think(700,1500);
   }
  }finally{try{await closePost(profileKey);}catch{}}
  if(!acted)return {message:`Skipped @${name}: ${lastSkip||'nothing eligible'}.`};
  const extra=skippedLiked?` (${skippedLiked} already liked skipped)`:'';
  return c.dry?{preview:true,count:acted,message:`Preview: would ${c.action==='comment'?'comment on':'like'} ${acted} post${acted===1?'':'s'} on @${name}${extra}. Nothing changed.`}:{performed:true,count:acted,message:`${verb[0].toUpperCase()+verb.slice(1)} ${acted} post${acted===1?'':'s'} on @${name}${extra}.`};
 }
 async function step(s,c,id){
  await active(id);
  if(!await until(()=>D.scope(),id,15000))throw Error('Instagram did not render this page. Check access and resume.');
  const root=D.scope();T('step',s.kind,c.action||'','container',root.tagName.toLowerCase()+(root.id?'#'+root.id:''));
  if(s.kind==='posts'){
   const read=()=>[...root.querySelectorAll('a[href]')].map(a=>S.postURL(a.href)).filter(Boolean);
   const empty=()=>{if(!s.username)return null;const t=document.body.innerText||'';return /This account is private|This Account is Private/i.test(t)?'the account is private':/No posts yet|No Posts Yet/i.test(t)?'it has no posts':/Sorry, this page isn.t available|The link you followed may be broken|Page Not Found/i.test(t)?'the profile is unavailable':null;};
   const ready=await until(()=>read().length||empty(),id,15000);
   if(!ready)throw Error('No posts appeared. Use a specific place feed or accessible hashtag/profile; check the task tab.');
   if(!read().length)T('empty profile:',ready);
   if(!read().length)return {posts:[],note:`Skipped @${s.username}: ${ready}.`};
   T('post links',read().length);
   const posts=await collect(root,read,['hashtag','location'].includes(c.mode)?c.scanLimit:c.perUser,id);
   return {posts,note:'Collected available posts within your scan limit.'};
  }
  if(s.kind==='users'){
   if(s.source==='commenters'){
    if(!await until(()=>D.commenters(root).length,id))throw Error('No rendered comment authors found. Open/load comments on the task post and resume.');
    return {users:await collect(root,()=>D.commenters(root),c.scanLimit,id),note:'Comment authors only; hidden comments are not accessible.'};
   }
   let dialog=D.listDialog(s.source);
   if(!dialog){const button=await until(()=>s.source==='likers'?D.likerControl(root):S.listControl(root,s.source),id);if(!button)throw Error(`Could not find the ${s.source} control. Open that list on the task tab and resume.`);button.click();dialog=await until(()=>D.listDialog(s.source),id);}
   if(!dialog)throw Error(`The ${s.source} dialog did not open. Open it manually and resume.`);
   if(!await until(()=>D.names(dialog).length,id))throw Error('The list is empty or Instagram did not expose accounts.');
   return {users:await collect(dialog,()=>D.names(dialog),c.scanLimit,id),note:'Collected available accounts within your scan limit.'};
  }
  if(s.kind==='author'){const author=await until(()=>D.author(root),id);if(!author)throw Error('Cannot identify this post author.');return {users:[author]};}
  const actor=D.actor();T('signed in',!!actor);
  if(s.kind==='account'){
   const name=S.profileName(location.href)?.toLowerCase();if(name!==s.username)throw Error('Profile changed; refusing to act on a different account.');
   if(c.exclude.includes(name)||actor===name)return {message:'Skipped: own or excluded profile.'};
   const header=root.querySelector('header')||root;
   await until(()=>D.button(header,'Follow')||D.button(header,'Follow back')||D.button(header,'Following')||D.button(header,'Requested')||D.button(header,'Edit profile'),id);
   if(D.button(header,'Edit profile'))return {message:'Skipped: your own profile.'};
   if(c.action==='follow'){
    if(D.button(header,'Following')||D.button(header,'Requested'))return {message:'Skipped: already following or requested.'};
    const button=D.button(header,'Follow')||D.button(header,'Follow back');if(!button)throw Error('Follow control unavailable.');
    if(c.dry)return {preview:true,message:`Preview: follow @${name}. No change made.`};
    if(!actor)throw Error('Cannot identify the signed-in account. Refresh Instagram.');
    return perform(`${actor}:follow:${name}:${id}`,id,()=>button.click(),()=>D.button(header,'Following')||D.button(header,'Requested'),`Followed/requested @${name}.`);
   }
   if(c.action!=='unfollow'||c.mode!=='users')throw Error('Unfollow requires an explicit username list.');
   const following=D.button(header,'Following');if(!following)return {message:'Skipped: not currently following.'};
   if(c.dry)return {preview:true,message:`Preview: unfollow @${name}. No change made.`};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh Instagram.');
   return perform(`${actor}:unfollow:${name}:${id}`,id,async()=>{following.click();const confirm=await until(()=>[...document.querySelectorAll('[role="dialog"]')].map(d=>D.button(d,'Unfollow')).find(Boolean),id);if(!confirm)throw Error('Unfollow confirmation did not appear. Nothing else was clicked.');await active(id);confirm.click();},()=>D.button(header,'Follow')||D.button(header,'Follow back'),`Unfollowed @${name}.`);
  }
  if(s.kind==='walk')return walk(s,c,id,actor);
  if(s.kind!=='engage')throw Error('Unknown step. Create a new task.');
  return postAction(c,id,root,actor);
 }
 // Read-only report used by the on-page "Check page" button. Contains counts and yes/no only, no names or tokens.
 globalThis.AuroraDiagnose=()=>{
  const root=D.scope()||document.body,mark=ok=>ok?'✓':'✗';
  const kind=S.postURL(location.href)?'post':/^\/explore\/tags\//.test(location.pathname)?'hashtag':S.profileName(location.href)?'profile':'other';
  const lang=(document.documentElement.lang||'').toLowerCase(),bar=D.bar(root);
  const rows=[
   ['Page type',kind],
   ['Signed in',mark(!!D.actor())],
   ['English interface',mark(lang.startsWith('en'))+(lang?` (${lang})`:'')],
   ['Page container found',mark(!!D.scope())],
   ['Post action bar found',kind==='post'?mark(!!bar):'n/a'],
   ['Like heart found',kind==='post'?mark(!!(bar&&bar.querySelector('svg[aria-label="Like"],svg[aria-label="Unlike"]'))):'n/a'],
   ['Post author found',kind==='post'?mark(!!D.author(root)):'n/a'],
   ['Profile header',kind==='profile'?mark(!!root.querySelector('header')):'n/a'],
   ['Follow/Following button',kind==='profile'?mark(['Follow','Follow back','Following','Requested','Edit profile'].some(l=>D.button(root,l))):'n/a'],
   ['Post links on page',String([...root.querySelectorAll('a[href]')].filter(a=>S.postURL(a.href)).length)],
   ['Comment rows',String(D.commentRows(root).length)],
   ['Followers/following popup',mark(!!D.listDialog('followers')||!!D.listDialog('following'))],
   ['Warning visible',(()=>{if(location.pathname.includes('/accounts/login'))return 'login page';const c=detectChallenge();return c?'YES: '+c.kind+' ('+c.where+')':'no';})()]
  ];
  return 'Aurora page check\n'+rows.map(([k,v])=>`${k}: ${v}`).join('\n');
 };
 chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.action!=='step'||s.id!==chrome.runtime.id)return;if(locked){reply({wait:'Waiting for the current step.'});return;}locked=true;trace=[];const diag=()=>{try{return globalThis.AuroraDiagnose();}catch{return '';}};step(m.step,m.config,m.jobId).then(r=>reply({...r,trace}),e=>reply({error:e.message,trace,diag:diag(),stack:String(e.stack||'').split('\n').slice(0,4).join('\n')})).finally(()=>locked=false);return true;});
})();
