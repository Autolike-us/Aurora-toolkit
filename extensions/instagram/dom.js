globalThis.AuroraDOM={
 visible:e=>!!e?.getClientRects().length,
 controls(root){return root?[...root.querySelectorAll('button,[role="button"]')].filter(this.visible):[];},
 text(e){const copy=e.cloneNode(true);copy.querySelectorAll('svg').forEach(x=>x.remove());return copy.textContent.trim();},
 button(root,label){return this.controls(root).find(e=>this.text(e)===label||e.getAttribute('aria-label')===label);},
 // Reel pages and post popups often have no <article> or <main>; fall back to a dialog or the page body when a post action bar is on screen.
 scope(){return document.querySelector('article')||document.querySelector('main')||[...document.querySelectorAll('[role="dialog"]')].find(d=>this.visible(d)&&d.querySelector('svg[aria-label="Comment"]'))||(document.querySelector('svg[aria-label="Comment"]')?document.body:null);},
 bar(root){
  if(!root)return null;
  const comment=[...root.querySelectorAll('svg[aria-label="Comment"]')].find(this.visible);
  for(let e=comment?.parentElement;e&&e!==root;e=e.parentElement){if(e.querySelector('svg[aria-label="Like"],svg[aria-label="Unlike"]'))return e;}
  return null;
 },
 names(root){return !root?[]:[...new Set([...root.querySelectorAll('a[href]')].filter(this.visible).map(a=>AuroraSelectors.profileName(a.href)).filter(Boolean).map(x=>x.toLowerCase()))];},
 author(root){return !root?undefined:[...root.querySelectorAll('a[href]')].filter(this.visible).map(a=>({name:AuroraSelectors.profileName(a.href),text:a.textContent?.trim()})).find(x=>x.name&&x.text&&(x.text===x.name||x.text.startsWith(x.name)))?.name?.toLowerCase();},
 commentRows(root){
  const rows=[];if(!root)return rows;
  for(const a of root.querySelectorAll('a[href*="/c/"]')){
   let e=a.parentElement;
   for(let n=0;e&&e!==root&&n<7;n++,e=e.parentElement){if(this.names(e).length&&this.controls(e).some(b=>b.textContent.trim()==='Reply')){rows.push(e);break;}}
  }
  return [...new Set(rows)];
 },
 commenters(root){return [...new Set(this.commentRows(root).map(row=>this.names(row)[0]).filter(Boolean))];},
 likerControl(root){
  const bar=this.bar(root);
  if(bar){const controls=this.controls(bar);const heart=controls.findIndex(e=>e.querySelector('svg[aria-label="Like"],svg[aria-label="Unlike"]'));const next=controls[heart+1];if(heart>=0&&next&&!next.querySelector('svg')&&/^[\d.,]+\s*[KMB]?$/i.test(next.textContent.trim()))return next;}
  return [...root.querySelectorAll('a,button,[role="button"]')].filter(this.visible).find(e=>e.getAttribute('href')?.includes('/liked_by/')||/^others$|^[\d.,KMB]+ likes$/i.test(e.textContent.trim()));
 },
 listDialog(source){return [...document.querySelectorAll('[role="dialog"]')].filter(this.visible).find(e=>[...e.querySelectorAll('h1,h2,[role="heading"]')].some(h=>h.textContent.trim().toLowerCase()===(source==='likers'?'likes':source)));},
 scrollContainer(root){return [root,...root.querySelectorAll('div,ul')].filter(e=>e.clientHeight>80&&e.scrollHeight>e.clientHeight+40&&/auto|scroll/.test(getComputedStyle(e).overflowY)).sort((a,b)=>b.scrollHeight-a.scrollHeight)[0];},
 actor(){const root=document.querySelector('main');return [...document.querySelectorAll('a[href]')].filter(a=>!root?.contains(a)&&a.querySelector('img[alt*="profile picture"]')).map(a=>AuroraSelectors.profileName(a.href)).find(Boolean)?.toLowerCase();}
};
