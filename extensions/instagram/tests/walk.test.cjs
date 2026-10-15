// Offline check of the in-place profile walk: open the first post popup, like, press Next, repeat, close.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');let passed=0;const check=(n,v)=>{assert(v,n);passed++;console.log('PASS '+n);};
const MOCK=`window.data={job:{id:'test',status:'running'},receipts:{},history:[]};window.listeners=[];
window.chrome={runtime:{id:'extension',onMessage:{addListener:f=>listeners.push(f)},sendMessage:async()=>({ok:true})},storage:{local:{get:async()=>structuredClone(data),set:async x=>Object.assign(data,structuredClone(x)),remove:async()=>{}},onChanged:{addListener:()=>{}}}};
const nt=window.setTimeout;window.setTimeout=(f,ms,...a)=>nt(f,Math.min(ms||0,10),...a);`;
const PAGE=`<html lang="en"><body><div><a href="/me/"><img alt="me's profile picture"></a></div><main><header><h2>dabijou</h2><button>Follow</button></header><div id="grid">
<a href="https://www.instagram.com/dabijou/reel/AAA111/"><img src="x"></a><a href="https://www.instagram.com/dabijou/p/BBB222/"><img src="x"></a><a href="https://www.instagram.com/dabijou/p/CCC333/"><img src="x"></a><a href="https://www.instagram.com/dabijou/p/DDD444/"><img src="x"></a></div></main>
<script>
window.__loc={pathname:'/dabijou/',get href(){return 'https://www.instagram.com'+this.pathname;}};
var ids=['AAA111','BBB222','CCC333','DDD444'],kinds=['reel','p','p','p'];window.liked={BBB222:true};window.clicks=0;var modal=null,idx=-1;
function render(){modal?.remove();modal=document.createElement('div');modal.setAttribute('role','dialog');const id=ids[idx];
 modal.innerHTML='<div><article><header><a href="/dabijou/">dabijou</a></header><section><div role="button" tabindex="0" id="likebtn"><svg aria-label="'+(window.liked[id]?'Unlike':'Like')+'"></svg></div><div role="button" tabindex="0"><svg aria-label="Comment"></svg></div></section>'+(idx===0?'<button id="car"><svg aria-label="Next"></svg></button>':'')+'<time datetime="2025-01-01T00:00:00Z">x</time></article></div>'+(idx<ids.length-1?'<div class="_aaqg"><button id="nav"><svg aria-label="Next"></svg></button></div>':'')+'<div role="button" tabindex="0" id="close"><svg aria-label="Close"></svg></div>';
 document.body.append(modal);
 modal.querySelector('#likebtn').onclick=()=>{window.clicks++;window.liked[id]=true;render();};
 const nav=modal.querySelector('#nav');if(nav)nav.onclick=()=>{idx++;__loc.pathname='/dabijou/'+kinds[idx]+'/'+ids[idx]+'/';render();};
 modal.querySelector('#close').onclick=()=>{modal.remove();modal=null;__loc.pathname='/dabijou/';};}
document.querySelectorAll('#grid a').forEach((a,i)=>a.onclick=e=>{e.preventDefault();idx=i;__loc.pathname=new URL(a.href).pathname;render();});
</script></body></html>`;
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-crashpad-for-testing']});
try{const ctx=await browser.newContext();let pg=await ctx.newPage();pg.setDefaultTimeout(60000);pg.on('pageerror',e=>{throw e;});
 const run=async(config,step={})=>{pg=await ctx.newPage();pg.on('pageerror',e=>{throw e;});await pg.setContent(PAGE);await pg.evaluate(()=>{window.liked={BBB222:true};window.clicks=0;});await pg.addScriptTag({content:MOCK});await pg.addScriptTag({content:read('selectors.js')});await pg.addScriptTag({content:'{const location=window.__loc;'+read('dom.js')+'\n'+read('content.js')+'}'});
  return pg.evaluate(([c,s])=>new Promise(r=>listeners[0]({action:'step',step:{kind:'walk',url:'https://www.instagram.com/dabijou/',username:'dabijou',...s},config:{action:'like',dry:false,mode:'users',perUser:3,limit:10,delay:30,exclude:[],maxAge:0,videos:false,scanLimit:5,comment:'Nice!',...c},jobId:'test'},{id:'extension'},r)),[config,step]);};
 let r=await run({});check('walk likes the first 3 eligible posts (skipping one already liked) and reports the count',r.performed&&r.count===3&&/Liked 3 posts on @dabijou/.test(r.message)&&/1 already liked skipped/.test(r.message));
 check('exactly three like clicks were sent and the popup was closed',await pg.evaluate(()=>clicks===3&&!document.querySelector('[role=dialog]')&&__loc.pathname==='/dabijou/'));
 check('the photo-carousel Next arrow inside the article was never used (post order was reel, then photos)',await pg.evaluate(()=>liked.AAA111&&liked.CCC333&&liked.DDD444));
 check('live progress is written while the walk runs (for the panel and studio)',await pg.evaluate(()=>data.walk&&data.walk.id==='test'&&data.walk.acted===3&&/post/.test(data.walk.text)));
 r=await run({dry:true});check('preview walks the posts without clicking Like',r.preview&&r.count===3&&await pg.evaluate(()=>clicks===0));
 r=await run({perUser:1});check('posts-per-profile of 1 stops after one like',r.performed&&r.count===1);
 r=await run({limit:5},{done:4});check('the remaining task limit is respected',r.performed&&r.count===1);
 r=await run({},{room:2});check('the remaining daily cap is respected',r.performed&&r.count===2);
 r=await run({perUser:10});check('it stops at the last post when Next disappears',r.performed&&r.count===3&&/already liked/.test(r.message));
 console.log('\n'+passed+' walk checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
