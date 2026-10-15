(()=>{
 if(globalThis.__auroraContent)return;globalThis.__auroraContent=true;
 const D=AuroraDOM,S=AuroraSelectors;let locked=false;
 // Short trace of what this step saw; sent back with the result so the background can log it (never includes cookies or tokens).
 let trace=[];const T=(...a)=>{trace.push(a.join(' ').slice(0,160));if(trace.length>40)trace.shift();};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 // ---- Challenges (captcha, verification, "slow down") --------------------------------------------------
 const WARN=/Try Again Later|We restrict certain activity|Action Blocked|Too many attempts|You.re following too fast|You.re tapping too fast|challenge required/i;
 const VERIFY=/Confirm it.s you|Help us confirm|Verify to continue|Verify you are human|Security verification/i;
 const CAPTCHA_TEXT=/Drag the slider|fit the puzzle|Select \d objects?|same shape|Slide to complete|Rotate the (image|object)|Click on the (shapes|objects)/i;
 const CAPTCHA_SEL='[class*="captcha" i],[id*="captcha" i],[class*="secsdk" i],[class*="verify-bar" i],[class*="verify_bar" i],[class*="verify-wrap" i],[class*="verify-container" i],[class*="verify_container" i],iframe[src*="captcha" i]';
 const SKIP_TEXT='[data-e2e*="comment"],[data-e2e*="video-desc"],[data-e2e*="user-bio"],[data-e2e*="user-post"]';
 const MSG={
  captcha:'TikTok is showing a captcha. Solve it in the TikTok tab; Aurora continues automatically once it is solved (or press Resume).',
  verify:'TikTok is asking you to verify it is you. Complete it in the TikTok tab, then press Resume.',
  warning:'TikTok restricted this action ("slow down" or "try again later"). Wait a while before you press Resume.'
 };
 const cls=z=>typeof z.className==='string'?z.className:'';
 const big=z=>{const r=z.getBoundingClientRect();return r.width>150&&r.height>100;};
 const desc=z=>z.tagName.toLowerCase()+(z.id?'#'+z.id:'')+(cls(z)?'.'+cls(z).slice(0,60):'')+' "'+String(z.innerText||z.textContent||'').replace(/\s+/g,' ').slice(0,80)+'"';
 // Looks for a challenge that is really on screen: sized captcha widgets, captcha wording outside comments/captions, and warning dialogs/toasts.
 function detectChallenge(){
  for(const z of document.querySelectorAll(CAPTCHA_SEL))if(D.visible(z)&&big(z)&&(z.tagName==='IFRAME'||z.innerText||z.querySelector('iframe,canvas,img')))return {kind:'captcha',where:desc(z)};
  for(const el of document.querySelectorAll('div,span,p,h1,h2,h3,button')){
   if(el.childElementCount>2)continue;const t=el.textContent;if(!t||t.length>120||!CAPTCHA_TEXT.test(t))continue;
   if(D.visible(el)&&!el.closest(SKIP_TEXT))return {kind:'captcha',where:desc(el)};
  }
  for(const z of document.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="alert"],[class*="Toast" i]')){
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
  if(location.pathname.includes('/login')||document.querySelector('input[name="password"]'))throw Error('Sign in to TikTok, then resume.');
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
 async function receipt(key,status){const {receipts={}}=await chrome.storage.local.get('receipts');receipts[key]={status,time:Date.now()};await chrome.storage.local.set({receipts});}
 async function perform(key,id,click,confirm,message){
  const {receipts={}}=await chrome.storage.local.get('receipts');
  if(receipts[key])return {message:`Skipped: this action was already ${receipts[key].status}. Check TikTok before creating another task.`};
  await think(900,2600);
  await active(id);await receipt(key,'attempted');await active(id);await click();T('click sent');
  const ok=await until(confirm,id,9000);T('confirmed',!!ok);
  if(!ok)throw Error('Action was sent but could not be confirmed. It will not be automatically repeated. Check TikTok.');
  await receipt(key,'confirmed');return {performed:true,message};
 }
 async function step(s,c,id){
  await active(id);
  if(!await until(()=>D.scope(),id,15000))throw Error('TikTok did not render this page. Check access and resume.');
  const root=D.scope();T('step',s.kind,c.action||'','container',root.tagName.toLowerCase()+(root.id?'#'+root.id:''));
  if(S.pageKey(location.href)!==S.pageKey(s.url))throw Error('TikTok changed targets. Nothing was submitted.');
  if(s.kind==='posts'){
   // Read only the profile/hashtag video grid (never menus or side panels), and on a profile only that profile's own videos.
   const grid='[data-e2e="user-post-item-list"],[data-e2e="challenge-item-list"]';
   const read=()=>{const r=D.scope()||root,area=r.querySelector(grid)||r;return [...area.querySelectorAll('a[href]')].map(a=>S.postURL(a.href)).filter(Boolean).filter(u=>!s.username||u.split('/')[3]==='@'+s.username);};
   const empty=()=>{if(!s.username)return null;const t=document.body.innerText||'';return /This account is private/i.test(t)?'the account is private':/No content|No videos yet|hasn.t published any videos|has no videos/i.test(t)?'it has no videos':/Couldn.t find this account|Account not found|this account (?:doesn.t|does not) exist/i.test(t)?'the profile is unavailable':null;};
   const ready=await until(()=>read().length||empty(),id,15000);
   if(!ready)throw Error('No posts appeared. Use an accessible hashtag/profile; check the task tab.');
   if(!read().length)T('empty profile:',ready);
   if(!read().length)return {posts:[],note:`Skipped @${s.username}: ${ready}.`};
   T('post links',read().length);
   const posts=await collect(root,read,c.mode==='hashtag'?c.scanLimit:c.perUser,id);
   return {posts,note:'Collected available posts within your scan limit.'};
  }
  if(s.kind==='users'){
   if(s.source==='commenters'){
    if(!await until(()=>D.commenters(root).length,id))throw Error('No rendered comment authors found. Open/load comments on the task post and resume.');
    return {users:await collect(root,()=>D.commenters(root),c.scanLimit,id),note:'Comment authors only; hidden comments are not accessible.'};
   }
   let dialog=D.listDialog(s.source);
   if(!dialog){const button=await until(()=>S.listControl(root,s.source),id);if(!button)throw Error(`Could not find the ${s.source} control. Open that list on the task tab and resume.`);button.click();dialog=await until(()=>D.listDialog(s.source),id);}
   if(!dialog)throw Error(`The ${s.source} dialog did not open. Open it manually and resume.`);
   const own=S.profileName(location.href)?.toLowerCase(),listed=()=>D.names(dialog).filter(n=>n!==own);
   if(!await until(()=>listed().length,id))throw Error('The list is empty or TikTok did not expose accounts.');
   return {users:await collect(dialog,listed,c.scanLimit,id),note:'Collected available accounts within your scan limit.'};
  }
  if(s.kind==='author'){const author=await until(()=>D.author(root),id);if(!author)throw Error('Cannot identify this post author.');return {users:[author]};}
  const actor=D.actor();T('signed in',!!actor);
  if(s.kind==='account'){
   const name=S.profileName(location.href)?.toLowerCase();if(name!==s.username)throw Error('Profile changed; refusing to act on a different account.');
   if(c.exclude.includes(name)||actor===name)return {message:'Skipped: own or excluded profile.'};
   const hdr=()=>D.profileHeader(D.scope()||root);let header=hdr();
   const ids=()=>[...hdr().querySelectorAll('[data-e2e="user-title"],[data-e2e="user-subtitle"]')].map(e=>e.textContent.trim().replace(/^@/,'').toLowerCase());
   const verified=await until(()=>ids().includes(name)||(hdr()!==document.body&&(hdr().innerText||'').toLowerCase().includes(name)&&ids().length),id,15000);
   if(!verified)throw Error('Cannot verify the rendered profile. No account action sent.');header=hdr();
   await until(()=>D.button(hdr(),'Follow')||D.button(hdr(),'Follow back')||D.button(hdr(),'Following')||D.button(hdr(),'Requested')||D.button(hdr(),'Friends')||D.button(hdr(),'Edit profile'),id);
   if(D.button(hdr(),'Edit profile'))return {message:'Skipped: your own profile.'};
   if(c.action==='follow'){
    if(D.button(hdr(),'Following')||D.button(hdr(),'Requested')||D.button(hdr(),'Friends'))return {message:'Skipped: already following or requested.'};
    const button=D.button(hdr(),'Follow')||D.button(hdr(),'Follow back');if(!button)throw Error('Follow control unavailable.');
    if(c.dry)return {preview:true,message:`Preview: follow @${name}. No change made.`};
    if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
    return perform(`${actor}:follow:${name}:${id}`,id,()=>button.click(),()=>D.button(hdr(),'Following')||D.button(hdr(),'Requested')||D.button(hdr(),'Friends'),`Followed/requested @${name}.`);
   }
   if(c.action!=='unfollow'||c.mode!=='users')throw Error('Unfollow requires an explicit username list.');
   const following=D.button(hdr(),'Following')||D.button(hdr(),'Friends');if(!following)return {message:'Skipped: not currently following.'};
   if(c.dry)return {preview:true,message:`Preview: unfollow @${name}. No change made.`};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
   return perform(`${actor}:unfollow:${name}:${id}`,id,async()=>{following.click();const next=await until(()=>D.button(hdr(),'Follow')||D.button(hdr(),'Follow back')||[...document.querySelectorAll('[role="dialog"]')].map(d=>D.button(d,'Unfollow')).find(Boolean),id);if(!next)throw Error('Unfollow outcome is uncertain. Check TikTok manually.');if(D.text(next)==='Unfollow'){await active(id);next.click();}},()=>D.button(hdr(),'Follow')||D.button(hdr(),'Follow back'),`Unfollowed @${name}.`);
  }
  if(s.kind!=='engage')throw Error('Unknown step. Create a new task.');
  const urlAuthor=new URL(s.url).pathname.split('/')[1].slice(1).toLowerCase();
  const author=await until(()=>D.author(root)||(D.names(root).includes(urlAuthor)?urlAuthor:null),id);T('author found',!!author);
  // TikTok also accepts the numeric account id in the address; the video id (already matched above) is then the proof of identity.
  if(!author||(!/^\d+$/.test(urlAuthor)&&author!==urlAuthor))throw Error('Cannot verify the video author'+(author?` (page shows @${author}, expected @${urlAuthor})`:' (no author link found on the page)')+'. Nothing submitted.');
  if(actor&&author===actor)return {message:'Skipped: this is your own post.'};
  if(c.exclude.includes(author))return {message:'Skipped: excluded post author.'};
  if(c.action==='like'){
   const button=await until(()=>D.likeButton(root,author),id);if(!button&&/\/photo\//.test(location.pathname))return {message:'Skipped: Like control not found on this photo post (photo layouts can differ). Use Check page if this repeats.'};if(!button)throw Error(`Cannot identify a unique video Like control (found ${D.likeCandidates(root).length}).`);
   const state=D.likeState(button);T('like candidates',D.likeCandidates(root).length,'state',state);
   if(state===true)return {message:'Skipped: video already liked.'};
   if(state!==false)throw Error('Cannot read whether this video is liked. No click sent.');
   if(c.dry)return {preview:true,message:'Preview: eligible video like. No change made.'};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
   return perform(`${actor}:like:${S.pageKey(location.href)}:${id}`,id,()=>button.click(),()=>D.likeState(D.likeButton(root,author))===true,'Liked video.');
  }
  if(c.action==='comment'){
   // The page can replace the comment box while typing, so always look it up fresh instead of holding on to one element.
   const live=()=>D.scope()||root;let lastField=null;const findField=()=>{const f=D.commentField(live())||D.commentField(document)||(lastField&&lastField.isConnected&&D.visible(lastField)?lastField:null);if(f)lastField=f;return f;};
   // Describes the comment-related parts of the page so a failed run shows what TikTok actually rendered.
   const probe=()=>{const v=[...document.querySelectorAll('[data-e2e*="comment"]')].slice(0,14).map(e=>(e.getAttribute('data-e2e')||'')+(D.visible(e)?'+':'-')+(e.isContentEditable?'E':'')).join(' ');const ed=[...document.querySelectorAll('textarea,[contenteditable="true"],[role="textbox"]')].map(e=>e.tagName.toLowerCase()+(D.visible(e)?'+':'-')).join(' ');return `url=${location.pathname} e2e[${v}] editors[${ed}] fieldNow=${!!findField()}`;};
   // TikTok shows the comment panel by itself once the page has loaded, so give it time before clicking the (toggle) comments icon.
   {const t0=Date.now();while(document.readyState!=='complete'&&Date.now()-t0<15000){await active(id);await wait(300);}
    for(let k=0;k<10&&!findField();k++){await active(id);await wait(400);}}
   if(!findField()){for(let tries=0;tries<2&&!findField();tries++){const open=D.commentsButton(live());T('comments button found',!!open);if(!open)break;D.press(open);T('clicked the comments icon, attempt',tries+1);await until(findField,id,6000);}}
   // TikTok's side panel can be showing the "You may like" tab; switch it to Comments like a person would.
   const showCommentsTab=()=>{const t=[...document.querySelectorAll('[role="tab"],div,span,button,p')].find(e=>D.visible(e)&&!e.children.length&&/^comments?$/i.test(e.textContent.trim())&&e.closest('[role="tablist"],[class*="Tab" i]')&&e.getAttribute('aria-selected')!=='true');if(t){D.press(t);T('switched the side panel to Comments');}return !!t;};
   if(!findField()&&showCommentsTab())await until(findField,id,3000);
   T('comment dom',probe());
   const field=findField();T('comment box found',!!field);
   if(!field)return {message:'Skipped: comments are disabled or the comment field is unavailable.'};
   if(c.dry)return {preview:true,message:`Preview comment: ${c.comment}. Nothing posted.`};
   if(!actor)throw Error('Cannot identify the signed-in account. Refresh TikTok.');
   const key=`${actor}:comment:${S.pageKey(location.href)}`;
   const {receipts={}}=await chrome.storage.local.get('receipts');if(receipts[key])return {message:'Skipped: Aurora already attempted a comment on this post. No duplicate sent.'};
   if(D.fieldText(field).trim())throw Error('The comment box already contains text. Clear it manually before resuming.');
   const want=c.comment.replace(/\s*[\r\n]+\s*/g,' ').trim();
   const ownComment=()=>[...D.commentRows(live()),...D.commentRows(document)].some(row=>D.names(row)[0]===actor&&row.textContent.includes(want));
   if(ownComment())return {message:'Skipped: your comment is already visible.'};
   await active(id);await think(500,1400);
   // Let the video page finish loading and re-rendering before typing; TikTok can close or rebuild the comment panel while it hydrates.
   {const t0=Date.now();while(document.readyState!=='complete'&&Date.now()-t0<15000){await active(id);await wait(300);}await think(1500,2800);
    let prev=findField(),still=0;while(still<4&&Date.now()-t0<25000){await active(id);await wait(400);const cur=findField();if(cur&&cur===prev)still++;else{still=0;prev=cur;}}
    if(!findField()){await wait(2000);if(!findField()){const open=D.commentsButton(live());T('panel closed while loading; reopening',!!open,probe());if(open){D.press(open);await until(findField,id,6000);}}}}
   // If TikTok closes the comment panel mid-typing, click the comments icon again to bring it back, then carry on from where we were.
   // Click where a person would: the element actually under the box (TikTok puts a placeholder layer over it), then focus the editor.
   try{const f0=findField(),r0=f0.getBoundingClientRect();D.press(document.elementFromPoint(r0.left+Math.min(r0.width/2,60),r0.top+r0.height/2)||f0);f0.focus();}catch{}await think(300,800);
   let typed='',recoveries=0;
   const recover=async()=>{const btns=D.commentsButtons(live());const open=btns[0];const st=b=>b?`${b.getAttribute('aria-pressed')||b.getAttribute('aria-expanded')||'-'}`:'none';
    for(let a=0;a<5&&open;a++){T('comment box lost; toggling the comments icon, try',a+1,'icons',btns.length,'state',st(open),probe());D.press(open);const f=await until(findField,id,2500);if(f)return f;}return null;};
   await typeHuman(want,id,async ch=>{
    let f=findField();if(!f){await wait(500);f=findField();}
    if(!f&&recoveries<3){recoveries++;f=await recover();if(f){await wait(600);f=findField()||f;const now=D.fieldText(f).trim();if(now&&now!==typed){f.focus();if('value' in f)f.value='';else{document.execCommand('selectAll');document.execCommand('delete');}}if(D.fieldText(f).trim()!==typed)for(const x of typed)D.typeChar(f,x);T('comment box restored',recoveries);}}
    if(!f){T('comment box gone',probe());throw Error('The comment box disappeared while typing. Nothing was submitted.');}
    D.typeChar(f,ch);typed+=ch;
    if(typed.length===1){await wait(500);T('after the first character, box present',!!findField(),location.pathname);}
   });
   {const f=findField();T('typed',[...want].length,'characters');if(!f||D.fieldText(f).trim()!==want)throw Error('Typing did not complete as expected. Nothing was submitted.');}
   const submit=await until(()=>D.commentSubmit(live())||D.commentSubmit(document),id,5000);T('post button found',!!submit,'box still attached',field.isConnected);
   if(!submit)throw Error('Comment prepared but Post control is unavailable. Nothing was submitted.');
   return perform(key,id,()=>submit.click(),()=>{const f=findField();return (!f||!D.fieldText(f).trim())&&ownComment();},'Posted your comment.');
  }
  throw Error('Unsupported post action.');
 }
 // Read-only report used by the on-page "Check page" button. Contains counts and yes/no only, no names or tokens.
 globalThis.AuroraDiagnose=()=>{
  const root=D.scope()||document.body,mark=ok=>ok?'✓':'✗';
  const kind=S.postURL(location.href)?'video':S.profileName(location.href)?'profile':/^\/tag\//.test(location.pathname)?'hashtag':'other';
  const likes=D.likeCandidates(root).length,lang=(document.documentElement.lang||'').toLowerCase();
  const rows=[
   ['Page type',kind],
   ['Signed in',mark(!!D.actor())],
   ['English interface',mark(lang.startsWith('en'))+(lang?` (${lang})`:'')],
   ['Page container found',mark(!!D.scope())],
   ['Video author found',kind==='video'?mark(!!D.author(root)):'n/a'],
   ['Like buttons found',kind==='video'?`${likes} ${mark(likes>=1)}`:'n/a'],
   ['Like state readable',kind==='video'?mark(D.likeState(D.likeButton(root,D.author(root)))!==null):'n/a'],
   ['Profile name header',kind==='profile'?mark(!!root.querySelector('[data-e2e="user-title"],[data-e2e="user-subtitle"]')):'n/a'],
   ['Follow/Following button',kind==='profile'?mark(['Follow','Follow back','Following','Requested','Friends','Edit profile'].some(l=>D.button(root,l))):'n/a'],
   ['Comment box found',kind==='video'?mark(!!(D.commentField(root)||D.commentField(document))):'n/a'],
   ['Comments button found',kind==='video'?mark(!!D.commentsButton(root)):'n/a'],
   ['Video links on page',String([...root.querySelectorAll('a[href]')].filter(a=>S.postURL(a.href)).length)],
   ['Comment rows',String(D.commentRows(root).length)],
   ['Followers/following popup',mark(!!D.listDialog('followers')||!!D.listDialog('following'))],
   ['Captcha/warning visible',(()=>{if(location.pathname.includes('/login'))return 'login page';const c=detectChallenge();return c?'YES: '+c.kind+' ('+c.where+')':'no';})()]
  ];
  return 'Aurora page check\n'+rows.map(([k,v])=>`${k}: ${v}`).join('\n');
 };
 chrome.runtime.onMessage.addListener((m,s,reply)=>{if(m.action!=='step'||s.id!==chrome.runtime.id)return;if(locked){reply({wait:'Waiting for the current step.'});return;}locked=true;trace=[];const diag=()=>{try{return globalThis.AuroraDiagnose();}catch{return '';}};step(m.step,m.config,m.jobId).then(r=>reply({...r,trace}),e=>reply({error:e.message,trace,diag:diag(),stack:String(e.stack||'').split('\n').slice(0,4).join('\n')})).finally(()=>locked=false);return true;});
})();

