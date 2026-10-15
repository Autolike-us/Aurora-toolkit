globalThis.AuroraDOM={
 visible:e=>!!e?.getClientRects().length,
 controls(root){return root?[...root.querySelectorAll('button,[role="button"]')].filter(this.visible):[];},
 text(e){const copy=e.cloneNode(true);copy.querySelectorAll('svg').forEach(x=>x.remove());return copy.textContent.trim();},
 button(root,label){return this.controls(root).find(e=>this.text(e)===label||e.getAttribute('aria-label')===label);},
 scope(){const pick=q=>[...document.querySelectorAll(q)].find(this.visible);return pick('[data-e2e="browse-video-container"],[class*="DivBrowserModeContainer"],main,[role="main"]')||pick('[data-e2e="user-page"],#main-content-others_homepage,[id^="main-content"],[data-e2e="challenge-item-list"],#app')||(document.body&&this.visible(document.body)?document.body:null);},
 profileHeader(root){return root.querySelector('[data-e2e="user-page"]')||root;},
 names(root){return !root?[]:[...new Set([...root.querySelectorAll('a[href]')].filter(this.visible).map(a=>AuroraSelectors.profileName(a.href)?.toLowerCase()).filter(Boolean))];},
 author(root){const sel='[data-e2e="browse-username"],[data-e2e="video-author-uniqueid"],[data-e2e="browse-user-avatar"],[data-e2e="video-author-avatar"],[data-e2e="video-author-nickname"],[data-e2e="browse-user-name"]';
  for(const e of [...root.querySelectorAll(sel)].filter(this.visible)){
   const link=e.closest('a')||e.querySelector('a');const name=AuroraSelectors.profileName(e.href||link?.href||'')||(/uniqueid|username/.test(e.getAttribute('data-e2e'))&&/^@?[\w.]{1,30}$/.test(e.textContent.trim())?e.textContent.trim().replace(/^@/,''):null);
   if(name)return name.toLowerCase();
  }
  return null;},
 commentRows(root){return !root?[]:[...root.querySelectorAll('[data-e2e="comment-item"],[data-e2e="comment-level-1"]')].filter(this.visible);},
 commenters(root){return [...new Set(this.commentRows(root).map(row=>this.names(row)[0]).filter(Boolean))];},
 listDialog(source){
  const known=[...document.querySelectorAll('[role="dialog"],[data-e2e="follow-info-popup"],[class*="DivModalContainer"]')].filter(this.visible).find(e=>new RegExp(`\\b${source}\\b`,'i').test(e.getAttribute('aria-label')||e.textContent||''));
  if(known)return known;
  const tabRe=new RegExp(`^${source}\\s*[\\d.,]+\\s*[KMB]?$`,'i');
  const tabs=[...document.querySelectorAll('[role="tab"],div,span,a,button,p,h2,h3')].filter(e=>this.visible(e)&&tabRe.test(e.textContent.trim()));
  for(const tab of tabs){for(let n=tab.parentElement;n&&n!==document.body&&n!==document.documentElement;n=n.parentElement){if(n.querySelector('[data-e2e="user-page"],[data-e2e="user-title"],nav'))break;if(this.names(n).length>=2)return n;}}
  return null;
 },
 scrollContainer(root){return [root,...root.querySelectorAll('div,ul')].filter(e=>e.clientHeight>80&&e.scrollHeight>e.clientHeight+40&&/auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];},
 actor(){
  const fromMenu=[...document.querySelectorAll('a[data-e2e="profile-icon"],a[data-e2e="nav-profile"],a[aria-label="Profile"]')].filter(this.visible).map(a=>AuroraSelectors.profileName(a.href)?.toLowerCase()).find(Boolean);
  if(fromMenu)return fromMenu;
  // Fallback: the signed-in user's name is part of the page's own startup data.
  try{const el=document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');const u=JSON.parse(el?.textContent||'null')?.['__DEFAULT_SCOPE__']?.['webapp.app-context']?.user?.uniqueId;return /^[\w.]{1,30}$/.test(u||'')?u.toLowerCase():null;}catch{return null;}
 },
 likeCandidates(root){const q='[data-e2e="browse-like-icon"],[data-e2e="like-icon"],[aria-label^="Like video"],[aria-label^="Unlike video"],[aria-label^="Undo like"],[aria-label^="like video" i]';const heart=r=>[...r.querySelectorAll('svg path')].filter(p=>/^M7\.5 2\.25c3 0 4\.5 2/.test(p.getAttribute('d')||'')).map(p=>p.closest('svg'));
  const notComment=e=>!e.closest('[data-e2e*="comment"],[class*="CommentItem"],[class*="DivComment"]');
  const find=r=>[...new Set([...r.querySelectorAll(q),...heart(r)].filter(this.visible).filter(notComment).map(e=>e.closest('button,[role="button"]')||(e.tagName.toLowerCase()==='svg'?e.parentElement:e)))];let c=find(root);if(!c.length&&root!==document)c=find(document);return c;},
 inView(e){const r=e.getBoundingClientRect();const cy=r.top+r.height/2,cx=r.left+r.width/2;return cy>0&&cy<innerHeight&&cx>0&&cx<innerWidth;},
 likeButton(root,author){let c=this.likeCandidates(root);if(c.length>1)c=c.filter(e=>this.inView(e));
  if(c.length>1&&author)c=c.filter(e=>{for(let n=e.parentElement,i=0;n&&i<10;n=n.parentElement,i++){const names=this.names(n);if(names.length)return names[0]===author;}return false;});
  return c.length===1?c[0]:null;},
 likeState(button){if(!button)return null;const pressed=button.getAttribute('aria-pressed');if(pressed==='true')return true;if(pressed==='false')return false;const label=button.getAttribute('aria-label')||'';if(/^(Unlike video|Undo like)/i.test(label))return true;if(/^Like video/i.test(label))return false;const paints=[...button.querySelectorAll('svg,path')].map(e=>getComputedStyle(e).fill);if(paints.some(p=>/^rgba?\(25[45], 44, 85(?:, 1)?\)$/.test(p)))return true;if(paints.some(p=>/^rgba?\(22, 24, 35(?:, [\d.]+)?\)$/.test(p)))return false;if(paints.some(p=>/^rgba?\(255, 255, 255(?:, 0?\.9\d*)?\)$/.test(p)))return false;return null;},
 commentsButtons(root){const q='[data-e2e="browse-comment-icon"],[data-e2e="comment-icon"],[aria-label^="Read or add comments"]';const find=r=>r?[...r.querySelectorAll(q)].filter(this.visible).map(e=>e.closest('button,[role="button"]')||e):[];const mid=innerHeight/2,dist=e=>{const r=e.getBoundingClientRect();return Math.abs(r.top+r.height/2-mid);};return [...new Set([...find(root),...find(document)])].sort((a,b)=>dist(a)-dist(b));},
 press(el){const r=el.getBoundingClientRect(),o={bubbles:true,cancelable:true,view:window,clientX:r.left+r.width/2,clientY:r.top+r.height/2,button:0};for(const t of ['pointerover','mouseover','pointermove','mousemove','pointerdown','mousedown','pointerup','mouseup','click']){const C=t.startsWith('pointer')?PointerEvent:MouseEvent;el.dispatchEvent(new C(t,{...o,pointerId:1,isPrimary:true}));}},
 commentsButton(root){return this.commentsButtons(root)[0]||null;},
 commentField(root){if(!root)return null;const ok=e=>this.visible(e)&&(e.isContentEditable||e.tagName==='TEXTAREA');const hint=e=>/comment/i.test((e.placeholder||'')+(e.getAttribute('aria-label')||'')+(e.getAttribute('data-e2e')||'')+(e.closest('[data-e2e*="comment"]')?'comment':'')+(e.closest('[class*="CommentInput" i],[class*="comment-input" i]')?'comment':''));const all=[...root.querySelectorAll('textarea,[contenteditable="true"],[contenteditable="plaintext-only"],[role="textbox"],[data-e2e*="comment-input"]')].map(e=>e.isContentEditable||e.tagName==='TEXTAREA'?e:(e.querySelector('[contenteditable="true"],textarea')||e)).filter(ok);return all.find(hint)||null;},
 fieldText(field){return 'value' in field?field.value:field.textContent;},
 // One typed character (used by the human-paced typing); keeps the caret at the end of the box.
 // Puts the caret at the end of the text inside the editor's own text leaf (never on the outer wrapper), which rich-text editors like Draft.js need to track the selection.
 caretToEnd(field){const sel=getSelection();let n=field;while(n.lastChild)n=n.lastChild;const r=document.createRange();if(n.nodeType===3)r.setStart(n,n.length);else if(n!==field&&n.parentNode)r.setStartBefore(n);else r.selectNodeContents(field);r.collapse(true);sel.removeAllRanges();sel.addRange(r);},
 typeChar(field,ch){field.focus();if('value' in field){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,field.value+ch);field.dispatchEvent(new InputEvent('input',{bubbles:true,data:ch,inputType:'insertText'}));return;}const sel=getSelection();const inside=sel.rangeCount&&field.contains(sel.anchorNode)&&sel.anchorNode!==field;if(!inside)this.caretToEnd(field);
  // Draft.js style editors (TikTok's comment box) take text from the browser's own text-input event; send that first and only fall back to execCommand if the text did not appear.
  if(field.querySelector('[data-contents]')){const before=field.textContent;try{const ev=document.createEvent('TextEvent');ev.initTextEvent('textInput',true,true,window,ch,0,'en-US');field.dispatchEvent(ev);}catch{}if(field.textContent!==before)return;}
  if(!document.execCommand('insertText',false,ch))throw Error('TikTok comment editor did not accept text. Nothing submitted.');},
 fillComment(field,text){field.focus();if('value' in field){Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(field,text);field.dispatchEvent(new Event('input',{bubbles:true}));}else{if(!document.execCommand('insertText',false,text))throw Error('TikTok comment editor did not accept text. Nothing submitted.');}},
 commentSubmit(root){return [...root.querySelectorAll('[data-e2e="comment-post"],button,[role="button"]')].filter(this.visible).find(e=>(e.getAttribute('data-e2e')==='comment-post'||this.text(e)==='Post')&&!e.disabled&&e.getAttribute('aria-disabled')!=='true')||null;}
};
