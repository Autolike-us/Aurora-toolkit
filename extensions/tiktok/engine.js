globalThis.AuroraEngine = {
  profile(value) {
    let s=String(value||'').trim().replace(/^@/,'');
    if(/^https?:/.test(s))s=AuroraSelectors.profileName(s)||'';
    if(!/^[\w.]{1,30}$/.test(s)||!AuroraSelectors.profileName('/@'+s))throw Error('Enter valid TikTok usernames.');
    return s.toLowerCase();
  },
  config(input) {
    const c={...input,action:input.action||'like',dry:input.dry!==false};
    if(!['like','follow','unfollow','comment'].includes(c.action))throw Error('Choose an action.');
    for(const key of ['perUser','limit','delay','maxAge','scanLimit','dailyCap']) {
      c[key]=Number(c[key]??(key==='scanLimit'?50:0));const min=key==='maxAge'||key==='dailyCap'?0:key==='delay'?30:1;const max=key==='scanLimit'?500:key==='delay'?86400:key==='dailyCap'?10000:100000;
      if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)throw Error(`Check ${key}: enter a whole number from ${min} to ${max}.`);
    }
    if(c.maxAge || c.videos)throw Error('Post age and skip-video filters are unavailable for TikTok.');
    if(!['users','posts','hashtag','followers','following','commenters'].includes(c.mode))throw Error('Choose a supported TikTok discovery source.');
    c.exclude=String(c.exclude||'').split(/[\s,]+/).filter(Boolean).map(x=>this.profile(x));c.comment=String(c.comment||'').trim();
    if(c.action==='comment'&&(!c.comment||c.comment.length>150))throw Error('Enter your comment text (1–150 characters).');
    if(c.action==='unfollow'&&c.mode!=='users')throw Error('Unfollow uses your explicit profile/user list.');return c;
  },
  profileStep(name,c){return {label:'@'+name,kind:['follow','unfollow'].includes(c.action)?'account':'posts',url:`https://www.tiktok.com/@${name}`,username:name};},
  initial(c) {
    const value=String(c.target||'').trim();if(!value)throw Error('Enter a target.');
    const post=s=>{const url=AuroraSelectors.postURL(s);if(!url)throw Error('Enter valid TikTok video or photo URLs.');return url;};
    switch(c.mode){
      case 'users':return [...new Set(value.split(/[\s,]+/).map(x=>this.profile(x)))].filter(x=>!c.exclude.includes(x)).map(x=>this.profileStep(x,c));
      case 'posts':return [...new Set(value.split(/[\s,]+/).map(post))].map(url=>({kind:c.action==='follow'?'author':'engage',url,label:'post '+String(AuroraSelectors.pageKey(url)||'').replace(/^post:/,'')}));
      case 'hashtag':{let tag=value.replace(/^#/,'');if(/^https?:/.test(value)){const key=AuroraSelectors.pageKey(value);if(!key?.startsWith('tag:'))throw Error('Paste a hashtag URL or enter #tag.');tag=key.slice(4);}if(!/^[\p{L}\p{N}_]+$/u.test(tag))throw Error('Enter one hashtag or its TikTok URL.');return [{label:'#'+tag,kind:'posts',url:'https://www.tiktok.com/tag/'+encodeURIComponent(tag)}];}
      case 'followers':case 'following':return [{label:c.mode+' of @'+this.profile(value),kind:'users',source:c.mode,url:`https://www.tiktok.com/@${this.profile(value)}`}];
      case 'commenters':return [{label:c.mode+' of a post',kind:'users',source:c.mode,url:post(value)}];
      default:throw Error('Choose a discovery source.');
    }
  },
  expand(job,step,result){
    const c=job.config;job.seenUsers??=[];job.seen??=[];
    if(step.kind==='users'||step.kind==='author'){const users=[...new Set(result.users||[])].map(x=>this.profile(x)).filter(x=>!c.exclude.includes(x)&&!job.seenUsers.includes(x)).slice(0,c.scanLimit);job.seenUsers.push(...users);return users.map(x=>this.profileStep(x,c));}
    if(step.kind==='posts'){const limit=c.mode==='hashtag'?c.scanLimit:c.perUser;const urls=[...new Set((result.posts||[]).map(x=>AuroraSelectors.postURL(x)).filter(Boolean))].filter(x=>!job.seen.includes(x)).slice(0,limit);job.seen.push(...urls);return urls.map(url=>({kind:c.action==='follow'?'author':'engage',url,label:'post '+String(AuroraSelectors.pageKey(url)||'').replace(/^post:/,'')}));}
    return [];
  }
};

