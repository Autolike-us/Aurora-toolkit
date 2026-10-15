(() => {
  if (document.getElementById('aurora-panel-host')) return;
  const host = document.createElement('div');
  host.id = 'aurora-panel-host';
  host.style.cssText = 'position:fixed;right:20px;bottom:80px;z-index:2147483647';
  const shadow = host.attachShadow({mode:'closed'});
  shadow.innerHTML = `<style>
    :host{all:initial;font:14px system-ui,-apple-system,"Segoe UI",sans-serif;
      --bg:#fff;--ink:#1c1e21;--muted:#65676b;--line:#dadde1;--soft:#f0f2f5;--accent:#fe2c55;--ok:#12a594;--bad:#d4222a;--warnbg:#fff3d6;--warnink:#8a5200;--livebg:#ffe9ea;--liveink:#b3202a}
    *{box-sizing:border-box}
    button,input{font:inherit;color:inherit}
    button{cursor:pointer;border:1px solid var(--line);border-radius:12px;background:var(--soft);color:var(--ink);padding:9px 13px;font-weight:600}
    button:hover:not(:disabled){border-color:var(--accent)}
    button:disabled{opacity:.45;cursor:default}
    [hidden]{display:none!important}
    .primary,#toggle{background:#121218;color:#fff;border:0;box-shadow:-3px 3px 0 #25f4ee,3px -3px 0 #fe2c55}
    #toggle{border-radius:999px;padding:11px 18px}
    #toggle.alert{animation:ring 1.2s ease-in-out infinite}@keyframes ring{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
    section{width:min(340px,calc(100vw - 40px));max-height:calc(100vh - 150px);overflow-y:auto;padding:18px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:22px;box-shadow:0 12px 50px rgba(20,10,40,.28);margin-bottom:10px}
    header{display:flex;align-items:center;justify-content:space-between;gap:10px}
    h2{margin:0;font-size:19px}small{color:var(--muted);font-size:12px}
    .chip{display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em}
    .chip.preview{background:var(--warnbg);color:var(--warnink)}.chip.live{background:var(--livebg);color:var(--liveink)}
    #alert{margin:12px 0 0;padding:10px 12px;border-radius:14px;background:var(--livebg);color:var(--liveink);font-weight:600;line-height:1.4}
    #now{margin:12px 0 0;font-weight:650;line-height:1.4}
    #message{margin:6px 0 0;color:var(--muted);line-height:1.5;overflow-wrap:anywhere}
    progress{width:100%;height:8px;margin:12px 0 0;accent-color:var(--accent)}
    label{display:block;margin:14px 0 4px;font-weight:600;font-size:13px}
    input{width:100%;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
    .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
    .note{margin:12px 0 0;color:var(--muted);font-size:12px;line-height:1.5}
    pre{white-space:pre-wrap;font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px;margin:10px 0 0;max-height:220px;overflow:auto}
    .bar{display:flex;gap:8px;justify-content:flex-end;align-items:center}
    #quickPause{border-radius:999px;padding:10px 14px;box-shadow:0 6px 18px rgba(0,0,0,.18)}
  </style>
  <section hidden>
    <header><h2>✦ Aurora <small id="ver"></small></h2><span id="chip" class="chip preview">👁 PREVIEW</span></header>
    <div id="alert" role="alert" hidden>🔔 Paused — it needs you. Check the message, then Resume.</div>
    <p id="now" hidden></p>
    <progress id="bar" max="10" value="0" hidden></progress>
    <p id="message" role="status" aria-live="polite">Ready. Preview a profile without sending anything, or open the full studio for live tasks.</p>
    <div id="idle">
      <label for="target">Profile username</label><input id="target" placeholder="@username">
      <div class="row"><button id="preview" class="primary">Preview profile</button></div>
      <p class="note">Checks up to 3 videos. Preview never sends engagement actions.</p>
    </div>
    <div class="row" id="controls"><button id="pause">Pause</button><button id="resume">Resume</button><button id="skip">↷ Skip this target</button><button id="stop">Stop</button></div>
    <div class="row"><button id="studio">Open full studio</button><button id="check">Check page</button></div>
    <div class="row" id="reportRow"><button id="copyReport">Copy error report</button></div>
    <pre id="report" hidden></pre>
  </section>
  <div class="bar"><button id="quickPause" hidden>⏸ Pause</button><button id="toggle" aria-expanded="false">✦ Aurora</button></div>`;
  document.documentElement.append(host);
  const $ = id => shadow.getElementById(id);
  try { $('ver').textContent = chrome.runtime.getManifest().version; } catch {}
const profile = AuroraSelectors.profileName(location.href);
  if (profile) $('target').value=profile;
  $('toggle').onclick=()=>{const section=shadow.querySelector('section');section.hidden=!section.hidden;$('toggle').setAttribute('aria-expanded',String(!section.hidden));};
  async function send(action, extra={}) {
    try {const result=await chrome.runtime.sendMessage({action,...extra});if(!result?.ok)throw Error(result?.error||'No response from Aurora.');if(result.message)$('message').textContent=result.message;}
    catch(error){$('message').textContent=error.message+' If Aurora was updated, refresh this TikTok tab.';}
  }
  $('preview').onclick=()=>send('previewProfile',{target:$('target').value});
  $('studio').onclick=()=>send('openStudio');
  $('copyReport').onclick=async()=>{try{const t=await globalThis.AuroraReport.build(80);await navigator.clipboard.writeText(t);$('message').textContent='Error report copied. Paste it into your message.';}catch(e){$('message').textContent='Could not copy the report: '+e.message;}};
  $('check').onclick=async()=>{const r=$('report');try{const text=globalThis.AuroraDiagnose?globalThis.AuroraDiagnose():'Check unavailable on this page.';r.textContent=text;r.hidden=false;try{await navigator.clipboard.writeText(text);$('message').textContent='Page check copied to your clipboard.';}catch{$('message').textContent='Page check shown below.';}}catch(e){r.textContent='Check failed: '+e.message;r.hidden=false;}};
  for(const action of ['pause','resume','stop','skip'])$(action).onclick=()=>send(action==='skip'?'skipTarget':action);
  let wasPaused=false,wasRunning=false,lastJob=null;
  // "Target 2 of 5 · name · next in 24s", refreshed every second from the last job we saw.
  const walkOf=()=>null,doneNow=job=>job?.done||0;
  function tickNow(){
    const job=lastJob,el=$('now');if(!job){el.hidden=true;return;}
    const left=job.queue?.length||0,w=walkOf(job),total=job.total||0,idx=total?Math.min((job.finished?.length||0)+1,total):0,label=job.queue?.[0]?.label;
    const lead=(idx?'Target '+idx+' of '+total+' \u00b7 ':'')+(label?label+' \u00b7 ':''),part=doneNow(job)+'/'+(job.config?.limit||'?')+' done'+(left?' \u00b7 '+left+' step'+(left===1?'':'s')+' left':'');
    if(job.status==='running'){const s=Math.max(0,Math.round((Math.max(job.nextAt||0,w?.until||0)-Date.now())/1000));el.textContent='\u25b6 '+lead+(w?.n?'post '+w.n+'/'+w.max+' \u00b7 ':'')+(s?(w?.until>Date.now()?'next post in ':'next in ')+s+'s \u00b7 ':'working\u2026 \u00b7 ')+part;el.hidden=false;}
    else if(job.status==='paused'){el.textContent='\u23f8 Paused \u00b7 '+lead+part;el.hidden=false;}
    else el.hidden=true;
  }
  setInterval(tickNow,1000);
  function render(job){
    lastJob=job;
    const paused=job?.status==='paused',running=job?.status==='running',active=paused||running,section=shadow.querySelector('section');
    // Mode badge: the live/preview nature of the current task, or the panel's own preview-only nature when idle.
    const live=job&&job.config&&job.config.dry===false&&active;$('chip').textContent=live?'⚡ LIVE':'👁 PREVIEW';$('chip').className='chip '+(live?'live':'preview');
    if(job?.message)$('message').textContent=(job.config?.dry&&active?'Preview run — nothing is sent. ':'')+job.message;
    $('alert').hidden=!paused;$('toggle').classList.toggle('alert',paused);
    $('toggle').textContent=paused?'🔔 Aurora needs you':running?'✦ Aurora · '+(job.done||0)+'/'+(job.config?.limit||'?'):'✦ Aurora';
    if(paused&&!wasPaused){section.hidden=false;$('toggle').setAttribute('aria-expanded','true');}
    if(running&&!wasRunning){section.hidden=true;$('toggle').setAttribute('aria-expanded','false');}
    wasRunning=running;wasPaused=paused;
    // Only show what applies right now.
    $('idle').hidden=active;
    $('controls').hidden=!active;$('pause').hidden=!running;$('resume').hidden=!paused;$('skip').hidden=!(paused&&(job.queue?.length||0)>0);$('stop').hidden=!active;
    $('reportRow').hidden=!paused;
    const bar=$('bar');bar.hidden=!active;if(active){bar.max=Number(job.config?.limit)||10;bar.value=job.done||0;}
    const qp=$('quickPause');qp.hidden=!active;qp.textContent=paused?'▶ Resume':'⏸ Pause';qp.onclick=()=>send(paused?'resume':'pause');
    tickNow();
  }
  // When a captcha paused the task, notice that it has been solved in THIS tab and let the background continue (it checks that this is the task tab).
  let clearPolls=0;
  setInterval(async()=>{try{const {job}=await chrome.storage.local.get('job');if(job?.status!=='paused'||!job.waitingCaptcha){clearPolls=0;return;}if(globalThis.AuroraChallenge?.()){clearPolls=0;return;}if(++clearPolls>=2){clearPolls=0;await chrome.runtime.sendMessage({action:'captchaCleared'});}}catch{}},globalThis.__auroraCaptchaPollMs||2500);
  chrome.storage.local.get('job').then(({job})=>render(job)).catch(error=>$('message').textContent=error.message);
  chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.job)render(changes.job.newValue);});
})();
