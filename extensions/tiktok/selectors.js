globalThis.AuroraSelectors = {
 url(value){try{const u=new URL(value,'https://www.tiktok.com');return u.origin==='https://www.tiktok.com'?u:null;}catch{return null;}},
 profileName(value){const u=this.url(value);return u?.pathname.match(/^\/@([\w.]{1,30})\/?$/)?.[1]||null;},
 postURL(value){const u=this.url(value),m=u?.pathname.match(/^\/@([\w.]{1,30})\/(video|photo)\/(\d+)\/?$/);return m?`https://www.tiktok.com/@${m[1].toLowerCase()}/${m[2]}/${m[3]}`:null;},
 pageKey(value){const u=this.url(value);if(!u)return null;const post=this.postURL(value);if(post)return post.split('/').slice(-2).join(':');const tag=u.pathname.match(/^\/tag\/([^/]+)\/?$/);if(tag){try{return 'tag:'+decodeURIComponent(tag[1]).toLowerCase();}catch{return null;}}const path=u.pathname.replace(/\/$/,'').toLowerCase();return this.profileName(value)?'profile:'+path:path+u.search;},
 listControl(root,source){if(!['followers','following'].includes(source))return null;const candidates=[...root.querySelectorAll(`[data-e2e="${source}"],button,[role="button"],a`)];return candidates.find(e=>e.getClientRects().length&&(e.getAttribute('data-e2e')===source||new RegExp(`\\b${source}\\b`,'i').test(e.getAttribute('aria-label')||e.textContent||'')))||null;}
};
