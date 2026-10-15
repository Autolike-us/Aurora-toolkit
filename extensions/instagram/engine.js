globalThis.AuroraEngine = {
  profile(value) {
    let s=String(value||'').trim().replace(/^@/,'');
    if(/^https?:/.test(s))s=AuroraSelectors.profileName(s)||'';
    if(!/^[\w.]{1,30}$/.test(s)||!AuroraSelectors.profileName('/'+s+'/'))throw Error('Enter valid Instagram usernames.');
    return s.toLowerCase();
  },
  config(input) {
    const c={...input,action:input.action||'like',dry:input.dry!==false};
    if(!['like','follow','unfollow','comment'].includes(c.action))throw Error('Choose an action.');
    for(const key of ['perUser','limit','delay','maxAge','scanLimit','dailyCap']) {
      c[key]=Number(c[key]??(key==='scanLimit'?50:0));const min=key==='maxAge'||key==='dailyCap'?0:key==='delay'?30:1;const max=key==='scanLimit'?500:key==='delay'?86400:key==='dailyCap'?10000:100000;
      if(!Number.isInteger(c[key])||c[key]<min||c[key]>max)throw Error(`Check ${key}: enter a whole number from ${min} to ${max}.`);
    }
    c.exclude=String(c.exclude||'').split(/[\s,]+/).filter(Boolean).map(x=>this.profile(x));c.comment=String(c.comment||'').trim();
    if(c.action==='comment'&&(!c.comment||c.comment.length>2200))throw Error('Enter your comment text (1–2200 characters).');
    if(c.action==='unfollow'&&c.mode!=='users')throw Error('Unfollow uses your explicit profile/user list.');return c;
  },
  // Like/comment walk a profile in place: open its first post, act, press Next, repeat (no per-post page loads).
  profileStep(name,c){return {kind:['follow','unfollow'].includes(c.action)?'account':'walk',url:`https://www.instagram.com/${name}/`,username:name};},
  initial(c) {
    const value=String(c.target||'').trim();if(!value)throw Error('Enter a target.');
    const post=s=>{const url=AuroraSelectors.postURL(s);if(!url)throw Error('Enter valid Instagram post or reel URLs.');return url;};
    switch(c.mode){
      case 'users':return [...new Set(value.split(/[\s,]+/).map(x=>this.profile(x)))].filter(x=>!c.exclude.includes(x)).map(x=>this.profileStep(x,c));
      case 'posts':return [...new Set(value.split(/[\s,]+/).map(post))].map(url=>({kind:c.action==='follow'?'author':'engage',url}));
      case 'hashtag':{let tag=value.replace(/^#/,'');if(/^https?:/.test(value)){const key=AuroraSelectors.pageKey(value);if(!key?.startsWith('tag:'))throw Error('Paste a hashtag URL or enter #tag.');tag=key.slice(4);}if(!/^[\p{L}\p{N}_]+$/u.test(tag))throw Error('Enter one hashtag or its Instagram URL.');return [{kind:'posts',url:'https://www.instagram.com/explore/search/keyword/?q='+encodeURIComponent('#'+tag)}];}
      case 'location':{const url=/^\d+$/.test(value)?`https://www.instagram.com/explore/locations/${value}/`:value;if(!AuroraSelectors.pageKey(url)?.startsWith('location:'))throw Error('Paste a specific place URL /explore/locations/123/name/ or its numeric ID. Country/city directories are not post feeds.');return [{kind:'posts',url:new URL(url).origin+new URL(url).pathname}];}
      case 'followers':case 'following':return [{kind:'users',source:c.mode,url:`https://www.instagram.com/${this.profile(value)}/`}];
      case 'commenters':case 'likers':return [{kind:'users',source:c.mode,url:post(value)}];
      default:throw Error('Choose a discovery source.');
    }
  },
  expand(job,step,result){
    const c=job.config;job.seenUsers??=[];job.seen??=[];
    if(step.kind==='users'||step.kind==='author'){const users=[...new Set(result.users||[])].map(x=>this.profile(x)).filter(x=>!c.exclude.includes(x)&&!job.seenUsers.includes(x)).slice(0,c.scanLimit);job.seenUsers.push(...users);return users.map(x=>this.profileStep(x,c));}
    if(step.kind==='posts'){const limit=['hashtag','location'].includes(c.mode)?c.scanLimit:c.perUser;const urls=[...new Set((result.posts||[]).map(x=>AuroraSelectors.postURL(x)).filter(Boolean))].filter(x=>!job.seen.includes(x)).slice(0,limit);job.seen.push(...urls);return urls.map(url=>({kind:c.action==='follow'?'author':'engage',url}));}
    return [];
  }
};
