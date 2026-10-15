globalThis.AuroraSelectors = {
  pageKey(value) {
    try {
      const u=new URL(value);if(u.origin!=='https://www.instagram.com')return null;
      const post=this.postURL(value);if(post)return 'post:'+new URL(post).pathname.split('/')[2];
      const tag=u.pathname.match(/^\/explore\/tags\/([^/]+)/);
      if(tag)return 'tag:'+decodeURIComponent(tag[1]).toLowerCase();
      if(u.pathname==='/explore/search/keyword/'&&u.searchParams.get('q')?.startsWith('#'))return 'tag:'+u.searchParams.get('q').slice(1).toLowerCase();
      const place=u.pathname.match(/^\/explore\/locations\/(\d+)(?:\/|$)/);if(place)return 'location:'+place[1];
      const prof=this.profileName(value);if(prof)return 'profile:'+prof.toLowerCase();
      return u.pathname.replace(/\/$/,'').toLowerCase()+u.search;
    }catch{return null;}
  },
  profileName(value) {
    try {
      const u=new URL(value,'https://www.instagram.com');if(u.origin!=='https://www.instagram.com')return null;
      const name=u.pathname.match(/^\/([\w.]{1,30})\/?$/)?.[1];
      return name&&!['explore','accounts','direct','reels','stories','p','reel','about','legal'].includes(name)?name:null;
    }catch{return null;}
  },
  postURL(value) {
    try {
      const u = new URL(value);
      if (u.origin !== 'https://www.instagram.com') return null;
      const match = u.pathname.match(/^\/(?:[\w.]+\/)?(p|reels?)\/([\w-]+)\/?$/);
      // /reels/<id>/ is the same reel as /reel/<id>/ (Instagram may redirect between them); always canonicalise to /p/ or /reel/.
      return match ? `https://www.instagram.com/${match[1]==='p'?'p':'reel'}/${match[2]}/` : null;
    } catch { return null; }
  },
  listControl(root, source) {
    if (!['followers', 'following'].includes(source)) return null;
    return [...root.querySelectorAll('a,button,[role="button"]')].find(el => {
      if (!el.getClientRects().length) return false;
      const href = el.getAttribute('href') || '';
      const label = `${el.textContent || ''} ${el.getAttribute('aria-label') || ''}`;
      return href.split('?')[0].endsWith(`/${source}/`) || new RegExp(`\\b${source}\\b`, 'i').test(label);
    }) || null;
  }
};
