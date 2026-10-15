"""Isolated-Chromium checks of the page-side script against simulated Instagram layouts.
Run: python tests/browser_smoke.py   (set CHROMIUM_PATH if Chromium is not found automatically)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,os
ROOT=Path(__file__).resolve().parent.parent
checks=[]
URL='https://www.instagram.com/p/ABC123/'
NAV='<a href="/me/"><img alt="me\'s profile picture"></a>'
POST='<main><article><a href="/alice/">alice</a><section><button id="like"><svg aria-label="Like"></svg></button><button><svg aria-label="Comment"></svg></button></section><div><a href="/bob/">bob</a><span>Hello</span></div></article></main>'
PROFILE='<main><header><h2>alice</h2><button>Follow</button></header><a href="/p/AAA/">p</a><a href="/p/BBB/">p</a></main>'
MOCK='''window.data={job:{id:'test',status:'running'},receipts:{},history:[]};window.listeners=[];window.clicks=0;
window.chrome={runtime:{id:'extension',onMessage:{addListener:f=>listeners.push(f)},sendMessage:async(m)=>{(window.sent=window.sent||[]).push(m);return {ok:true}},getURL:p=>'https://fixture.test/'+p},storage:{local:{get:async()=>structuredClone(data),set:async x=>Object.assign(data,structuredClone(x)),remove:async k=>{delete data[k]}},onChanged:{addListener:()=>{}}}};
const nativeTimeout=window.setTimeout;window.setTimeout=(f,ms,...args)=>nativeTimeout(f,Math.min(ms,10),...args);
document.addEventListener('click',e=>{if(e.target.closest('main button'))clicks++});'''
COMMENT_POST='<main><article><a href="/alice/">alice</a><section><button id="like"><svg aria-label="Like"></svg></button><button><svg aria-label="Comment"></svg></button></section><ul id="rows"></ul><form id="f"><textarea aria-label="Add a comment…" placeholder="Add a comment…"></textarea><div role="button" id="post">Post</div></form></article></main>'
# Simulates Instagram re-rendering: typing replaces the textarea node (value kept); Post adds our comment row and clears the box.
RERENDER="""()=>{const f=document.getElementById('f');const mk=v=>{const t=document.createElement('textarea');t.setAttribute('aria-label','Add a comment…');t.placeholder='Add a comment…';t.value=v;t.addEventListener('input',()=>{const n=mk(t.value);t.replaceWith(n);});return t;};f.querySelector('textarea').replaceWith(mk(''));document.getElementById('post').onclick=()=>{const t=f.querySelector('textarea');const li=document.createElement('li');li.innerHTML='<a href="/me/">me</a><span>'+t.value+'</span><a href="/p/ABC123/c/1/">1m</a><button>Reply</button>';document.getElementById('rows').append(li);t.value='';};}"""
with sync_playwright() as p:
 exe=os.environ.get('CHROMIUM_PATH') or next((x for x in ('/usr/bin/chromium','/opt/pw-browsers/chromium') if os.path.exists(x)),None)
 browser=p.chromium.launch(headless=True,args=['--no-sandbox'],**({'executable_path':exe} if exe else {}))
 context=browser.new_context()
 context.route('**/*',lambda r:r.fulfill(status=200,content_type='text/html',body='<html><body></body></html>'))
 page=context.new_page()
 def fixture(body,url=URL,actor=True):
  page.goto(url);page.set_content((NAV if actor else '')+body);page.add_script_tag(content=MOCK)
  for f in ['selectors.js','dom.js','content.js']:page.add_script_tag(path=str(ROOT/f))
 def step(action='like',dry=True,kind='engage',url=URL,**extra):
  c=dict(action=action,dry=dry,mode='posts',exclude=[],maxAge=0,videos=False,scanLimit=2,perUser=2,comment='Nice!');c.update(extra)
  return page.evaluate('''arg=>new Promise(resolve=>listeners[0]({action:'step',step:{kind:arg.kind,url:arg.url,username:'alice'},config:arg.c,jobId:'test'},{id:'extension'},resolve))''',dict(kind=kind,url=url,c=c))
 def check(name,condition):
  assert condition,name;checks.append(name)
 fixture(POST);r=step();check('like preview sends no clicks',r.get('preview') and page.evaluate('clicks')==0)
 fixture(POST);page.evaluate("document.querySelector('#like svg').setAttribute('aria-label','Unlike')");r=step();check('already liked post is skipped',not r.get('preview') and 'already liked' in r.get('message',''))
 fixture(POST);page.evaluate("()=>{const b=document.getElementById('like');b.onclick=()=>b.querySelector('svg').setAttribute('aria-label','Unlike')}");r=step(dry=False);check('live like is clicked once and confirmed',bool(r.get('performed')) and page.evaluate('clicks')==1)
 fixture(POST);r=step(dry=False,exclude=['alice']);check('excluded author is skipped',not r.get('performed') and 'excluded' in r.get('message',''))
 fixture(POST,actor=False);r=step(dry=False);check('live like without a signed-in user fails closed',bool(r.get('error')) and page.evaluate('clicks')==0)
 fixture(PROFILE,'https://www.instagram.com/alice/');r=step(action='follow',kind='account',url='https://www.instagram.com/alice/',mode='users');check('follow preview sends no clicks',r.get('preview') and page.evaluate('clicks')==0)
 for name,body,word in [('private profile','<main><header><h2>alice</h2></header><div>This account is private</div></main>','private'),('profile with no posts','<main><header><h2>alice</h2></header><div>No posts yet</div></main>','no posts'),('missing profile','<main><span>Sorry, this page isn\'t available.</span></main>','unavailable')]:
  fixture(body,'https://www.instagram.com/alice/');r=step(kind='posts',url='https://www.instagram.com/alice/',mode='users');check(name+' is skipped, not an error',not r.get('error') and r.get('posts')==[] and word in r.get('note',''))
 fixture(PROFILE,'https://www.instagram.com/alice/');r=step(kind='posts',url='https://www.instagram.com/alice/',mode='users');check('profile with posts still returns its posts',not r.get('error') and len(r.get('posts',[]))==2)
 fixture(POST.replace('<span>Hello','<span>Too many attempts, Action Blocked, Try Again Later'));r=step();check('warning words inside a comment do not stop the task',bool(r.get('preview')) and not r.get('error'))
 fixture(POST.replace('<main>','<main><div role="dialog">Try Again Later</div>'));r=step();check('warning shown in a dialog does stop the task',bool(r.get('error')) and 'restricted' in r.get('error',''))
 fixture(COMMENT_POST);page.evaluate(RERENDER);r=step(action='comment',dry=False,comment='Nice!');check('comment is posted even when Instagram re-renders the comment box',bool(r.get('performed')) and not r.get('error'))
 fixture(POST);page.add_script_tag(path=str(ROOT/'content.js'));check('content script is safe to inject twice',page.evaluate('listeners.length')==1)
 fixture(POST.replace('<a href="/alice/">alice','<a href="/me/">me'));r=step(dry=False);check('your own post is skipped, nothing is clicked',not r.get('performed') and 'own post' in r.get('message','') and page.evaluate('clicks')==0)
 fixture(POST.replace('<main>','<main><div id="captcha_container" class="captcha_verify_container" style="display:block"></div>'));r=step();check('an empty captcha placeholder does not stop the task',bool(r.get('preview')) and not r.get('error'))
 fixture(POST.replace('<main>','<main><div class="captcha_verify_container" style="width:300px;height:200px">Drag the slider to fit the puzzle</div>'));r=step();check('a real captcha on screen stops the task, asks you to solve it and says which element',bool(r.get('error')) and 'captcha' in r.get('error','').lower() and 'Solve it' in r.get('error','') and any('challenge captcha' in x for x in r.get('trace',[])))
 fixture(POST.replace('<main>','<main><div role="dialog">Select 2 objects that are the same shape</div>'));r=step();check('a captcha shown inside a dialog is noticed',bool(r.get('error')) and 'captcha' in r.get('error','').lower())
 fixture(POST.replace('<main>','<main><div role="dialog">Confirm it\'s you</div>'));r=step();check('an identity check is reported as verification, not a captcha',bool(r.get('error')) and 'verify it is you' in r.get('error',''))
 fixture(POST,'https://www.instagram.com/challenge/abc/');r=step(url='https://www.instagram.com/challenge/abc/');check('the challenge page is noticed',bool(r.get('error')) and 'verify it is you' in r.get('error',''))
 fixture(COMMENT_POST);page.evaluate("()=>{window.inputs=0;document.addEventListener('input',()=>window.inputs++,true);}");page.evaluate(RERENDER);r=step(action='comment',dry=False,comment='Nice!');check('the comment is typed one character at a time',bool(r.get('performed')) and page.evaluate('inputs')>=len('Nice!'))
 fixture(COMMENT_POST);page.evaluate(RERENDER);r=step(action='comment',dry=False,comment='Hi\nthere');check('a multi-line comment is typed as one line',bool(r.get('performed')) and 'Hi there' in page.evaluate("document.getElementById('rows').innerText"))
 fixture(COMMENT_POST);page.evaluate(RERENDER);page.evaluate("()=>{let n=0;document.addEventListener('input',()=>{if(++n===3)setTimeout(()=>{document.querySelector('textarea').value='';},20);});}");r=step(action='comment',dry=False,comment='Hello there');check('a comment box reset mid-typing is restored before posting',bool(r.get('performed')) and 'Hello there' in page.evaluate("document.getElementById('rows').innerText"))
 fixture(POST.replace('<main>','<main><div class="captcha_verify_container" style="width:300px;height:200px">Drag the slider</div>'));page.evaluate('data.job.status="paused";data.job.waitingCaptcha=true;window.__auroraCaptchaPollMs=80;window.sent=[]');page.add_script_tag(path=str(ROOT/'panel.js'));page.wait_for_timeout(700);check('while the captcha is still on screen nothing is reported as solved',not any(m.get('action')=='captchaCleared' for m in page.evaluate('sent')))
 fixture(POST);page.evaluate('data.job.status="paused";data.job.waitingCaptcha=true;window.__auroraCaptchaPollMs=80;window.sent=[]');page.add_script_tag(path=str(ROOT/'panel.js'));page.wait_for_timeout(700);check('once the captcha is gone the page tells the background it was solved',any(m.get('action')=='captchaCleared' for m in page.evaluate('sent')))
 fixture(POST);r=step();check('step results carry a short page trace',isinstance(r.get('trace'),list) and any('action bar' in t for t in r['trace']))
 fixture('<main></main>');r=step();check('a failed step carries the page check report',bool(r.get('error')) and 'Aurora page check' in r.get('diag','') and isinstance(r.get('trace'),list))
 fixture(POST);rep=page.evaluate('AuroraDiagnose()');check('page check reports what it found',('Post action bar found: ✓' in rep) and ('Like heart found: ✓' in rep) and 'Signed in: ✓' in rep)
 fixture(POST,actor=False);rep=page.evaluate('AuroraDiagnose()');check('page check flags a missing sign-in','Signed in: ✗' in rep)
 fixture(PROFILE,'https://www.instagram.com/alice/?hl=en');r=step(action='follow',kind='account',url='https://www.instagram.com/alice/',mode='users');check('profile with a tracking parameter is still recognised',not r.get('error'))
 for f in ('dashboard.html','popup.html'):
  html=(ROOT/f).read_text(encoding='utf-8');check(f+' preview defaults on','id="dry" checked' in html);check(f+' has the daily cap and banner','id="dailyCap"' in html and 'id="banner"' in html);check(f+' has the debug log tab','id="debugTab"' in html and 'id="debugText"' in html and 'report.js' in html)
 for f in ('dashboard.html','popup.html'):
  page.goto('https://fixture.test/'+f);page.set_content((ROOT/f).read_text(encoding='utf-8'));page.add_script_tag(content=MOCK);page.evaluate('data.job=null');page.add_style_tag(path=str(ROOT/'style.css'));page.add_script_tag(path=str(ROOT/'report.js'));page.add_script_tag(path=str(ROOT/'dashboard.js'));page.wait_for_timeout(400)
  page.evaluate("chrome.runtime.getManifest=()=>({name:'T',version:'1'})");page.click('#debugTab');page.wait_for_timeout(300)
  check(f+' debug log tab shows the report',page.locator('#debug').is_visible() and not page.locator('#studio').is_visible() and 'Aurora debug report' in page.locator('#debugText').inner_text())
  page.click('#studioTab');check(f+' can switch back to the studio',page.locator('#studio').is_visible())
  page.evaluate("window.setTimeout=nativeTimeout");page.fill('#target','@zed');page.fill('#limit','7');page.wait_for_timeout(500)
  check(f+' form is remembered as you type',page.evaluate("data.draft&&data.draft.target==='@zed'&&data.draft.limit==='7'"))
  page.fill('#presetName','Morning');page.click('#presetSave');page.wait_for_timeout(100);check(f+' a named setup can be saved',page.evaluate("Object.keys(data.presets||{}).join()")=='Morning')
  page.click('#presetSave');page.fill('#target','@other');page.fill('#presetName','Morning');page.click('#presetSave');page.wait_for_timeout(100);check(f+' overwriting a setup needs a second click',page.evaluate("data.presets.Morning.target")=='@zed')
  page.click('#reset');page.click('#reset');page.wait_for_timeout(100);check(f+' reset restores defaults and keeps setups',page.locator('#target').input_value()=='' and page.locator('#limit').input_value()=='10' and page.locator('#dry').is_checked() and page.evaluate("!data.draft&&!!data.presets.Morning"))
  page.select_option('#presetList','Morning');page.click('#presetLoad');page.wait_for_timeout(100);check(f+' loading a setup fills the form with preview on',page.locator('#target').input_value()=='@zed' and page.locator('#limit').input_value()=='7' and page.locator('#dry').is_checked())
  page.fill('#presetName','Evening');page.click('#presetRename');page.wait_for_timeout(100);check(f+' a setup can be renamed',page.evaluate("Object.keys(data.presets).join()")=='Evening')
  page.select_option('#presetList','Evening');page.click('#presetDelete');page.click('#presetDelete');page.wait_for_timeout(100);check(f+' a setup can be deleted',page.evaluate("Object.keys(data.presets).length")==0)
  page.goto('https://fixture.test/'+f);page.set_content((ROOT/f).read_text(encoding='utf-8'));page.add_script_tag(content=MOCK.replace("history:[]};","history:[],draft:{target:'@back',limit:'4',comment:'Hi',action:'comment'}};"));page.add_script_tag(path=str(ROOT/'report.js'));page.add_script_tag(path=str(ROOT/'dashboard.js'));page.wait_for_timeout(150);check(f+' reopening restores the remembered form',page.locator('#target').input_value()=='@back' and page.locator('#limit').input_value()=='4' and page.locator('#comment').input_value()=='Hi')
 browser.close()
print(json.dumps({'passed':len(checks),'checks':checks},indent=2))
