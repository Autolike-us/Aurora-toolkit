'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let account = null, authMode = 'register', config = null;
async function api(path, body) {
  const response = await fetch(path, {method:body === undefined ? 'GET':'POST', credentials:'same-origin',
    headers:body === undefined ? {} : {'Content-Type':'application/json'}, body:body === undefined ? undefined : JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw Error(typeof data.detail === 'string' ? data.detail : 'Please check your details and try again.');
  return data;
}
function toast(message) { $('#toast').textContent=message; $('#toast').hidden=false; setTimeout(()=>$('#toast').hidden=true,5000); }
function node(tag, text, className) { const n=document.createElement(tag); if(text)n.textContent=text; if(className)n.className=className; return n; }
function openCheckout() {
  $('#auth-form').hidden=!!account; $('#payment-step').hidden=!account;
  $('#signed-in-email').textContent=account ? 'Signed in as '+account.email : '';
  $('#checkout-status').textContent=config && !Object.values(config.providers).some(Boolean) ? 'Payment setup is pending. You can create your account, but no trial or charge will start until checkout is connected.' : '';
  $$('[data-pay]').forEach(b=>{ b.disabled=!config?.providers[b.dataset.pay]; });
  if (!$('#checkout-dialog').open) $('#checkout-dialog').showModal();
}
$$('[data-trial]').forEach(b=>b.addEventListener('click',openCheckout));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$$('[data-auth]').forEach(b=>b.addEventListener('click',()=>{
  authMode=b.dataset.auth; $$('[data-auth]').forEach(x=>x.classList.toggle('active',x===b));
  $('#auth-submit').textContent=authMode==='register'?'Create my account ↗︎':'Sign in ↗︎';
  $('[name=password]').autocomplete=authMode==='register'?'new-password':'current-password';
}));
$('#auth-form').addEventListener('submit',async e=>{
  e.preventDefault(); const submit=$('#auth-submit'); submit.disabled=true; $('#checkout-status').textContent='';
  try {
    const f=new FormData(e.target); await api('/api/auth/'+authMode,{email:f.get('email'),password:f.get('password')});
    e.target.reset(); await loadAccount(); openCheckout();
  } catch(err) { $('#checkout-status').textContent=err.message; }
  finally { submit.disabled=false; }
});
$$('[data-pay]').forEach(b=>b.addEventListener('click',async()=>{
  if(!$('#consent').checked){$('#checkout-status').textContent='Please read and agree to the trial and recurring billing terms first.';$('#consent').focus();return;}
  $$('[data-pay]').forEach(x=>x.disabled=true); $('#checkout-status').textContent='Opening secure checkout…';
  try { const result=await api('/api/checkout',{product:'facebook',provider:b.dataset.pay,consent:true});
    const url=new URL(result.url);
    if(url.protocol!=='https:'||!['checkout.stripe.com','www.paypal.com','www.sandbox.paypal.com'].includes(url.hostname))throw Error('Unexpected checkout address. Please contact support.');
    location.assign(url.href);
  } catch(err) {$('#checkout-status').textContent=err.message;$$('[data-pay]').forEach(x=>x.disabled=!config?.providers[x.dataset.pay]);}
}));
$('#account-button').addEventListener('click',()=>{if(account){location.hash='account';}else{authMode='login';$('[data-auth=login]').click();openCheckout();}});
$('#logout').addEventListener('click',async()=>{try{await api('/api/logout',{});account=null;$('#account').hidden=true;$('#account-button').textContent='Sign in ↗︎';toast('You have signed out.');}catch(err){toast(err.message);}});
const date=t=>t?new Date(t*1000).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'Not started';
async function loadAccount() {
  try {account=await api('/api/account');}
  catch(err){if(!account)return;throw err;}
  $('#account-button').textContent='My account ↗︎'; $('#account').hidden=false; $('#account-email').textContent=account.email;
  const wrap=$('#subscriptions');wrap.replaceChildren();
  if(!account.subscriptions.length){wrap.append(node('p','Your account is ready. Approve a subscription to start the free trial.'));const b=node('button','Choose Stripe or PayPal ↗︎','button dark');b.onclick=openCheckout;wrap.append(b);return;}
  for(const sub of account.subscriptions){
    const card=node('article',null,'subscription-card');card.append(node('h3','The complete Aurora Series'));
    const status=sub.canceling?'Cancellation scheduled':sub.status;
    card.append(node('p',`${status} · ${sub.provider === 'stripe'?'Stripe':'PayPal'} · Access until ${date(sub.until)}`));
    card.append(node('p','3 days free, then $10/month for three paid months, then $30/month for all three studios.'));
    const actions=node('div',null,'subscription-actions');
    const perform=async(button,fn)=>{button.disabled=true;$('#account-status').textContent='';try{await fn();}catch(err){$('#account-status').textContent=err.message;}finally{button.disabled=false;}};
    const refresh=node('button','Refresh subscription');refresh.onclick=()=>perform(refresh,async()=>{await api(`/api/subscriptions/${sub.id}/refresh`,{});await loadAccount();});actions.append(refresh);
    if(['active','trialing'].includes(sub.status)&&sub.until>Date.now()/1000){
      const key=node('button','Generate / replace license');key.onclick=()=>perform(key,async()=>{
        if(!confirm('Generate a new license? This immediately revokes any previous key for this subscription.'))return;
        const result=await api(`/api/subscriptions/${sub.id}/license`,{});
        card.querySelector('.license-output')?.remove();const output=node('div',null,'license-output');output.append(node('p','Save your license securely. Paste it into License & activation in each studio:'));
        output.append(node('code',result.key));const copy=node('button','Copy key','text-button');copy.onclick=()=>navigator.clipboard.writeText(result.key).then(()=>toast('License copied.'),()=>toast('Select and copy the license manually.'));output.append(node('br'),copy);card.append(output);
      });actions.append(key);
      for(const product of ['facebook','instagram','tiktok']) {const a=node('a','Download '+product,'download-link');a.href='/api/download/'+product;actions.append(a);}
    }
    if(!sub.canceling&&['trialing','active'].includes(sub.status)){
      const cancel=node('button','Cancel subscription');cancel.onclick=()=>perform(cancel,async()=>{
        const warning=sub.provider==='paypal'?'PayPal cancellation ends access immediately.':'Access remains until the current trial or paid period ends.';
        if(confirm('Cancel your Aurora subscription? '+warning+' No further renewals will be charged.')){await api(`/api/subscriptions/${sub.id}/cancel`,{});await loadAccount();toast('Cancellation confirmed.');}
      });actions.append(cancel);
    }
    card.append(actions);wrap.append(card);
  }
}
const productInfo={
  facebook:{title:'Facebook Studio',version:'2.0.29',description:'For page, profile, group, and feed workflows in Facebook.',features:['Seven post reactions, comments, and shares.','Follow and unfollow explicit pages or profiles.','Friend requests and group joins with confirmation checks.','Preview mode, adjustable pacing, task controls, and local activity history.'],limits:'Facebook in English is required. Membership questions and verification must be handled manually. The extension requests Chrome debugger access for native reaction input. No Marketplace or messaging workflow is included.'},
  instagram:{title:'Instagram Studio',version:'2.7.1',description:'For discovering profiles and managing focused Instagram sessions.',features:['Like, follow, unfollow, and comment tasks.','Discover from profiles, followers, following, commenters, likers, hashtags, and numeric place URLs.','Post age and video filters for applicable actions.','Duplicate action receipts, daily caps, local history, and preview mode.'],limits:'Unfollow uses an explicit profile list. Rendered content and available dialogs determine discovery. English and a signed-in Instagram tab are required.'},
  tiktok:{title:'TikTok Studio',version:'1.7.0',description:'For profile, video, and photo-post workflows on TikTok.',features:['Like, follow, unfollow, and comment tasks.','Discover from profiles, hashtags, followers, following, and video commenters.','Video and photo-post links, with comments up to 150 characters.','Preview mode, daily caps, local history, and CSV exports.'],limits:'TikTok in English is required. No DMs, scheduling, location discovery, or guaranteed follower results. Private or restricted lists cannot be discovered.'}
};
function detail(title,paragraphs){$('#detail-title').textContent=title;$('#detail-body').replaceChildren(...paragraphs);$('#detail-dialog').showModal();}
$$('[data-product]').forEach(b=>b.addEventListener('click',()=>{const p=productInfo[b.dataset.product];const list=node('ul');p.features.forEach(x=>list.append(node('li',x)));const trial=node('button','Try the complete series ↗︎','button dark');trial.onclick=()=>{$('#detail-dialog').close();openCheckout();};detail(p.title,[node('p',p.description+' Version '+p.version+'.'),list,node('h3','Before you begin'),node('p',p.limits),node('p','All three studios are included: 3 days free, then $10/month for 3 paid months, then $30/month for all three.'),trial]);}));
$('#preview-button').addEventListener('click',()=>{
  const p=node('p','The interface shown on this page is an illustration. Choose a studio below to explore features verified in its source code. Preview mode inside the installed extension reads the rendered page without sending engagement actions.');
  const buttons=node('div',null,'subscription-actions');Object.entries(productInfo).forEach(([id,p])=>{const b=node('button',p.title);b.onclick=()=>{$('#detail-dialog').close();$(`[data-product=${id}]`).click();};buttons.append(b);});
  detail('A closer look at Aurora.',[p,buttons,node('p','No live social-account actions are performed by this website demo.')]);
});
$('#privacy-button').addEventListener('click',()=>detail('Privacy & subscription terms.',[
  node('p','This is a development storefront. Public checkout stays disabled until merchant configuration is complete. Before public launch, the operator must add its legal identity, support contact, privacy retention policy, and applicable refund and consumer terms.'),
  node('h3','Your subscription'),node('p','One approved subscription unlocks the complete Aurora Series. It starts with 3 days free, then bills $10 USD each month for three paid months. From the fourth paid month, renewal is $30 USD/month for all three extensions ($10 each). Payment approval is required. Cancel before the next charge to stop renewals. Stripe cancellation preserves access until the current period ends; PayPal cancellation ends access immediately. No automatic refunds are implemented.'),
  node('h3','Your information'),node('p','Aurora stores your email, a salted password hash, hashed session and license tokens, and provider subscription identifiers. Card and PayPal payment details are handled by the providers. License verification sends the license key and studio identifier to the Aurora server. Task targets, settings, receipts, and history remain in Chrome storage. Logs should never contain payment credentials or license keys.'),
  node('h3','Platform compatibility'),node('p','Aurora is an independent browser tool. It does not guarantee growth or uninterrupted compatibility with changing social platform layouts. Use it only for actions you intend to perform and in accordance with the relevant platform terms. Public Chrome Web Store publication is a separate step.')
]));
$('#year').textContent=new Date().getFullYear();
(async()=>{try{config=await api('/api/config');await loadAccount();const state=new URLSearchParams(location.search).get('checkout');if(state==='returned'&&account){for(const sub of account.subscriptions){await api(`/api/subscriptions/${sub.id}/refresh`,{});}await loadAccount();toast('Subscription status refreshed from your payment provider.');}else if(state==='canceled')toast('Checkout canceled. No trial access has been granted.');}catch(err){toast(err.message);}})();
